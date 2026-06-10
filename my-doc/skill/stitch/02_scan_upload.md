# Stitch Prompt — 02. Scan / Upload ảnh khuôn mặt

> Màn hình chụp hoặc upload ảnh để phân tích. Copy GLOBAL STYLE (file 00) lên đầu.

---

## PROMPT

```
Create a web screen for "MSS" AI skincare app — the face scan / photo upload page.
Keep the left vertical icon sidebar (active item: "New Scan") and the white, airy QuillBot-style layout. Soft pink theme.

MAIN CONTENT (centered):
- Heading: "Scan your face"
- Subtitle: "Make sure your face is well-lit and centered. We'll analyze your skin in seconds."
- A large central UPLOAD/CAPTURE area (rounded 20px, dashed soft-pink border, light pink #FFF5F9 background):
   - Big camera + upload icon in the middle (pink)
   - Text: "Drag & drop a photo, or click to upload"
   - A pink pill button "Take a photo" and a white outline pill button "Upload from device"
- A "Tips for best results" panel on the right side (white card, rounded 16px, soft pink border):
   - Checklist with small pink check icons:
     - "Good, natural lighting"
     - "Remove glasses and hair from face"
     - "No makeup for accurate results"
     - "Look straight at the camera"
- After-upload state (show as a second variant): image preview in a rounded frame with a pink "Analyze now" CTA button and a "Retake" text link.
- A subtle privacy note at the bottom with a small lock icon: "Your photos are encrypted and never shared."

Style: soft pink (#EC4899 primary, #FCE7F3 soft pink), rounded corners, pill buttons, subtle pink shadows, Inter/Poppins font, friendly beauty-tech feel.
Desktop web layout.
```

---

## GHI CHÚ
- Nên yêu cầu Stitch tạo 2 trạng thái: **empty (chưa upload)** và **preview (đã có ảnh)**.
- Privacy note quan trọng vì dữ liệu ảnh khuôn mặt nhạy cảm (liên quan security_compliance).
