import base64
import io
import os
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import MagicMock, patch

import jwt
import numpy as np
import torch
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from PIL import Image


os.environ.setdefault("JWT_SECRET", base64.b64encode(b"test-secret-key-that-is-at-least-32-bytes").decode())
os.environ.setdefault("JWT_ISSUER", "aiskin-user-service")

from app.security import JWT_SECRET, verify_token
from app import main as main_module
from app.main import _fallback_skin_issue_analysis, _require_reliable_skin_type
from app.services.skin_type_inference import SkinTypeDetector, calibrated_softmax
from app.utils.face_cropper import _decode_image, _resize_for_output, crop_face_from_bytes


class JwtSecurityTest(unittest.TestCase):
    def _credentials(self, issuer):
        now = datetime.now(timezone.utc)
        token = jwt.encode(
            {
                "sub": "student-user",
                "iss": issuer,
                "iat": now,
                "exp": now + timedelta(minutes=5),
            },
            JWT_SECRET,
            algorithm="HS256",
        )
        return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

    def test_accepts_token_from_user_service(self):
        payload = verify_token(self._credentials("aiskin-user-service"))
        self.assertEqual(payload["sub"], "student-user")

    def test_rejects_missing_bearer_token_with_authentication_challenge(self):
        with self.assertRaises(HTTPException) as context:
            verify_token(None)

        self.assertEqual(context.exception.status_code, 401)
        self.assertEqual(context.exception.headers["WWW-Authenticate"], "Bearer")

    def test_rejects_token_from_wrong_issuer(self):
        with self.assertRaises(HTTPException) as context:
            verify_token(self._credentials("attacker-service"))
        self.assertEqual(context.exception.status_code, 401)

    def test_rejects_token_with_empty_subject(self):
        now = datetime.now(timezone.utc)
        token = jwt.encode(
            {
                "sub": "",
                "iss": "aiskin-user-service",
                "iat": now,
                "exp": now + timedelta(minutes=5),
            },
            JWT_SECRET,
            algorithm="HS256",
        )
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

        with self.assertRaises(HTTPException) as context:
            verify_token(credentials)

        self.assertEqual(context.exception.status_code, 401)


class AiInputHardeningTest(unittest.TestCase):
    def test_unexpected_decoder_error_fails_closed(self):
        image_buffer = io.BytesIO()
        Image.new("RGB", (200, 200), "white").save(image_buffer, format="JPEG")
        with patch("app.utils.face_cropper.ImageOps.exif_transpose", side_effect=RuntimeError("decoder failed")):
            with self.assertRaisesRegex(ValueError, "Không thể đọc định dạng ảnh"):
                crop_face_from_bytes(image_buffer.getvalue())

    def test_rejects_spoofed_unsupported_image_format(self):
        image_buffer = io.BytesIO()
        Image.new("RGB", (200, 200), "white").save(image_buffer, format="GIF")

        with self.assertRaisesRegex(ValueError, "JPG, PNG hoặc WEBP"):
            crop_face_from_bytes(image_buffer.getvalue())

    def test_applies_exif_orientation_before_face_detection(self):
        image = Image.new("RGB", (320, 180), "white")
        exif = Image.Exif()
        exif[274] = 6
        image_buffer = io.BytesIO()
        image.save(image_buffer, format="JPEG", exif=exif)

        decoded = _decode_image(image_buffer.getvalue())

        self.assertEqual(decoded.shape[:2], (320, 180))

    def test_limits_processed_preview_dimension(self):
        source = np.zeros((1600, 2400, 3), dtype=np.uint8)

        resized = _resize_for_output(source)

        self.assertEqual(resized.shape[:2], (683, 1024))

    def test_missing_skin_issue_model_does_not_report_healthy_skin(self):
        fallback = _fallback_skin_issue_analysis("weight missing")

        self.assertEqual(fallback["modelStatus"], "unavailable")
        self.assertEqual(fallback["t_zone"]["issues"], [])
        self.assertEqual(fallback["u_zone"]["issues"], [])

    def test_unreliable_skin_type_cannot_generate_routine(self):
        scan_record = {
            "skinType": {
                "predicted": "Oily",
                "confidence": 0.52,
                "minimumConfidence": 0.6,
                "reliable": False,
            }
        }

        with self.assertRaises(HTTPException) as context:
            _require_reliable_skin_type(scan_record)

        self.assertEqual(context.exception.status_code, 409)
        self.assertIn("52%", context.exception.detail)

    def test_reliable_skin_type_can_generate_routine(self):
        _require_reliable_skin_type({"skinType": {"confidence": 0.8, "reliable": True}})


class ModelCheckpointContractTest(unittest.TestCase):
    def test_temperature_scaling_reduces_overconfidence(self):
        logits = torch.tensor([[6.0, 0.0, 0.0]])

        raw_confidence = float(calibrated_softmax(logits, 1.0).max())
        calibrated_confidence = float(calibrated_softmax(logits, 2.5).max())

        self.assertLess(calibrated_confidence, raw_confidence)

    def test_rejects_invalid_temperature(self):
        with self.assertRaisesRegex(ValueError, "temperature"):
            calibrated_softmax(torch.tensor([[1.0, 0.0, 0.0]]), 0.0)

    def test_rejects_checkpoint_with_wrong_architecture(self):
        checkpoint = {
            "model_state_dict": {},
            "model": "resnet50",
            "class_names": ["Dry", "Normal", "Oily"],
            "preprocessing": {
                "image_size": 224,
                "mean": [0.485, 0.456, 0.406],
                "std": [0.229, 0.224, 0.225],
            },
        }
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "wrong-model.pt"
            torch.save(checkpoint, path)
            with self.assertRaisesRegex(ValueError, "sai kiến trúc"):
                SkinTypeDetector(str(path))


class RelatedDataCleanupTest(unittest.TestCase):
    def test_deleting_scan_also_deletes_routine_recommendations(self):
        original_db = main_module.db
        fake_db = MagicMock()
        main_module.db = fake_db
        fake_db.ai_scan_results.find_one.return_value = {
            "_id": "scan-1",
            "userId": "user-1",
        }
        try:
            with patch.object(main_module.image_store, "delete"):
                response = main_module.delete_scan_history("scan-1", "user-1")
        finally:
            main_module.db = original_db

        self.assertEqual(response["status"], "success")
        fake_db.product_recommendations.delete_many.assert_called_once_with({"scanId": "scan-1"})
        fake_db.skincare_routines.delete_many.assert_called_once_with({"scanId": "scan-1"})


if __name__ == "__main__":
    unittest.main()
