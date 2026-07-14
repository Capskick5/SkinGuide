from __future__ import annotations

import argparse
import csv
import json
from collections import Counter
from pathlib import Path

from app.utils.face_cropper import crop_face_from_bytes

from audit_skin_type_dataset import find_dataset_root


CLASS_NAMES = {"dry": "Dry", "normal": "Normal", "oily": "Oily"}
VALID_SPLITS = {"train", "validation", "test"}


def resolve_dataset_file(dataset_root: Path, relative_path: str) -> Path:
    root = dataset_root.resolve()
    candidate = (root / relative_path).resolve()
    if candidate != root and root not in candidate.parents:
        raise ValueError(f"Manifest path escapes dataset root: {relative_path}")
    if not candidate.is_file():
        raise FileNotFoundError(f"Manifest image does not exist: {candidate}")
    return candidate


def prepare_dataset(dataset_root: Path, manifest_path: Path, output_dir: Path) -> dict:
    counts = Counter()
    rejected_reasons = Counter()
    output_dir.mkdir(parents=True, exist_ok=True)

    with manifest_path.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))

    for row in rows:
        split = row["clean_split"]
        if split not in VALID_SPLITS:
            counts["excluded_manifest"] += 1
            continue

        source_class = row["class_name"].strip().lower()
        class_name = CLASS_NAMES.get(source_class)
        if class_name is None:
            raise ValueError(f"Unsupported skin type class: {row['class_name']}")

        source_path = resolve_dataset_file(dataset_root, row["relative_path"])
        try:
            cropped = crop_face_from_bytes(source_path.read_bytes())
        except ValueError as exc:
            counts["rejected_by_production_guard"] += 1
            rejected_reasons[str(exc)] += 1
            continue

        group_id = int(row["visual_group_id"])
        digest = row["sha256"][:12]
        target_dir = output_dir / split / class_name
        target_dir.mkdir(parents=True, exist_ok=True)
        target_path = target_dir / f"group-{group_id:05d}-{digest}.jpg"
        if target_path.exists():
            counts["deduplicated_exact"] += 1
            continue
        target_path.write_bytes(cropped)
        counts[f"{split}/{class_name}"] += 1
        counts["prepared"] += 1

    report = {
        "dataset_root": str(dataset_root),
        "manifest": str(manifest_path),
        "output_dir": str(output_dir),
        "counts": dict(counts),
        "rejection_reasons": dict(rejected_reasons.most_common()),
    }
    (output_dir / "preparation_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Crop a leakage-safe skin-type dataset with the production face guard.")
    parser.add_argument("--data-root", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()

    dataset_root = find_dataset_root(args.data_root)
    if any((args.output_dir / split).exists() for split in VALID_SPLITS):
        raise FileExistsError(f"Output split already exists; use a new or empty directory: {args.output_dir}")

    report = prepare_dataset(dataset_root, args.manifest, args.output_dir)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
