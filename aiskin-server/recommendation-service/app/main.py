import logging
import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pymongo import ASCENDING, DESCENDING, MongoClient
from pymongo.errors import DuplicateKeyError

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", ".env"))

from .chat_service import ChatRateLimiter, GroqChatService
from .kafka_consumer import ProductKafkaConsumer
from .security import get_current_user_id
from .similarity_engine import RecommendationEngine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
APP_NAME = "recommendation-service"
APP_PORT = 5001
MONGO_URI = os.getenv("MONGODB_URI_RECOMMENDATION")
RECOMMENDATION_SCHEMA_VERSION = 2
ROUTINE_RECORD_TYPE = "routine"
ALLOWED_ORIGINS = [origin.strip() for origin in os.getenv(
    "RECOMMENDATION_ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174",
).split(",") if origin.strip()]

# Global variables
engine = None
db = None
mongo_client = None
kafka_consumer_task = None
chat_service = GroqChatService()
chat_rate_limiter = ChatRateLimiter()

STEP_TO_LABEL = {
    "makeup_remover": "Cleanser",
    "cleanser": "Cleanser",
    "toner": "Toner",
    "exfoliant": "Treatment",
    "serum": "Treatment",
    "treatment": "Treatment",
    "moisturizer": "Moisturizer",
    "sunscreen": "Sun protect",
}


def _routine_recommendation_filter(routine_id: str, user_id: str) -> dict:
    return {
        "routineId": routine_id,
        "userId": user_id,
        "recordType": ROUTINE_RECORD_TYPE,
        "schemaVersion": RECOMMENDATION_SCHEMA_VERSION,
    }


def _ensure_database_indexes(database) -> None:
    database.product_recommendations.create_index(
        [("routineId", ASCENDING), ("userId", ASCENDING)],
        name="routine_recommendation_lookup",
    )
    database.product_recommendations.create_index(
        [("userId", ASCENDING), ("createdAt", DESCENDING)],
        name="user_recommendation_history",
    )
    # Keep legacy records untouched while making all v2 routine writes idempotent.
    database.product_recommendations.create_index(
        [("routineId", ASCENDING), ("userId", ASCENDING)],
        name="unique_v2_recommendation_per_routine",
        unique=True,
        partialFilterExpression={
            "recordType": ROUTINE_RECORD_TYPE,
            "schemaVersion": RECOMMENDATION_SCHEMA_VERSION,
        },
    )


def _clean_product(record: dict, include_skin_compatibility: bool = False) -> dict:
    clean = {
        "id": record.get("id"),
        "slug": record.get("slug"),
        "imageUrl": record.get("imageUrl"),
        "brand": record.get("brand"),
        "name": record.get("name"),
        "price": record.get("price"),
        "variantId": record.get("variantId"),
        "variantName": record.get("variantName"),
        "sku": record.get("sku"),
        "volume": record.get("volume"),
        "unit": record.get("unit"),
        "availableQuantity": record.get("availableQuantity"),
        "ingredients": record.get("ingredients"),
        "matchedIngredients": record.get("matchedIngredients", []),
        "matchReasons": record.get("matchReasons", []),
        "evidenceLevel": record.get("evidenceLevel", "category_fallback"),
        "match_score": round(float(record.get("match_score", 0)), 4)
        if "match_score" in record
        else None,
    }
    if include_skin_compatibility:
        clean["rank"] = record.get("rank")
        clean["skin_compatibility"] = {
            "combination": record.get("combination") == 1,
            "dry": record.get("dry") == 1,
            "normal": record.get("normal") == 1,
            "oily": record.get("oily") == 1,
            "sensitive": record.get("sensitive") == 1,
        }
    return clean


