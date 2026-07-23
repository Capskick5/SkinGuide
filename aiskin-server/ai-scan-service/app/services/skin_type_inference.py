import hashlib
import io
import os
from pathlib import Path

import torch
import torch.nn as nn
from PIL import Image
from torchvision import models, transforms


ALLOWED_MODELS = ["mobilenet_v2", "resnet50"]
EXPECTED_CLASS_NAMES = ["Dry", "Normal", "Oily"]
EXPECTED_IMAGE_SIZE = 224
EXPECTED_MEAN = [0.485, 0.456, 0.406]
EXPECTED_STD = [0.229, 0.224, 0.225]


def calibrated_softmax(logits: torch.Tensor, temperature: float) -> torch.Tensor:
    if not 0 < temperature <= 10:
        raise ValueError("Checkpoint Model A có temperature không hợp lệ.")
    return torch.softmax(logits / temperature, dim=1)


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
            custom_resnet_path = os.path.join(base_dir, "models", "resnet_skin_type.pth")
            resnet_path = os.path.join(base_dir, "models", "skin_type_resnet50_best.pt")
            mobilenet_path = os.path.join(base_dir, "models", "skin_type_mobilenetv2_best.pt")
            if os.path.exists(custom_resnet_path):
                model_path = custom_resnet_path
            elif os.path.exists(resnet_path):
                model_path = resnet_path
            elif os.path.exists(mobilenet_path):
                model_path = mobilenet_path
            else:
                raise FileNotFoundError("Không tìm thấy bất kỳ file trọng số nào (cần resnet50 hoặc mobilenet_v2) trong thư mục models.")

        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Không tìm thấy file trọng số loại da tại {model_path}.")

        if torch.cuda.is_available():
            self.device = "cuda"
        elif torch.backends.mps.is_available():
            self.device = "mps"
        else:
            self.device = "cpu"
        print(f"Dang khoi tao AI phan loai loai da...")
        print(f"Dang nap bo nho tu: {model_path}...")
        checkpoint = torch.load(model_path, map_location=self.device)
        
        # Nếu checkpoint là state_dict thô (không có metadata)
        if isinstance(checkpoint, dict) and "model_state_dict" not in checkpoint:
            model_name = "resnet50"
            class_names = EXPECTED_CLASS_NAMES
            self.temperature = 1.0
            self.minimum_confidence = 0.0
            self.evidence = {}
            self.model_version = f"{Path(model_path).name}:raw_state_dict"
            state_dict = checkpoint
            
            self.model = models.resnet50(weights=None)
            # Tái hiện lại đúng bug architecture lúc user train
            num_ftrs = self.model.fc.in_features
            self.model.fc.in_features = nn.Linear(num_ftrs, len(class_names))
            self.class_names = list(class_names)
            self.is_raw_resnet = True
        else:
            if not isinstance(checkpoint, dict) or "model_state_dict" not in checkpoint:
                raise ValueError("Checkpoint Model A thiếu metadata hoặc model_state_dict.")

            model_name = checkpoint.get("model")
            class_names = checkpoint.get("class_names")
            preprocessing = checkpoint.get("preprocessing") or {}
            if model_name not in ALLOWED_MODELS:
                raise ValueError(f"Checkpoint Model A sai kiến trúc: {model_name!r}. Chỉ hỗ trợ: {ALLOWED_MODELS}.")
            if class_names != EXPECTED_CLASS_NAMES:
                raise ValueError(f"Checkpoint Model A sai thứ tự nhãn: {class_names!r}.")
            if preprocessing.get("image_size") != EXPECTED_IMAGE_SIZE:
                raise ValueError("Checkpoint Model A sai kích thước đầu vào.")
            if preprocessing.get("mean") != EXPECTED_MEAN or preprocessing.get("std") != EXPECTED_STD:
                raise ValueError("Checkpoint Model A sai cấu hình chuẩn hóa ảnh.")

            self.class_names = list(class_names)
            self.temperature = float(checkpoint.get("temperature", 1.0))
            if not 0 < self.temperature <= 10:
                raise ValueError("Checkpoint Model A có temperature không hợp lệ.")
            self.minimum_confidence = float(checkpoint.get("minimum_confidence", 0.0))
            if not 0 <= self.minimum_confidence <= 1:
                raise ValueError("Checkpoint Model A có minimum_confidence không hợp lệ.")
            dataset_metadata = checkpoint.get("dataset") or {}
            test_metrics = checkpoint.get("test_metrics") or {}
            self.evidence = {
                "dataset": dataset_metadata.get("source", "unavailable"),
                "testAccuracy": test_metrics.get("accuracy"),
                "testMacroF1": test_metrics.get("macro_f1"),
                "temperature": self.temperature,
                "minimumConfidence": self.minimum_confidence,
            }
            checkpoint_sha256 = hashlib.sha256(Path(model_path).read_bytes()).hexdigest()
            self.model_version = (
                f"{Path(model_path).name}:sha256-{checkpoint_sha256[:12]}:"
                f"epoch-{checkpoint.get('epoch', 'unknown')}"
            )
            if model_name == "resnet50":
                self.model = models.resnet50(weights=None)
                self.model.fc = nn.Linear(self.model.fc.in_features, len(self.class_names))
            else:
                self.model = models.mobilenet_v2(weights=None)
                self.model.classifier[1] = nn.Linear(self.model.classifier[1].in_features, len(self.class_names))
            state_dict = checkpoint["model_state_dict"]
            self.is_raw_resnet = False

        self.model = self.model.to(self.device)
        self.model.load_state_dict(state_dict)
        print(f"Nap bo nho loai da {model_name} thanh cong!")

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
            if getattr(self, "is_raw_resnet", False):
                logits = logits[:, :len(self.class_names)]
            if logits.shape != (1, len(self.class_names)) or not torch.isfinite(logits).all():
                raise RuntimeError("Model A trả về logits không hợp lệ.")
            probabilities = calibrated_softmax(logits, self.temperature)[0].detach().cpu()
            pred_idx = int(torch.argmax(probabilities).item())

        predicted_class = self.class_names[pred_idx]
        confidence = float(probabilities[pred_idx].item())

        return {
            "predicted": predicted_class,
            "confidence": confidence,
            "probabilities": {
                self.class_names[index]: float(probabilities[index].item())
                for index in range(len(self.class_names))
            },
            "model_version": self.model_version,
            "confidence_calibrated": self.temperature != 1.0,
            "minimum_confidence": self.minimum_confidence,
            "reliable": float(probabilities[pred_idx].item()) >= self.minimum_confidence,
        }
