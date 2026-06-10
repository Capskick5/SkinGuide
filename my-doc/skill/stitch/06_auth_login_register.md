# Stitch Prompt — 06. Đăng nhập / Đăng ký

> Màn hình authentication. Copy GLOBAL STYLE (file 00) lên đầu.

---

## PROMPT

```
Create a web authentication screen (login & register) for "MSS" AI skincare app.
Soft pink theme, clean and premium. Two-column split layout.

LEFT COLUMN (~50%, pink gradient background #F9A8D4 → #EC4899):
- App logo "MSS" with a small pink flower/face icon (white version)
- A large welcoming headline in white: "Glow with confidence"
- Subtext in light white: "AI-powered skin analysis and personalized skincare, just for you."
- A soft illustration or abstract skincare graphic (bottles, leaves, face outline) — minimal, elegant.

RIGHT COLUMN (~50%, white background, centered form card):
- Tabs: "Log in" and "Sign up" (active tab underlined in pink)
- Input fields (rounded, light border, pink focus ring): Email, Password (with show/hide eye icon)
- For sign up: also Full name + Confirm password
- A pink full-width pill button "Log in" / "Create account"
- "Forgot password?" link in pink (login only)
- A divider "or continue with"
- Social login buttons: Google, Apple (white outline pills with icons)
- Bottom small text: "By continuing you agree to our Terms & Privacy Policy."

Style: soft pink (#EC4899 primary, gradient panel), rounded inputs, pill buttons, Inter/Poppins font, beauty-tech, trustworthy and clean.
Desktop web layout. Provide both Log in and Sign up variants.
```

---

## GHI CHÚ
- Map tới entity `User` (email, password, fullName) và `UserSession`.
- Yêu cầu Stitch tạo cả 2 biến thể: Log in và Sign up.
