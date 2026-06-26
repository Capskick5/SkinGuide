import os
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms, models
from torch.utils.data import DataLoader, Subset, Dataset
import numpy as np
from PIL import Image, ImageFilter
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from tqdm import tqdm
import time
import copy
import sys
import io
# Cấu hình siêu tham số
EPOCHS = 30 # Tăng số vòng học lên 30 để AI thấm sâu dữ liệu
BATCH_SIZE = 32
LEARNING_RATE = 0.0001
NUM_CLASSES = 7

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dataset_dir = os.path.join(base_dir, "datasets", "Ultimate-Skin-Dataset")
model_save_path = os.path.join(base_dir, "models", "ultimate_skin_resnet.pth")

# Custom Transform: Tinh hoa từ Bài 1 & 2 (GLCM/LBP)
# Ta mô phỏng bằng bộ lọc nổi bật cạnh (Edge Enhancement) 
# để ép CNN phải nhìn thấy lỗ chân lông và nếp nhăn.
class TextureEnhancement(object):
    def __call__(self, img):
        # Tăng cường độ nét để làm nổi bật kết cấu sần sùi (nhăn, lỗ chân lông)
        return img.filter(ImageFilter.EDGE_ENHANCE_MORE)

# Tinh hoa từ Bài 2: Chống Data Leakage
# Tập Train: Vừa tăng cường ảnh (Augment), vừa tăng kết cấu (Texture)
# Tập Train: Vừa tăng cường ảnh (Augment), vừa tăng kết cấu (Texture)
# Tinh chỉnh: Dùng RandomResizedCrop để giả lập việc AI chỉ nhìn vào một vùng chữ T hoặc chữ U
train_transforms = transforms.Compose([
    TextureEnhancement(),
    transforms.RandomResizedCrop(224, scale=(0.4, 1.0)), # Mô phỏng cắt cận cảnh vào trán/má
    transforms.RandomHorizontalFlip(p=0.5),
    transforms.RandomRotation(degrees=15),
    transforms.ColorJitter(brightness=0.2, contrast=0.2),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

# Tập Test/Val: KHÔNG AUGMENT, chỉ tăng kết cấu để test công bằng
test_transforms = transforms.Compose([
    TextureEnhancement(),
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

class SkinDatasetWrapper(Dataset):
    def __init__(self, subset, transform=None):
        self.subset = subset
        self.transform = transform
        
    def __getitem__(self, index):
        try:
            x, y = self.subset[index]
            if self.transform:
                x = self.transform(x)
            return x, y
        except (FileNotFoundError, OSError):
            # File bi thieu — thu index ke tiep
            next_index = (index + 1) % len(self)
            return self.__getitem__(next_index)
        
    def __len__(self):
        return len(self.subset)

def get_valid_indices(dataset):
    """Loc bo cac anh khong ton tai tren disk truoc khi train."""
    print("Dang kiem tra tinh hop le cua toan bo anh trong dataset...", flush=True)
    valid = []
    invalid = 0
    for idx in range(len(dataset)):
        path, _ = dataset.samples[idx]
        if os.path.exists(path):
            valid.append(idx)
        else:
            invalid += 1
    print(f"[OK] File hop le: {len(valid)} | File bi thieu (bo qua): {invalid}", flush=True)
    return np.array(valid)

def train_model():
    print("Khoi tao tien trinh huan luyen Sieu Thuat Toan (Ultimate Hybrid Skin)...", flush=True)
    
    if not os.path.exists(dataset_dir):
        print(f"Khong tim thay thu muc dataset: {dataset_dir}", flush=True)
        return

    # 1. Tải Dataset gốc (chưa qua transform để tránh leakage)
    base_dataset = datasets.ImageFolder(root=dataset_dir)
    print(f"Tong so anh: {len(base_dataset)}", flush=True)
    print(f"Cac lop phan loai: {base_dataset.classes}", flush=True)
    
    # 2. Loc bo file bi thieu, phan chia Train/Val
    valid_indices = get_valid_indices(base_dataset)
    targets = np.array(base_dataset.targets)
    valid_targets = targets[valid_indices]
    train_idx_local, val_idx_local = train_test_split(
        np.arange(len(valid_indices)),
        test_size=0.2,
        shuffle=True,
        stratify=valid_targets,
        random_state=42
    )
    train_idx = valid_indices[train_idx_local]
    val_idx   = valid_indices[val_idx_local]
    
    # 3. Ép kiểu Transform (Đảm bảo Train bị Augment, Val thì không)
    train_dataset = SkinDatasetWrapper(Subset(base_dataset, train_idx), transform=train_transforms)
    val_dataset = SkinDatasetWrapper(Subset(base_dataset, val_idx), transform=test_transforms)
    
    dataloaders = {
        'train': DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True, num_workers=0),
        'val': DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)
    }
    
    dataset_sizes = {'train': len(train_dataset), 'val': len(val_dataset)}
    
    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
    print(f"Su dung thiet bi: {device}", flush=True)
    print("Dang tai mo hinh ResNet50 tu Internet (neu chua co)... Vui long doi!", flush=True)
    
    # Tinh hoa từ Bài 3: Deep Learning CNN (ResNet50)
    model = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V2)
    num_ftrs = model.fc.in_features
    model.fc = nn.Linear(num_ftrs, NUM_CLASSES)
    
    # --- THÊM TÍNH NĂNG TRAIN TIẾP (RESUME TRAINING) ---
    if os.path.exists(model_save_path):
        print(f"\n[INFO] Phat hien mo hinh da train. Dang tai weights de TRAIN TIEP tu: {model_save_path}", flush=True)
        # Load weights cũ vào kiến trúc mạng
        model.load_state_dict(torch.load(model_save_path, map_location=device))
    else:
        print("\n[INFO] Khong co mo hinh cu. Bat dau train tu dau (From scratch)...", flush=True)

    model = model.to(device)
    
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE)
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=5, gamma=0.1)
    
    best_model_wts = copy.deepcopy(model.state_dict())
    best_acc = 0.0
    
    for epoch in range(EPOCHS):
        print(f'Epoch {epoch+1}/{EPOCHS}')
        print('-' * 10)
        
        for phase in ['train', 'val']:
            if phase == 'train':
                model.train()
            else:
                model.eval()
                
            running_loss = 0.0
            running_corrects = 0
            
            all_preds = []
            all_labels = []
            
            print(f"Bat dau chay {phase}...", flush=True)
            for inputs, labels in tqdm(dataloaders[phase], desc=f"{phase} Epoch {epoch+1}/{EPOCHS}"):
                inputs = inputs.to(device)
                labels = labels.to(device)
                
                optimizer.zero_grad()
                
                with torch.set_grad_enabled(phase == 'train'):
                    outputs = model(inputs)
                    _, preds = torch.max(outputs, 1)
                    loss = criterion(outputs, labels)
                    
                    if phase == 'train':
                        loss.backward()
                        optimizer.step()
                        
                running_loss += loss.item() * inputs.size(0)
                running_corrects += torch.sum(preds == labels.data)
                
                if phase == 'val':
                    all_preds.extend(preds.cpu().numpy())
                    all_labels.extend(labels.cpu().numpy())
                
            if phase == 'train':
                scheduler.step()
                
            epoch_loss = running_loss / dataset_sizes[phase]
            epoch_acc = running_corrects.double() / dataset_sizes[phase]
            
            print(f'{phase} Loss: {epoch_loss:.4f} Acc: {epoch_acc:.4f}', flush=True)
            
            if phase == 'val':
                print(f"\n[Validation Report - Epoch {epoch+1}]")
                try:
                    target_names = base_dataset.classes
                    print(classification_report(all_labels, all_preds, target_names=target_names, zero_division=0))
                except Exception as e:
                    print(f"Loi in report: {e}")
                    
            if phase == 'val' and epoch_acc > best_acc:
                best_acc = epoch_acc
                best_model_wts = copy.deepcopy(model.state_dict())
                os.makedirs(os.path.dirname(model_save_path), exist_ok=True)
                torch.save(model.state_dict(), model_save_path)
                print(f"Da luu mo hinh tot nhat voi do chinh xac {best_acc:.4f}", flush=True)
        print()

    print(f'Dao tao hoan tat! Do chinh xac cao nhat (Validation): {best_acc:4f}', flush=True)

if __name__ == '__main__':
    train_model()
