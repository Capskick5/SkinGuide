from __future__ import annotations

import argparse
import csv
import hashlib
import json
import random
from pathlib import Path

import numpy as np
import torch
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from torch import nn
from torch.utils.data import DataLoader
from torchvision import datasets, models, transforms
from tqdm import tqdm


CLASS_NAMES = ["Dry", "Normal", "Oily"]
EXPECTED_CLASS_TO_INDEX = {name.lower(): index for index, name in enumerate(CLASS_NAMES)}
IMAGE_SIZE = 224
NORMALIZATION_MEAN = [0.485, 0.456, 0.406]
NORMALIZATION_STD = [0.229, 0.224, 0.225]


def seed_everything(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)


def choose_device(requested: str) -> torch.device:
    if requested != "auto":
        return torch.device(requested)
    if torch.backends.mps.is_available():
        return torch.device("mps")
    if torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")


def file_sha256(path: Path | None) -> str | None:
    if path is None:
        return None
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def make_transforms() -> tuple[transforms.Compose, transforms.Compose]:
    train_transform = transforms.Compose(
        [
            transforms.Resize((256, 256)),
            transforms.RandomResizedCrop(IMAGE_SIZE, scale=(0.85, 1.0)),
            transforms.RandomHorizontalFlip(),
            transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.2, hue=0.1),
            transforms.GaussianBlur(kernel_size=3),
            transforms.RandomAdjustSharpness(sharpness_factor=2),
            transforms.ToTensor(),
            transforms.Normalize(NORMALIZATION_MEAN, NORMALIZATION_STD),
        ]
    )
    evaluation_transform = transforms.Compose(
        [
            transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
            transforms.ToTensor(),
            transforms.Normalize(NORMALIZATION_MEAN, NORMALIZATION_STD),
        ]
    )
    return train_transform, evaluation_transform


def build_model(pretrained: bool = True) -> nn.Module:
    weights = models.ResNet50_Weights.IMAGENET1K_V2 if pretrained else None
    model = models.resnet50(weights=weights)
    model.fc = nn.Linear(model.fc.in_features, len(CLASS_NAMES))
    return model


def calculate_metrics(targets: list[int], predictions: list[int]) -> dict:
    report = classification_report(
        targets,
        predictions,
        labels=list(range(len(CLASS_NAMES))),
        target_names=CLASS_NAMES,
        output_dict=True,
        zero_division=0,
    )
    return {
        "accuracy": float(accuracy_score(targets, predictions)),
        "macro_f1": float(f1_score(targets, predictions, labels=[0, 1, 2], average="macro", zero_division=0)),
        "per_class": {name: report[name] for name in CLASS_NAMES},
        "confusion_matrix": confusion_matrix(targets, predictions, labels=[0, 1, 2]).tolist(),
    }


def run_epoch(model, loader, criterion, device, optimizer=None) -> dict:
    training = optimizer is not None
    model.train(training)
    total_loss = 0.0
    total = 0
    targets = []
    predictions = []

    for images, labels in tqdm(loader, leave=False):
        images = images.to(device)
        labels = labels.to(device)
        if training:
            optimizer.zero_grad(set_to_none=True)
        with torch.set_grad_enabled(training):
            logits = model(images)
            loss = criterion(logits, labels)
            if training:
                loss.backward()
                optimizer.step()
        total_loss += float(loss.detach().cpu()) * labels.size(0)
        total += labels.size(0)
        targets.extend(labels.detach().cpu().tolist())
        predictions.extend(logits.argmax(dim=1).detach().cpu().tolist())

    metrics = calculate_metrics(targets, predictions)
    metrics["loss"] = total_loss / total
    return metrics


def collect_logits(model, loader, device) -> tuple[torch.Tensor, torch.Tensor]:
    model.eval()
    logits_parts = []
    target_parts = []
    with torch.no_grad():
        for images, labels in loader:
            logits_parts.append(model(images.to(device)).cpu())
            target_parts.append(labels.cpu())
    return torch.cat(logits_parts), torch.cat(target_parts)


def choose_temperature(logits: torch.Tensor, targets: torch.Tensor) -> float:
    criterion = nn.CrossEntropyLoss()
    candidates = torch.linspace(0.5, 5.0, steps=91)
    losses = [float(criterion(logits / temperature, targets)) for temperature in candidates]
    return float(candidates[int(np.argmin(losses))])


