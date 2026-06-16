import sys
if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

import os
import cv2
import numpy as np
from app.services.acne_inference import AcneDetector

def main():
    print("-------------------------------------------------")
    print(" BẮT ĐẦU TEST NHẬN DIỆN MỤN BẰNG YOLOv8")
    print("-------------------------------------------------")
    
    # Khởi tạo AI
    detector = AcneDetector()
    
    # Tìm một tấm ảnh ngẫu nhiên trong tập valid để test
    base_dir = os.path.dirname(os.path.abspath(__file__))
    valid_dir = os.path.join(base_dir, "datasets", "Acne-Dataset", "valid", "images")
    
    if not os.path.exists(valid_dir) or len(os.listdir(valid_dir)) == 0:
        print(f"[LỖI] Không tìm thấy ảnh test trong {valid_dir}")
        return
        
    # Lấy tấm ảnh đầu tiên làm test
    test_img_name = os.listdir(valid_dir)[0]
    test_img_path = os.path.join(valid_dir, test_img_name)
    print(f"Đang phân tích ảnh: {test_img_name}")
    
    # 1. Đọc ảnh thành bytes (giả lập việc App tải file lên qua API)
    with open(test_img_path, "rb") as f:
        img_bytes = f.read()
        
    # 2. Gọi AI phân tích
    # Ngưỡng 0.3 (30%) tin tưởng mới hiển thị
    results = detector.predict(img_bytes, confidence_threshold=0.3)
    
    print(f"-> Phát hiện {len(results)} nốt mụn!")
    for i, r in enumerate(results):
        print(f"   Mụn {i+1}: Tọa độ {r['box']} - Độ tin cậy: {r['confidence']:.2f}")
        
    # 3. Vẽ ô vuông đỏ trực quan hóa lên ảnh để xuất báo cáo
    # Đọc lại ảnh bằng OpenCV để vẽ
    img_draw = cv2.imread(test_img_path)
    
    for r in results:
        xmin, ymin, xmax, ymax = r['box']
        # Vẽ hình chữ nhật màu đỏ (B=0, G=0, R=255), độ dày 2 pixel
        cv2.rectangle(img_draw, (xmin, ymin), (xmax, ymax), (0, 0, 255), 2)
        
        # Ghi độ tin cậy phía trên nốt mụn
        text = f"{r['confidence']*100:.0f}%"
        cv2.putText(img_draw, text, (xmin, ymin - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)
        
    # 4. Lưu ảnh kết quả
    output_path = os.path.join(base_dir, "test_result.jpg")
    cv2.imwrite(output_path, img_draw)
    print("-------------------------------------------------")
    print(f"HOÀN TẤT! Đã lưu ảnh kết quả có vẽ khung mụn tại: {output_path}")
    print("Hãy mở file test_result.jpg để xem sự 'thần kỳ' của AI nhé!")

if __name__ == "__main__":
    main()
