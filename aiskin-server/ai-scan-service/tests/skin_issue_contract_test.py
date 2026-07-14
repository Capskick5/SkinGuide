import unittest

import torch

from app.services.ultimate_skin_inference import (
    EXPECTED_CLASS_NAMES,
    multilabel_probabilities,
    validate_checkpoint_metadata,
)


def valid_metadata():
    return {
        "model_state_dict": {},
        "model": "resnet50_multilabel",
        "task": "multi_label_classification",
        "class_names": EXPECTED_CLASS_NAMES,
        "preprocessing": {
            "image_size": 224,
            "mean": [0.485, 0.456, 0.406],
            "std": [0.229, 0.224, 0.225],
        },
        "decision_thresholds": {label: 0.5 for label in EXPECTED_CLASS_NAMES},
        "evidence": {"dataset": "licensed-dataset", "test_metrics": {"macro_f1": 0.7}},
    }


class SkinIssueContractTest(unittest.TestCase):
    def test_accepts_multiple_simultaneous_issues(self):
        logits = torch.tensor([[2.0, -2.0, 1.0, -1.0, 0.8, -0.5, -3.0]])
        probabilities = multilabel_probabilities(logits)

        detected = [
            EXPECTED_CLASS_NAMES[index]
            for index, probability in enumerate(probabilities[0])
            if float(probability) >= 0.5
        ]
        self.assertEqual(detected, ["Acne", "Dark_Spots", "Pores"])

    def test_rejects_legacy_single_label_checkpoint(self):
        checkpoint = valid_metadata()
        checkpoint["task"] = "single_label_classification"

        with self.assertRaisesRegex(ValueError, "multi-label"):
            validate_checkpoint_metadata(checkpoint)

    def test_requires_threshold_for_every_label(self):
        checkpoint = valid_metadata()
        checkpoint["decision_thresholds"].pop("Wrinkles")

        with self.assertRaisesRegex(ValueError, "decision_thresholds"):
            validate_checkpoint_metadata(checkpoint)

    def test_requires_independent_test_evidence(self):
        checkpoint = valid_metadata()
        checkpoint["evidence"] = {"dataset": "licensed-dataset", "test_metrics": {}}

        with self.assertRaisesRegex(ValueError, "test macro F1"):
            validate_checkpoint_metadata(checkpoint)


if __name__ == "__main__":
    unittest.main()
