import json
import time

try:
    from deep_translator import GoogleTranslator
except ImportError:
    print("Vui lòng cài đặt thư viện trước bằng lệnh: pip install deep-translator")
    exit()

def capitalize_first(text):
    if not text:
        return text
    text = text.strip()
    return text[0].upper() + text[1:] if len(text) > 0 else text

def translate_dataset(input_file, output_file):
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

    translator = GoogleTranslator(source='en', target='vi')
    translated_count = 0

    for idx, product in enumerate(products):
        print(f"[{idx+1}/{total}] Đang dịch: {product.get('name', 'Unknown')}")
        
        try:
            # 1. Dịch Tên sản phẩm (name)
            original_name = product.get("name", "")
            if original_name:
                translated_name = translator.translate(original_name)
                product["name"] = translated_name

            # 2. Dịch Mô tả (description) và viết hoa chữ cái đầu
            original_desc = product.get("description", "")
            if original_desc:
                translated_desc = translator.translate(original_desc)
                product["description"] = capitalize_first(translated_desc)

            # 3. Dịch Danh mục (categoryName) và viết hoa chữ cái đầu
            original_cat = product.get("categoryName", "")
            if original_cat:
                translated_cat = translator.translate(original_cat)
                product["categoryName"] = capitalize_first(translated_cat)

            # Quy tắc 4 & 5: brandName và ingredients KHÔNG ĐƯỢC DỊCH
            # (Chúng ta không truyền các trường này vào hàm translate nên chúng sẽ được giữ nguyên)

            translated_count += 1
            print(" -> Thành công")
            
        except Exception as e:
            print(f" -> Lỗi khi dịch: {e}")
            
        # Nghỉ 0.5 giây để tránh bị Google chặn do gọi quá nhiều
        time.sleep(0.5)

        # Ghi đè file lưu kết quả sau mỗi 20 sản phẩm
        if idx % 20 == 0 or idx == total - 1:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\nHoàn tất! Đã dịch {translated_count}/{total} sản phẩm. File kết quả: {output_file}")

if __name__ == "__main__":
    input_path = r"C:\Users\ADMIN\Documents\FPTG\MSS\SkinGuide\my-doc\data\product_dataset.json"
    output_path = r"C:\Users\ADMIN\Documents\FPTG\MSS\SkinGuide\my-doc\data\product_dataset_vi.json"
    translate_dataset(input_path, output_path)
