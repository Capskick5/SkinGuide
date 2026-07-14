from __future__ import annotations

import argparse
import csv
import hashlib
import json
import random
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image


IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}
DEFAULT_CLASSES = ("Dry", "Normal", "Oily")
SPLIT_ALIASES = {
    "train": "train",
    "validation": "validation",
    "valid": "validation",
    "val": "validation",
    "test": "test",
}


@dataclass(frozen=True)
class ImageRecord:
    path: Path
    relative_path: str
    original_split: str
    class_name: str
    sha256: str
    dhash: int


class DisjointSet:
    def __init__(self, size: int):
        self.parent = list(range(size))

    def find(self, index: int) -> int:
        while self.parent[index] != index:
            self.parent[index] = self.parent[self.parent[index]]
            index = self.parent[index]
        return index

    def union(self, left: int, right: int) -> None:
        left_root = self.find(left)
        right_root = self.find(right)
        if left_root != right_root:
            self.parent[right_root] = left_root


def normalize_split(value: str) -> str | None:
    return SPLIT_ALIASES.get(value.strip().lower())


def find_dataset_root(path: Path) -> Path:
    candidates = [path, path / "Skin Type Identification Research", path / "extracted" / "Skin Type Identification Research"]
    for candidate in candidates:
        split_names = {normalize_split(child.name) for child in candidate.iterdir()} if candidate.is_dir() else set()
        if {"train", "validation", "test"}.issubset(split_names):
            return candidate
    raise FileNotFoundError(f"Could not find Train/Validation/Test below {path}")


def compute_dhash(image: Image.Image) -> int:
    grayscale = image.convert("L").resize((9, 8), Image.Resampling.LANCZOS)
    pixels = np.asarray(grayscale, dtype=np.int16)
    bits = pixels[:, 1:] > pixels[:, :-1]
    value = 0
    for bit in bits.flatten():
        value = (value << 1) | int(bit)
    return value


def hamming_distance(left: int, right: int) -> int:
    return bin(left ^ right).count("1")


def collect_records(dataset_root: Path, class_names: tuple[str, ...]) -> list[ImageRecord]:
    records = []
    for split_dir in sorted(dataset_root.iterdir()):
        split = normalize_split(split_dir.name)
        if split is None or not split_dir.is_dir():
            continue
        for class_name in class_names:
            class_dir = split_dir / class_name
            if not class_dir.is_dir():
                raise FileNotFoundError(f"Missing class directory: {class_dir}")
            for path in sorted(class_dir.iterdir()):
                if not path.is_file() or path.suffix.lower() not in IMAGE_SUFFIXES:
                    continue
                raw = path.read_bytes()
                with Image.open(path) as image:
                    dhash = compute_dhash(image)
                records.append(
                    ImageRecord(
                        path=path,
                        relative_path=str(path.relative_to(dataset_root)),
                        original_split=split,
                        class_name=class_name,
                        sha256=hashlib.sha256(raw).hexdigest(),
                        dhash=dhash,
                    )
                )
    if not records:
        raise ValueError(f"No images found below {dataset_root}")
    return records


def group_similar_images(records: list[ImageRecord], threshold: int) -> list[list[int]]:
    groups = DisjointSet(len(records))
    exact_indexes = defaultdict(list)
    for index, record in enumerate(records):
        exact_indexes[record.sha256].append(index)
    for indexes in exact_indexes.values():
        for index in indexes[1:]:
            groups.union(indexes[0], index)

    # The datasets used here contain only a few thousand images. Comparing hashes
    # per class is deterministic and prevents visually duplicated subjects leaking.
    class_indexes = defaultdict(list)
    for index, record in enumerate(records):
        class_indexes[record.class_name].append(index)
    for indexes in class_indexes.values():
        for offset, left in enumerate(indexes):
            for right in indexes[offset + 1 :]:
                if hamming_distance(records[left].dhash, records[right].dhash) <= threshold:
                    groups.union(left, right)

    grouped = defaultdict(list)
    for index in range(len(records)):
        grouped[groups.find(index)].append(index)
    return sorted(grouped.values(), key=lambda indexes: min(records[index].relative_path for index in indexes))


def assign_group_splits(
    records: list[ImageRecord],
    groups: list[list[int]],
    seed: int,
    train_ratio: float,
    validation_ratio: float,
) -> dict[int, str]:
    assignments = {}
    rng = random.Random(seed)
    groups_by_class = defaultdict(list)
    for group_id, indexes in enumerate(groups):
        labels = {records[index].class_name for index in indexes}
        if len(labels) != 1:
            continue
        groups_by_class[next(iter(labels))].append((group_id, indexes))

    for class_name in sorted(groups_by_class):
        class_groups = groups_by_class[class_name]
        rng.shuffle(class_groups)
        total = sum(len(indexes) for _, indexes in class_groups)
        targets = {
            "train": total * train_ratio,
            "validation": total * validation_ratio,
            "test": total * (1.0 - train_ratio - validation_ratio),
        }
        counts = Counter()
        for group_id, indexes in sorted(class_groups, key=lambda item: len(item[1]), reverse=True):
            split = max(targets, key=lambda name: targets[name] - counts[name])
            assignments[group_id] = split
            counts[split] += len(indexes)
    return assignments


