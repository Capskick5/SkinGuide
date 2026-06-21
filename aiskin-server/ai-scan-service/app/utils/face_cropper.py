import cv2
import numpy as np
import os

# Nạp model Haar Cascade mặc định của OpenCV
cascade_path = os.path.join(cv2.data.haarcascades, 'haarcascade_frontalface_default.xml')
_FACE_CASCADE = cv2.CascadeClassifier(cascade_path)

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
            return image_bytes
            
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # KIỂM TRA CHẤT LƯỢNG ẢNH (Image Quality Control)
        # 1. Kiểm tra độ sáng (Brightness)
        brightness = np.mean(gray)
        if brightness < 40:
            raise ValueError("Ảnh quá tối. Vui lòng chụp ở nơi có đủ ánh sáng tự nhiên để AI phân tích chính xác nhất.")
        if brightness > 230:
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
            lower_skin = np.array([0, 15, 60], dtype=np.uint8)
            upper_skin = np.array([20, 255, 255], dtype=np.uint8)
            mask = cv2.inRange(hsv, lower_skin, upper_skin)
            return cv2.countNonZero(mask) / (image_bgr.shape[0] * image_bgr.shape[1])

        # Nhận diện khuôn mặt
        faces = _FACE_CASCADE.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=4, minSize=(40, 40)
        )
        
        # Fallback: Không thấy mặt thì kiểm tra xem có phải ảnh chụp cận da không
        if len(faces) == 0:
            if get_skin_ratio(img) < 0.20: # Nhỏ hơn 20% diện tích là da
                raise ValueError("Ảnh không hợp lệ: Không tìm thấy khuôn mặt hoặc vùng da người. Vui lòng chụp rõ mặt hoặc cận cảnh vùng da của bạn.")
            
            # Áp dụng CLAHE cho ảnh cận da trước khi trả về
            enhanced_img = apply_clahe(img)
            success, encoded_img = cv2.imencode('.jpg', enhanced_img)
            return encoded_img.tobytes() if success else image_bytes

        # Lấy khuôn mặt to nhất (trường hợp có nhiều người hoặc nhận diện nhầm)
        x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
        
        # Mở rộng vùng cắt ra 10% để lấy trọn vẹn cằm và trán
        pad = int(0.10 * min(w, h))
        H, W = img.shape[:2]
        x1 = max(0, x - pad)
        y1 = max(0, y - pad)
        x2 = min(W, x + w + pad)
        y2 = min(H, y + h + pad)
        
        # Cắt ảnh
        cropped_img = img[y1:y2, x1:x2]
        
        # CHỐNG NHẬN DIỆN NHẦM CỦA HAAR CASCADE:
        # Nếu Haar Cascade nhận diện nhầm một vật thể (ví dụ: avatar, bức tường) là khuôn mặt,
        # vùng cắt đó sẽ không có màu da. Ta phải kiểm tra lại tỷ lệ da trên vùng vừa cắt!
        if get_skin_ratio(cropped_img) < 0.15:
            raise ValueError("Ảnh không hợp lệ: Vật thể trong ảnh không phải là da người.")
        
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
