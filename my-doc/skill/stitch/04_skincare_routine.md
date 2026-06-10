# Stitch Prompt — 04. Lộ trình chăm sóc da

> Màn hình hiển thị skincare routine cá nhân hóa. Copy GLOBAL STYLE (file 00) lên đầu.

---

## PROMPT

```
Create a web screen for "MSS" AI skincare app — the personalized skincare routine page.
Keep the left vertical icon sidebar (active item: "Routine") and the white, airy QuillBot-style layout. Soft pink theme.

MAIN CONTENT:
- Heading: "Your skincare routine"
- Subtitle: "Personalized for combination skin · 4–6 weeks plan"
- A toggle / segmented control at the top: "Morning ☀️" and "Evening 🌙" (active tab highlighted pink)

ROUTINE STEPS (vertical timeline / numbered list of step cards):
Each step card (white, rounded 14px, soft pink border, connected by a thin pink vertical line):
   - A pink circular number badge (1, 2, 3...)
   - Category icon + label: Cleanser / Toner / Serum / Moisturizer / Sunscreen
   - Step title and short instruction text
   - A small "frequency" chip (e.g., "Daily", "2x / week")
   - On the right: a small linked product thumbnail with name (optional) and a "View product" link

Example morning steps: 1. Cleanser, 2. Toner, 3. Vitamin C Serum, 4. Moisturizer, 5. Sunscreen.

RIGHT SIDE PANEL (white card, rounded 16px):
- "Routine summary": total steps, estimated time, plan duration
- A pink pill button "Start tracking" (progress feature)
- A white outline button "Regenerate routine"

Style: soft pink (#EC4899 primary, #FCE7F3 soft pink), timeline with pink connectors, rounded cards, pill chips, Inter/Poppins font, calming beauty-routine feel.
Desktop web layout.
```

---

## GHI CHÚ
- Map tới entities: `SkincareRoutine` + `RoutineStep` (morning/evening, category, frequency, linked Product).
- Toggle Morning/Evening phản ánh `timeOfDay`.
