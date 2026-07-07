import io
import os

import torch
import torch.nn as nn
from PIL import Image
from torchvision import models, transforms


INDEX_LABEL = {0: "Dry", 1: "Normal", 2: "Oily"}


class SkinTypeDetector:
    def __init__(self, model_path: str = None):
        """
        Model A: phân loại loại da thành 3 lớp Dry / Normal / Oily.

        File này giữ nguyên interface cũ để không phải sửa `main.py`:
        - class: SkinTypeDetector
        - method: predict(image_bytes) -> "Dry" | "Normal" | "Oily"
        """
        if model_path is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            model_path = os.path.join(base_dir, "models", "skin_type_mobilenetv2_best.pt")

        self.device = "cuda" if torch.cuda.is_available() else "cpu"

        print("Đang khởi tạo AI phân loại loại da (MobileNetV2)...")
        self.model = models.mobilenet_v2(weights=None)
        self.model.classifier[1] = nn.Linear(self.model.classifier[1].in_features, len(INDEX_LABEL))
        self.model = self.model.to(self.device)

        print(f"Đang nạp bộ nhớ từ: {model_path}...")
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Không tìm thấy file trọng số loại da tại {model_path}.")

        checkpoint = torch.load(model_path, map_location=self.device)
        state_dict = checkpoint.get("model_state_dict", checkpoint)
        self.model.load_state_dict(state_dict)
        print("Nạp bộ nhớ loại da MobileNetV2 thành công!")

        self.model.eval()

        self.transform = transforms.Compose(
            [
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
            ]
        )

    def predict(self, image_bytes: bytes):
        """
        Nhận bytes ảnh, trả về text: "Dry", "Normal", hoặc "Oily".
        """
        try:
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except Exception as e:
            raise ValueError(f"Không thể đọc định dạng ảnh: {e}")

        tensor = self.transform(image).unsqueeze(0).to(self.device)
        with torch.no_grad():
            logits = self.model(tensor)
            pred_idx = int(torch.argmax(logits, dim=1).item())

        return INDEX_LABEL.get(pred_idx, "Unknown")

    def predict_with_probabilities(self, image_bytes: bytes):
        """
        Hàm phụ để debug/test, không bắt buộc main.py dùng.
        """
        try:
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except Exception as e:
            raise ValueError(f"Không thể đọc định dạng ảnh: {e}")

        tensor = self.transform(image).unsqueeze(0).to(self.device)
        with torch.no_grad():
            logits = self.model(tensor)
            probabilities = torch.softmax(logits, dim=1)[0].detach().cpu()
            pred_idx = int(torch.argmax(probabilities).item())

        return {
            "predicted": INDEX_LABEL.get(pred_idx, "Unknown"),
            "confidence": float(probabilities[pred_idx].item()),
            "probabilities": {
                INDEX_LABEL[index]: float(probabilities[index].item())
                for index in range(len(INDEX_LABEL))
            },
        }
