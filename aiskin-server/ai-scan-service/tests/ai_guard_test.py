import argparse
import csv
import hashlib
import json
import os
import sys
from pathlib import Path

import cv2
import numpy as np
import requests

ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ROOT.parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.utils.face_cropper import crop_face_from_bytes


COMMONS_API = "https://commons.wikimedia.org/w/api.php"
USER_AGENT = "SkinGuide-AI-Guard-Test/1.0"

FACE_CATEGORIES = [
    "Category:Portrait photographs of women",
    "Category:Portrait photographs of men",
    "Category:Close-up photographs of human faces",
]

NON_FACE_CATEGORIES = [
    "Category:Landscape photographs",
    "Category:Photographs of buildings",
    "Category:Photographs of food",
]


def stable_name(prefix, url):
    digest = hashlib.sha1(url.encode("utf-8")).hexdigest()[:12]
    return f"{prefix}_{digest}.jpg"


def commons_image_urls(category, limit):
    params = {
        "action": "query",
        "format": "json",
        "generator": "categorymembers",
        "gcmtitle": category,
        "gcmtype": "file",
        "gcmlimit": str(limit * 4),
        "prop": "imageinfo",
        "iiprop": "url|mime",
        "iiurlwidth": "900",
    }
    response = requests.get(
        COMMONS_API,
        params=params,
        headers={"User-Agent": USER_AGENT},
        timeout=25,
    )
    response.raise_for_status()
    pages = response.json().get("query", {}).get("pages", {})

    urls = []
    for page in pages.values():
        info = (page.get("imageinfo") or [{}])[0]
        mime = info.get("mime", "")
        if not mime.startswith("image/"):
            continue
        url = info.get("thumburl") or info.get("url")
        if url:
            urls.append(url)
        if len(urls) >= limit:
            break
    return urls


def download_images(categories, target_dir, prefix, wanted):
    target_dir.mkdir(parents=True, exist_ok=True)
    existing = sorted(target_dir.glob(f"{prefix}_*.jpg"))
    if len(existing) >= wanted:
        return existing[:wanted]

    saved = {path.name for path in existing}
    output = list(existing)
    for category in categories:
        if len(output) >= wanted:
            break
        for url in commons_image_urls(category, wanted):
            if len(output) >= wanted:
                break
            name = stable_name(prefix, url)
            if name in saved:
                continue
            try:
                response = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=25)
                response.raise_for_status()
                arr = np.frombuffer(response.content, np.uint8)
                image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
                if image is None or min(image.shape[:2]) < 220:
                    continue
                path = target_dir / name
                cv2.imwrite(str(path), image)
                output.append(path)
                saved.add(name)
            except Exception as exc:
                print(f"skip download {url}: {exc}")
    return output[:wanted]


def load_olivetti_faces(target_dir, wanted):
    target_dir.mkdir(parents=True, exist_ok=True)
    existing = sorted(target_dir.glob("olivetti_*.jpg"))
    if len(existing) >= wanted:
        return existing[:wanted]

    try:
        from sklearn.datasets import fetch_olivetti_faces
    except Exception as exc:
        print(f"skip olivetti faces: sklearn unavailable: {exc}")
        return existing[:wanted]

    try:
        dataset = fetch_olivetti_faces(data_home=str(target_dir / "_sklearn"), download_if_missing=True)
    except Exception as exc:
        print(f"skip olivetti faces: download failed: {exc}")
        return existing[:wanted]

    output = list(existing)
    for index, face in enumerate(dataset.images):
        if len(output) >= wanted:
            break
        path = target_dir / f"olivetti_{index:03d}.jpg"
        if path.exists():
            output.append(path)
            continue
        gray = np.clip(face * 255, 0, 255).astype(np.uint8)
        ycrcb = cv2.merge(
            [
                gray,
                np.full_like(gray, 150),
                np.full_like(gray, 110),
            ]
        )
        bgr = cv2.cvtColor(ycrcb, cv2.COLOR_YCrCb2BGR)
        bgr = cv2.resize(bgr, (384, 384), interpolation=cv2.INTER_CUBIC)
        cv2.imwrite(str(path), bgr)
        output.append(path)
    return output[:wanted]


