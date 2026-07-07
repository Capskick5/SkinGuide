import cv2
import numpy as np
import os

# Nạp vài Haar Cascade sẵn có để giảm rớt ảnh mặt hợp lệ do góc chụp/ánh sáng.
_FACE_CASCADES = [
    cv2.CascadeClassifier(os.path.join(cv2.data.haarcascades, name))
    for name in (
        "haarcascade_frontalface_default.xml",
        "haarcascade_frontalface_alt.xml",
        "haarcascade_frontalface_alt2.xml",
        "haarcascade_profileface.xml",
    )
]

_MIN_IMAGE_SIZE = 160
_MIN_FACE_AREA_RATIO = 0.04
_MIN_DETECTED_FACE_AREA_RATIO = 0.003
_MIN_SECONDARY_FACE_AREA_RATIO = 0.05
_MIN_HAAR_FALLBACK_FACE_AREA_RATIO = 0.12
_MIN_FACE_SKIN_RATIO = 0.12
_FACE_DEDUPE_IOU = 0.35
_MAX_OVEREXPOSED_RATIO = 0.50
_YUNET_SCORE_THRESHOLD = 0.75
_YUNET_MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "models",
    "face_detection_yunet_2023mar.onnx",
)

def crop_face_from_bytes(image_bytes: bytes) -> bytes:
    """
    Nhận mảng byte của ảnh gốc.
    Tìm khuôn mặt và cắt (có padding 10%).
    Nếu không tìm thấy mặt, trả về mảng byte gốc (Fallback an toàn).
    """
    try:
        # Chuyển bytes thành mảng numpy
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise ValueError("Không thể đọc định dạng ảnh. Vui lòng tải lên ảnh JPG hoặc PNG hợp lệ.")

        H, W = img.shape[:2]
        if min(H, W) < _MIN_IMAGE_SIZE:
            raise ValueError("Ảnh có độ phân giải quá thấp. Vui lòng tải ảnh khuôn mặt rõ hơn.")

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # KIỂM TRA CHẤT LƯỢNG ẢNH (Image Quality Control)
        # 1. Kiểm tra độ sáng (Brightness)
        brightness = np.mean(gray)
        overexposed_ratio = np.count_nonzero(gray > 235) / gray.size
        if brightness < 40:
            raise ValueError("Ảnh quá tối. Vui lòng chụp ở nơi có đủ ánh sáng tự nhiên để AI phân tích chính xác nhất.")
        if brightness > 250 or overexposed_ratio > 0.52:
            raise ValueError("Ảnh quá sáng hoặc lóa ánh đèn. Vui lòng điều chỉnh lại góc chụp để thấy rõ da mặt.")
            
        # 2. Kiểm tra độ mờ / mất nét (Blurriness) bằng phương sai Laplacian
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        if laplacian_var < 30:
            raise ValueError("Ảnh quá mờ nhòe hoặc không lấy nét đúng. Vui lòng giữ chắc tay và chụp ảnh thật sắc nét.")
        
        
        def apply_clahe(image_bgr):
            # Tăng cường độ tương phản CLAHE trên không gian màu LAB để giữ nguyên sắc thái màu (chỉ chỉnh độ sáng/tối)
            lab = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2LAB)
            l_channel, a_channel, b_channel = cv2.split(lab)
            
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
            cl = clahe.apply(l_channel)
            
            merged_lab = cv2.merge((cl, a_channel, b_channel))
            return cv2.cvtColor(merged_lab, cv2.COLOR_LAB2BGR)

        def get_skin_ratio(image_bgr):
            hsv = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2HSV)
            hsv_mask = cv2.inRange(
                hsv,
                np.array([0, 15, 40], dtype=np.uint8),
                np.array([25, 255, 255], dtype=np.uint8),
            )

            ycrcb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2YCrCb)
            ycrcb_mask = cv2.inRange(
                ycrcb,
                np.array([0, 133, 77], dtype=np.uint8),
                np.array([255, 173, 127], dtype=np.uint8),
            )

            mask = cv2.bitwise_or(hsv_mask, ycrcb_mask)
            return cv2.countNonZero(mask) / (image_bgr.shape[0] * image_bgr.shape[1])

        def face_iou(a, b):
            ax, ay, aw, ah = a
            bx, by, bw, bh = b
            ax2, ay2 = ax + aw, ay + ah
            bx2, by2 = bx + bw, by + bh

            inter_w = max(0, min(ax2, bx2) - max(ax, bx))
            inter_h = max(0, min(ay2, by2) - max(ay, by))
            inter_area = inter_w * inter_h
            union_area = aw * ah + bw * bh - inter_area
            return inter_area / union_area if union_area else 0

        def dedupe_faces(candidates):
            candidates.sort(key=lambda face: face[2] * face[3], reverse=True)
            unique_faces = []
            for face in candidates:
                if all(face_iou(face, existing) < _FACE_DEDUPE_IOU for existing in unique_faces):
                    unique_faces.append(face)
            return unique_faces

        def detect_yunet_faces(image_bgr):
            if not os.path.exists(_YUNET_MODEL_PATH) or not hasattr(cv2, "FaceDetectorYN"):
                return []

            detector = cv2.FaceDetectorYN.create(
                _YUNET_MODEL_PATH,
                "",
                (W, H),
                score_threshold=_YUNET_SCORE_THRESHOLD,
                nms_threshold=0.3,
                top_k=5000,
            )
            _, detected = detector.detect(image_bgr)
            if detected is None:
                return []

            faces = []
            min_area = H * W * _MIN_DETECTED_FACE_AREA_RATIO
            for face in detected:
                x, y, w, h = face[:4]
                x = max(0, int(x))
                y = max(0, int(y))
                w = int(w)
                h = int(h)
                if w <= 0 or h <= 0 or w * h < min_area:
                    continue
                faces.append((x, y, w, h))
            return dedupe_faces(faces)

        def detect_haar_faces(gray_img, min_area_ratio):
            equalized = cv2.equalizeHist(gray_img)
            candidates = []
            for cascade in _FACE_CASCADES:
                if cascade.empty():
                    continue
                for source in (gray_img, equalized):
                    detected = cascade.detectMultiScale(
                        source,
                        scaleFactor=1.08,
                        minNeighbors=4,
                        minSize=(40, 40),
                    )
                    candidates.extend(tuple(map(int, face)) for face in detected)

            min_area = H * W * min_area_ratio
            candidates = [face for face in candidates if face[2] * face[3] >= min_area]
            return dedupe_faces(candidates)

        # Nhận diện khuôn mặt
        faces = detect_yunet_faces(img)
        if len(faces) == 0:
            faces = detect_haar_faces(gray, _MIN_HAAR_FALLBACK_FACE_AREA_RATIO)
        
        if len(faces) == 0:
            raise ValueError("Ảnh không hợp lệ: Không tìm thấy khuôn mặt. Vui lòng chụp rõ một khuôn mặt chính diện.")

        if len(faces) > 1:
            raise ValueError("Ảnh không hợp lệ: Phát hiện nhiều khuôn mặt. Vui lòng tải ảnh chỉ có một người.")

        # Lấy khuôn mặt to nhất (trường hợp có nhiều người hoặc nhận diện nhầm)
        x, y, w, h = faces[0]
        if w * h < H * W * _MIN_FACE_AREA_RATIO:
            raise ValueError("Ảnh khuôn mặt quá nhỏ. Vui lòng chụp gần mặt hơn để AI phân tích chính xác.")
        
        # Mở rộng vùng cắt ra 10% để lấy trọn vẹn cằm và trán
        pad = int(0.10 * min(w, h))
        x1 = max(0, x - pad)
        y1 = max(0, y - pad)
        x2 = min(W, x + w + pad)
        y2 = min(H, y + h + pad)
        
        # Cắt ảnh
        cropped_img = img[y1:y2, x1:x2]
        cropped_gray = cv2.cvtColor(cropped_img, cv2.COLOR_BGR2GRAY)
        face_brightness = np.mean(cropped_gray)
        face_overexposed_ratio = np.count_nonzero(cropped_gray > 235) / cropped_gray.size

        if face_brightness > 238 or face_overexposed_ratio > _MAX_OVEREXPOSED_RATIO:
            raise ValueError("Ảnh khuôn mặt quá sáng hoặc bị lóa. Vui lòng chụp lại để thấy rõ bề mặt da.")
        
        # CHỐNG NHẬN DIỆN NHẦM CỦA HAAR CASCADE:
        # Nếu Haar Cascade nhận diện nhầm một vật thể (ví dụ: avatar, bức tường) là khuôn mặt,
        # vùng cắt đó sẽ không có màu da. Ta phải kiểm tra lại tỷ lệ da trên vùng vừa cắt!
        if get_skin_ratio(cropped_img) < _MIN_FACE_SKIN_RATIO:
            raise ValueError("Ảnh không hợp lệ: Vùng nhận diện không giống khuôn mặt người. Vui lòng tải ảnh mặt rõ hơn.")
        
        # Áp dụng CLAHE tăng cường chi tiết cho khuôn mặt vừa cắt
        enhanced_cropped_img = apply_clahe(cropped_img)
        
        # Chuyển lại thành bytes
        success, encoded_img = cv2.imencode('.jpg', enhanced_cropped_img)
        if success:
            return encoded_img.tobytes()
        else:
            return image_bytes
            
    except ValueError:
        raise
    except Exception as e:
        print(f"Lỗi khi cắt khuôn mặt: {e}")
        return image_bytes
