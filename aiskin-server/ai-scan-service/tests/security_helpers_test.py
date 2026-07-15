import tempfile
import time
import unittest
from pathlib import Path

from app.utils.rate_limiter import SlidingWindowRateLimiter
from app.utils.scan_image_store import ScanImageStore


class SlidingWindowRateLimiterTest(unittest.TestCase):
    def test_rejects_request_after_limit(self):
        limiter = SlidingWindowRateLimiter()

        self.assertTrue(limiter.allow("scan:user-1", 2, 60))
        self.assertTrue(limiter.allow("scan:user-1", 2, 60))
        self.assertFalse(limiter.allow("scan:user-1", 2, 60))
        self.assertTrue(limiter.allow("scan:user-2", 2, 60))


class ScanImageStoreTest(unittest.TestCase):
    def test_can_generate_gateway_relative_signed_url(self):
        with tempfile.TemporaryDirectory() as directory:
            store = ScanImageStore(directory, "test-secret-that-is-at-least-32-bytes")

            url = store.signed_url("", "scan-1", "scan-1.jpg")

            self.assertTrue(url.startswith("/api/scans/images/scan-1?"))

    def test_signed_url_allows_expected_file_and_rejects_tampering(self):
        with tempfile.TemporaryDirectory() as directory:
            store = ScanImageStore(directory, "test-secret-that-is-at-least-32-bytes", url_ttl_seconds=60)
            filename = store.save("scan-1", b"image")
            url = store.signed_url("http://localhost:8080", "scan-1", filename)
            query = dict(part.split("=", 1) for part in url.split("?", 1)[1].split("&"))

            self.assertTrue(store.verify("scan-1", query["file"], int(query["expires"]), query["signature"]))
            self.assertFalse(store.verify("scan-2", query["file"], int(query["expires"]), query["signature"]))

            store.delete(filename)
            self.assertFalse(Path(directory, filename).exists())

    def test_rejects_expired_signature_and_path_traversal(self):
        with tempfile.TemporaryDirectory() as directory:
            store = ScanImageStore(directory, "test-secret-that-is-at-least-32-bytes")
            self.assertFalse(store.verify("scan-1", "scan-1.jpg", int(time.time()) - 1, "invalid"))
            with self.assertRaises(ValueError):
                store.path("../secret.jpg")

    def test_rejects_weak_signing_secret(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(ValueError, "at least 32 bytes"):
                ScanImageStore(directory, "too-short")


if __name__ == "__main__":
    unittest.main()