def calibration_metrics(logits: torch.Tensor, targets: torch.Tensor, temperature: float, bins: int = 10) -> dict:
    probabilities = torch.softmax(logits / temperature, dim=1)
    confidences, predictions = probabilities.max(dim=1)
    correct = predictions.eq(targets)
    expected_calibration_error = 0.0
    boundaries = torch.linspace(0.0, 1.0, bins + 1)
    for index in range(bins):
        mask = (confidences > boundaries[index]) & (confidences <= boundaries[index + 1])
        if mask.any():
            expected_calibration_error += float(mask.float().mean()) * abs(
                float(correct[mask].float().mean()) - float(confidences[mask].mean())
            )
    one_hot = torch.nn.functional.one_hot(targets, num_classes=len(CLASS_NAMES)).float()
    brier_score = float(torch.mean(torch.sum((probabilities - one_hot) ** 2, dim=1)))
    return {
        "temperature": temperature,
        "expected_calibration_error": expected_calibration_error,
        "brier_score": brier_score,
        "mean_confidence": float(confidences.mean()),
    }


def choose_reliability_threshold(
    logits: torch.Tensor,
    targets: torch.Tensor,
    temperature: float,
    target_accuracy: float = 0.8,
    minimum_coverage: float = 0.5,
) -> tuple[float, dict]:
    probabilities = torch.softmax(logits / temperature, dim=1)
    confidences, predictions = probabilities.max(dim=1)
    candidates = np.arange(0.5, 0.91, 0.05)
    measurements = {}
    selected = float(candidates[-1])
    for threshold in candidates:
        mask = confidences >= threshold
        coverage = float(mask.float().mean())
        accuracy = float(predictions[mask].eq(targets[mask]).float().mean()) if mask.any() else 0.0
        measurements[f"{threshold:.2f}"] = {"coverage": coverage, "accuracy": accuracy}
        if accuracy >= target_accuracy and coverage >= minimum_coverage:
            selected = float(threshold)
            break
    return selected, measurements


def save_history(path: Path, history: list[dict]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(history[0]))
        writer.writeheader()
        writer.writerows(history)


