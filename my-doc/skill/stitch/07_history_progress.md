# Stitch Prompt — 07. Lịch sử & Tiến trình

> Màn hình lịch sử phân tích và theo dõi cải thiện da (Phase 2). Copy GLOBAL STYLE (file 00) lên đầu.

---

## PROMPT

```
Create a web screen for "MSS" AI skincare app — the skin history & progress tracking page.
Keep the left vertical icon sidebar (active item: "Progress") and the white, airy QuillBot-style layout. Soft pink theme.

MAIN CONTENT:
- Heading: "Your skin progress"
- Subtitle: "Track how your skin improves over time."

TOP SECTION — Before/After comparison:
- Two face photos side by side in rounded frames, labeled "First scan" and "Latest scan" with dates
- A pink improvement badge between them: "+15% improvement"

MIDDLE SECTION — Trend chart:
- A line/area chart card (white, rounded 16px) showing skin score over time, pink line and soft pink gradient fill
- Small stat chips above the chart: "Skin score 82", "Scans: 6", "Streak: 12 days"

BOTTOM SECTION — Scan history timeline:
- A vertical list of past scans as rows (white cards, soft pink border):
   - Small thumbnail of the scan photo
   - Date + skin score + top condition tags
   - A "View details" link in pink
- Optional: a routine adherence ring/progress bar showing "85% routine completed this week"

Style: soft pink (#EC4899 primary, #FCE7F3 soft pink), pink charts, rounded cards, pill chips, Inter/Poppins font, motivating and clean.
Desktop web layout.
```

---

## GHI CHÚ
- Map tới entities Phase 2: `ImageVersion`, `UserProgress`, `ProgressCheckIn` + lịch sử `ScanAnalysis`.
- Before/After dùng để so sánh tiến trình cải thiện da.
