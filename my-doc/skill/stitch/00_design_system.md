# MSS - Design System cho Google Stitch

> File nền tảng. Dán phần "GLOBAL STYLE" này vào ĐẦU mỗi prompt khi generate từng màn hình để giữ giao diện đồng nhất.

---

## 🎨 GLOBAL STYLE (copy vào mọi prompt)

```
Design style: Clean, modern, minimal SaaS web app (inspired by QuillBot layout).
Theme: Soft pink / rose aesthetic, friendly and premium for a skincare AI product.

COLOR PALETTE:
- Primary: #EC4899 (pink 500) — buttons, active states, highlights
- Primary dark: #DB2777 (pink 600) — hover, emphasis
- Primary soft: #FCE7F3 (pink 100) — backgrounds, chips, cards
- Accent: #F9A8D4 (pink 300) — secondary highlights, gradients
- Background: #FFFFFF (white) main, #FFF5F9 (very light pink) sections
- Surface / cards: #FFFFFF with soft pink border #FBCFE8
- Text primary: #1F2937 (gray 800)
- Text secondary: #6B7280 (gray 500)
- Success: #10B981, Warning: #F59E0B, Error: #EF4444
- Gradient: linear 135deg from #F9A8D4 to #EC4899 (hero accents, CTA)

TYPOGRAPHY:
- Font: "Inter" or "Poppins", sans-serif
- Hero heading: bold, very large (48-56px)
- Section heading: semibold, 28-32px
- Body: regular, 16px
- Caption: 13px, gray 500

LAYOUT (QuillBot-inspired):
- Left vertical sidebar (icon + label, ~80-100px wide), white with subtle border, active item highlighted in pink
- Top-right header: "Upgrade" pill button (pink gradient) + user avatar
- Main content centered with generous whitespace
- Rounded corners everywhere (12-16px radius)
- Soft shadows (subtle, pink-tinted)
- Pill-shaped buttons and chips with icons

COMPONENTS:
- Buttons: pill shape, pink primary / white outline secondary
- Cards: white, rounded 16px, soft pink border, small icon top-left
- Input: large rounded box, light border, focus ring in pink
- Chips/tags: pill, pink-100 background, pink-600 text, with small icon

TONE: Welcoming, light, airy. Lots of white space. Skincare/beauty feel but professional.
```

---

## 🧭 SIDEBAR NAVIGATION (dùng chung cho mọi màn hình app)

Các mục trên sidebar trái (icon + label, giống QuillBot):
1. **New Scan** (+ icon) — bắt đầu phân tích da mới
2. **Dashboard** (home icon)
3. **My Skin** (face/scan icon) — hồ sơ da
4. **Routine** (calendar/list icon) — lộ trình chăm sóc
5. **Products** (bottle icon) — sản phẩm gợi ý
6. **History** (clock icon) — lịch sử phân tích
7. **Progress** (chart icon) — theo dõi tiến trình *(Phase 2)*
8. **More** (... icon)
- Bottom: **Settings / Profile**

---

## 📄 DANH SÁCH MÀN HÌNH CẦN DESIGN

| File | Màn hình | Ưu tiên |
|------|----------|---------|
| 01_home_dashboard.md | Trang chủ (QuillBot-style hero) | Cao |
| 02_scan_upload.md | Chụp/Upload ảnh khuôn mặt | Cao |
| 03_analysis_result.md | Kết quả phân tích da | Cao |
| 04_skincare_routine.md | Lộ trình chăm sóc da | Cao |
| 05_product_recommendation.md | Tư vấn sản phẩm | Cao |
| 06_auth_login_register.md | Đăng nhập / Đăng ký | Trung bình |
| 07_history_progress.md | Lịch sử & Tiến trình | Trung bình |

---

## 💡 CÁCH DÙNG VỚI GOOGLE STITCH

1. Mở [Google Stitch](https://stitch.withgoogle.com)
2. Với mỗi màn hình: copy phần **GLOBAL STYLE** ở trên + nội dung prompt của file màn hình đó
3. Dán vào Stitch, chọn **Web** mode
4. Generate, tinh chỉnh, rồi export sang Figma / HTML
5. Giữ nhất quán: luôn kèm GLOBAL STYLE để mọi màn hình cùng tông hồng
