import base64
import binascii
import os

import jwt
from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer


JWT_ISSUER = os.getenv("JWT_ISSUER", "aiskin-user-service")
security = HTTPBearer()


def _load_jwt_secret() -> bytes:
    encoded_secret = os.getenv("JWT_SECRET")
    if not encoded_secret:
        raise RuntimeError("JWT_SECRET is required")
    try:
        secret = base64.b64decode(encoded_secret, validate=True)
    except (ValueError, binascii.Error) as exc:
        raise RuntimeError("JWT_SECRET must be valid Base64") from exc
    if len(secret) < 32:
        raise RuntimeError("JWT_SECRET must decode to at least 32 bytes")
    return secret


JWT_SECRET = _load_jwt_secret()


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> str:
    try:
        payload = jwt.decode(
            credentials.credentials,
            JWT_SECRET,
            algorithms=["HS256"],
            issuer=JWT_ISSUER,
            options={"require": ["exp", "iss", "sub"]},
        )
        return str(payload["sub"])
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail="Token expired") from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="Invalid authentication token") from exc
