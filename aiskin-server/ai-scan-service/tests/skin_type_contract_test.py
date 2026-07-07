import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ROOT.parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.services.skin_type_inference import SkinTypeDetector
from app.utils.face_cropper import crop_face_from_bytes


def main():
    sample_paths = sorted((REPO_ROOT / "photo-test").glob("*.jpg"))[:5]
    if not sample_paths:
        raise RuntimeError("No sample images found in photo-test.")

    detector = SkinTypeDetector()
    checked = []

    for path in sample_paths:
        try:
            cropped = crop_face_from_bytes(path.read_bytes())
            result = detector.predict_with_probabilities(cropped)
        except ValueError:
            continue

        probabilities = result.get("probabilities", {})
        expected_labels = {"Dry", "Normal", "Oily"}
        if set(probabilities) != expected_labels:
            raise AssertionError(f"{path.name}: unexpected labels {sorted(probabilities)}")

        total_probability = sum(float(value) for value in probabilities.values())
        if abs(total_probability - 1.0) > 0.001:
            raise AssertionError(f"{path.name}: probability sum is {total_probability}")

        predicted = result.get("predicted")
        confidence = float(result.get("confidence", -1))
        if predicted not in expected_labels:
            raise AssertionError(f"{path.name}: invalid predicted label {predicted}")
        if not 0.0 <= confidence <= 1.0:
            raise AssertionError(f"{path.name}: invalid confidence {confidence}")
        if abs(confidence - float(probabilities[predicted])) > 0.0001:
            raise AssertionError(f"{path.name}: confidence does not match predicted probability")

        checked.append(
            {
                "file": path.name,
                "predicted": predicted,
                "confidence": round(confidence, 4),
                "probabilities": {key: round(float(value), 4) for key, value in probabilities.items()},
            }
        )

    if not checked:
        raise RuntimeError("No valid face image passed the AI guard for Model A contract test.")

    for item in checked:
        print(item)


if __name__ == "__main__":
    main()
