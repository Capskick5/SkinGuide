import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image


MODULE_PATH = Path(__file__).resolve().parents[1] / "training" / "audit_skin_type_dataset.py"
SPEC = importlib.util.spec_from_file_location("dataset_audit", MODULE_PATH)
dataset_audit = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
sys.modules[SPEC.name] = dataset_audit
SPEC.loader.exec_module(dataset_audit)


class DatasetAuditTest(unittest.TestCase):
    def test_visual_duplicates_share_one_clean_split(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            dataset_root = root / "Skin Type Identification Research"
            colors = {"Dry": "red", "Normal": "green", "Oily": "blue"}
            for split in ("Train", "Validation", "Test"):
                for class_name, color in colors.items():
                    target = dataset_root / split / class_name
                    target.mkdir(parents=True)
                    Image.new("RGB", (64, 64), color).save(target / f"{split.lower()}.png")

            records = dataset_audit.collect_records(dataset_root, tuple(colors))
            groups = dataset_audit.group_similar_images(records, threshold=0)
            assignments = dataset_audit.assign_group_splits(records, groups, seed=42, train_ratio=0.8, validation_ratio=0.1)
            report = dataset_audit.build_report(records, groups, threshold=0)

            self.assertEqual(len(groups), 3)
            self.assertEqual(len(assignments), 3)
            self.assertEqual(report["cross_split_visual_group_count"], 3)
            self.assertTrue(report["leakage_detected"])

    def test_find_dataset_root_accepts_extracted_parent(self):
        with tempfile.TemporaryDirectory() as directory:
            expected = Path(directory) / "extracted" / "Skin Type Identification Research"
            for split in ("Train", "Validation", "Test"):
                (expected / split).mkdir(parents=True)

            actual = dataset_audit.find_dataset_root(Path(directory))

            self.assertEqual(actual, expected)


if __name__ == "__main__":
    unittest.main()
