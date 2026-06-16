import sys
if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

import os
import cv2
import numpy as np
import tensorflow as tf
import keras_cv
from tensorflow import keras

# ==========================================
# CẤU HÌNH ĐƯỜNG DẪN DỮ LIỆU & TRAINING
# ==========================================
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "datasets", "Acne-Dataset")
BATCH_SIZE = 4 # Tùy chỉnh tùy lượng RAM/VRAM
AUTO = tf.data.AUTOTUNE
CLASS_MAPPING = {0: 'Acne'}

# ==========================================
# 1. TIỀN XỬ LÝ (PREPROCESSING)
# ==========================================
def parse_txt_annot(img_path, txt_path):
    """
    Đọc file .txt định dạng YOLO và chuyển đổi tọa độ tương đối
    thành tọa độ tuyệt đối pixel (xmin, ymin, xmax, ymax).
    """
    img = cv2.imread(img_path)
    if img is None:
        return img_path, [], []
    
    h, w = img.shape[:2] # Opencv trả về (height, width)
    
    try:
        with open(txt_path, "r") as file_label:
            lines = file_label.read().split('\n')
    except Exception as e:
        return img_path, [], []

    boxes = []
    classes = []
    
    if lines[0] == '':
        return img_path, classes, boxes
    else:
        for line in lines:
            if line.strip() == '':
                continue
            objbud = line.split(' ')
            class_ = int(objbud[0])
        
            # YOLO format: class, x_center, y_center, width, height (normalized)
            x_center = float(objbud[1])
            y_center = float(objbud[2])
            w_norm = float(objbud[3])
            h_norm = float(objbud[4])
        
            xmin = int((x_center * w) - (w_norm * w) / 2.0)
            ymin = int((y_center * h) - (h_norm * h) / 2.0)
            xmax = int((x_center * w) + (w_norm * w) / 2.0)
            ymax = int((y_center * h) + (h_norm * h) / 2.0)
    
            boxes.append([xmin, ymin, xmax, ymax])
            classes.append(class_)
    
    return img_path, classes, boxes

def create_paths_list(path):
    """Lấy danh sách các file trong thư mục"""
    if not os.path.exists(path):
        return []
    images = sorted(os.listdir(path))
    return [os.path.join(path, i) for i in images]

def creating_files(img_files_paths, annot_files_paths):
    """Đọc toàn bộ ảnh và annotations trả về dạng Tensor của TensorFlow"""
    img_files = create_paths_list(img_files_paths)
    annot_files = create_paths_list(annot_files_paths)
    
    if not img_files:
        print(f"CẢNH BÁO: Không tìm thấy ảnh tại {img_files_paths}")
        return None, None, None

    image_paths = []
    bbox = []
    classes = []
    
    print(f"Đang nạp dữ liệu từ {img_files_paths}...")
    for i in range(len(img_files)):
        # Giả định tên file ảnh và file nhãn giống hệt nhau, chỉ khác đuôi
        # Nếu thư mục lộn xộn, cần logic so khớp tên
        img_name = os.path.splitext(os.path.basename(img_files[i]))[0]
        # Tìm file txt tương ứng
        txt_path = os.path.join(annot_files_paths, img_name + ".txt")
        
        image_path_, classes_, bbox_ = parse_txt_annot(img_files[i], txt_path)
        image_paths.append(image_path_)
        bbox.append(bbox_)
        classes.append(classes_)
        
    image_paths = tf.ragged.constant(image_paths)
    bbox = tf.ragged.constant(bbox)
    classes = tf.ragged.constant(classes)
    
    return image_paths, classes, bbox

# ==========================================
# 2. XÂY DỰNG DATASET PIPELINE
# ==========================================
def img_preprocessing(img_path):
    img = tf.io.read_file(img_path)
    img = tf.image.decode_jpeg(img, channels=3)
    img = tf.cast(img, tf.float32) 
    return img

resizing = keras_cv.layers.JitteredResize(
    target_size=(640, 640),
    scale_factor=(0.8, 1.25),
    bounding_box_format="xyxy"
)

def load_ds(img_paths, classes, bbox):
    img = img_preprocessing(img_paths)
    bounding_boxes = {
        "classes": tf.cast(classes, dtype=tf.float32),
        "boxes": bbox 
    }
    return {"images": img, "bounding_boxes": bounding_boxes}

def dict_to_tuple(inputs):
    return inputs["images"], inputs["bounding_boxes"]

def build_dataset(img_dir, label_dir):
    img_paths, classes, bboxes = creating_files(img_dir, label_dir)
    if img_paths is None:
        return None
        
    loader = tf.data.Dataset.from_tensor_slices((img_paths, classes, bboxes))
    dataset = (loader
                 .map(load_ds, num_parallel_calls=AUTO)
                 .shuffle(BATCH_SIZE * 10)
                 .ragged_batch(BATCH_SIZE, drop_remainder=False)
                 .map(resizing, num_parallel_calls=AUTO)
                 .map(dict_to_tuple, num_parallel_calls=AUTO)
                 .prefetch(AUTO))
    return dataset

# ==========================================
# 3. HÀM MAIN
# ==========================================
def main():
    print("-------------------------------------------------")
    print(" BẮT ĐẦU QUÁ TRÌNH TRAINING ACNE VỚI YOLOV8")
    print("-------------------------------------------------")
    
    # Định nghĩa thư mục
    train_img_dir = os.path.join(DATA_DIR, "train", "images")
    train_lbl_dir = os.path.join(DATA_DIR, "train", "labels")
    valid_img_dir = os.path.join(DATA_DIR, "valid", "images")
    valid_lbl_dir = os.path.join(DATA_DIR, "valid", "labels")
    
    if not os.path.exists(train_img_dir):
        print(f"[LỖI] Không tìm thấy thư mục {train_img_dir}")
        print("Vui lòng tải tập dữ liệu mụn định dạng YOLO và đặt vào đường dẫn này.")
        return

    # Khởi tạo dataset
    train_dataset = build_dataset(train_img_dir, train_lbl_dir)
    valid_dataset = build_dataset(valid_img_dir, valid_lbl_dir)

    if train_dataset is None:
        return

    print("Khởi tạo mô hình YOLOv8...")
    # Khởi tạo backbone YOLOv8 (phiên bản XS - siêu nhẹ, phù hợp CPU)
    backbone = keras_cv.models.YOLOV8Backbone.from_preset("yolo_v8_xs_backbone_coco")
    
    model = keras_cv.models.YOLOV8Detector(
        num_classes=len(CLASS_MAPPING),
        bounding_box_format="xyxy",
        backbone=backbone,
        fpn_depth=1
    )
    
    # Tối ưu hóa (Optimizer)
    optimizer = keras.optimizers.Adam(learning_rate=0.001)
    
    model.compile(
        classification_loss="binary_crossentropy",
        box_loss="ciou",
        optimizer=optimizer,
    )
    
    print("Bắt đầu huấn luyện...")
    # Vì là chạy test nên train thử 2 Epochs
    EPOCHS = 30
    model.fit(
        train_dataset,
        validation_data=valid_dataset,
        epochs=EPOCHS,
    )
    
    # Lưu trọng số mô hình
    model_save_path = os.path.join(BASE_DIR, "models", "yolov8_acne.weights.h5")
    model.save_weights(model_save_path)
    print(f"Hoàn tất training! Đã lưu trọng số tại: {model_save_path}")

if __name__ == "__main__":
    main()
