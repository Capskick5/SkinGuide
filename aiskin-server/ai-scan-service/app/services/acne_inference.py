import os
import cv2
import numpy as np
import tensorflow as tf
import keras_cv
from tensorflow import keras

# Bản đồ phân loại (Phải giống hệt lúc train)
CLASS_MAPPING = {0: 'Acne'}

class AcneDetector:
    def __init__(self, model_path: str = None):
        """
        Khởi tạo mô hình YOLOv8 và nạp trọng số đã huấn luyện.
        Việc này khá tốn thời gian nên chỉ chạy 1 lần khi Start Server.
        """
        if model_path is None:
            # Tự động trỏ đến file weights trong thư mục models/
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            model_path = os.path.join(base_dir, "models", "yolov8_acne.weights.h5")

        print("Dang khoi tao loi AI YOLOv8...")
        # Bắt buộc phải khai báo lại kiến trúc y hệt lúc huấn luyện
        backbone = keras_cv.models.YOLOV8Backbone.from_preset("yolo_v8_xs_backbone_coco")
        self.model = keras_cv.models.YOLOV8Detector(
            num_classes=len(CLASS_MAPPING),
            bounding_box_format="xyxy",
            backbone=backbone,
            fpn_depth=1
        )
        
        print(f"Dang nap bo nho tu: {model_path}...")
        if os.path.exists(model_path):
            self.model.load_weights(model_path)
            print("Nap bo nho thanh cong!")
        else:
            print(f"[CANH BAO] Khong tim thay file trong so tai {model_path}. Mo hinh se du doan ngau nhien!")

    def predict(self, image_bytes: bytes, confidence_threshold: float = 0.3):
        """
        Nhận mảng byte của ảnh (từ file tải lên), phân tích và trả về tọa độ mụn.
        """
        # 1. Chuyển byte thành ảnh OpenCV
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Không thể đọc định dạng ảnh.")
        
        # 2. Tiền xử lý để AI hiểu được (Phải giống hệt chuẩn KerasCV)
        # KerasCV yêu cầu đầu vào dạng Tensor RGB (OpenCV mặc định đọc BGR)
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # YOLOv8Detector yêu cầu batch (chúng ta gửi 1 ảnh nên thêm số 1 vào đầu)
        # Thay vì jittered resize như lúc train, lúc predict ta tự resize hoặc dùng pad
        # KerasCV YOLO model tự resize nội bộ (nếu input không hợp lệ) hoặc chúng ta phải cấu hình
        # Tốt nhất là resize nó về kích thước chia hết cho 32 (VD: 640x640)
        img_resized = cv2.resize(img_rgb, (640, 640))
        img_tensor = tf.convert_to_tensor(img_resized, dtype=tf.float32)
        input_tensor = tf.expand_dims(img_tensor, axis=0) # Shape: (1, 640, 640, 3)

        # 3. Chạy AI dự đoán
        y_pred = self.model.predict(input_tensor, verbose=0)
        
        # y_pred của KerasCV YoloV8Detector trả về dictionary chứa "boxes", "classes", "confidence"
        boxes = y_pred["boxes"][0]             # Tọa độ bounding box (N, 4)
        confidences = y_pred["confidence"][0]  # Độ tin cậy (N, )
        
        results = []
        
        # Lọc các dự đoán dựa trên ngưỡng (threshold)
        for box, conf in zip(boxes, confidences):
            if conf >= confidence_threshold and conf != -1.0: # KerasCV có thể pad bằng -1.0
                # Cần scale lại tọa độ vì ảnh gốc đã bị bóp về 640x640
                original_h, original_w = img.shape[:2]
                scale_x = original_w / 640.0
                scale_y = original_h / 640.0
                
                xmin, ymin, xmax, ymax = box
                xmin_orig = int(xmin * scale_x)
                ymin_orig = int(ymin * scale_y)
                xmax_orig = int(xmax * scale_x)
                ymax_orig = int(ymax * scale_y)
                
                results.append({
                    "box": [xmin_orig, ymin_orig, xmax_orig, ymax_orig],
                    "confidence": float(conf),
                    "class": "Acne"
                })
        
        return results
