import json
import time
import google.generativeai as genai
import sys

# Cấu hình Gemini API (BẠN CẦN ĐIỀN API KEY CỦA BẠN VÀO ĐÂY)
GEMINI_API_KEY = "ĐIỀN_API_KEY_CỦA_BẠN_VÀO_ĐÂY"

def translate_dataset(input_file, output_file):
    if GEMINI_API_KEY == "ĐIỀN_API_KEY_CỦA_BẠN_VÀO_ĐÂY":
        print("LỖI: Bạn cần thay GEMINI_API_KEY ở dòng 7 bằng API Key thực tế của bạn!")
        print("Truy cập https://aistudio.google.com/app/apikey để lấy key miễn phí.")
        return

    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')

    PROMPT = """
    Translate the following product fields to Vietnamese. 
    Rules:
    1. `name`: Translate to Vietnamese. Do NOT translate proper nouns, brand names, or specific tech/chemical terms (e.g., Vitamin C, Retinol, LANEIGE).
    2. `description`: Translate to Vietnamese. Capitalize the first letter of the first word. Keep the brand names and specific terms exactly as they are.
    3. `categoryName`: Translate to Vietnamese. Capitalize the first letter of the first word.

    Input product data (JSON):
    """

    print(f"Đang đọc file {input_file}...")
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Không thể đọc file {input_file}: {e}")
        return

    products = data if isinstance(data, list) else [data]
    total = len(products)
    print(f"Tìm thấy {total} sản phẩm.")

    translated_count = 0

    for idx, product in enumerate(products):
        print(f"[{idx+1}/{total}] Đang dịch: {product.get('name', 'Unknown')}")
        
        # Chỉ gửi những trường cần thiết để dịch
        data_to_translate = {
            "name": product.get("name", ""),
            "description": product.get("description", ""),
            "categoryName": product.get("categoryName", "")
        }
        
        if not data_to_translate["name"]:
            continue
            
        full_prompt = PROMPT + json.dumps(data_to_translate, ensure_ascii=False)
        
        try:
            response = model.generate_content(
                full_prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                )
            )
            
            result_json = json.loads(response.text)
            
            # Ghi đè vào object gốc (giữ nguyên brand, ingredients và các id)
            product["name"] = result_json.get("name", product.get("name"))
            product["description"] = result_json.get("description", product.get("description"))
            product["categoryName"] = result_json.get("categoryName", product.get("categoryName"))
            
            translated_count += 1
            print(" -> Thành công")
            
        except Exception as e:
            print(f" -> Lỗi khi dịch: {e}")
            
        # Nghỉ 2 giây tránh hit rate limit
        time.sleep(2)

        # Ghi đè file lưu kết quả theo từng bước (phòng hờ bị ngắt giữa chừng)
        if idx % 10 == 0 or idx == total - 1:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\nHoàn tất! Đã dịch {translated_count}/{total} sản phẩm. File kết quả: {output_file}")

if __name__ == "__main__":
    input_path = r"C:\Users\ADMIN\Documents\FPTG\MSS\SkinGuide\my-doc\data\product_dataset.json"
    output_path = r"C:\Users\ADMIN\Documents\FPTG\MSS\SkinGuide\my-doc\data\product_dataset_vi.json"
    translate_dataset(input_path, output_path)
