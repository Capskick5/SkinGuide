import os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", ".env"))
import uuid
import jwt
from datetime import datetime, timezone
from pymongo import MongoClient
from fastapi import FastAPI, UploadFile, File, HTTPException, Request, Depends, BackgroundTasks, Query
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import py_eureka_client.eureka_client as eureka_client
from contextlib import asynccontextmanager
import json
import asyncio
import requests
from app.services.skin_type_inference import SkinTypeDetector
from app.services.ultimate_skin_inference import UltimateSkinDetector
from app.utils.face_cropper import crop_face_from_bytes
from app.formulas.routine_builder import generate_routine
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
EUREKA_SERVER = os.getenv("EUREKA_URI")
APP_NAME = "ai-scan-service"
APP_PORT = 5000
MONGO_URI = os.getenv("MONGODB_URI_SCAN")
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Global AI model & DB instance
skin_detector = None
ultimate_detector = None
db = None
RECOMMENDATION_SERVICE_URL = os.getenv("RECOMMENDATION_SERVICE_URL")

from app.security import verify_token, has_permission

def get_current_user_id(payload: dict = Depends(verify_token)):
    return payload.get("sub", "unknown_user")



@asynccontextmanager
async def lifespan(app: FastAPI):
    global skin_detector, ultimate_detector, db
    logger.info("Khởi động AI Scan Service...")
    
    # 1. Connect MongoDB
    try:
        client = MongoClient(MONGO_URI)
        db = client.ai_scan_db
        logger.info("MongoDB connected thành công.")
    except Exception as e:
        logger.error(f"MongoDB connection error: {e}")

    # 2. Khởi tạo mô hình AI (Load weight tốn khoảng vài giây)
    try:
        skin_detector = SkinTypeDetector()
        ultimate_detector = UltimateSkinDetector()
        logger.info("AI Model nạp thành công.")
    except Exception as e:
        logger.error(f"Lỗi khi khởi tạo AI: {e}")
        
    # 2. Register to Eureka on startup
    try:
        # Chạy init_async nhưng không await nếu không muốn nó block, 
        # Tuy nhiên py-eureka-client yêu cầu await để hoàn tất đăng ký trước khi nhận request
        await eureka_client.init_async(
            eureka_server=EUREKA_SERVER,
            app_name=APP_NAME,
            instance_port=APP_PORT,
            instance_host="127.0.0.1"
        )
        logger.info("Đã đăng ký với Eureka thành công!")
    except Exception as e:
        logger.error(f"Lỗi Eureka: {e}")
        
    yield
    
    # Unregister from Eureka on shutdown
    try:
        await eureka_client.stop_async()
        logger.info("Đã hủy đăng ký Eureka thành công!")
    except Exception as e:
        logger.error(f"Lỗi khi hủy Eureka: {e}")

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="AI Scan Service", version="1.0.0", lifespan=lifespan)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/scans/analyze", tags=["AI Skin Scan"])
def analyze_skin(request: Request, image: UploadFile = File(...), user_id: str = Depends(get_current_user_id)):
    """
    Nhận file ảnh từ người dùng, chạy các mô hình AI để đánh giá tổng quan tình trạng da, lưu lịch sử quét.
    """
    if skin_detector is None or ultimate_detector is None:
        raise HTTPException(status_code=503, detail="AI Model chưa được nạp sẵn sàng.")
        
    try:
        # Đọc mảng byte của file ảnh gốc
        bytes_data = image.file.read()
        
        # 1. Lưu file ảnh vật lý xuống thư mục uploads/
        file_ext = image.filename.split(".")[-1] if image.filename and "." in image.filename else "jpg"
        unique_filename = f"{uuid.uuid4()}.{file_ext}"
        filepath = os.path.join(UPLOAD_DIR, unique_filename)
        
        with open(filepath, "wb") as f:
            f.write(bytes_data)
            
        base_url = str(request.base_url).rstrip("/")
        image_url = f"{base_url}/uploads/{unique_filename}"
        
        # Áp dụng Face Cropping để cắt rác hậu cảnh trước khi đưa cho các mô hình ResNet50
        cropped_bytes_data = crop_face_from_bytes(bytes_data)
        
        # Gọi mô hình phân loại da (Dùng ảnh đã cắt)
        skin_type = skin_detector.predict(cropped_bytes_data)
        
        # Gọi Siêu AI 7 Lớp phân tích top 3 vấn đề (Dùng ảnh đã cắt)
        ultimate_analysis = ultimate_detector.predict(cropped_bytes_data, top_k=3)
        
        # 3. Lưu lịch sử vào MongoDB (Chỉ lưu kết quả Scan)
        scan_id = str(uuid.uuid4())
        now_utc = datetime.now(timezone.utc)
        
        scan_record = {
            "_id": scan_id,
            "userId": user_id,
            "imageUrl": image_url,
            "skinType": {"predicted": skin_type, "probability": 0.85},
            "facialZones": ultimate_analysis,
            "analyzedAt": now_utc
        }
        
        if db is not None:
            db.ai_scan_results.insert_one(scan_record)
        
        return {
            "status": "success",
            "message": "Phân tích da thành công",
            "scan_result": scan_record
        }

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Lỗi trong quá trình predict: {e}")
        raise HTTPException(status_code=500, detail="Lỗi hệ thống nội bộ")

import base64

@app.post("/api/scans/validate", tags=["AI Skin Scan"])
def validate_skin_image(image: UploadFile = File(...), user_id: str = Depends(get_current_user_id)):
    """
    API Tiền xử lý: Chỉ kiểm định chất lượng ảnh (độ sáng, độ mờ), cắt khuôn mặt và làm sáng ảnh (CLAHE).
    Nếu lỗi sẽ trả về 400. Nếu thành công sẽ trả về ảnh đã xử lý dưới dạng Base64.
    """
    try:
        bytes_data = image.file.read()
        
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
def generate_scan_routine(scan_id: str, background_tasks: BackgroundTasks, user_id: str = Depends(get_current_user_id)):
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
        if "t_zone" in ultimate_analysis and "issues" in ultimate_analysis["t_zone"]:
            flat_conditions.extend(ultimate_analysis["t_zone"]["issues"])
        if "u_zone" in ultimate_analysis and "issues" in ultimate_analysis["u_zone"]:
            flat_conditions.extend(ultimate_analysis["u_zone"]["issues"])
            
        # 3. Tạo Lộ trình
        routine, top_ingredients = generate_routine(skin_type, flat_conditions)
        
        # Lấy tối đa 2 vấn đề nổi cộm làm Focus Areas
        focus_areas = list(set([c["name"] for c in flat_conditions if c.get("name") != "Healthy"]))[:2]
        if not focus_areas: focus_areas = ["Duy trì làn da khỏe mạnh"]
        
        routine_id = str(uuid.uuid4())
        now_utc = datetime.now(timezone.utc)
        
        routine_record = {
            "_id": routine_id,
            "scanId": scan_id,
            "userId": user_id,
            "focusAreas": focus_areas,
            "topIngredients": top_ingredients,
            "routine": routine,
            "generatedAt": now_utc
        }
        
        db.skincare_routines.insert_one(routine_record)
        
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

@app.get("/api/scans/history", tags=["AI Skin Scan"])
def get_scan_history(user_id: str = Depends(get_current_user_id)):
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
        raise HTTPException(status_code=500, detail=str(e))

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
        raise HTTPException(status_code=500, detail=str(e))

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
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/scans/system/endpoints", tags=["System"])
def get_endpoints():
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
