import hashlib
import hmac
import os
import time
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse


class ScanImageStore:
    def __init__(self, upload_dir: str, signing_secret: str, url_ttl_seconds: int = 900):
        if not signing_secret:
            raise ValueError("SCAN_IMAGE_SIGNING_SECRET or JWT_SECRET is required")
        if len(signing_secret.encode("utf-8")) < 32:
            raise ValueError("Scan image signing secret must contain at least 32 bytes")
        self.upload_dir = Path(upload_dir).resolve()
        self.upload_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
        self.signing_secret = signing_secret.encode("utf-8")
        self.url_ttl_seconds = url_ttl_seconds

    def save(self, scan_id: str, image_bytes: bytes) -> str:
        filename = f"{scan_id}.jpg"
        destination = self.path(filename)
        destination.write_bytes(image_bytes)
        destination.chmod(0o600)
        return filename

    def delete(self, filename: Optional[str]) -> None:
        if not filename:
            return
        path = self.path(filename)
        if path.exists():
            path.unlink()

    def signed_url(self, base_url: str, scan_id: str, filename: str) -> str:
        expires = int(time.time()) + self.url_ttl_seconds
        signature = self._signature(scan_id, filename, expires)
        root = base_url.rstrip("/")
        return f"{root}/api/scans/images/{scan_id}?file={filename}&expires={expires}&signature={signature}"

    def verify(self, scan_id: str, filename: str, expires: int, signature: str) -> bool:
        if expires < int(time.time()):
            return False
        expected = self._signature(scan_id, filename, expires)
        return hmac.compare_digest(expected, signature)

    def path(self, filename: str) -> Path:
        safe_name = os.path.basename(filename)
        if safe_name != filename:
            raise ValueError("Invalid image filename")
        path = (self.upload_dir / safe_name).resolve()
        if path.parent != self.upload_dir:
            raise ValueError("Invalid image path")
        return path

    def filename_from_record(self, record: dict) -> Optional[str]:
        filename = record.get("imageFile")
        if filename:
            return os.path.basename(filename)
        image_url = record.get("imageUrl")
        if image_url:
            return os.path.basename(urlparse(image_url).path)
        return None

    def _signature(self, scan_id: str, filename: str, expires: int) -> str:
        payload = f"{scan_id}:{filename}:{expires}".encode("utf-8")
        return hmac.new(self.signing_secret, payload, hashlib.sha256).hexdigest()
