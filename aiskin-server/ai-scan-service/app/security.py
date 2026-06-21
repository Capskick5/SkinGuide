import jwt
from fastapi import Request, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import base64

# Dùng chung secret key với user-service (Base64 encoded)
JWT_SECRET_B64 = "Y2hhbmdlLW1lLXRoaXMtaXMtYS1kZXYtb25seS1zZWNyZXQta2V5LTEyMzQ1Ng=="
# Decode base64 to bytes
JWT_SECRET = base64.b64decode(JWT_SECRET_B64)

security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

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
