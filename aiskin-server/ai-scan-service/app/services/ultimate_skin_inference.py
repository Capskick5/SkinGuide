import hashlib
import io
import os
from pathlib import Path

import torch
import torch.nn as nn
from PIL import Image
from torchvision import models, transforms


EXPECTED_MODEL = "resnet50_multilabel"
EXPECTED_TASK = "multi_label_classification"
EXPECTED_CLASS_NAMES = [
    "Acne",
    "Blackheads",
    "Dark_Spots",
    "Pigmentation",
    "Pores",
    "Redness",
    "Wrinkles",
]
EXPECTED_IMAGE_SIZE = 224
EXPECTED_MEAN = [0.485, 0.456, 0.406]
EXPECTED_STD = [0.229, 0.224, 0.225]


def validate_checkpoint_metadata(checkpoint: dict) -> None:
    if not isinstance(checkpoint, dict) or "model_state_dict" not in checkpoint:
        raise ValueError("Checkpoint Model B thiếu metadata hoặc model_state_dict.")
    if checkpoint.get("model") != EXPECTED_MODEL:
        raise ValueError("Checkpoint Model B phải dùng kiến trúc resnet50_multilabel.")
    if checkpoint.get("task") != EXPECTED_TASK:
        raise ValueError("Checkpoint Model B phải là bài toán multi-label classification.")
    if checkpoint.get("class_names") != EXPECTED_CLASS_NAMES:
        raise ValueError("Checkpoint Model B sai hoặc thiếu thứ tự nhãn chuẩn.")

    preprocessing = checkpoint.get("preprocessing") or {}
    if preprocessing.get("image_size") != EXPECTED_IMAGE_SIZE:
        raise ValueError("Checkpoint Model B sai kích thước đầu vào.")
    if preprocessing.get("mean") != EXPECTED_MEAN or preprocessing.get("std") != EXPECTED_STD:
        raise ValueError("Checkpoint Model B sai cấu hình chuẩn hóa ảnh.")

    thresholds = checkpoint.get("decision_thresholds")
    if not isinstance(thresholds, dict) or set(thresholds) != set(EXPECTED_CLASS_NAMES):
        raise ValueError("Checkpoint Model B thiếu decision_thresholds cho từng nhãn.")
    if any(not 0 < float(value) < 1 for value in thresholds.values()):
        raise ValueError("Checkpoint Model B có decision_thresholds không hợp lệ.")

    evidence = checkpoint.get("evidence") or {}
    test_metrics = evidence.get("test_metrics") or {}
    if not evidence.get("dataset") or test_metrics.get("macro_f1") is None:
        raise ValueError("Checkpoint Model B thiếu nguồn dataset hoặc test macro F1.")


def multilabel_probabilities(logits: torch.Tensor) -> torch.Tensor:
    if logits.ndim != 2 or logits.shape[1] != len(EXPECTED_CLASS_NAMES):
        raise ValueError("Model B trả về logits sai kích thước.")
    if not torch.isfinite(logits).all():
        raise ValueError("Model B trả về logits không hợp lệ.")
    return torch.sigmoid(logits)


class UltimateSkinDetector:
    """Nhận diện đồng thời nhiều dấu hiệu da, không đưa ra chẩn đoán y khoa."""

    def __init__(self, model_path: str = None):
        if model_path is None:
            base_dir = Path(__file__).resolve().parents[2]
            model_path = str(base_dir / "models" / "ultimate_skin_multilabel.pt")

        if not os.path.exists(model_path):
            raise FileNotFoundError("Chưa có checkpoint Model B đa nhãn đã được kiểm chứng.")

        if torch.cuda.is_available():
            self.device = "cuda"
        elif torch.backends.mps.is_available():
            self.device = "mps"
        else:
            self.device = "cpu"

        checkpoint = torch.load(model_path, map_location=self.device)
        validate_checkpoint_metadata(checkpoint)

        self.class_names = list(checkpoint["class_names"])
        self.decision_thresholds = {
            label: float(checkpoint["decision_thresholds"][label]) for label in self.class_names
        }
        self.evidence = checkpoint["evidence"]
        checkpoint_sha256 = hashlib.sha256(Path(model_path).read_bytes()).hexdigest()
        self.model_version = f"{Path(model_path).name}:sha256-{checkpoint_sha256[:12]}"

        self.model = models.resnet50(weights=None)
        self.model.fc = nn.Linear(self.model.fc.in_features, len(self.class_names))
        self.model.load_state_dict(checkpoint["model_state_dict"])
        self.model = self.model.to(self.device)
        self.model.eval()
        self.transform = transforms.Compose(
            [
                transforms.Resize((EXPECTED_IMAGE_SIZE, EXPECTED_IMAGE_SIZE)),
                transforms.ToTensor(),
                transforms.Normalize(mean=EXPECTED_MEAN, std=EXPECTED_STD),
            ]
        )

    def predict(self, image_bytes: bytes, top_k: int = 3):
        try:
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except Exception as exc:
            raise ValueError(f"Không thể đọc định dạng ảnh: {exc}") from exc

        tensor = self.transform(image).unsqueeze(0).to(self.device)
        with torch.no_grad():
            probabilities = multilabel_probabilities(self.model(tensor))[0].detach().cpu()

        issues = []
        for index, label in enumerate(self.class_names):
            probability = float(probabilities[index].item())
            threshold = self.decision_thresholds[label]
            if probability >= threshold:
                issues.append(
                    {
                        "name": label,
                        "probability": round(probability, 4),
                        "decisionThreshold": threshold,
                        "detected": True,
                    }
                )
        issues.sort(key=lambda item: item["probability"], reverse=True)

        # Phân tích trên toàn bộ vùng mặt đã crop. Không tự gán T/U-zone khi dataset
        # chưa có annotation theo vùng.
        return {
            "modelStatus": "loaded",
            "modelVersion": self.model_version,
            "analysisMethod": EXPECTED_TASK,
            "issues": issues[:top_k],
            "t_zone": {"issues": []},
            "u_zone": {"issues": []},
        }
