import os
import json
import time
from pymongo import MongoClient
import google.generativeai as genai

model = None
products_col = None


def required_env(name):
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value

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
    global model, products_col

    mongo_uri = required_env('MONGODB_URI_PRODUCT')
    gemini_api_key = required_env('GEMINI_API_KEY')
    genai.configure(api_key=gemini_api_key)
    model = genai.GenerativeModel('gemini-1.5-flash')

    client = MongoClient(mongo_uri)
    try:
        products_col = client.get_default_database('aiskin_product').products
        print("Bắt đầu tiến trình dịch sản phẩm...")

        # Chỉ lấy các sản phẩm chưa được dịch
        products = list(products_col.find({"isTranslated": {"$ne": True}}))
        print(f"Tìm thấy {len(products)} sản phẩm cần dịch.")

        translated_count = 0
        for idx, product in enumerate(products):
            print(f"[{idx + 1}/{len(products)}] Đang dịch: {product.get('name')} ...")

            translated_data = translate_product(product)
            if translated_data:
                update_fields = {
                    "name": translated_data.get("name", product.get("name")),
                    "description": translated_data.get("description", product.get("description")),
                    "categoryName": translated_data.get("categoryName", product.get("categoryName")),
                    "isTranslated": True,
                }
                products_col.update_one(
                    {"_id": product["_id"]},
                    {"$set": update_fields},
                )
                translated_count += 1
                print(" -> Thành công!")
            else:
                print(" -> Thất bại.")

            # Nghỉ 2 giây để tránh hit rate limit
            time.sleep(2)

        print(f"\nHoàn tất! Đã dịch thành công {translated_count}/{len(products)} sản phẩm.")
    finally:
        client.close()

if __name__ == "__main__":
    main()
