import os
import json
import time
from pymongo import MongoClient
import google.generativeai as genai

# 1. Cấu hình MongoDB
MONGO_URI = 'mongodb+srv://hoannaa2011_db_user:nonoru04@user-service.hil3ccd.mongodb.net/aiskin_product?retryWrites=true&w=majority'
db = MongoClient(MONGO_URI).aiskin_product
products_col = db.products

# 2. Cấu hình Gemini API (BẠN CẦN ĐIỀN API KEY CỦA BẠN VÀO ĐÂY)
GEMINI_API_KEY = "ĐIỀN_API_KEY_CỦA_BẠN_VÀO_ĐÂY"
genai.configure(api_key=GEMINI_API_KEY)

# Dùng model Gemini 1.5 Flash (nhanh và rẻ)
model = genai.GenerativeModel('gemini-1.5-flash')

# 3. Định dạng System Prompt
PROMPT = """
Translate the following product fields to Vietnamese. 
Rules:
1. `name`: Translate to Vietnamese. Do NOT translate proper nouns, brand names, or specific tech/chemical terms (e.g., Vitamin C, Retinol, LANEIGE).
2. `description`: Translate to Vietnamese. Capitalize the first letter of the first word. Keep the brand names and specific terms exactly as they are.
3. `categoryName`: Translate to Vietnamese. Capitalize the first letter of the first word.

Input product data (JSON):
"""

def translate_product(product):
    try:
        # Chuẩn bị dữ liệu gửi đi (chỉ gửi các trường cần dịch để tiết kiệm token)
        data_to_translate = {
            "name": product.get("name", ""),
            "description": product.get("description", ""),
            "categoryName": product.get("categoryName", "")
        }
        
        if not data_to_translate["name"]:
            return None
            
        full_prompt = PROMPT + json.dumps(data_to_translate, ensure_ascii=False)
        
        # Bắt buộc trả về JSON
        response = model.generate_content(
            full_prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
            )
        )
        
        result_json = json.loads(response.text)
        return result_json
        
    except Exception as e:
        print(f"Error translating product {product.get('_id')}: {e}")
        return None

def main():
    if GEMINI_API_KEY == "ĐIỀN_API_KEY_CỦA_BẠN_VÀO_ĐÂY":
        print("LỖI: Bạn chưa điền GEMINI_API_KEY ở dòng 12!")
        return
        
    print("Bắt đầu tiến trình dịch sản phẩm...")
    
    # Chỉ lấy các sản phẩm chưa được dịch
    products = list(products_col.find({"isTranslated": {"$ne": True}}))
    print(f"Tìm thấy {len(products)} sản phẩm cần dịch.")
    
    translated_count = 0
    
    for idx, product in enumerate(products):
        print(f"[{idx+1}/{len(products)}] Đang dịch: {product.get('name')} ...")
        
        translated_data = translate_product(product)
        if translated_data:
            # Ghi đè lại các trường theo yêu cầu
            update_fields = {
                "name": translated_data.get("name", product.get("name")),
                "description": translated_data.get("description", product.get("description")),
                "categoryName": translated_data.get("categoryName", product.get("categoryName")),
                "isTranslated": True # Đánh dấu đã dịch
            }
            
            products_col.update_one(
                {"_id": product["_id"]},
                {"$set": update_fields}
            )
            translated_count += 1
            print(f" -> Thành công!")
        else:
            print(f" -> Thất bại.")
            
        # Nghỉ 2 giây để tránh hit rate limit
        time.sleep(2)
        
    print(f"\nHoàn tất! Đã dịch thành công {translated_count}/{len(products)} sản phẩm.")

if __name__ == "__main__":
    main()
