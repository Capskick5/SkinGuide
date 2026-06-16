from fastapi import FastAPI, UploadFile, File, HTTPException, Form
import py_eureka_client.eureka_client as eureka_client
from contextlib import asynccontextmanager
from app.services.acne_inference import AcneDetector
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Eureka configuration
EUREKA_SERVER = "http://localhost:8761/eureka"
APP_NAME = "ai-scan-service"
APP_PORT = 5001

# Global AI model instance
acne_detector = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global acne_detector
    logger.info("Khởi động AI Scan Service...")
    
    # 1. Khởi tạo mô hình AI (Load weight tốn khoảng vài giây)
    try:
        acne_detector = AcneDetector()
        logger.info("AI Model nạp thành công.")
    except Exception as e:
        logger.error(f"Lỗi khi khởi tạo AI: {e}")
        
    # 2. Register to Eureka on startup
    # [TẠM TẮT] Tránh lỗi treo/sập Server nếu bạn chưa bật Server Eureka (Java Spring Boot)
    # try:
    #     await eureka_client.init_async(
    #         eureka_server=EUREKA_SERVER,
    #         app_name=APP_NAME,
    #         instance_port=APP_PORT,
    #         instance_host="127.0.0.1"
    #     )
    #     logger.info("Đã đăng ký với Eureka thành công!")
    # except Exception as e:
    #     logger.error(f"Lỗi Eureka: {e}")
        
    yield
    
    # Unregister from Eureka on shutdown
    try:
        await eureka_client.stop_async()
        logger.info("Đã hủy đăng ký Eureka thành công!")
    except Exception as e:
        logger.error(f"Lỗi khi hủy Eureka: {e}")

app = FastAPI(title="AI Scan Service", version="1.0.0", lifespan=lifespan)

@app.get("/api/scans/health")
async def health_check():
    return {"status": "ok", "message": "ai-scan-service is running", "ai_loaded": acne_detector is not None}

from fastapi.responses import Response
import cv2
import numpy as np

@app.post("/api/scans/analyze")
def analyze_acne(image: UploadFile = File(...), visualize: bool = Form(False)):
    """
    Nhận file ảnh từ người dùng, chạy AI YOLOv8 nhận diện mụn.
    - visualize=False (Mặc định): Trả về JSON tọa độ (Dành cho App).
    - visualize=True: Trả về trực tiếp bức ảnh đã vẽ khung đỏ (Dành cho Test/Báo cáo).
    """
    if acne_detector is None:
        raise HTTPException(status_code=503, detail="AI Model chưa được nạp sẵn sàng.")
        
    try:
        # Đọc mảng byte của file ảnh
        bytes_data = image.file.read()
        
        # Gọi mô hình nhận diện (Hạ mức tin cậy xuống 0.05 để xem các dự đoán yếu của mô hình 2 epochs)
        results = acne_detector.predict(bytes_data, confidence_threshold=0.05)
        
        if not visualize:
            return {
                "status": "success",
                "message": "Phân tích mụn thành công",
                "acne_count": len(results),
                "data": results
            }
        else:
            # Chế độ trực quan: Vẽ khung lên ảnh và trả về file ảnh
            np_arr = np.frombuffer(bytes_data, np.uint8)
            img_draw = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            
            for r in results:
                xmin, ymin, xmax, ymax = r['box']
                cv2.rectangle(img_draw, (xmin, ymin), (xmax, ymax), (0, 0, 255), 2)
                text = f"{r['confidence']*100:.0f}%"
                cv2.putText(img_draw, text, (xmin, ymin - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)
                
            _, encoded_img = cv2.imencode('.jpg', img_draw)
            return Response(content=encoded_img.tobytes(), media_type="image/jpeg")

    except Exception as e:
        logger.error(f"Lỗi trong quá trình predict: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=APP_PORT, reload=False)