def main() -> None:
    parser = argparse.ArgumentParser(description="Train a leakage-safe, production-aligned ResNet50 skin-type model.")
    parser.add_argument("--data-root", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--manifest", type=Path)
    parser.add_argument("--audit-report", type=Path)
    parser.add_argument("--epochs", type=int, default=25)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--learning-rate", type=float, default=1e-4)
    parser.add_argument("--weight-decay", type=float, default=1e-4)
    parser.add_argument("--patience", type=int, default=6)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--device", default="auto")
    parser.add_argument("--num-workers", type=int, default=0)
    parser.add_argument("--no-pretrained", action="store_true")
    args = parser.parse_args()

    if args.epochs < 1 or args.patience < 1:
        raise ValueError("epochs and patience must be positive")
    args.output_dir.mkdir(parents=True, exist_ok=True)
    seed_everything(args.seed)
    device = choose_device(args.device)
    print(f"Using device: {device} for ResNet50 training")
    train_transform, evaluation_transform = make_transforms()
    train_dataset = datasets.ImageFolder(args.data_root / "train", transform=train_transform)
    validation_dataset = datasets.ImageFolder(args.data_root / "validation", transform=evaluation_transform)
    test_dataset = datasets.ImageFolder(args.data_root / "test", transform=evaluation_transform)
    for dataset in (train_dataset, validation_dataset, test_dataset):
        if dataset.class_to_idx != EXPECTED_CLASS_TO_INDEX:
            raise RuntimeError(f"Unexpected class order: {dataset.class_to_idx}")

    generator = torch.Generator().manual_seed(args.seed)
    train_loader = DataLoader(
        train_dataset,
        batch_size=args.batch_size,
        shuffle=True,
        num_workers=args.num_workers,
        generator=generator,
    )
    validation_loader = DataLoader(validation_dataset, batch_size=args.batch_size, shuffle=False, num_workers=args.num_workers)
    test_loader = DataLoader(test_dataset, batch_size=args.batch_size, shuffle=False, num_workers=args.num_workers)

    class_counts = np.bincount(train_dataset.targets, minlength=len(CLASS_NAMES))
    class_weights = len(train_dataset) / (len(CLASS_NAMES) * class_counts)
    criterion = nn.CrossEntropyLoss(weight=torch.tensor(class_weights, dtype=torch.float32, device=device))
    model = build_model(pretrained=not args.no_pretrained).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.learning_rate, weight_decay=args.weight_decay)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode="max", factor=0.3, patience=3)

    best_validation_f1 = -1.0
    best_epoch = 0
    epochs_without_improvement = 0
    training_state_path = args.output_dir / "best_training_state.pt"
    history = []
    for epoch in range(1, args.epochs + 1):
        train_metrics = run_epoch(model, train_loader, criterion, device, optimizer)
        validation_metrics = run_epoch(model, validation_loader, criterion, device)
        scheduler.step(validation_metrics["macro_f1"])
        row = {
            "epoch": epoch,
            "learning_rate": optimizer.param_groups[0]["lr"],
            "train_loss": train_metrics["loss"],
            "train_accuracy": train_metrics["accuracy"],
            "train_macro_f1": train_metrics["macro_f1"],
            "validation_loss": validation_metrics["loss"],
            "validation_accuracy": validation_metrics["accuracy"],
            "validation_macro_f1": validation_metrics["macro_f1"],
        }
        history.append(row)
        save_history(args.output_dir / "history.csv", history)
        print(json.dumps(row))

        if validation_metrics["macro_f1"] > best_validation_f1:
            best_validation_f1 = validation_metrics["macro_f1"]
            best_epoch = epoch
            epochs_without_improvement = 0
            torch.save(model.state_dict(), training_state_path)
        else:
            epochs_without_improvement += 1
            if epochs_without_improvement >= args.patience:
                print(f"Using device: {device}\nEarly stopping at epoch {epoch}.")
                break

    model.load_state_dict(torch.load(training_state_path, map_location=device))
    validation_logits, validation_targets = collect_logits(model, validation_loader, device)
    temperature = choose_temperature(validation_logits, validation_targets)
    minimum_confidence, reliability_validation = choose_reliability_threshold(
        validation_logits,
        validation_targets,
        temperature,
    )
    test_logits, test_targets = collect_logits(model, test_loader, device)
    test_predictions = (test_logits / temperature).argmax(dim=1).tolist()
    test_metrics = calculate_metrics(test_targets.tolist(), test_predictions)
    test_metrics["calibration"] = calibration_metrics(test_logits, test_targets, temperature)

    dataset_metadata = {
        "source": "Kaggle Oily, Dry and Normal Skin Types Dataset",
        "source_url": "https://www.kaggle.com/datasets/shakyadissanayake/oily-dry-and-normal-skin-types-dataset",
        "license": "Apache-2.0",
        "prepared_counts": {
            "train": len(train_dataset),
            "validation": len(validation_dataset),
            "test": len(test_dataset),
        },
        "manifest_sha256": file_sha256(args.manifest),
        "audit_report_sha256": file_sha256(args.audit_report),
        "split_policy": "visual duplicate groups remain in exactly one split",
        "input_policy": "all images passed the production face guard and cropper",
    }
    checkpoint = {
        "model_state_dict": model.state_dict(),
        "model": "resnet50",
        "class_names": CLASS_NAMES,
        "epoch": best_epoch,
        "best_val_macro_f1": best_validation_f1,
        "temperature": temperature,
        "minimum_confidence": minimum_confidence,
        "reliability_policy": {
            "target_accuracy": 0.8,
            "minimum_coverage": 0.5,
            "validation_measurements": reliability_validation,
        },
        "preprocessing": {
            "image_size": IMAGE_SIZE,
            "mean": NORMALIZATION_MEAN,
            "std": NORMALIZATION_STD,
            "production_face_crop_required": True,
        },
        "dataset": dataset_metadata,
        "training": {
            "seed": args.seed,
            "optimizer": "AdamW",
            "learning_rate": args.learning_rate,
            "weight_decay": args.weight_decay,
            "class_weights": class_weights.tolist(),
        },
        "test_metrics": test_metrics,
    }
    checkpoint_path = args.output_dir / "skin_type_ResNet50_candidate.pt"
    torch.save(checkpoint, checkpoint_path)
    (args.output_dir / "test_metrics.json").write_text(json.dumps(test_metrics, indent=2), encoding="utf-8")
    (args.output_dir / "dataset_metadata.json").write_text(json.dumps(dataset_metadata, indent=2), encoding="utf-8")
    print(json.dumps({"checkpoint": str(checkpoint_path), "test_metrics": test_metrics}, indent=2))


if __name__ == "__main__":
    main()

