import torch
import torchvision
from torchvision import datasets, transforms
from torch.utils.data import DataLoader
import os

def main():
    print("Starting skin type training pipeline...")
    
    # Đường dẫn tới dataset
    data_dir = "datasets/Oily-Dry-Skin-Types"
    
    # Ở giai đoạn cơ bản, dùng transforms của Torchvision để thay đổi kích thước ảnh và chuẩn hóa
    # (Bạn có thể đổi sang Albumentations sau này để augmentation xịn hơn)
    data_transforms = {
        'train': transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.RandomHorizontalFlip(),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ]),
        'valid': transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ]),
    }

    # Load dataset bằng ImageFolder (tự động nhận diện thư mục con là tên class)
    image_datasets = {
        x: datasets.ImageFolder(os.path.join(data_dir, x), data_transforms[x])
        for x in ['train', 'valid']
    }
    
    dataloaders = {
        x: DataLoader(image_datasets[x], batch_size=32, shuffle=True, num_workers=0)
        for x in ['train', 'valid']
    }
    
    dataset_sizes = {x: len(image_datasets[x]) for x in ['train', 'valid']}
    class_names = image_datasets['train'].classes

    print(f"Dataset đã được nạp thành công!")
    print(f"Các loại da (Classes): {class_names}")
    print(f"Số lượng ảnh Train: {dataset_sizes['train']}")
    print(f"Số lượng ảnh Valid: {dataset_sizes['valid']}")
    
    # TODO: Define model (e.g. EfficientNet) and Train loop here
    pass

if __name__ == "__main__":
    main()
