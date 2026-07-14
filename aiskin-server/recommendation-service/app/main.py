from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
import py_eureka_client.eureka_client as eureka_client
import logging
import asyncio
import json
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", ".env"))
import uuid
from datetime import datetime, timezone
from pymongo import MongoClient
import aiohttp
from .similarity_engine import RecommendationEngine
from .kafka_consumer import ProductKafkaConsumer
from .chat_service import ChatRateLimiter, GroqChatService
from .security import get_current_user_id

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
EUREKA_SERVER = os.getenv("EUREKA_URI")
APP_NAME = "recommendation-service"
APP_PORT = 5001
DATASET_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "datasets", "cosmetics.csv")
MONGO_URI = os.getenv("MONGODB_URI_RECOMMENDATION")
ALLOWED_ORIGINS = [origin.strip() for origin in os.getenv(
    "RECOMMENDATION_ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174",
).split(",") if origin.strip()]

# Global variables
engine = None
db = None
kafka_consumer_task = None
chat_service = GroqChatService()
chat_rate_limiter = ChatRateLimiter()

STEP_TO_LABEL = {
    "Tẩy trang": "Cleanser",
    "Sữa rửa mặt": "Cleanser",
    "Toner": "Toner",
    "Tẩy tế bào chết": "Treatment",
    "Serum": "Treatment",
    "Mặt nạ": "Face Mask",
    "Kem mắt": "Eye cream",
    "Kem dưỡng ẩm": "Moisturizer",
    "Kem chống nắng": "Sun protect"
}

@asynccontextmanager
async def lifespan(app: FastAPI):
    global engine, db, kafka_consumer_task
    logger.info("Khởi động Recommendation Service...")
    client = None
    db_products = []
    
    # 0. Kết nối MongoDB
    try:
        if not MONGO_URI:
            raise RuntimeError("MONGODB_URI_RECOMMENDATION is required")
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        client.admin.command("ping")
        db = client.ai_scan_db
        logger.info("MongoDB connected thành công.")
    except Exception as e:
        logger.error(f"MongoDB connection error: {e}")

    # 1. Khởi tạo Hybrid Recommendation Engine
    try:
        engine = RecommendationEngine(DATASET_PATH)
        # Nạp tức thì (Zero-latency) dữ liệu thật từ MongoDB của Product-Service
        try:
            if client is None:
                raise RuntimeError("MongoDB client is not available")
            prod_db = client.aiskin_product
            db_products = list(prod_db.products.find())
            if db_products:
                engine.update_data(db_products)
                logger.info(f"Đã nạp nhanh {len(db_products)} sản phẩm gốc từ MongoDB vào AI Engine.")
        except Exception as e:
            logger.error(f"Lỗi khi nạp nhanh từ MongoDB: {e}")
            
    except Exception as e:
        logger.error(f"Lỗi khi nạp Dataset: {e}")
        
    # 1.5 Khởi động Kafka Consumer (chỉ để nhận sự kiện Cập nhật/Thêm mới realtime)
    try:
        kafka_consumer_task = ProductKafkaConsumer(engine, db_products)
        await kafka_consumer_task.start()
        logger.info("Kafka Consumer đã sẵn sàng lắng nghe realtime events.")
    except Exception as e:
        logger.error(f"Lỗi khi khởi động Kafka Consumer: {e}")

    # 2. Đăng ký với Eureka Server
    try:
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
    
    # Hủy đăng ký khi tắt app
    if kafka_consumer_task:
        await kafka_consumer_task.stop()
        
    try:
        await eureka_client.stop_async()
        logger.info("Đã hủy đăng ký Eureka thành công!")
    except Exception as e:
        logger.error(f"Lỗi khi hủy Eureka: {e}")

