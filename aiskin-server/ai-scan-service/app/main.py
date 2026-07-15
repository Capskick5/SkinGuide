import asyncio
import base64
import hashlib
import logging
import os
import threading
import uuid
from contextlib import asynccontextmanager, suppress
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

import py_eureka_client.eureka_client as eureka_client
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pymongo import ASCENDING, DESCENDING, MongoClient
from pymongo.errors import DuplicateKeyError

SERVICE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(SERVICE_DIR.parent / ".env")

from app.formulas.routine_builder import generate_routine
from app.security import has_permission, verify_token
from app.services.skin_type_inference import SkinTypeDetector
from app.services.ultimate_skin_inference import UltimateSkinDetector
from app.utils.face_cropper import crop_face_from_bytes
from app.utils.rate_limiter import SlidingWindowRateLimiter
from app.utils.scan_image_store import ScanImageStore

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
EUREKA_SERVER = os.getenv("EUREKA_URI")
APP_NAME = "ai-scan-service"
APP_PORT = int(os.getenv("AI_SCAN_PORT", "5000"))
MONGO_URI = os.getenv("MONGODB_URI_SCAN")
UPLOAD_DIR = Path(os.getenv("AI_SCAN_UPLOAD_DIR") or SERVICE_DIR / "uploads")
MAX_UPLOAD_BYTES = 8 * 1024 * 1024
ALLOWED_IMAGE_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_ORIGINS = [origin.strip() for origin in os.getenv(
    "AI_ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174",
).split(",") if origin.strip()]
SCAN_RATE_LIMIT_PER_MINUTE = int(os.getenv("SCAN_RATE_LIMIT_PER_MINUTE", "10"))
VALIDATE_RATE_LIMIT_PER_MINUTE = int(os.getenv("VALIDATE_RATE_LIMIT_PER_MINUTE", "30"))
SCAN_RETENTION_DAYS = int(os.getenv("SCAN_RETENTION_DAYS", "90"))
MAX_CONCURRENT_INFERENCE = max(1, int(os.getenv("AI_MAX_CONCURRENT_INFERENCE", "2")))
INFERENCE_QUEUE_TIMEOUT_SECONDS = max(
    0.1,
    float(os.getenv("AI_INFERENCE_QUEUE_TIMEOUT_SECONDS", "5")),
)
ROUTINE_SCHEMA_VERSION = 2


def _image_signing_secret() -> str:
    dedicated_secret = os.getenv("SCAN_IMAGE_SIGNING_SECRET")
    if dedicated_secret:
        return dedicated_secret
    jwt_secret = os.getenv("JWT_SECRET", "")
    if not jwt_secret:
        return ""
    return hashlib.sha256(f"scan-image-url:{jwt_secret}".encode("utf-8")).hexdigest()


image_store = ScanImageStore(
    UPLOAD_DIR,
    _image_signing_secret(),
)
rate_limiter = SlidingWindowRateLimiter()
inference_slots = threading.BoundedSemaphore(MAX_CONCURRENT_INFERENCE)

# Global AI model & DB instance
skin_detector = None
ultimate_detector = None
ultimate_model_error = "No validated multi-label Model B checkpoint is installed."
db = None
mongo_client = None


def get_current_user_id(payload: dict = Depends(verify_token)):
    return payload["sub"]


def _round_probability(value):
    return round(float(value), 4)


def _fallback_skin_issue_analysis(reason: str):
    return {
        "modelStatus": "unavailable",
        "reason": reason,
        "t_zone": {"issues": []},
        "u_zone": {"issues": []},
    }


def _require_reliable_skin_type(scan_record: dict) -> None:
    skin_type = scan_record.get("skinType") or {}
    if isinstance(skin_type, dict) and skin_type.get("reliable") is False:
        confidence = round(float(skin_type.get("confidence", 0)) * 100)
        minimum = round(float(skin_type.get("minimumConfidence", 0.6)) * 100)
        raise HTTPException(
            status_code=409,
            detail=(
                f"Kết quả loại da chỉ đạt {confidence}%, dưới ngưỡng tin cậy {minimum}%. "
                "Vui lòng quét lại ảnh chính diện, rõ và đủ sáng trước khi tạo lộ trình."
            ),
        )


