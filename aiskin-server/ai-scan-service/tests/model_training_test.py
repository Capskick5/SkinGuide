import importlib.util
import sys
import unittest
from pathlib import Path

import torch


MODULE_PATH = Path(__file__).resolve().parents[1] / "training" / "train_skin_type_mobilenet.py"
SPEC = importlib.util.spec_from_file_location("model_training", MODULE_PATH)
model_training = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
sys.modules[SPEC.name] = model_training
SPEC.loader.exec_module(model_training)


class ModelTrainingTest(unittest.TestCase):
    def test_metrics_always_report_all_three_classes(self):
        metrics = model_training.calculate_metrics([0, 1, 2], [0, 0, 2])

        self.assertEqual(set(metrics["per_class"]), {"Dry", "Normal", "Oily"})
        self.assertEqual(len(metrics["confusion_matrix"]), 3)
        self.assertAlmostEqual(metrics["accuracy"], 2 / 3)

    def test_temperature_search_reduces_overconfidence(self):
        logits = torch.tensor([[8.0, 0.0, 0.0], [8.0, 0.0, 0.0], [0.0, 8.0, 0.0]])
        targets = torch.tensor([0, 1, 1])

        temperature = model_training.choose_temperature(logits, targets)

        self.assertGreater(temperature, 1.0)

    def test_reliability_threshold_prefers_coverage_at_target_accuracy(self):
        logits = torch.tensor(
            [
                [4.0, 0.0, 0.0],
                [0.0, 4.0, 0.0],
                [0.0, 0.0, 4.0],
                [0.8, 0.7, 0.0],
            ]
        )
        targets = torch.tensor([0, 1, 2, 1])

        threshold, measurements = model_training.choose_reliability_threshold(
            logits,
            targets,
            temperature=1.0,
            target_accuracy=0.9,
            minimum_coverage=0.5,
        )

        self.assertGreaterEqual(measurements[f"{threshold:.2f}"]["accuracy"], 0.9)
        self.assertGreaterEqual(measurements[f"{threshold:.2f}"]["coverage"], 0.5)


if __name__ == "__main__":
    unittest.main()
