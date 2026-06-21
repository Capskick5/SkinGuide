import cv2
import numpy as np

# Thử import mediapipe, nếu chưa cài đặt thì sẽ báo lỗi rõ ràng
try:
    import mediapipe as mp
    import mediapipe.python.solutions.face_mesh as mp_face_mesh
    face_mesh = mp_face_mesh.FaceMesh(static_image_mode=True, max_num_faces=1, refine_landmarks=False)
except ImportError as e:
    print(f"Lỗi import mediapipe: {e}")
    mp = None

def extract_facial_zones(image_bgr):
    """
    Trích xuất vùng T-Zone và U-Zone từ ảnh BGR bằng Mediapipe Face Mesh.
    Trả về (t_zone_img, u_zone_img) - ảnh đã crop theo bounding box của vùng.
    Nếu không tìm thấy mặt, trả về (image_bgr, image_bgr) nguyên bản.
    """
    if mp is None:
        return image_bgr, image_bgr
        
    results = face_mesh.process(cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB))
    if not results.multi_face_landmarks:
        return image_bgr, image_bgr
    
    landmarks = results.multi_face_landmarks[0].landmark
    h, w, _ = image_bgr.shape
    
    # T-Zone landmarks (Trán và sống mũi)
    t_zone_indices = [10, 109, 67, 297, 338, 1, 4, 5, 19, 94, 278, 48, 115, 220, 275, 440]
    
    # U-Zone landmarks (Má và cằm)
    u_zone_indices = [152, 199, 234, 454, 50, 280, 205, 425, 132, 361, 148, 377]
    
    def crop_by_indices(indices):
        xs = [int(landmarks[i].x * w) for i in indices]
        ys = [int(landmarks[i].y * h) for i in indices]
        x_min, x_max = max(0, min(xs)), min(w, max(xs))
        y_min, y_max = max(0, min(ys)), min(h, max(ys))
        
        # Mở rộng vùng cắt ra 15% để bao phủ toàn bộ vùng da
        pad_x = int((x_max - x_min) * 0.15)
        pad_y = int((y_max - y_min) * 0.15)
        x_min = max(0, x_min - pad_x)
        x_max = min(w, x_max + pad_x)
        y_min = max(0, y_min - pad_y)
        y_max = min(h, y_max + pad_y)
        
        return image_bgr[y_min:y_max, x_min:x_max]

    t_zone = crop_by_indices(t_zone_indices)
    u_zone = crop_by_indices(u_zone_indices)
    
    # Kích thước an toàn (tránh lỗi crop ra ảnh width/height = 0)
    if t_zone.size == 0: t_zone = image_bgr
    if u_zone.size == 0: u_zone = image_bgr
        
    return t_zone, u_zone