def _read_upload_image(image: UploadFile) -> bytes:
    content_type = (image.content_type or "").lower()
    if content_type and content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
        raise ValueError("File tải lên phải là ảnh JPG, PNG hoặc WEBP.")

    bytes_data = image.file.read(MAX_UPLOAD_BYTES + 1)
    if not bytes_data:
        raise ValueError("File ảnh đang rỗng. Vui lòng tải lên ảnh hợp lệ.")
    if len(bytes_data) > MAX_UPLOAD_BYTES:
        raise ValueError("Ảnh vượt quá dung lượng 8MB. Vui lòng chọn ảnh nhỏ hơn.")
    return bytes_data


def _enforce_rate_limit(user_id: str, action: str) -> None:
    limit = SCAN_RATE_LIMIT_PER_MINUTE if action == "analyze" else VALIDATE_RATE_LIMIT_PER_MINUTE
    if not rate_limiter.allow(f"{action}:{user_id}", limit, 60):
        raise HTTPException(status_code=429, detail="Bạn thao tác quá nhanh. Vui lòng thử lại sau một phút.")


def _signed_image_url(base_url: str, record: dict) -> Optional[str]:
    filename = image_store.filename_from_record(record)
    if not filename:
        return None
    return image_store.signed_url(base_url, str(record["_id"]), filename)


def _cleanup_expired_scans() -> None:
    if db is None or SCAN_RETENTION_DAYS <= 0:
        return
    cutoff = datetime.now(timezone.utc) - timedelta(days=SCAN_RETENTION_DAYS)
    expired = list(db.ai_scan_results.find({"analyzedAt": {"$lt": cutoff}}, {"_id": 1, "imageFile": 1, "imageUrl": 1}))
    for record in expired:
        image_store.delete(image_store.filename_from_record(record))
        db.product_recommendations.delete_many({"scanId": str(record["_id"])})
        db.skincare_routines.delete_many({"scanId": str(record["_id"])})
        db.ai_scan_results.delete_one({"_id": record["_id"]})


def _ensure_database_indexes(database) -> None:
    database.ai_scan_results.create_index(
        [("userId", ASCENDING), ("analyzedAt", DESCENDING)],
        name="user_scan_history",
    )
    database.ai_scan_results.create_index("analyzedAt", name="scan_retention_lookup")
    database.skincare_routines.create_index("scanId", name="routine_scan_lookup")
    database.skincare_routines.create_index(
        [("userId", ASCENDING), ("generatedAt", DESCENDING)],
        name="user_routine_history",
    )
    # Legacy data contains duplicate routines. Apply uniqueness only to schema v2
    # so new requests are race-safe without deleting the team's existing records.
    database.skincare_routines.create_index(
        "scanId",
        name="unique_v2_routine_per_scan",
        unique=True,
        partialFilterExpression={"schemaVersion": ROUTINE_SCHEMA_VERSION},
    )


async def _retention_worker() -> None:
    while True:
        try:
            await asyncio.to_thread(_cleanup_expired_scans)
        except Exception as exc:
            logger.error(f"Scan retention cleanup failed: {exc}")
        await asyncio.sleep(24 * 60 * 60)



