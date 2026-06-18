from fastapi import FastAPI, UploadFile, File, HTTPException
import py_eureka_client.eureka_client as eureka_client
from contextlib import asynccontextmanager
from app.services.skin_type_inference import SkinTypeDetector
from app.services.ultimate_skin_inference import UltimateSkinDetector
from app.utils.face_cropper import crop_face_from_bytes
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Eureka configuration
EUREKA_SERVER = "http://localhost:8761/eureka"
APP_NAME = "ai-scan-service"
APP_PORT = 5000

# Global AI model instance
skin_detector = None
ultimate_detector = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global skin_detector, ultimate_detector
    logger.info("Khởi động AI Scan Service...")
    
    # 1. Khởi tạo mô hình AI (Load weight tốn khoảng vài giây)
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/scans/health")
async def health_check():
    return {"status": "ok", "message": "ai-scan-service is running", "ai_loaded": skin_detector is not None and ultimate_detector is not None}

@app.post("/api/scans/analyze", tags=["AI Skin Scan"])
def analyze_skin(image: UploadFile = File(...)):
    """
    Nhận file ảnh từ người dùng, chạy các mô hình AI để đánh giá tổng quan tình trạng da.
    """
    if skin_detector is None or ultimate_detector is None:
        raise HTTPException(status_code=503, detail="AI Model chưa được nạp sẵn sàng.")
        
    try:
        # Đọc mảng byte của file ảnh gốc
        bytes_data = image.file.read()
        
        # Áp dụng Face Cropping để cắt rác hậu cảnh trước khi đưa cho các mô hình ResNet50
        cropped_bytes_data = crop_face_from_bytes(bytes_data)
        
        # Gọi mô hình phân loại da (Dùng ảnh đã cắt)
        skin_type = skin_detector.predict(cropped_bytes_data)
        
        # Gọi Siêu AI 7 Lớp phân tích top 3 vấn đề (Dùng ảnh đã cắt)
        ultimate_analysis = ultimate_detector.predict(cropped_bytes_data, top_k=3)
        
        return {
            "status": "success",
            "message": "Phân tích thành công",
            "skin_type": skin_type,
            "ultimate_analysis": ultimate_analysis
        }

    except Exception as e:
        logger.error(f"Lỗi trong quá trình predict: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=APP_PORT, reload=False)
