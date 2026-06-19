import numpy as np
import pandas as pd
from copy import deepcopy
from torchvision import transforms
from torchvision.models import resnet50, ResNet50_Weights
from sklearn.model_selection import train_test_split
from torch.utils.data import Dataset, DataLoader
import torch
import torch.nn as nn
from PIL import Image
import os

label_index = {"dry": 0, "normal": 1, "oily": 2}
index_label = {0: "dry", 1: "normal", 2: "oily"}

def create_df(base):
    dd = {"images": [], "labels": []}
    if not os.path.exists(base):
        print(f"Warning: Directory not found: {base}")
        return pd.DataFrame(dd)
        
    for i in os.listdir(base):
        label_dir = os.path.join(base, i)
        if not os.path.isdir(label_dir) or i not in label_index:
            continue
        for j in os.listdir(label_dir):
            img = os.path.join(label_dir, j)
            dd["images"] += [img]
            dd["labels"] += [label_index[i]]
    return pd.DataFrame(dd)

if __name__ == '__main__':
    # Đường dẫn tương đối từ vị trí chạy script
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dataset_dir = os.path.join(base_dir, "datasets", "Oily-Dry-Skin-Types")
    
    train_df = create_df(os.path.join(dataset_dir, "train"))
    val_df = create_df(os.path.join(dataset_dir, "valid"))
    test_df = create_df(os.path.join(dataset_dir, "test"))
    
    train_df = pd.concat([train_df, val_df, test_df])
    
    # Configuration
    EPOCHS = 20  # Huấn luyện đủ 20 vòng để độ chính xác cao nhất
    LR = 0.1
    STEP = 15
    GAMMA = 0.1
    BATCH = 32
    OUT_CLASSES = 3
    IMG_SIZE = 224

    class CloudDS(Dataset):
        def __init__(self, data, transform):
            super(CloudDS, self).__init__()
            self.data = data
            self.transform = transform
            
        def __len__(self):
            return len(self.data)
        
        def __getitem__(self, x):
            img, label = self.data.iloc[x, 0], self.data.iloc[x, 1]
            img = Image.open(img).convert("RGB")
            img = self.transform(np.array(img))
            
            return img, label

    train_transform = transforms.Compose([transforms.ToPILImage(),
                                   transforms.ToTensor(),
                                   transforms.Resize((IMG_SIZE, IMG_SIZE)),
                                    transforms.RandomVerticalFlip(0.6),
                                   transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225])])

    transform = transforms.Compose([transforms.ToPILImage(),
                                   transforms.ToTensor(),
                                   transforms.Resize((IMG_SIZE, IMG_SIZE)),
                                   transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225])])

    train, testing = train_test_split(train_df, random_state=42, test_size=0.2)
    val, test = train_test_split(testing, random_state=42, test_size=0.5)

    train_ds = CloudDS(train, train_transform)
    val_ds = CloudDS(val, transform)

    # Note: Added num_workers=0 to prevent multiprocessing issues on Windows
    train_dl = DataLoader(train_ds, batch_size=BATCH, shuffle=True, num_workers=0)
    val_dl = DataLoader(val_ds, batch_size=BATCH, shuffle=False, num_workers=0)

    print("Downloading/Loading ResNet50...")
    resnet = resnet50(weights=ResNet50_Weights.IMAGENET1K_V2)
    num_ftrs = resnet.fc.in_features
    resnet.fc.in_features = nn.Linear(num_ftrs, OUT_CLASSES)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Using device: {device}")

    model = deepcopy(resnet)
    model = model.to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.SGD(model.parameters(), lr=LR)
    scheduler = torch.optim.lr_scheduler.StepLR(optimizer, step_size=STEP, gamma=GAMMA)

    best_model = deepcopy(model)
    best_acc = 0

    train_loss = []
    train_acc = []
    val_loss = []
    val_acc = []
    
    print(f"Starting skin type classification training with {EPOCHS} epochs...")

    for i in range(1, EPOCHS+1):
        model.train()
        
        diff = 0
        total = 0
        acc = 0
        
        for data, target in train_dl:
            optimizer.zero_grad()
            if torch.cuda.is_available():
                data, target = data.cuda(), target.cuda()
                
            out = model(data)
            loss = criterion(out, target)
            diff += loss.item()
            acc += (out.argmax(1) == target).sum().item()
            total += out.size(0)
            loss.backward()
            optimizer.step()
            
        train_loss += [diff/total]
        train_acc += [acc/total]
        
        model.eval()
        
        diff = 0
        total = 0
        acc = 0
        
        with torch.no_grad():
            for data, target in val_dl:
                if torch.cuda.is_available():
                    data, target = data.cuda(), target.cuda()
                    
                out = model(data)
                loss = criterion(out, target)
                diff += loss.item()
                acc += (out.argmax(1) == target).sum().item()
                total += out.size(0)
                
        val_loss += [diff/total]
        val_acc += [acc/total]
        
        if val_acc[-1] > best_acc:
            best_acc = val_acc[-1]
            best_model = deepcopy(model)
            
        scheduler.step()
        
        print("Epoch {} | train loss: {:.4f} acc: {:.4f} | val loss: {:.4f} acc: {:.4f}".format(
            i, train_loss[-1], train_acc[-1], val_loss[-1], val_acc[-1]))

    # Lưu lại file trọng số
    model_dir = os.path.join(base_dir, "models")
    os.makedirs(model_dir, exist_ok=True)
    save_path = os.path.join(model_dir, "resnet_skin_type.pth")
    torch.save(best_model.state_dict(), save_path)
    print(f"Training complete! Saved best model ({best_acc*100:.2f}% validation accuracy) at: {save_path}")