def encode_jpg(image):
    ok, buffer = cv2.imencode(".jpg", image)
    if not ok:
        raise RuntimeError("Could not encode generated image")
    return buffer.tobytes()


def make_dark(image):
    return np.clip(image.astype(np.float32) * 0.18, 0, 255).astype(np.uint8)


def make_mild_dark(image):
    return np.clip(image.astype(np.float32) * 0.78, 0, 255).astype(np.uint8)


def make_bright(image):
    return np.clip(image.astype(np.float32) * 1.75 + 80, 0, 255).astype(np.uint8)


def make_mild_bright(image):
    return np.clip(image.astype(np.float32) * 1.12 + 12, 0, 255).astype(np.uint8)


def make_blur(image):
    return cv2.GaussianBlur(image, (61, 61), 0)


def make_mild_jpeg(image):
    params = [int(cv2.IMWRITE_JPEG_QUALITY), 70]
    ok, buffer = cv2.imencode(".jpg", image, params)
    if not ok:
        return image
    decoded = cv2.imdecode(buffer, cv2.IMREAD_COLOR)
    return decoded if decoded is not None else image


def expected_for_mild_quality_variant(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    overexposed_ratio = np.count_nonzero(gray > 235) / gray.size
    if np.mean(gray) > 238 or overexposed_ratio > 0.52:
        return "reject"
    return "pass"


def make_small_face_canvas(image):
    small = cv2.resize(image, (120, 120))
    canvas = np.full((900, 900, 3), 180, dtype=np.uint8)
    y = (canvas.shape[0] - small.shape[0]) // 2
    x = (canvas.shape[1] - small.shape[1]) // 2
    canvas[y : y + small.shape[0], x : x + small.shape[1]] = small
    return canvas


def make_two_face_image(image_a, image_b):
    left = cv2.resize(image_a, (420, 560))
    right = cv2.resize(image_b, (420, 560))
    return np.hstack([left, right])


def synthetic_invalid_cases():
    return {
        "black_image": np.zeros((480, 640, 3), dtype=np.uint8),
        "white_image": np.full((480, 640, 3), 255, dtype=np.uint8),
        "gray_blank": np.full((480, 640, 3), 127, dtype=np.uint8),
        "green_landscape_like": np.dstack(
            [
                np.full((480, 640), 40, dtype=np.uint8),
                np.full((480, 640), 170, dtype=np.uint8),
                np.full((480, 640), 60, dtype=np.uint8),
            ]
        ),
        "tiny_resolution": np.full((120, 120, 3), 160, dtype=np.uint8),
    }


def run_case(name, image_bytes, expected):
    try:
        out = crop_face_from_bytes(image_bytes)
        actual = "pass"
        detail = str(len(out))
    except Exception as exc:
        actual = "reject"
        detail = str(exc)

    ok = actual == expected
    return {
        "name": name,
        "expected": expected,
        "actual": actual,
        "ok": ok,
        "detail": detail,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--face-count", type=int, default=24)
    parser.add_argument("--non-face-count", type=int, default=10)
    parser.add_argument("--data-dir", default=str(ROOT / "testdata" / "ai_guard"))
    args = parser.parse_args()

    data_dir = Path(args.data_dir)
    faces_dir = data_dir / "downloaded_faces"
    non_faces_dir = data_dir / "downloaded_non_faces"
    report_dir = data_dir / "reports"
    report_dir.mkdir(parents=True, exist_ok=True)

    face_paths = download_images(FACE_CATEGORIES, faces_dir, "face", args.face_count)
    non_face_paths = download_images(NON_FACE_CATEGORIES, non_faces_dir, "nonface", args.non_face_count)
    olivetti_paths = load_olivetti_faces(data_dir / "olivetti_faces", 20)

    local_photo_paths = sorted((REPO_ROOT / "photo-test").glob("*.jpg"))
    unsupported_local_names = {"dry_03_elderly_gambian_woman.jpg"}
    valid_local_paths = [path for path in local_photo_paths if path.name not in unsupported_local_names]
    unsupported_local_paths = [path for path in local_photo_paths if path.name in unsupported_local_names]
    all_face_paths = valid_local_paths + face_paths

    results = []
    for path in all_face_paths:
        results.append(run_case(f"valid_face::{path.name}", path.read_bytes(), "pass"))

    for path in unsupported_local_paths:
        results.append(run_case(f"unsupported_pose::{path.name}", path.read_bytes(), "reject"))

    for path in olivetti_paths:
        results.append(run_case(f"low_quality_face::{path.name}", path.read_bytes(), "reject"))

    for path in non_face_paths:
        results.append(run_case(f"non_face::{path.name}", path.read_bytes(), "reject"))

    for name, image in synthetic_invalid_cases().items():
        results.append(run_case(f"synthetic_invalid::{name}", encode_jpg(image), "reject"))

    usable_faces = []
    for path in all_face_paths:
        image = cv2.imread(str(path))
        if image is not None:
            usable_faces.append((path, image))

    for path, image in usable_faces[:10]:
        mild_dark = make_mild_dark(image)
        mild_bright = make_mild_bright(image)
        mild_jpeg = make_mild_jpeg(image)
        results.append(run_case(f"valid_variant_mild_dark::{path.name}", encode_jpg(mild_dark), expected_for_mild_quality_variant(mild_dark)))
        results.append(run_case(f"valid_variant_mild_bright::{path.name}", encode_jpg(mild_bright), expected_for_mild_quality_variant(mild_bright)))
        results.append(run_case(f"valid_variant_mild_jpeg::{path.name}", encode_jpg(mild_jpeg), expected_for_mild_quality_variant(mild_jpeg)))

    for path, image in usable_faces[:8]:
        results.append(run_case(f"variant_dark::{path.name}", encode_jpg(make_dark(image)), "reject"))
        results.append(run_case(f"variant_bright::{path.name}", encode_jpg(make_bright(image)), "reject"))
        results.append(run_case(f"variant_blur::{path.name}", encode_jpg(make_blur(image)), "reject"))
        results.append(run_case(f"variant_small_face::{path.name}", encode_jpg(make_small_face_canvas(image)), "reject"))

    if len(usable_faces) >= 2:
        for idx in range(0, min(len(usable_faces) - 1, 8), 2):
            left_name, left = usable_faces[idx]
            right_name, right = usable_faces[idx + 1]
            name = f"variant_two_faces::{left_name.name}+{right_name.name}"
            results.append(run_case(name, encode_jpg(make_two_face_image(left, right)), "reject"))

    summary = {
        "total": len(results),
        "passed_expectation": sum(1 for item in results if item["ok"]),
        "failed_expectation": sum(1 for item in results if not item["ok"]),
        "downloaded_faces": len(face_paths),
        "downloaded_non_faces": len(non_face_paths),
        "olivetti_faces": len(olivetti_paths),
    }

    csv_path = report_dir / "ai_guard_results.csv"
    with csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["name", "expected", "actual", "ok", "detail"])
        writer.writeheader()
        writer.writerows(results)

    json_path = report_dir / "ai_guard_summary.json"
    json_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")

    print(json.dumps(summary, indent=2, ensure_ascii=False))
    print(f"CSV: {csv_path}")
    print(f"JSON: {json_path}")

    failures = [item for item in results if not item["ok"]]
    if failures:
        print("Failures:")
        for item in failures[:30]:
            print(f"- {item['name']} expected={item['expected']} actual={item['actual']} detail={item['detail']}")
        sys.exit(1)


if __name__ == "__main__":
    main()
