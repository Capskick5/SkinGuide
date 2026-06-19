import os
import uuid
import jwt
from datetime import datetime, timezone
from pymongo import MongoClient
from fastapi import FastAPI, UploadFile, File, HTTPException, Request, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import py_eureka_client.eureka_client as eureka_client
from contextlib import asynccontextmanager
from app.services.skin_type_inference import SkinTypeDetector
from app.services.ultimate_skin_inference import UltimateSkinDetector
from app.utils.face_cropper import crop_face_from_bytes
from app.formulas.routine_builder import generate_routine
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
EUREKA_SERVER = "http://localhost:8761/eureka"
APP_NAME = "ai-scan-service"
APP_PORT = 5000
MONGO_URI = "mongodb+srv://hoannaa2011_db_user:nonoru04@user-service.hil3ccd.mongodb.net/ai_scan_db?retryWrites=true&w=majority"
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Global AI model & DB instance
skin_detector = None
ultimate_detector = None
db = None

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

@app.post("/api/scans/analyze", tags=["AI Skin Scan"], dependencies=[Depends(has_permission("/api/scans/analyze", "POST"))])
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
        
        # 3. Tạo Lộ trình chuyên sâu (Rule-based Formula Engine)
        routine, top_ingredients = generate_routine(skin_type, ultimate_analysis)
        
        # 4. Lưu lịch sử vào MongoDB
        if db is not None:
            scan_record = {
                "userId": user_id,
                "imageUrl": image_url,
                "skinType": skin_type,
                "ultimateAnalysis": ultimate_analysis,
                "recommendedRoutine": routine,
                "topIngredients": top_ingredients,
                "createdAt": datetime.now(timezone.utc)
            }
            db.scan_histories.insert_one(scan_record)
        
        return {
            "status": "success",
            "message": "Phân tích thành công",
            "skin_type": skin_type,
            "ultimate_analysis": ultimate_analysis,
            "image_url": image_url,
            "recommended_routine": routine,
            "top_ingredients": top_ingredients
        }

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Lỗi trong quá trình predict: {e}")
        raise HTTPException(status_code=500, detail="Lỗi hệ thống nội bộ")

@app.get("/api/scans/history", tags=["AI Skin Scan"], dependencies=[Depends(has_permission("/api/scans/history", "GET"))])
def get_scan_history(user_id: str = Depends(get_current_user_id)):
    """
    Lấy danh sách lịch sử quét da của user hiện tại.
    """
    if db is None:
        raise HTTPException(status_code=503, detail="Database chưa được kết nối.")
        
    try:
        cursor = db.scan_histories.find({"userId": user_id}).sort("createdAt", -1).limit(50)
        histories = []
        for record in cursor:
            record["_id"] = str(record["_id"])
            # PyMongo trả về datetime dạng Naive (nhưng thực tế là giờ UTC)
            # Cần gắn thêm tzinfo để FastAPI trả về chuỗi ISO có đuôi 'Z', từ đó Frontend dịch ra GMT+7 đúng
            if "createdAt" in record and isinstance(record["createdAt"], datetime):
                record["createdAt"] = record["createdAt"].replace(tzinfo=timezone.utc)
            histories.append(record)
            
        return {
            "status": "success",
            "data": histories
        }
    except Exception as e:
        logger.error(f"Lỗi khi lấy lịch sử quét: {e}")
        raise HTTPException(status_code=500, detail=str(e))

from bson.objectid import ObjectId

@app.delete("/api/scans/history/{scan_id}", tags=["AI Skin Scan"], dependencies=[Depends(has_permission("/api/scans/history/{scan_id}", "DELETE"))])
def delete_scan_history(scan_id: str, user_id: str = Depends(get_current_user_id)):
    """
    Xóa 1 bản quét lịch sử của user hiện tại.
    """
    if db is None:
        raise HTTPException(status_code=503, detail="Database chưa được kết nối.")
        
    try:
        if not ObjectId.is_valid(scan_id):
            raise HTTPException(status_code=400, detail="ID bản quét không hợp lệ.")
            
        record = db.scan_histories.find_one({"_id": ObjectId(scan_id)})
        if not record:
            raise HTTPException(status_code=404, detail="Không tìm thấy bản quét.")
            
        if record.get("userId") != user_id:
            raise HTTPException(status_code=403, detail="Bạn không có quyền xóa bản quét này.")
            
        db.scan_histories.delete_one({"_id": ObjectId(scan_id)})
        
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
