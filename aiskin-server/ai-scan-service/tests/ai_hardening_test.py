import base64
import io
import os
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

import jwt
import torch
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from PIL import Image


os.environ.setdefault("JWT_SECRET", base64.b64encode(b"test-secret-key-that-is-at-least-32-bytes").decode())
os.environ.setdefault("JWT_ISSUER", "aiskin-user-service")

from app.security import JWT_SECRET, verify_token
from app.services.skin_type_inference import SkinTypeDetector
from app.utils.face_cropper import crop_face_from_bytes


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

    def test_rejects_token_from_wrong_issuer(self):
        with self.assertRaises(HTTPException) as context:
            verify_token(self._credentials("attacker-service"))
        self.assertEqual(context.exception.status_code, 401)


class AiInputHardeningTest(unittest.TestCase):
    def test_unexpected_decoder_error_fails_closed(self):
        image_buffer = io.BytesIO()
        Image.new("RGB", (200, 200), "white").save(image_buffer, format="JPEG")
        with patch("app.utils.face_cropper.cv2.imdecode", side_effect=RuntimeError("decoder failed")):
            with self.assertRaisesRegex(ValueError, "Không thể kiểm định ảnh"):
                crop_face_from_bytes(image_buffer.getvalue())


class ModelCheckpointContractTest(unittest.TestCase):
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


if __name__ == "__main__":
    unittest.main()
