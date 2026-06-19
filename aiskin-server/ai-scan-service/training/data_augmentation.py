import albumentations as A
import cv2

def get_training_augmentation():
    """
    Returns an Albumentations composition for training.
    """
    return A.Compose([
        A.RandomBrightnessContrast(p=0.5),
        A.HorizontalFlip(p=0.5),
        A.GaussianBlur(blur_limit=3, p=0.2)
    ])
