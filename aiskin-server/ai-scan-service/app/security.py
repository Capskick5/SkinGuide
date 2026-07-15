import base64
import binascii
import os
from typing import Optional

import jwt
from fastapi import Request, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

JWT_ISSUER = os.getenv("JWT_ISSUER", "aiskin-user-service")


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

security = HTTPBearer(auto_error=False)


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=401,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def verify_token(credentials: Optional[HTTPAuthorizationCredentials] = Security(security)):
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _unauthorized("Authentication required")
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=["HS256"],
            issuer=JWT_ISSUER,
            options={"require": ["exp", "iss", "sub"]},
        )
        subject = payload.get("sub")
        if not isinstance(subject, str) or not subject.strip():
            raise jwt.InvalidTokenError("Token subject must be a non-empty string")
        return payload
    except jwt.ExpiredSignatureError:
        raise _unauthorized("Token expired")
    except jwt.InvalidTokenError:
        raise _unauthorized("Invalid token")

def has_permission(resource: str, method: str):
    def permission_checker(request: Request, payload: dict = Security(verify_token)):
        required_permission = f"{method.upper()}:{resource}"
        wildcard_permission = f"ANY:{resource}"
        
        roles = payload.get("roles", [])
        if "ADMIN" in roles:
            return payload
            
        permissions = payload.get("permissions", [])
        
        if required_permission in permissions or wildcard_permission in permissions:
            return payload
            
        raise HTTPException(status_code=403, detail="Forbidden: You don't have permission to access this resource")
    
    return permission_checker
