import numpy as np
import pandas as pd
from torchvision import transforms
from torchvision.models import resnet50, ResNet50_Weights
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
from torch.utils.data import Dataset, DataLoader
import torch
import torch.nn as nn
from PIL import Image
import os
import matplotlib.pyplot as plt
import seaborn as sns

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

if __name__ == '__main__':
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dataset_dir = os.path.join(base_dir, "datasets", "Oily-Dry-Skin-Types")
    
    train_df = create_df(os.path.join(dataset_dir, "train"))
    val_df = create_df(os.path.join(dataset_dir, "valid"))
    test_df = create_df(os.path.join(dataset_dir, "test"))
    
    train_df = pd.concat([train_df, val_df, test_df])
    
    # Chia test set giống hệt như file training (lấy trọn 20% làm tập đánh giá)
    train, test = train_test_split(train_df, random_state=42, test_size=0.2)
    
    print(f"Evaluating on Test set with {len(test)} images.")

    IMG_SIZE = 224
    transform = transforms.Compose([
        transforms.ToPILImage(),
        transforms.ToTensor(),
        transforms.Resize((IMG_SIZE, IMG_SIZE)),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    test_ds = CloudDS(test, transform)
    test_dl = DataLoader(test_ds, batch_size=32, shuffle=False, num_workers=0)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Using device: {device}")

    print("Loading ResNet50 architecture...")
    model = resnet50(weights=ResNet50_Weights.IMAGENET1K_V2)
    num_ftrs = model.fc.in_features
    # Replicate đúng kiến trúc trong training
    model.fc.in_features = nn.Linear(num_ftrs, 3) 
    
    model_path = os.path.join(base_dir, "models", "resnet_skin_type.pth")
    if os.path.exists(model_path):
        print(f"Loading weights from {model_path}...")
        model.load_state_dict(torch.load(model_path, map_location=device))
    else:
        print(f"Error: Model not found at {model_path}")
        exit()
        
    model = model.to(device)
    model.eval()

    all_preds = []
    all_targets = []
    
    print("Starting Inference on Test set...")
    with torch.no_grad():
        for data, target in test_dl:
            data, target = data.to(device), target.to(device)
            out = model(data)
            preds = out.argmax(1)
            
            all_preds.extend(preds.cpu().numpy())
            all_targets.extend(target.cpu().numpy())

    print("\n--- CLASSIFICATION REPORT ---")
    target_names = ["Dry", "Normal", "Oily"]
    report = classification_report(all_targets, all_preds, target_names=target_names)
    print(report)
    
    # Vẽ Confusion Matrix
    cm = confusion_matrix(all_targets, all_preds)
    plt.figure(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=target_names, yticklabels=target_names)
    plt.title('Confusion Matrix - ResNet50 Skin Type Classifier')
    plt.ylabel('Thực tế (True Label)')
    plt.xlabel('Dự đoán (Predicted Label)')
    
    cm_path = os.path.join(base_dir, "models", "resnet_skin_type_cm.png")
    plt.savefig(cm_path)
    print(f"\nSaved Confusion Matrix chart to: {cm_path}")