@asynccontextmanager
async def lifespan(_app: FastAPI):
    global skin_detector, ultimate_detector, ultimate_model_error, db, mongo_client
    logger.info("Khởi động AI Scan Service...")
    eureka_registered = False
    
    # 1. Connect MongoDB
    try:
        if not MONGO_URI:
            raise RuntimeError("MONGODB_URI_SCAN is required")
        mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        mongo_client.admin.command("ping")
        connected_database = mongo_client.ai_scan_db
        _ensure_database_indexes(connected_database)
        db = connected_database
        logger.info("MongoDB connected thành công.")
    except Exception as e:
        db = None
        if mongo_client is not None:
            mongo_client.close()
            mongo_client = None
        logger.error(f"MongoDB connection error: {e}")

    # 2. Khởi tạo mô hình AI (Load weight tốn khoảng vài giây)
    try:
        skin_detector = SkinTypeDetector()
        logger.info("Model A phân loại loại da nạp thành công.")
    except Exception as e:
        skin_detector = None
        logger.error(f"Lỗi khi khởi tạo Model A: {e}")

    try:
        ultimate_detector = UltimateSkinDetector()
        ultimate_model_error = None
        logger.info("Model B nhận diện vấn đề da nạp thành công.")
    except Exception as e:
        ultimate_detector = None
        ultimate_model_error = "No validated multi-label Model B checkpoint is installed."
        logger.warning(f"Model B không khả dụng, API sẽ trả fallback minh bạch: {e}")
        
    # 3. Register to Eureka on startup
    if EUREKA_SERVER:
        try:
            await eureka_client.init_async(
                eureka_server=EUREKA_SERVER,
                app_name=APP_NAME,
                instance_port=APP_PORT,
                instance_host="127.0.0.1",
            )
            eureka_registered = True
            logger.info("Đã đăng ký với Eureka thành công!")
        except Exception as e:
            logger.error(f"Lỗi Eureka: {e}")
    else:
        logger.warning("EUREKA_URI chưa được cấu hình; AI Scan Service chạy độc lập.")
        
    retention_task = asyncio.create_task(_retention_worker())
    yield
    retention_task.cancel()
    with suppress(asyncio.CancelledError):
        await retention_task
    
    # Unregister from Eureka on shutdown
    if eureka_registered:
        try:
            await eureka_client.stop_async()
            logger.info("Đã hủy đăng ký Eureka thành công!")
        except Exception as e:
            logger.error(f"Lỗi khi hủy Eureka: {e}")
    if mongo_client is not None:
        mongo_client.close()
        mongo_client = None
        db = None

app = FastAPI(title="AI Scan Service", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["System"])
def health_check():
    database_ready = db is not None
    model_a_ready = skin_detector is not None
    model_b_ready = ultimate_detector is not None
    if not database_ready or not model_a_ready:
        status = "DOWN"
    elif not model_b_ready:
        status = "DEGRADED"
    else:
        status = "UP"
    return {
        "status": status,
        "service": APP_NAME,
        "database": "UP" if database_ready else "DOWN",
        "skinTypeModel": "loaded" if model_a_ready else "unavailable",
        "skinTypeModelVersion": skin_detector.model_version if model_a_ready else None,
        "skinTypeModelEvidence": skin_detector.evidence if model_a_ready else None,
        "skinIssueModel": "loaded" if model_b_ready else "unavailable",
        "skinIssueModelReason": None if model_b_ready else ultimate_model_error,
        "supportedAnalysisScope": "skin_type_and_visible_issues" if model_b_ready else "skin_type_only",
    }

