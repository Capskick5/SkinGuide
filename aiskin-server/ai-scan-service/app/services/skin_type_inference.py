import io
import logging
import os

import torch
import torch.nn as nn
from PIL import Image
from torchvision import transforms
from torchvision.models import ResNet50_Weights, resnet50

logger = logging.getLogger(__name__)

INDEX_LABEL = {0: "Dry", 1: "Normal", 2: "Oily"}


class SkinTypeDetector:
    def __init__(self, model_path: str = None):
        if model_path is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            model_path = os.path.join(base_dir, "models", "resnet_skin_type.pth")

        logger.info("Initializing skin type classifier (ResNet50)...")
        self.model = resnet50(weights=ResNet50_Weights.IMAGENET1K_V2)
        num_ftrs = self.model.fc.in_features
        self.model.fc = nn.Linear(num_ftrs, 3)

        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = self.model.to(self.device)

        logger.info("Loading skin type weights from: %s", model_path)
        if os.path.exists(model_path):
            try:
                self.model.load_state_dict(torch.load(model_path, map_location=self.device))
                logger.info("Skin type weights loaded successfully.")
            except Exception as e:
                logger.error(f"Failed to load weights, using random weights. Error: {e}")
        else:
            logger.warning("Skin type weight file not found at %s. Using random weights.", model_path)

        self.model.eval()

        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])

    def predict(self, image_bytes: bytes):
        try:
            img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except Exception as exc:
            raise ValueError(f"Cannot read image format: {exc}") from exc

        img_tensor = self.transform(img)
        input_tensor = img_tensor.unsqueeze(0).to(self.device)

        with torch.no_grad():
            output = self.model(input_tensor)
            pred_idx = output.argmax(1).item()

        return INDEX_LABEL.get(pred_idx, "Unknown")