def _build_routine_recommendations(routine_record: dict, skin_type: str) -> list:
    routine_data = routine_record.get("routine", {})
    if isinstance(routine_data, dict):
        all_steps = [
            *(routine_data.get("morning") or []),
            *(routine_data.get("evening") or []),
        ]
    elif isinstance(routine_data, list):
        all_steps = routine_data
    else:
        all_steps = []

    recommendations = []
    seen_step_codes = set()
    for step in all_steps:
        if not isinstance(step, dict):
            continue
        step_code = str(step.get("step") or "").strip().lower()
        if not step_code or step_code in seen_step_codes:
            continue
        seen_step_codes.add(step_code)

        display_name = str(step.get("name") or step_code).strip()
        product_label = STEP_TO_LABEL.get(step_code)
        target_ingredients = step.get("recommended_ingredients") or []
        products = []
        if product_label:
            products = engine.recommend(
                product_label=product_label,
                skin_type=skin_type,
                target_ingredients=target_ingredients,
                top_k=3,
            )
        else:
            logger.warning("No product category mapping for routine step: %s", step_code)

        recommendations.append({
            "stepCode": step_code,
            "step": display_name,
            "productCategory": product_label,
            "products": [_clean_product(product) for product in products],
        })
    return recommendations

@asynccontextmanager
async def lifespan(app: FastAPI):
    global engine, db, mongo_client, kafka_consumer_task
    logger.info("Khởi động Recommendation Service...")
    db_products = []
    
    # 0. Kết nối MongoDB
    try:
        if not MONGO_URI:
            raise RuntimeError("MONGODB_URI_RECOMMENDATION is required")
        mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        mongo_client.admin.command("ping")
        db = mongo_client.ai_scan_db
        _ensure_database_indexes(db)
        logger.info("MongoDB connected thành công.")
    except Exception as e:
        db = None
        if mongo_client is not None:
            mongo_client.close()
            mongo_client = None
        logger.error(f"MongoDB connection error: {e}")

    # 1. Khởi tạo Hybrid Recommendation Engine
    try:
        engine = RecommendationEngine(None)
        # Nạp tức thì (Zero-latency) dữ liệu thật từ MongoDB của Product-Service
        try:
            if mongo_client is None:
                raise RuntimeError("MongoDB client is not available")
            prod_db = mongo_client.aiskin_product
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
        
    yield
    
    # Hủy đăng ký khi tắt app
    if kafka_consumer_task:
        await kafka_consumer_task.stop()
        
    if mongo_client is not None:
        mongo_client.close()
        mongo_client = None
        db = None

app = FastAPI(title="Recommendation Service", version="1.0.0", lifespan=lifespan)

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
            
        recommendation_filter = _routine_recommendation_filter(routine_id, user_id)
        existing_recs = db.product_recommendations.find_one(recommendation_filter)
        if existing_recs:
            return {
                "status": "success",
                "message": "Lấy dữ liệu gợi ý mỹ phẩm cũ thành công",
                "data": existing_recs.get("recommendations", [])
            }
            
        scan_id = routine_record.get("scanId")
        scan_record = db.ai_scan_results.find_one({"_id": scan_id, "userId": user_id})
        skin_type = "Normal"
        if scan_record:
            skin_type = scan_record.get("skinType", {}).get("predicted", "Normal")
            
        recommendations_list = _build_routine_recommendations(routine_record, skin_type)
            
        # Lưu vào Collection product_recommendations
        record_id = str(uuid.uuid4())
        record = {
            "_id": record_id,
            **recommendation_filter,
            "scanId": scan_id,
            "recommendations": recommendations_list,
            "createdAt": datetime.now(timezone.utc)
        }
        try:
            db.product_recommendations.insert_one(record)
        except DuplicateKeyError:
            winner = db.product_recommendations.find_one(recommendation_filter)
            if winner:
                recommendations_list = winner.get("recommendations", [])
            else:
                raise
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
    top_k: int = Field(default=5, ge=1, le=20)
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

        record = db.product_recommendations.find_one(
            _routine_recommendation_filter(routine_id, user_id)
        )
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
        
        clean_results = [
            _clean_product(result, include_skin_compatibility=True)
            for result in results
        ]
            
        # Lưu kết quả xuống Database nếu có routine_id
        if req.routine_id and db is not None:
            record_id = str(uuid.uuid4())
            now_utc = datetime.now(timezone.utc)
            record = {
                "_id": record_id,
                "recordType": "adhoc",
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
    catalog_size = 0 if engine is None or engine.df is None else len(engine.df)
    database_ready = db is not None
    engine_ready = engine is not None and catalog_size > 0
    return {
        "status": "UP" if database_ready and engine_ready else "DOWN",
        "service": APP_NAME,
        "database": "UP" if database_ready else "DOWN",
        "catalogSize": catalog_size,
        "chatbotConfigured": chat_service.available,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=APP_PORT, reload=False)
