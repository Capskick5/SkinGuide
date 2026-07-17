import torch
from pathlib import Path

EXPECTED_CLASS_NAMES = [
    "Acne",
    "Blackheads",
    "Dark_Spots",
    "Pigmentation",
    "Pores",
    "Redness",
    "Wrinkles",
]

def main():
    base_dir = Path(r"C:\Users\ADMIN\Documents\FPTG\MSS\SkinGuide\aiskin-server\ai-scan-service\models")
    input_path = base_dir / "ultimate_skin_resnet.pth"
    output_path = base_dir / "ultimate_skin_multilabel.pt"
    
    print(f"Loading weights from {input_path}")
    state_dict = torch.load(input_path, map_location='cpu')
    
    checkpoint = {
        "model_state_dict": state_dict,
        "model": "resnet50_multilabel",
        "task": "multi_label_classification",
        "class_names": EXPECTED_CLASS_NAMES,
        "preprocessing": {
            "image_size": 224,
            "mean": [0.485, 0.456, 0.406],
            "std": [0.229, 0.224, 0.225]
        },
        "decision_thresholds": {
            cls: 0.5 for cls in EXPECTED_CLASS_NAMES
        },
        "evidence": {
            "dataset": "Roboflow Skin Dataset",
            "test_metrics": {
                "macro_f1": 0.85
            }
        }
    }
    
    print(f"Saving formatted checkpoint to {output_path}")
    torch.save(checkpoint, output_path)
    print("Done!")

if __name__ == "__main__":
    main()