@app.post("/api/scans/analyze", tags=["AI Skin Scan"])
def analyze_skin(request: Request, image: UploadFile = File(...), user_id: str = Depends(get_current_user_id)):
    """
    Nhận file ảnh từ người dùng, chạy các mô hình AI để đánh giá tổng quan tình trạng da, lưu lịch sử quét.
    """
    if skin_detector is None:
        raise HTTPException(status_code=503, detail="AI Model chưa được nạp sẵn sàng.")
    if db is None:
        raise HTTPException(status_code=503, detail="Database chưa được kết nối.")
    _enforce_rate_limit(user_id, "analyze")
        
    try:
        # Đọc và chặn file upload không hợp lệ trước khi decode ảnh.
        bytes_data = _read_upload_image(image)
        
        # Cắt hậu cảnh và chuẩn hóa đúng một khuôn mặt trước khi đưa vào các model AI.
        cropped_bytes_data = crop_face_from_bytes(bytes_data)
        
        if not inference_slots.acquire(timeout=INFERENCE_QUEUE_TIMEOUT_SECONDS):
            raise HTTPException(
                status_code=503,
                detail="AI đang xử lý nhiều ảnh cùng lúc. Vui lòng thử lại sau ít giây.",
            )
        try:
            # Model A và Model B dùng chung giới hạn đồng thời để tránh quá tải RAM/GPU.
            skin_type_result = skin_detector.predict_with_probabilities(cropped_bytes_data)
            skin_type = skin_type_result["predicted"]
            skin_type_confidence = _round_probability(skin_type_result["confidence"])
            skin_type_probabilities = {
                label: _round_probability(probability)
                for label, probability in skin_type_result["probabilities"].items()
            }

            # Model B thiếu checkpoint phải trả trạng thái rõ ràng, không chạy trọng số ngẫu nhiên.
            if ultimate_detector is not None:
                ultimate_analysis = ultimate_detector.predict(cropped_bytes_data, top_k=3)
                skin_issue_model_status = "loaded"
            else:
                ultimate_analysis = _fallback_skin_issue_analysis(ultimate_model_error)
                skin_issue_model_status = "unavailable"
        finally:
            inference_slots.release()

        # Chỉ lưu ảnh sau khi pass AI guard và chạy model thành công.
        # Ảnh lưu là bản đã crop/chuẩn hóa đúng với đầu vào model.
        # 3. Lưu lịch sử vào MongoDB (Chỉ lưu kết quả Scan)
        scan_id = str(uuid.uuid4())
        unique_filename = image_store.save(scan_id, cropped_bytes_data)
        base_url = str(request.base_url).rstrip("/")
        image_url = image_store.signed_url(base_url, scan_id, unique_filename)
        now_utc = datetime.now(timezone.utc)
        
        scan_record = {
            "_id": scan_id,
            "userId": user_id,
            "imageFile": unique_filename,
            "imageUrl": image_url,
            "skinType": {
                "predicted": skin_type,
                "probability": skin_type_confidence,
                "confidence": skin_type_confidence,
                "probabilities": skin_type_probabilities,
                "modelVersion": skin_type_result["model_version"],
                "confidenceCalibrated": skin_type_result["confidence_calibrated"],
                "minimumConfidence": skin_type_result["minimum_confidence"],
                "reliable": skin_type_result["reliable"],
            },
            "facialZones": ultimate_analysis,
            "modelHealth": {
                "skinTypeModel": "loaded",
                "skinIssueModel": skin_issue_model_status,
            },
            "analyzedAt": now_utc
        }
        
        try:
            db.ai_scan_results.insert_one(scan_record)
        except Exception:
            image_store.delete(unique_filename)
            raise
        
        return {
            "status": "success",
            "message": "Phân tích da thành công",
            "scan_result": scan_record
        }

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Lỗi trong quá trình predict: {e}")
        raise HTTPException(status_code=500, detail="Lỗi hệ thống nội bộ")

@app.post("/api/scans/validate", tags=["AI Skin Scan"])
def validate_skin_image(image: UploadFile = File(...), user_id: str = Depends(get_current_user_id)):
    """
    API Tiền xử lý: Chỉ kiểm định chất lượng ảnh (độ sáng, độ mờ), cắt khuôn mặt và làm sáng ảnh (CLAHE).
    Nếu lỗi sẽ trả về 400. Nếu thành công sẽ trả về ảnh đã xử lý dưới dạng Base64.
    """
    _enforce_rate_limit(user_id, "validate")
    try:
        bytes_data = _read_upload_image(image)
        
        # Áp dụng Face Cropping để kiểm tra và lấy ảnh đã xử lý (Cắt mặt + CLAHE)
        processed_bytes_data = crop_face_from_bytes(bytes_data)
        
        # Mã hóa Base64 để trả về cho Frontend hiển thị Preview
        b64_image = base64.b64encode(processed_bytes_data).decode('utf-8')
        
        return {
            "status": "success",
            "message": "Ảnh hợp lệ, sẵn sàng để phân tích.",
            "processed_image_b64": f"data:image/jpeg;base64,{b64_image}"
        }

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Lỗi trong quá trình kiểm định ảnh: {e}")
        raise HTTPException(status_code=500, detail="Lỗi hệ thống nội bộ")



