import base64
import os
import unittest
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials


os.environ.setdefault(
    "JWT_SECRET",
    base64.b64encode(b"test-secret-key-that-is-at-least-32-bytes").decode(),
)
os.environ.setdefault("JWT_ISSUER", "aiskin-user-service")

from app.security import JWT_SECRET, get_current_user_id


class RecommendationSecurityTest(unittest.TestCase):
    def _credentials(self, subject="user-1", issuer="aiskin-user-service", expired=False):
        now = datetime.now(timezone.utc)
        expiry = now - timedelta(minutes=1) if expired else now + timedelta(minutes=5)
        token = jwt.encode(
            {"sub": subject, "iss": issuer, "iat": now, "exp": expiry},
            JWT_SECRET,
            algorithm="HS256",
        )
        return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

    def test_reads_user_id_from_valid_token(self):
        self.assertEqual(get_current_user_id(self._credentials()), "user-1")

    def test_rejects_missing_credentials_with_bearer_challenge(self):
        with self.assertRaises(HTTPException) as context:
            get_current_user_id(None)

        self.assertEqual(context.exception.status_code, 401)
        self.assertEqual(context.exception.headers, {"WWW-Authenticate": "Bearer"})

    def test_rejects_wrong_issuer(self):
        with self.assertRaises(HTTPException) as context:
            get_current_user_id(self._credentials(issuer="attacker-service"))
        self.assertEqual(context.exception.status_code, 401)

    def test_rejects_expired_token(self):
        with self.assertRaises(HTTPException) as context:
            get_current_user_id(self._credentials(expired=True))
        self.assertEqual(context.exception.status_code, 401)


if __name__ == "__main__":
    unittest.main()