app = FastAPI(title="Recommendation Service", version="1.0.0", lifespan=lifespan)

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/v1/recommend/routine/{routine_id}", tags=["Recommendations"])
def generate_routine_recommendation(
    routine_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """
    Sinh danh sách gợi ý sản phẩm cho toàn bộ Lộ trình chăm sóc da.
    Kết quả sẽ được lưu vào DB và trả về ngay lập tức (Synchronous).
    """
    if db is None or engine is None:
        raise HTTPException(status_code=503, detail="DB hoặc Engine chưa sẵn sàng!")
        
    try:
        # Lấy lộ trình từ MongoDB
        routine_record = db.skincare_routines.find_one({"_id": routine_id, "userId": user_id})
        if not routine_record:
            raise HTTPException(status_code=404, detail=f"Không tìm thấy routine_id {routine_id} trong DB")
            
        # Kiểm tra xem đã có gợi ý chưa, nếu có rồi thì trả về luôn không cần phân tích lại
        existing_recs = db.product_recommendations.find_one({"routineId": routine_id, "userId": user_id})
        if existing_recs:
            return {
                "status": "success",
                "message": "Lấy dữ liệu gợi ý mỹ phẩm cũ thành công",
                "data": existing_recs.get("recommendations", [])
            }
            
        scan_id = routine_record.get("scanId")
        scan_record = db.ai_scan_results.find_one({"_id": scan_id})
        skin_type = "Normal"
        if scan_record:
            skin_type = scan_record.get("skinType", {}).get("predicted", "Normal")
            
        recommendations_list = []
        
        routine_data = routine_record.get("routine", {})
        all_steps = []
        if isinstance(routine_data, dict):
            all_steps.extend(routine_data.get("morning", []))
            all_steps.extend(routine_data.get("evening", []))
        elif isinstance(routine_data, list):
            all_steps = routine_data
            
        for step in all_steps:
            vi_step = step.get("name", "")
            en_label = STEP_TO_LABEL.get(vi_step, "")
            ingredients = step.get("recommended_ingredients", [])
            
            # Gọi Engine Hybrid tìm Top 3 sản phẩm phù hợp nhất
            recs = engine.recommend(
                product_label=en_label,
                skin_type=skin_type,
                target_ingredients=ingredients,
                top_k=3
            )
            
            # Làm sạch dữ liệu recs
            clean_recs = []
            for r in recs:
                clean_recs.append({
                    "id": r.get("id"),
                    "slug": r.get("slug"),
                    "imageUrl": r.get("imageUrl"),
                    "brand": r.get("brand"),
                    "name": r.get("name"),
                    "price": r.get("price"),
                    "variantId": r.get("variantId"),
                    "variantName": r.get("variantName"),
                    "sku": r.get("sku"),
                    "volume": r.get("volume"),
                    "unit": r.get("unit"),
                    "availableQuantity": r.get("availableQuantity"),
                    "ingredients": r.get("ingredients"),
                    "match_score": round(r.get("match_score", 0), 4) if "match_score" in r else None
                })
                
            recommendations_list.append({
                "step": vi_step,
                "products": clean_recs
            })
            
        # Lưu vào Collection product_recommendations
        record_id = str(uuid.uuid4())
        record = {
            "_id": record_id,
            "routineId": routine_id,
            "userId": user_id,
            "scanId": scan_id,
            "recommendations": recommendations_list,
            "createdAt": datetime.now(timezone.utc)
        }
        db.product_recommendations.insert_one(record)
        logger.info(f"Đã lưu thành công danh sách Recommend cho routine_id {routine_id} vào DB!")
        
        return {
            "status": "success",
            "message": "Tạo gợi ý mỹ phẩm thành công",
            "data": recommendations_list
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Lỗi khi tạo Recommendation cho routine {routine_id}: {e}")
        raise HTTPException(status_code=500, detail="Lỗi hệ thống nội bộ")



class RecommendRequest(BaseModel):
    product_label: str  # Ví dụ: 'Cleanser', 'Moisturizer'
    skin_type: str      # Ví dụ: 'Oily', 'Dry', 'Sensitive'
    target_ingredients: List[str] # Ví dụ: ["Salicylic Acid", "Niacinamide"]
    top_k: int = 5
    routine_id: Optional[str] = None  # ID của Lộ trình (nếu có)


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = Field(default_factory=list)

@app.get("/api/v1/recommend/routine/{routine_id}", tags=["Recommendations"])
def get_routine_recommendations(
    routine_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """
    Lấy danh sách gợi ý mỹ phẩm đã tạo của một lộ trình
    """
    if db is None:
        raise HTTPException(status_code=503, detail="Database chưa sẵn sàng")
        
    try:
        routine_record = db.skincare_routines.find_one({"_id": routine_id, "userId": user_id}, {"_id": 1})
        if not routine_record:
            raise HTTPException(status_code=404, detail="Không tìm thấy lộ trình hoặc bạn không có quyền truy cập")

        record = db.product_recommendations.find_one({"routineId": routine_id, "userId": user_id})
        if not record:
            return {
                "status": "success",
                "message": "Chưa có gợi ý",
                "data": []
            }
            
        return {
            "status": "success",
            "message": "Lấy dữ liệu thành công",
            "data": record.get("recommendations", [])
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Lỗi khi lấy recommendations: {e}")
        raise HTTPException(status_code=500, detail="Lỗi hệ thống nội bộ")

@app.post("/api/v1/recommend", tags=["Recommendations"])
def get_recommendations(
    req: RecommendRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    Tìm kiếm sản phẩm phù hợp nhất dựa trên Loại da, Loại sản phẩm và Thành phần chỉ định.
    Thuật toán: Hybrid (Rule-based Filtering + TF-IDF Vectorization)
    """
    if engine is None:
        raise HTTPException(status_code=503, detail="Recommendation Engine chưa sẵn sàng.")
        
    try:
        if req.routine_id and db is not None:
            owned_routine = db.skincare_routines.find_one(
                {"_id": req.routine_id, "userId": user_id},
                {"_id": 1},
            )
            if not owned_routine:
                raise HTTPException(status_code=404, detail="Không tìm thấy lộ trình hoặc bạn không có quyền truy cập")

        results = engine.recommend(
            product_label=req.product_label,
            skin_type=req.skin_type,
            target_ingredients=req.target_ingredients,
            top_k=req.top_k
        )
        
        # Làm sạch dữ liệu trước khi trả về (chỉ giữ lại các field quan trọng)
        clean_results = []
        for r in results:
            clean_results.append({
                "id": r.get("id"),
                "slug": r.get("slug"),
                "imageUrl": r.get("imageUrl"),
                "brand": r.get("brand"),
                "name": r.get("name"),
                "price": r.get("price"),
                "variantId": r.get("variantId"),
                "variantName": r.get("variantName"),
                "sku": r.get("sku"),
                "volume": r.get("volume"),
                "unit": r.get("unit"),
                "availableQuantity": r.get("availableQuantity"),
                "rank": r.get("rank"),
                "ingredients": r.get("ingredients"),
                "match_score": round(r.get("match_score", 0), 4) if "match_score" in r else None,
                "skin_compatibility": {
                    "combination": r.get("combination") == 1,
                    "dry": r.get("dry") == 1,
                    "normal": r.get("normal") == 1,
                    "oily": r.get("oily") == 1,
                    "sensitive": r.get("sensitive") == 1
                }
            })
            
        # Lưu kết quả xuống Database nếu có routine_id
        if req.routine_id and db is not None:
            record_id = str(uuid.uuid4())
            now_utc = datetime.now(timezone.utc)
            record = {
                "_id": record_id,
                "routineId": req.routine_id,
                "userId": user_id,
                "productCategory": req.product_label,
                "targetIngredients": req.target_ingredients,
                "recommendedProducts": clean_results,
                "createdAt": now_utc
            }
            db.product_recommendations.insert_one(record)
            
        return {
            "status": "success",
            "message": "Đã tìm thấy sản phẩm phù hợp",
            "count": len(clean_results),
            "data": clean_results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Lỗi khi xử lý Recommend: {e}")
        raise HTTPException(status_code=500, detail="Lỗi hệ thống nội bộ")


@app.post("/api/v1/recommend/chat", tags=["Chatbot"])
async def chat_with_skincare_assistant(
    req: ChatRequest,
    user_id: str = Depends(get_current_user_id),
):
    message = req.message.strip()
    if not message or len(message) > 1000:
        raise HTTPException(status_code=400, detail="Câu hỏi phải có từ 1 đến 1000 ký tự")
    if len(req.history) > 10:
        raise HTTPException(status_code=400, detail="Lịch sử trò chuyện vượt quá 10 tin nhắn")
    if not chat_rate_limiter.allow(user_id):
        raise HTTPException(status_code=429, detail="Bạn gửi quá nhiều câu hỏi. Vui lòng thử lại sau một phút")
    if not chat_service.available:
        raise HTTPException(status_code=503, detail="Chatbot chưa được cấu hình trên máy chủ")

    try:
        history = [{"role": item.role, "content": item.content} for item in req.history]
        content = await chat_service.answer(history, message, engine)
        return {"status": "success", "data": {"content": content}}
    except Exception as exc:
        logger.error("Chatbot request failed: %s", exc)
        raise HTTPException(status_code=502, detail="Không thể kết nối trợ lý AI lúc này") from exc

@app.get("/health", tags=["System"])
def health_check():
    return {"status": "UP", "service": "recommendation-service"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=APP_PORT, reload=False)
