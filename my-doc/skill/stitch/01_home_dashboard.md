# Stitch Prompt — 01. Home / Dashboard

> Màn hình chính, áp dụng layout QuillBot với tông hồng. Copy GLOBAL STYLE (file 00) lên đầu khi dán vào Stitch.

---

## PROMPT

```
Create a web app home screen for "MSS" — an AI skincare analysis platform. 
Layout inspired by QuillBot: clean white background, left vertical icon sidebar, centered hero content, prominent input box, suggestion cards below.

LEFT SIDEBAR (vertical, ~90px, white with subtle right border):
- App logo "MSS" with a small pink flower/face icon at top
- Icon + label menu items: New Scan (+), Dashboard, My Skin, Routine, Products, History, More
- Active item "Dashboard" highlighted with pink background and pink icon
- Bottom: user avatar / settings icon

TOP RIGHT HEADER:
- Pink gradient pill button "Upgrade to Premium"
- Circular user avatar

MAIN CONTENT (centered, lots of whitespace):
- Large bold hero heading: "Analyze your skin today"
- Subtitle in gray: "Scan your face, get a personalized skincare routine and product recommendations powered by AI."
- A trust row with small chips: "★ 4.8/5 rating", "10K+ users", "AI-powered skin analysis"
- A LARGE rounded input/upload box (white, soft pink border, focus ring pink):
   - Placeholder text: "Upload a face photo or start a new scan..."
   - A "+" upload icon on the left
   - A pink circular arrow/scan button on the right
- A row of pill action buttons with icons below the box: "New Scan", "My Routine", "Products", "Skin History", "+ More"
- Small gray helper text: "Not sure where to start? Try one of these..."
- Below: 3 suggestion cards in a row (white, rounded 16px, soft pink border, small icon top-left):
   1. "Scan your face" — "Take or upload a photo to detect skin conditions"
   2. "Get a routine" — "Receive a morning & evening skincare plan"
   3. "Find products" — "Discover products matched to your skin"

Style: soft pink theme (#EC4899 primary, #FCE7F3 soft pink), Inter/Poppins font, pill buttons, rounded cards, subtle pink shadows, airy and premium beauty-tech feel.
Responsive web layout, desktop first.
```

---

## GHI CHÚ
- Đây là màn hình "mặt tiền" tương đương trang QuillBot trong ảnh bạn gửi.
- Ô input lớn ở giữa = nơi user upload ảnh / bắt đầu scan (thay cho ô nhập text của QuillBot).
- 3 card gợi ý map đúng 3 tính năng cốt lõi: Scan → Routine → Products.
