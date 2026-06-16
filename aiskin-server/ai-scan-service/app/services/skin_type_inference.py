import os
import torch
import torch.nn as nn
from torchvision.models import resnet50, ResNet50_Weights
from torchvision import transforms
import numpy as np
from PIL import Image
import io

# Map kết quả dự đoán (0, 1, 2) ra string
INDEX_LABEL = {0: "Dry", 1: "Normal", 2: "Oily"}

class SkinTypeDetector:
    def __init__(self, model_path: str = None):
        """
        Khởi tạo mô hình ResNet50 cho bài toán phân loại da và nạp trọng số đã huấn luyện.
        """
        if model_path is None:
            # Tự động trỏ đến file weights trong thư mục models/
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            model_path = os.path.join(base_dir, "models", "resnet_skin_type.pth")
            
        print("Đang khởi tạo AI phân loại loại da (ResNet50)...")
        # Khai báo lại cấu trúc mạng
        self.model = resnet50(weights=ResNet50_Weights.IMAGENET1K_V2)
        num_ftrs = self.model.fc.in_features
        self.model.fc.in_features = nn.Linear(num_ftrs, 3) # 3 classes: dry, normal, oily
        
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = self.model.to(self.device)
        
        print(f"Đang nạp bộ nhớ từ: {model_path}...")
        if os.path.exists(model_path):
            # Load weights (map_location để hỗ trợ chạy cả CPU lẫn GPU)
            self.model.load_state_dict(torch.load(model_path, map_location=self.device))
            print("Nạp bộ nhớ loại da thành công!")
        else:
            print(f"[CẢNH BÁO] Không tìm thấy file trọng số loại da tại {model_path}. Hãy chạy script training trước!")
            # Vẫn cho model hoạt động với trọng số random để không làm sập server
            
        self.model.eval() # Chuyển sang chế độ inference
        
        # Tiền xử lý (Phải giống hệt tập valid_transform trong notebook)
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

    def predict(self, image_bytes: bytes):
        """
        Nhận mảng byte của ảnh (từ file tải lên), phân tích và trả về text: "Dry", "Normal", "Oily".
        """
        # Đọc ảnh bằng PIL
        try:
            img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except Exception as e:
            raise ValueError(f"Không thể đọc định dạng ảnh: {e}")
            
        # Tiền xử lý
        img_tensor = self.transform(img)
        # Thêm batch dimension (1, 3, 224, 224)
        input_tensor = img_tensor.unsqueeze(0).to(self.device)
        
        with torch.no_grad():
            output = self.model(input_tensor)
            pred_idx = output.argmax(1).item()
            
        return INDEX_LABEL.get(pred_idx, "Unknown")
