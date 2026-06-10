# Stitch Prompt — 03. Kết quả phân tích da

> Màn hình hiển thị kết quả AI scan. Copy GLOBAL STYLE (file 00) lên đầu.

---

## PROMPT

```
Create a web screen for "MSS" AI skincare app — the skin analysis result page.
Keep the left vertical icon sidebar (active item: "My Skin") and the white, airy QuillBot-style layout. Soft pink theme.

MAIN CONTENT (two-column layout):

LEFT COLUMN (~40%):
- The user's analyzed face photo in a rounded frame, with subtle pink overlay markers/dots showing detected problem areas (acne, pores, etc.)
- Below the photo: a big circular "Skin Score" gauge showing "82 / 100" with a pink progress ring and label "Overall skin health"
- A pill tag showing detected skin type: "Combination skin" with a small icon

RIGHT COLUMN (~60%):
- Heading: "Your skin analysis"
- Date/time subtitle: "Analyzed today · AI model v1.0"
- A list of detected SKIN CONDITIONS as cards (white, rounded 14px, soft pink border). Each card:
   - Condition name (e.g., "Acne", "Pigmentation", "Wrinkles", "Pores", "Hydration")
   - A severity badge: Mild (green) / Moderate (amber) / Severe (red)
   - A thin confidence/severity progress bar in pink
   - Short description text in gray
- Bottom CTA row: two pill buttons — pink primary "View my routine" and white outline "See product recommendations"

A small disclaimer at the bottom in gray italic: "This analysis is for guidance only and does not replace a professional dermatologist."

Style: soft pink (#EC4899 primary, #FCE7F3 soft pink, severity colors green/amber/red), rounded cards, pill buttons, circular gauge, Inter/Poppins font, clean and medical-but-friendly feel.
Desktop web layout.
```

---

## GHI CHÚ
- Map trực tiếp tới entities: `ScanAnalysis` (skin score, skin type) + `SkinCondition` (các card).
- Disclaimer y khoa bắt buộc (theo domain_knowledge: không thay thế bác sĩ).
