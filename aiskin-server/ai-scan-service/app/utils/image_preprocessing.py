import cv2
import numpy as np

def check_blur(image: np.ndarray, threshold: float = 100.0) -> bool:
    """
    Check if the image is too blurry using Laplacian variance.
    Returns True if the variance is below the threshold.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    variance = cv2.Laplacian(gray, cv2.CV_64F).var()
    return variance < threshold

def normalize_image(image: np.ndarray) -> np.ndarray:
    """
    Normalize image colors or size before passing to the model.
    """
    # Placeholder for actual preprocessing
    return image
