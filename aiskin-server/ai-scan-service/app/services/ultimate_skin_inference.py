import os
import torch
import torch.nn as nn
from torchvision.models import resnet50, ResNet50_Weights
from torchvision import transforms
from PIL import Image, ImageFilter
import io
import logging

logger = logging.getLogger(__name__)

# Ánh xạ theo Alphabet của ImageFolder
CLASS_MAP = {
    0: "Acne",
    1: "Blackheads",
    2: "Dark_Spots",
    3: "Pigmentation",
    4: "Pores",
    5: "Redness",
    6: "Wrinkles"
}

class TextureEnhancement(object):
    def __call__(self, img):
        return img.filter(ImageFilter.EDGE_ENHANCE_MORE)

class UltimateSkinDetector:
    def __init__(self, model_path: str = None):
        if model_path is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            model_path = os.path.join(base_dir, "models", "ultimate_skin_resnet.pth")
            
        logger.info("Đang khởi tạo Siêu AI chuẩn đoán 7 bệnh (Ultimate Skin)...")
        self.model = resnet50(weights=ResNet50_Weights.IMAGENET1K_V2)
        num_ftrs = self.model.fc.in_features
        self.model.fc = nn.Linear(num_ftrs, 7) # 7 classes
        
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = self.model.to(self.device)
        
        if os.path.exists(model_path):
            try:
                self.model.load_state_dict(torch.load(model_path, map_location=self.device))
                logger.info("Nạp bộ nhớ Ultimate Skin thành công!")
            except Exception as e:
                logger.error(f"Lỗi khi load weight Ultimate Skin: {e}")
        else:
            logger.warning(f"[CẢNH BÁO] Không tìm thấy file trọng số tại {model_path}. Hệ thống sẽ chạy dự phòng cho đến khi quá trình Train hoàn tất!")
            
        self.model.eval()
        
        self.transform = transforms.Compose([
            TextureEnhancement(),
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

    def predict(self, image_bytes: bytes, top_k: int = 3):
        try:
            img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except Exception as e:
            raise ValueError(f"Không thể đọc định dạng ảnh: {e}")
            
        import numpy as np
        import cv2
        from app.utils.face_zones import extract_facial_zones
        
        img_np = np.array(img)
        img_bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
        t_zone_bgr, u_zone_bgr = extract_facial_zones(img_bgr)
        
        def analyze_zone(zone_bgr):
            zone_rgb = cv2.cvtColor(zone_bgr, cv2.COLOR_BGR2RGB)
            zone_pil = Image.fromarray(zone_rgb)
            img_tensor = self.transform(zone_pil).unsqueeze(0).to(self.device)
            
            with torch.no_grad():
                outputs = self.model(img_tensor)
                probs = torch.nn.functional.softmax(outputs, dim=1)[0]
                top_probs, top_indices = torch.topk(probs, len(CLASS_MAP))
                
            issues = []
            for i in range(len(CLASS_MAP)):
                idx = top_indices[i].item()
                prob = top_probs[i].item()
                
                if prob >= 0.05:
                    severity = "Clear"
                    severity_score = 1
                    if prob >= 0.8:
                        severity = "Severe"
                        severity_score = 4
                    elif prob >= 0.6:
                        severity = "Moderate"
                        severity_score = 3
                    elif prob >= 0.4:
                        severity = "Mild"
                        severity_score = 2
                        
                    issues.append({
                        "name": CLASS_MAP[idx],
                        "probability": round(prob, 4),
                        "severity": severity,
                        "severityScore": severity_score
                    })
            
            issues.sort(key=lambda x: x["probability"], reverse=True)
            if len(issues) == 0:
                issues.append({"name": "Healthy", "probability": 1.0, "severity": "Clear", "severityScore": 1})
            return issues[:top_k]

        t_zone_issues = analyze_zone(t_zone_bgr)
        u_zone_issues = analyze_zone(u_zone_bgr)
        
        return {
            "t_zone": { "issues": t_zone_issues },
            "u_zone": { "issues": u_zone_issues }
        }
            