def build_report(records: list[ImageRecord], groups: list[list[int]], threshold: int) -> dict:
    duplicate_groups = [indexes for indexes in groups if len(indexes) > 1]
    cross_split = [indexes for indexes in groups if len({records[index].original_split for index in indexes}) > 1]
    label_conflicts = [indexes for indexes in groups if len({records[index].class_name for index in indexes}) > 1]
    exact_groups = defaultdict(list)
    for index, record in enumerate(records):
        exact_groups[record.sha256].append(index)
    exact_duplicate_groups = [indexes for indexes in exact_groups.values() if len(indexes) > 1]
    exact_cross_split = [
        indexes
        for indexes in exact_duplicate_groups
        if len({records[index].original_split for index in indexes}) > 1
    ]

    return {
        "image_count": len(records),
        "independent_visual_group_count": len(groups),
        "class_counts": dict(Counter(record.class_name for record in records)),
        "original_split_counts": dict(Counter(record.original_split for record in records)),
        "dhash_hamming_threshold": threshold,
        "exact_duplicate_group_count": len(exact_duplicate_groups),
        "exact_cross_split_group_count": len(exact_cross_split),
        "visual_duplicate_group_count": len(duplicate_groups),
        "images_in_visual_duplicate_groups": sum(len(indexes) for indexes in duplicate_groups),
        "cross_split_visual_group_count": len(cross_split),
        "images_in_cross_split_visual_groups": sum(len(indexes) for indexes in cross_split),
        "label_conflict_group_count": len(label_conflicts),
        "leakage_detected": bool(cross_split),
    }


def write_manifest(
    path: Path,
    records: list[ImageRecord],
    groups: list[list[int]],
    assignments: dict[int, str],
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["relative_path", "class_name", "original_split", "clean_split", "visual_group_id", "sha256", "dhash"],
        )
        writer.writeheader()
        for group_id, indexes in enumerate(groups):
            clean_split = assignments.get(group_id, "exclude_label_conflict")
            for index in indexes:
                record = records[index]
                writer.writerow(
                    {
                        "relative_path": record.relative_path,
                        "class_name": record.class_name,
                        "original_split": record.original_split,
                        "clean_split": clean_split,
                        "visual_group_id": group_id,
                        "sha256": record.sha256,
                        "dhash": f"{record.dhash:016x}",
                    }
                )


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit skin-type images and create leakage-safe grouped splits.")
    parser.add_argument("--data-root", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--classes", nargs="+", default=list(DEFAULT_CLASSES))
    parser.add_argument("--dhash-threshold", type=int, default=4)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--train-ratio", type=float, default=0.8)
    parser.add_argument("--validation-ratio", type=float, default=0.1)
    args = parser.parse_args()

    if not 0 <= args.dhash_threshold <= 64:
        raise ValueError("dhash threshold must be between 0 and 64")
    if not 0 < args.train_ratio < 1 or not 0 < args.validation_ratio < 1:
        raise ValueError("split ratios must be between 0 and 1")
    if args.train_ratio + args.validation_ratio >= 1:
        raise ValueError("train and validation ratios must leave room for test")

    dataset_root = find_dataset_root(args.data_root)
    records = collect_records(dataset_root, tuple(args.classes))
    groups = group_similar_images(records, args.dhash_threshold)
    assignments = assign_group_splits(records, groups, args.seed, args.train_ratio, args.validation_ratio)
    report = build_report(records, groups, args.dhash_threshold)
    report.update(
        {
            "dataset_root": str(dataset_root),
            "classes": args.classes,
            "clean_split_group_counts": dict(Counter(assignments.values())),
            "clean_split_image_counts": dict(
                Counter(
                    assignments[group_id]
                    for group_id, indexes in enumerate(groups)
                    if group_id in assignments
                    for _ in indexes
                )
            ),
        }
    )

    args.output_dir.mkdir(parents=True, exist_ok=True)
    report_path = args.output_dir / "dataset_audit.json"
    manifest_path = args.output_dir / "clean_split_manifest.csv"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    write_manifest(manifest_path, records, groups, assignments)
    print(json.dumps(report, indent=2))
    print(f"Audit: {report_path}")
    print(f"Manifest: {manifest_path}")


if __name__ == "__main__":
    main()