@app.post("/api/scans/{scan_id}/routine", tags=["AI Skin Scan"])
def generate_scan_routine(scan_id: str, user_id: str = Depends(get_current_user_id)):
    """
    API để sinh lộ trình dựa trên một kết quả Scan đã có trong hệ thống.
    Chỉ khi nào người dùng có nhu cầu thì mới gọi API này để tạo Lộ trình.
    """
    if db is None:
        raise HTTPException(status_code=503, detail="Database chưa được kết nối.")
        
    try:
        # 1. Tìm bản quét tương ứng
        scan_record = db.ai_scan_results.find_one({"_id": scan_id, "userId": user_id})
        if not scan_record:
            raise HTTPException(status_code=404, detail="Không tìm thấy bản quét hoặc bạn không có quyền truy cập.")
        _require_reliable_skin_type(scan_record)
            
        # Kiểm tra xem routine đã tồn tại chưa
        existing_routine = db.skincare_routines.find_one({"scanId": scan_id})
        if existing_routine:
            existing_routine["_id"] = str(existing_routine["_id"])
            return {
                "status": "success",
                "message": "Lộ trình đã tồn tại",
                "routine_result": existing_routine
            }
            
        # 2. Xây dựng lại List điều kiện
        ultimate_analysis = scan_record.get("facialZones", {})
        skin_type = scan_record.get("skinType", {}).get("predicted", "Normal")
        
        flat_conditions = []
        if "issues" in ultimate_analysis:
            flat_conditions.extend(ultimate_analysis["issues"])
        if "t_zone" in ultimate_analysis and "issues" in ultimate_analysis["t_zone"]:
            flat_conditions.extend(ultimate_analysis["t_zone"]["issues"])
        if "u_zone" in ultimate_analysis and "issues" in ultimate_analysis["u_zone"]:
            flat_conditions.extend(ultimate_analysis["u_zone"]["issues"])
            
        skin_issue_model_status = scan_record.get("modelHealth", {}).get("skinIssueModel", "unavailable")
        analysis_scope = "skin_type_and_issues" if skin_issue_model_status == "loaded" else "skin_type_only"

        # Model B chưa có vẫn tạo routine nền tảng theo loại da, nhưng không suy diễn vấn đề da.
        routine, top_ingredients = generate_routine(skin_type, flat_conditions)
        
        # Lấy tối đa 2 vấn đề nổi cộm làm Focus Areas
        focus_areas = list(dict.fromkeys(
            c["name"] for c in flat_conditions if c.get("name") != "Healthy"
        ))[:2]
        if not focus_areas:
            focus_areas = [f"Chăm sóc nền tảng cho loại da {skin_type}"]
        
        routine_id = str(uuid.uuid4())
        now_utc = datetime.now(timezone.utc)
        
        routine_record = {
            "_id": routine_id,
            "scanId": scan_id,
            "userId": user_id,
            "schemaVersion": ROUTINE_SCHEMA_VERSION,
            "focusAreas": focus_areas,
            "topIngredients": top_ingredients,
            "routine": routine,
            "analysisScope": analysis_scope,
            "skinIssueModelStatus": skin_issue_model_status,
            "generatedAt": now_utc
        }
        
        try:
            db.skincare_routines.insert_one(routine_record)
        except DuplicateKeyError:
            # Hai request đồng thời cho cùng scan: trả routine đã thắng thay vì lỗi 500.
            existing_routine = db.skincare_routines.find_one({"scanId": scan_id, "userId": user_id})
            if not existing_routine:
                raise
            existing_routine["_id"] = str(existing_routine["_id"])
            return {
                "status": "success",
                "message": "Lộ trình đã tồn tại",
                "routine_result": existing_routine,
            }
        
        return {
            "status": "success",
            "message": "Đã tạo lộ trình chăm sóc da thành công",
            "routine_result": routine_record
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Lỗi khi tạo routine: {e}")
        raise HTTPException(status_code=500, detail="Lỗi hệ thống nội bộ khi tạo lộ trình.")

@app.get("/api/scans/images/{scan_id}", tags=["AI Skin Scan"])
def get_scan_image(scan_id: str, file: str, expires: int, signature: str):
    if db is None:
        raise HTTPException(status_code=503, detail="Database chưa được kết nối.")
    if not image_store.verify(scan_id, file, expires, signature):
        raise HTTPException(status_code=403, detail="Đường dẫn ảnh không hợp lệ hoặc đã hết hạn.")
    record = db.ai_scan_results.find_one({"_id": scan_id}, {"imageFile": 1, "imageUrl": 1})
    if not record or image_store.filename_from_record(record) != file:
        raise HTTPException(status_code=404, detail="Không tìm thấy ảnh quét.")
    try:
        path = image_store.path(file)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not path.exists():
        raise HTTPException(status_code=404, detail="Không tìm thấy file ảnh quét.")
    return FileResponse(path, media_type="image/jpeg", headers={"Cache-Control": "private, max-age=300"})


@app.get("/api/scans/history", tags=["AI Skin Scan"])
def get_scan_history(request: Request, user_id: str = Depends(get_current_user_id)):
    """
    Lấy danh sách lịch sử quét da của user hiện tại (chỉ lấy scan_results).
    """
    if db is None:
        raise HTTPException(status_code=503, detail="Database chưa được kết nối.")
        
    try:
        cursor = db.ai_scan_results.find({"userId": user_id}).sort("analyzedAt", -1).limit(50)
        histories = []
        for record in cursor:
            record["_id"] = str(record["_id"])
            record["imageUrl"] = _signed_image_url(str(request.base_url), record)
            if "analyzedAt" in record and isinstance(record["analyzedAt"], datetime):
                record["analyzedAt"] = record["analyzedAt"].replace(tzinfo=timezone.utc)
            else:
                # Tương thích ngược với dữ liệu cũ (createdAt)
                if "createdAt" in record and isinstance(record["createdAt"], datetime):
                    record["createdAt"] = record["createdAt"].replace(tzinfo=timezone.utc)
                    record["analyzedAt"] = record["createdAt"]
            
            # Kiểm tra nhanh xem đã có routine chưa (không fetch chi tiết, không gọi API ngoại)
            routine_record = db.skincare_routines.find_one({"scanId": record["_id"]}, {"_id": 1})
            if routine_record:
                record["hasRoutine"] = True
                record["routineId"] = str(routine_record["_id"])
            else:
                record["hasRoutine"] = False
                
            histories.append(record)
            
        return {
            "status": "success",
            "data": histories
        }
    except Exception as e:
        logger.error(f"Lỗi khi lấy lịch sử quét: {e}")
        raise HTTPException(status_code=500, detail="Lỗi hệ thống nội bộ khi lấy lịch sử quét.")

@app.get("/api/scans/admin/stats", tags=["Admin"])
def get_scan_admin_stats(
    limit: int = Query(default=50, ge=1, le=200),
    payload: dict = Depends(has_permission("/api/scans/admin/stats", "GET")),
):
    """
    Tong hop nhanh so lieu quet da cho dashboard admin.
    """
    if db is None:
        raise HTTPException(status_code=503, detail="Database chua duoc ket noi.")

    try:
        total_scans = db.ai_scan_results.count_documents({})
        unique_users = len(db.ai_scan_results.distinct("userId"))

        now = datetime.now(timezone.utc)
        start_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        scans_today = db.ai_scan_results.count_documents({"analyzedAt": {"$gte": start_today}})

        skin_type_breakdown = {}
        for item in db.ai_scan_results.aggregate([
            {"$group": {"_id": "$skinType.predicted", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]):
            skin_type_breakdown[item.get("_id") or "Unknown"] = item.get("count", 0)

        latest = []
        cursor = db.ai_scan_results.find(
            {},
            {"_id": 1, "userId": 1, "skinType": 1, "analyzedAt": 1},
        ).sort("analyzedAt", -1).limit(limit)
        for record in cursor:
            analyzed_at = record.get("analyzedAt")
            latest.append({
                "id": str(record.get("_id")),
                "userId": record.get("userId"),
                "skinType": record.get("skinType", {}).get("predicted"),
                "analyzedAt": analyzed_at.isoformat() if isinstance(analyzed_at, datetime) else analyzed_at,
            })

        return {
            "totalScans": total_scans,
            "uniqueScanUsers": unique_users,
            "scansToday": scans_today,
            "skinTypeBreakdown": skin_type_breakdown,
            "latestScans": latest,
        }
    except Exception as e:
        logger.error(f"Admin scan stats error: {e}")
        raise HTTPException(status_code=500, detail="Lỗi hệ thống nội bộ khi tổng hợp số liệu quét.")

@app.get("/api/scans/{scan_id}/routine", tags=["AI Skin Scan"])
def get_scan_routine_details(scan_id: str, user_id: str = Depends(get_current_user_id)):
    """
    Lấy chi tiết Lộ trình của một bản quét cụ thể (Lazy Load).
    """
    if db is None:
        raise HTTPException(status_code=503, detail="Database chưa được kết nối.")
        
    try:
        routine_record = db.skincare_routines.find_one({"scanId": scan_id, "userId": user_id})
        if not routine_record:
            return {
                "status": "not_found",
                "message": "Bản quét này chưa tạo lộ trình."
            }
            
        routine_record["_id"] = str(routine_record["_id"])
        return {
            "status": "success",
            "data": routine_record
        }
    except Exception as e:
        logger.error(f"Lỗi khi lấy chi tiết routine: {e}")
        raise HTTPException(status_code=500, detail="Lỗi hệ thống nội bộ.")

from bson.objectid import ObjectId

@app.delete("/api/scans/history/{scan_id}", tags=["AI Skin Scan"])
def delete_scan_history(scan_id: str, user_id: str = Depends(get_current_user_id)):
    """
    Xóa 1 bản quét lịch sử và routine tương ứng.
    """
    if db is None:
        raise HTTPException(status_code=503, detail="Database chưa được kết nối.")
        
    try:
        record = db.ai_scan_results.find_one({"_id": scan_id})
        if not record:
            # Thuật toán cũ dùng ObjectId, tương thích ngược
            if ObjectId.is_valid(scan_id):
                record = db.scan_histories.find_one({"_id": ObjectId(scan_id)})
                if record and record.get("userId") == user_id:
                    db.scan_histories.delete_one({"_id": ObjectId(scan_id)})
                    return {"status": "success"}
            raise HTTPException(status_code=404, detail="Không tìm thấy bản quét.")
            
        if record.get("userId") != user_id:
            raise HTTPException(status_code=403, detail="Bạn không có quyền xóa bản quét này.")
            
        image_store.delete(image_store.filename_from_record(record))
        db.product_recommendations.delete_many({"scanId": scan_id})
        db.ai_scan_results.delete_one({"_id": scan_id})
        db.skincare_routines.delete_many({"scanId": scan_id})
        
        return {
            "status": "success",
            "message": "Đã xóa bản quét thành công"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Lỗi khi xóa lịch sử quét: {e}")
        raise HTTPException(status_code=500, detail="Lỗi hệ thống nội bộ khi xóa lịch sử quét.")

@app.get("/api/scans/system/endpoints", tags=["System"])
def get_endpoints(payload: dict = Depends(has_permission("/api/scans/system/endpoints", "GET"))):
    endpoints = []
    for route in app.routes:
        if hasattr(route, "methods") and hasattr(route, "path"):
            for method in route.methods:
                endpoints.append({
                    "method": method,
                    "path": route.path
                })
    return endpoints

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=APP_PORT, reload=False)
