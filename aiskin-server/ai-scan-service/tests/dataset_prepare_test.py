import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / "training" / "prepare_skin_type_dataset.py"
TRAINING_DIR = MODULE_PATH.parent
if str(TRAINING_DIR) not in sys.path:
    sys.path.insert(0, str(TRAINING_DIR))
SPEC = importlib.util.spec_from_file_location("dataset_prepare", MODULE_PATH)
dataset_prepare = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
sys.modules[SPEC.name] = dataset_prepare
SPEC.loader.exec_module(dataset_prepare)


class DatasetPrepareTest(unittest.TestCase):
    def test_rejects_manifest_path_traversal(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "dataset"
            root.mkdir()
            outside = Path(directory) / "outside.jpg"
            outside.write_bytes(b"image")

            with self.assertRaisesRegex(ValueError, "escapes dataset root"):
                dataset_prepare.resolve_dataset_file(root, "../outside.jpg")

    def test_resolves_existing_image_inside_dataset(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            image = root / "train" / "dry" / "sample.jpg"
            image.parent.mkdir(parents=True)
            image.write_bytes(b"image")

            actual = dataset_prepare.resolve_dataset_file(root, "train/dry/sample.jpg")

            self.assertEqual(actual, image.resolve())


if __name__ == "__main__":
    unittest.main()
