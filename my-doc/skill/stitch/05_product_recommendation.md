# Stitch Prompt — 05. Tư vấn sản phẩm

> Màn hình gợi ý sản phẩm phù hợp. Copy GLOBAL STYLE (file 00) lên đầu.

---

## PROMPT

```
Create a web screen for "MSS" AI skincare app — the product recommendations page.
Keep the left vertical icon sidebar (active item: "Products") and the white, airy QuillBot-style layout. Soft pink theme.

MAIN CONTENT:
- Heading: "Recommended for your skin"
- Subtitle: "Products matched to your combination skin and detected concerns."
- A filter chip row (pill chips, pink when active): "All", "Cleanser", "Toner", "Serum", "Moisturizer", "Sunscreen", "Treatment"

PRODUCT GRID (3–4 columns of product cards):
Each product card (white, rounded 16px, soft pink border, subtle shadow):
   - Product image (rounded top)
   - A pink "Match 95%" badge in the corner
   - Brand name (small gray) + product name (bold)
   - Category chip (pink-100 background)
   - Key ingredient tags as small chips (e.g., "Niacinamide", "Hyaluronic Acid")
   - Price + star rating row
   - A pink pill button "View details" and a heart/save icon
   - A small "Why recommended" line in gray (e.g., "Helps with acne & oil control")

RIGHT or TOP: a small summary banner — "Based on your scan: Acne (moderate), Pigmentation (mild)".

Style: soft pink (#EC4899 primary, #FCE7F3 soft pink), product cards in a clean grid, match badges, ingredient chips, pill buttons, Inter/Poppins font, e-commerce-meets-beauty feel (but advisory, not a store checkout).
Desktop web layout.
```

---

## GHI CHÚ
- Map tới entities: `ProductRecommendation` + `RecommendedProduct` + `Product` + `Ingredient`.
- "Match %" = `matchScore`; "Why recommended" = `reason`.
- Lưu ý: chỉ tư vấn, KHÔNG có checkout/giỏ hàng (out of scope theo product_requirements).
