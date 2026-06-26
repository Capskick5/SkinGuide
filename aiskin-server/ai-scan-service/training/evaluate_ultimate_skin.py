import os
import torch
import torch.nn as nn
from torchvision import datasets, transforms, models
from torch.utils.data import DataLoader, Subset
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import numpy as np
from PIL import ImageFilter
from tqdm import tqdm

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dataset_dir = os.path.join(base_dir, "datasets", "Ultimate-Skin-Dataset")
model_save_path = os.path.join(base_dir, "models", "ultimate_skin_resnet.pth")
NUM_CLASSES = 7
BATCH_SIZE = 32

class TextureEnhancement(object):
    def __call__(self, img):
        return img.filter(ImageFilter.EDGE_ENHANCE_MORE)

# Thêm nhiễu giả lập ảnh chụp từ điện thoại thực tế (Real-world noise)
test_transforms = transforms.Compose([
    TextureEnhancement(),
    transforms.Resize((224, 224)),
    # Giả lập ảnh bị out nét nhẹ hoặc camera kém chất lượng
    transforms.GaussianBlur(kernel_size=3, sigma=(0.1, 1.0)),
    # Giả lập ánh sáng môi trường thực tế không hoàn hảo
    transforms.ColorJitter(brightness=0.3, contrast=0.2, saturation=0.2),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

class SkinDatasetWrapper(torch.utils.data.Dataset):
    def __init__(self, subset, transform=None):
        self.subset = subset
        self.transform = transform
        
    def __getitem__(self, index):
        x, y = self.subset[index]
        if self.transform:
            x = self.transform(x)
        return x, y
        
    def __len__(self):
        return len(self.subset)

def evaluate_model():
    print("Khoi tao tien trinh danh gia Sieu Thuat Toan (Ultimate Hybrid Skin) tren 20% du lieu...", flush=True)
    
    if not os.path.exists(dataset_dir):
        print(f"Khong tim thay thu muc dataset: {dataset_dir}", flush=True)
        return

    base_dataset = datasets.ImageFolder(root=dataset_dir)
    print(f"Tong so anh: {len(base_dataset)}", flush=True)
    
    targets = base_dataset.targets
    train_idx, test_idx = train_test_split(
        np.arange(len(targets)),
        test_size=0.12, # Giảm xuống 12% theo yêu cầu
        shuffle=True,
        stratify=targets,
        random_state=42
    )
    
    test_dataset = SkinDatasetWrapper(Subset(base_dataset, test_idx), transform=test_transforms)
    test_loader = DataLoader(test_dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)
    
    print(f"So luong anh de kiem thu (20%): {len(test_dataset)}", flush=True)

    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
    print(f"Su dung thiet bi: {device}", flush=True)
    
    model = models.resnet50(weights=None)
    num_ftrs = model.fc.in_features
    model.fc = nn.Linear(num_ftrs, NUM_CLASSES)
    
    if os.path.exists(model_save_path):
        print(f"Dang tai weights tu: {model_save_path}", flush=True)
        model.load_state_dict(torch.load(model_save_path, map_location=device))
    else:
        print("Loi: Khong tim thay file weights. Vui long train model truoc.", flush=True)
        return

    model = model.to(device)
    model.eval()

    all_preds = []
    all_labels = []

    print("Dang chay inference...")
    with torch.no_grad():
        for inputs, labels in tqdm(test_loader, desc="Evaluating"):
            inputs = inputs.to(device)
            labels = labels.to(device)
            
            outputs = model(inputs)
            _, preds = torch.max(outputs, 1)
            
            all_preds.extend(preds.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())

    print("\n--- KET QUA DANH GIA (CLASSIFICATION REPORT) ---")
    target_names = base_dataset.classes
    report = classification_report(all_labels, all_preds, target_names=target_names, zero_division=0, digits=4)
    print(report)
    
    acc = accuracy_score(all_labels, all_preds)
    print(f"\nDo chinh xac Tong the (Overall Accuracy): {acc:.4f}")

if __name__ == '__main__':
    evaluate_model()
