from __future__ import annotations

import argparse
import json
from pathlib import Path

from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score

from app.services.skin_type_inference import EXPECTED_CLASS_NAMES, SkinTypeDetector


def evaluate_checkpoint(checkpoint_path: Path, test_root: Path) -> dict:
    detector = SkinTypeDetector(str(checkpoint_path))
    targets = []
    predictions = []
    confidences = []
    for target_index, class_name in enumerate(EXPECTED_CLASS_NAMES):
        class_dir = test_root / class_name
        if not class_dir.is_dir():
            raise FileNotFoundError(f"Missing test class directory: {class_dir}")
        for image_path in sorted(class_dir.glob("*.jpg")):
            result = detector.predict_with_probabilities(image_path.read_bytes())
            targets.append(target_index)
            predictions.append(EXPECTED_CLASS_NAMES.index(result["predicted"]))
            confidences.append(result["confidence"])

    report = classification_report(
        targets,
        predictions,
        labels=[0, 1, 2],
        target_names=EXPECTED_CLASS_NAMES,
        output_dict=True,
        zero_division=0,
    )
    selective_performance = {}
    for threshold in (0.5, 0.6, 0.7, 0.8):
        accepted = [index for index, confidence in enumerate(confidences) if confidence >= threshold]
        selective_performance[str(threshold)] = {
            "accepted": len(accepted),
            "coverage": len(accepted) / len(targets),
            "accuracy": (
                sum(predictions[index] == targets[index] for index in accepted) / len(accepted)
                if accepted
                else None
            ),
        }
    return {
        "checkpoint": str(checkpoint_path),
        "modelVersion": detector.model_version,
        "evidence": detector.evidence,
        "imageCount": len(targets),
        "accuracy": float(accuracy_score(targets, predictions)),
        "macroF1": float(f1_score(targets, predictions, average="macro")),
        "meanConfidence": sum(confidences) / len(confidences),
        "selectivePerformance": selective_performance,
        "perClass": {name: report[name] for name in EXPECTED_CLASS_NAMES},
        "confusionMatrix": confusion_matrix(targets, predictions, labels=[0, 1, 2]).tolist(),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate production-compatible Model A checkpoints on one clean test split.")
    parser.add_argument("--test-root", type=Path, required=True)
    parser.add_argument("--checkpoint", type=Path, action="append", required=True)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    results = [evaluate_checkpoint(path, args.test_root) for path in args.checkpoint]
    payload = json.dumps(results, indent=2)
    print(payload)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(payload, encoding="utf-8")


if __name__ == "__main__":
    main()
