import hashlib
import io
import os
from pathlib import Path

import torch
import torch.nn as nn
from PIL import Image
from torchvision import models, transforms


EXPECTED_MODEL = "mobilenet_v2"
EXPECTED_CLASS_NAMES = ["Dry", "Normal", "Oily"]
EXPECTED_IMAGE_SIZE = 224
EXPECTED_MEAN = [0.485, 0.456, 0.406]
EXPECTED_STD = [0.229, 0.224, 0.225]


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

        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Không tìm thấy file trọng số loại da tại {model_path}.")

        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print("Đang khởi tạo AI phân loại loại da (MobileNetV2)...")
        print(f"Đang nạp bộ nhớ từ: {model_path}...")
        checkpoint = torch.load(model_path, map_location=self.device)
        if not isinstance(checkpoint, dict) or "model_state_dict" not in checkpoint:
            raise ValueError("Checkpoint Model A thiếu metadata hoặc model_state_dict.")

        model_name = checkpoint.get("model")
        class_names = checkpoint.get("class_names")
        preprocessing = checkpoint.get("preprocessing") or {}
        if model_name != EXPECTED_MODEL:
            raise ValueError(f"Checkpoint Model A sai kiến trúc: {model_name!r}.")
        if class_names != EXPECTED_CLASS_NAMES:
            raise ValueError(f"Checkpoint Model A sai thứ tự nhãn: {class_names!r}.")
        if preprocessing.get("image_size") != EXPECTED_IMAGE_SIZE:
            raise ValueError("Checkpoint Model A sai kích thước đầu vào.")
        if preprocessing.get("mean") != EXPECTED_MEAN or preprocessing.get("std") != EXPECTED_STD:
            raise ValueError("Checkpoint Model A sai cấu hình chuẩn hóa ảnh.")

        self.class_names = list(class_names)
        checkpoint_sha256 = hashlib.sha256(Path(model_path).read_bytes()).hexdigest()
        self.model_version = (
            f"{Path(model_path).name}:sha256-{checkpoint_sha256[:12]}:"
            f"epoch-{checkpoint.get('epoch', 'unknown')}"
        )
        self.model = models.mobilenet_v2(weights=None)
        self.model.classifier[1] = nn.Linear(self.model.classifier[1].in_features, len(self.class_names))
        self.model = self.model.to(self.device)
        state_dict = checkpoint["model_state_dict"]
        self.model.load_state_dict(state_dict)
        print("Nạp bộ nhớ loại da MobileNetV2 thành công!")

        self.model.eval()

        self.transform = transforms.Compose(
            [
                transforms.Resize((EXPECTED_IMAGE_SIZE, EXPECTED_IMAGE_SIZE)),
                transforms.ToTensor(),
                transforms.Normalize(mean=EXPECTED_MEAN, std=EXPECTED_STD),
            ]
        )

    def predict(self, image_bytes: bytes):
        """
        Nhận bytes ảnh, trả về text: "Dry", "Normal", hoặc "Oily".
        """
        return self.predict_with_probabilities(image_bytes)["predicted"]

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
            if logits.shape != (1, len(self.class_names)) or not torch.isfinite(logits).all():
                raise RuntimeError("Model A trả về logits không hợp lệ.")
            probabilities = torch.softmax(logits, dim=1)[0].detach().cpu()
            pred_idx = int(torch.argmax(probabilities).item())

        return {
            "predicted": self.class_names[pred_idx],
            "confidence": float(probabilities[pred_idx].item()),
            "probabilities": {
                self.class_names[index]: float(probabilities[index].item())
                for index in range(len(self.class_names))
            },
            "model_version": self.model_version,
            "confidence_calibrated": False,
        }
