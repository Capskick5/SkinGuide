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

    def test_production_compatibility_reports_rejections_by_class(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            accepted = root / "accepted.jpg"
            rejected = root / "rejected.jpg"
            accepted.write_bytes(b"accepted")
            rejected.write_bytes(b"rejected")
            records = [
                dataset_audit.ImageRecord(accepted, "accepted.jpg", "train", "Dry", "a", 1),
                dataset_audit.ImageRecord(rejected, "rejected.jpg", "test", "Oily", "b", 2),
            ]

            def validator(raw):
                if raw == b"rejected":
                    raise ValueError("No face")
                return b"cropped"

            report, rows = dataset_audit.audit_production_compatibility(records, validator)

            self.assertEqual(report["accepted_count"], 1)
            self.assertEqual(report["accepted_by_class"], {"Dry": 1})
            self.assertEqual(report["rejection_reasons"], {"No face": 1})
            self.assertTrue(rows[0]["production_input_accepted"])
            self.assertFalse(rows[1]["production_input_accepted"])


if __name__ == "__main__":
    unittest.main()
