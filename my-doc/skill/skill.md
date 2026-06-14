# SkinGuide - Kế hoạch phát triển hệ thống AI phân tích da

## Tổng quan dự án

Hệ thống AI phân tích da và đưa ra lộ trình tư vấn chăm sóc da.  
**Hướng trọng tâm:**
1. Nhận diện loại da và vấn đề da
2. Phân tích sâu rồi đề xuất lộ trình chăm sóc
3. Nghiệp vụ mở rộng: tư vấn sản phẩm, theo dõi tiến triển, lịch chăm sóc

---

## Tiến độ hiện tại

### aiskin-server (Spring Boot 4.0.6 | Java 21 | Spring Cloud 2025.1.1)

| Service | Trạng thái | Chi tiết |
|---------|-----------|----------|
| discovery-server | ✅ Hoàn thành | Eureka Server |
| api-gateway | ✅ Hoàn thành | Spring Cloud Gateway WebMVC + LoadBalancer |
| user-service | ✅ Hoàn thành | Auth (JWT + OTP), MongoDB, Redis, RBAC |
| product-service | 🟡 Scaffolding | Chỉ có Eureka Client, chưa có logic |
| ai-scan-service | ⬜ Chưa bắt đầu | Thư mục trống |
| recommendation-service | ⬜ Chưa bắt đầu | Thư mục trống |

### aiskin-client

| Project | Trạng thái | Chi tiết |
|---------|-----------|----------|
| Mobile App (Flutter) | 🔒 Tạm hoãn | QR scan + face capture. Cần domain để deploy |
| Web App (React 19 + Vite) | 🟡 Đang phát triển | Auth, Dashboard, Scan, Analysis, Products, Progress, Routine. Ant Design + TailwindCSS |

---

## Kế hoạch phát triển (Dừng ở mức Docker packaging)

### PHASE 1: Hoàn thiện nền tảng Backend

#### 1.1 product-service (Quản lý sản phẩm skincare)
- **Database:** MongoDB
- **Chức năng:**
  - CRUD sản phẩm skincare (tên, thương hiệu, thành phần, công dụng, loại da phù hợp)
  - Phân loại sản phẩm theo danh mục (cleanser, toner, serum, moisturizer, sunscreen...)
  - Tìm kiếm & lọc sản phẩm theo thành phần, loại da, vấn đề da
  - Đánh giá & review sản phẩm từ người dùng
- **API endpoints:**
  - `POST /api/products` — Thêm sản phẩm
  - `GET /api/products` — Danh sách (phân trang, filter)
  - `GET /api/products/{id}` — Chi tiết sản phẩm
  - `GET /api/products/search` — Tìm kiếm theo tiêu chí
  - `PUT /api/products/{id}` — Cập nhật
  - `DELETE /api/products/{id}` — Xóa (admin)

#### 1.2 ai-scan-service (Phân tích da bằng AI)
- **Database:** MongoDB (lưu kết quả scan)
- **Tích hợp:** Gọi AI model (Python microservice hoặc API bên ngoài)
- **Chức năng:**
  - Nhận ảnh da từ client → phân tích bằng AI model
  - Nhận diện loại da (oily, dry, combination, normal, sensitive)
  - Phát hiện vấn đề da (acne, wrinkles, dark spots, redness, enlarged pores...)
  - Đánh giá mức độ nghiêm trọng (severity score)
  - Lưu lịch sử scan của user
- **API endpoints:**
  - `POST /api/scans/analyze` — Upload ảnh & nhận kết quả phân tích
  - `GET /api/scans/history` — Lịch sử scan của user
  - `GET /api/scans/{id}` — Chi tiết 1 lần scan
  - `GET /api/scans/compare` — So sánh 2 lần scan (tiến triển)

#### 1.3 recommendation-service (Đề xuất lộ trình & sản phẩm)
- **Database:** MongoDB
- **Chức năng:**
  - Dựa trên kết quả scan → đề xuất routine chăm sóc da
  - Gợi ý sản phẩm phù hợp (kết hợp data từ product-service)
  - Tạo lộ trình skincare theo ngày/tuần (morning + evening routine)
  - Theo dõi tiến triển da theo thời gian
  - Nhắc nhở lịch chăm sóc
- **API endpoints:**
  - `POST /api/recommendations/generate` — Tạo lộ trình từ scan result
  - `GET /api/recommendations/routine/{userId}` — Routine hiện tại
  - `PUT /api/recommendations/routine/{id}` — Cập nhật routine
  - `GET /api/recommendations/products` — Sản phẩm được gợi ý
  - `GET /api/recommendations/progress/{userId}` — Tiến triển theo thời gian
  - `POST /api/recommendations/schedule` — Đặt lịch nhắc nhở

---

### PHASE 2: Hoàn thiện Frontend Web App

#### 2.1 Trang Scan & Analysis
- Upload ảnh da (camera/gallery)
- Hiển thị kết quả phân tích (loại da, vấn đề, severity)
- Visualization kết quả (biểu đồ, highlight vùng da)

#### 2.2 Trang Products
- Danh sách sản phẩm được gợi ý
- Chi tiết sản phẩm + review
- Lọc theo loại da / vấn đề da

#### 2.3 Trang Routine
- Hiển thị routine sáng/tối
- Checklist hàng ngày
- Tùy chỉnh routine

#### 2.4 Trang Progress
- Timeline tiến triển da
- So sánh before/after
- Biểu đồ cải thiện theo thời gian

#### 2.5 Trang Dashboard
- Tổng quan tình trạng da hiện tại
- Routine hôm nay
- Thông báo & nhắc nhở

---

### PHASE 3: AI/ML Pipeline

#### 3.1 Tổng quan kiến trúc ML

```
┌──────────┐     ┌──────────────┐     ┌───────────────────┐     ┌──────────────┐
│ Ảnh da   │ ──► │ Skin Analysis│ ──► │ Scoring Formula   │ ──► │ Routine +    │
│ (input)  │     │ Model (CNN)  │     │ Engine            │     │ Products     │
└──────────┘     └──────────────┘     └───────────────────┘     └──────────────┘
                       │                       │
                       ▼                       ▼
              Detect: loại da,         Công thức tính toán:
              vấn đề da, mức độ        severity × ingredient match
                                       → routine steps → products
```

**Pipeline gồm 2 phần chính:**
1. **Skin Analysis Model** — CNN phân loại ảnh (Machine Learning)
2. **Recommendation Formula Engine** — Công thức suy ra routine & sản phẩm (Rule-based scoring)

---

#### 3.2 Skin Analysis Model (CNN — Image Classification)

**Mục tiêu:** Nhận ảnh da mặt → output JSON chứa loại da + vấn đề da + mức độ

**Approach:** Transfer Learning trên pre-trained CNN

| Thành phần | Chi tiết |
|------------|----------|
| Base Model | EfficientNet-B3 hoặc ResNet-50 (pre-trained ImageNet) |
| Fine-tune | Thêm custom classification head cho skin tasks |
| Framework | PyTorch hoặc TensorFlow/Keras |
| Input | Ảnh 224×224 RGB (face crop) |
| Output | Multi-label classification + severity scores |

**Tasks phân tích:**

| Task | Type | Classes |
|------|------|---------|
| Skin Type | Single-label | normal, oily, dry, combination, sensitive |
| Skin Conditions | Multi-label | acne, dark_spots, wrinkles, redness, enlarged_pores, dehydration, pigmentation |
| Severity per condition | Regression | 0-100 score |
| Face Region | Multi-output | forehead, nose, left_cheek, right_cheek, chin |

**Dataset cần chuẩn bị:**

```
datasets/
├── skin_type/          # Ảnh đã label loại da
│   ├── oily/
│   ├── dry/
│   ├── combination/
│   ├── normal/
│   └── sensitive/
├── skin_conditions/    # Ảnh đã label vấn đề da (multi-label)
│   ├── annotations.csv   # image_path, acne, dark_spots, wrinkles, ...
│   └── images/
└── severity/           # Ảnh + severity score (0-100)
    ├── annotations.csv
    └── images/
```

**Nguồn dữ liệu khả thi:**
- Kaggle: "Skin Disease Dataset", "Acne Grading Dataset"
- DermNet NZ (dermatology images)
- Roboflow (skin condition datasets)
- Tự thu thập + label bằng team (recommend 500-1000 ảnh/class tối thiểu)

**Training pipeline:**

```python
# Pseudo-code
model = EfficientNetB3(pretrained=True)
model.classifier = CustomHead(
    skin_type_output=5,        # 5 classes
    conditions_output=7,       # 7 binary labels
    severity_output=7          # 7 regression scores (0-100)
)

# Multi-task loss
loss = CrossEntropy(skin_type) + BCE(conditions) + MSE(severity)

# Training
train(model, dataset, epochs=50, lr=1e-4, augmentation=True)
```

**Data Augmentation (quan trọng cho ảnh da):**
- Random horizontal flip
- Color jitter (brightness, contrast — mô phỏng ánh sáng khác nhau)
- Random rotation (±15°)
- Random crop + resize
- **KHÔNG** dùng: vertical flip, heavy distortion (làm sai texture da)

---

#### 3.3 Recommendation Formula Engine (Rule-based Scoring)

**Mục tiêu:** Từ kết quả phân tích ML → tính toán công thức → đưa ra routine + sản phẩm

**Đây KHÔNG phải ML**, mà là hệ thống công thức/quy tắc dựa trên kiến thức da liễu.

**Bước 1: Ingredient Matching Formula**

```
MatchScore(product, analysis) = Σ (ingredient_weight × concern_match × severity_factor)
```

Trong đó:
- `ingredient_weight`: Trọng số của thành phần hoạt chất (0-1)
- `concern_match`: 1 nếu ingredient phù hợp với vấn đề da, 0 nếu không
- `severity_factor`: severity_score / 100 (ưu tiên vấn đề nghiêm trọng hơn)

**Ví dụ:**
```
User có: acne (severity=70), enlarged_pores (severity=45)

Sản phẩm A chứa: Salicylic Acid (trị acne, weight=0.9), Niacinamide (thu nhỏ lỗ chân lông, weight=0.7)
→ MatchScore = (0.9 × 1 × 0.7) + (0.7 × 1 × 0.45) = 0.63 + 0.315 = 0.945

Sản phẩm B chứa: Retinol (trị wrinkles, weight=0.8)
→ MatchScore = (0.8 × 0 × 0.7) + (0 × 0 × 0.45) = 0 (không match)
```

**Bước 2: Routine Generation Formula**

Dựa trên bảng quy tắc da liễu:

```
ROUTINE_RULES = {
    "morning": [
        { step: "cleanser", required: true, rule: "pH 5.5, gentle" },
        { step: "toner", required: skin_type in ["oily", "combination"] },
        { step: "serum", required: has_condition, select_by: "top_concern" },
        { step: "moisturizer", required: true, rule: "by_skin_type" },
        { step: "sunscreen", required: true, rule: "SPF 30+" }
    ],
    "evening": [
        { step: "oil_cleanser", required: true, rule: "double cleanse" },
        { step: "cleanser", required: true },
        { step: "exfoliant", required: severity("acne") > 40, frequency: "2-3x/week" },
        { step: "treatment", required: has_condition, select_by: "severity_desc" },
        { step: "moisturizer", required: true }
    ]
}
```

**Bước 3: Ingredient Compatibility Check**

Kiểm tra không gợi ý sản phẩm xung đột:
```
CONFLICTS = {
    "retinol": ["AHA", "BHA", "vitamin_c"],   # Không dùng cùng lúc
    "AHA": ["retinol", "BHA"],
    "vitamin_c": ["niacinamide_high_conc"]     # Tranh cãi nhưng an toàn
}
```

**Bước 4: Final Scoring & Ranking**

```
FinalScore(product) = MatchScore × 0.6 
                    + SkinTypeCompatibility × 0.25 
                    + NoConflict × 0.15

→ Rank products by FinalScore DESC
→ Pick top 1-2 per routine step
```

---

#### 3.4 Knowledge Base (Dữ liệu nền tảng cho Formula)

Cần xây dựng database kiến thức:

```
ingredients_knowledge = {
    "salicylic_acid": {
        "treats": ["acne", "enlarged_pores", "blackheads"],
        "skin_types": ["oily", "combination"],
        "conflicts": ["retinol"],
        "max_concentration": 2.0,
        "usage": "evening",
        "weight": 0.9
    },
    "niacinamide": {
        "treats": ["enlarged_pores", "dark_spots", "redness", "oiliness"],
        "skin_types": ["all"],
        "conflicts": [],
        "max_concentration": 10.0,
        "usage": "any",
        "weight": 0.85
    },
    "hyaluronic_acid": {
        "treats": ["dehydration", "wrinkles"],
        "skin_types": ["all"],
        "conflicts": [],
        "weight": 0.8
    }
    // ... 30-50 key ingredients
}
```

---

#### 3.5 Cấu trúc AI Service (Python)

```
ai-model-service/
├── app/
│   ├── main.py                 # FastAPI entry point
│   ├── config.py               # Model paths, thresholds
│   ├── models/
│   │   ├── skin_classifier.py  # CNN model loading + inference
│   │   └── face_detector.py    # Face detection + region segmentation
│   ├── formulas/
│   │   ├── scoring.py          # MatchScore, FinalScore calculation
│   │   ├── routine_builder.py  # Routine generation logic
│   │   └── compatibility.py    # Ingredient conflict checker
│   ├── knowledge/
│   │   ├── ingredients.json    # Ingredient knowledge base
│   │   ├── routine_rules.json  # Routine step rules
│   │   └── conflicts.json      # Ingredient conflicts
│   └── utils/
│       ├── image_preprocessing.py  # Resize, normalize, augment
│       └── face_crop.py            # Face detection + crop
├── models/                     # Trained model weights (.pt / .h5)
│   ├── skin_type_v1.pt
│   └── skin_condition_v1.pt
├── training/                   # Training scripts (không deploy)
│   ├── train_skin_type.py
│   ├── train_conditions.py
│   ├── evaluate.py
│   └── data_augmentation.py
├── requirements.txt
└── Dockerfile
```

---

#### 3.6 API Output Format (từ AI Service)

```json
{
  "skinType": "oily",
  "overallScore": 72,
  "skinAge": 25,
  "conditions": [
    { "name": "acne", "severity": 70, "regions": ["forehead", "chin"] },
    { "name": "enlarged_pores", "severity": 45, "regions": ["nose", "cheeks"] },
    { "name": "dark_spots", "severity": 20, "regions": ["left_cheek"] }
  ],
  "recommendedRoutine": {
    "morning": [
      { "step": "cleanser", "reason": "Gentle low-pH for oily acne skin" },
      { "step": "toner", "reason": "Control oil production" },
      { "step": "serum", "ingredient": "niacinamide", "reason": "Pores + acne" },
      { "step": "moisturizer", "reason": "Lightweight gel for oily skin" },
      { "step": "sunscreen", "reason": "SPF 50 non-comedogenic" }
    ],
    "evening": [
      { "step": "oil_cleanser", "reason": "Remove sunscreen + sebum" },
      { "step": "cleanser", "reason": "Double cleanse" },
      { "step": "exfoliant", "ingredient": "salicylic_acid", "frequency": "3x/week" },
      { "step": "treatment", "ingredient": "retinol", "frequency": "2x/week" },
      { "step": "moisturizer", "reason": "Repair barrier overnight" }
    ]
  },
  "topIngredients": ["salicylic_acid", "niacinamide", "retinol"],
  "avoidIngredients": ["heavy_oils", "coconut_oil", "alcohol_denat"]
}
```

---

#### 3.7 Lộ trình xây dựng ML

| Bước | Task | Thời gian |
|------|------|-----------|
| 1 | Thu thập + label dataset (500+ ảnh/class) | 5-7 ngày |
| 2 | Training skin type classifier (transfer learning) | 3-4 ngày |
| 3 | Training condition detector (multi-label) | 3-4 ngày |
| 4 | Xây dựng Knowledge Base (ingredients, rules) | 2-3 ngày |
| 5 | Code Formula Engine (scoring + routine builder) | 3-4 ngày |
| 6 | Tích hợp FastAPI + ai-scan-service | 2 ngày |
| 7 | Evaluate + fine-tune accuracy | 3-5 ngày |

**Tổng:** ~21-29 ngày

> **Tip:** Có thể bắt đầu bằng Formula Engine trước (rule-based) với dummy ML output, sau đó plug model thật vào sau khi training xong.

---

### PHASE 4: Docker Packaging

#### 4.1 Dockerfile cho từng service

```
aiskin-server/
├── docker-compose.yml
├── discovery-server/Dockerfile
├── api-gateway/Dockerfile
├── user-service/Dockerfile
├── product-service/Dockerfile
├── ai-scan-service/Dockerfile
├── recommendation-service/Dockerfile
└── ai-model-service/Dockerfile (Python)
```

#### 4.2 docker-compose.yml
- **Infrastructure:**
  - MongoDB container
  - Redis container
- **Services:**
  - discovery-server (port 8761)
  - api-gateway (port 8080)
  - user-service (port 8081)
  - product-service (port 8082)
  - ai-scan-service (port 8083)
  - recommendation-service (port 8084)
  - ai-model-service (port 5000 - Python)
- **Network:** Tất cả service chung 1 Docker network
- **Volumes:** Persistent data cho MongoDB & Redis
- **Environment:** Cấu hình qua .env file

#### 4.3 Dockerfile template (Spring Boot service)
```dockerfile
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY target/*.jar app.jar
EXPOSE <port>
ENTRYPOINT ["java", "-jar", "app.jar"]
```

#### 4.4 Dockerfile template (Python AI service)
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000"]
```

#### 4.5 Web App build
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

---

## Thứ tự thực hiện (Priority)

| # | Task | Phụ thuộc | Ước lượng |
|---|------|-----------|-----------|
| 1 | product-service: CRUD + search | user-service ✅ | 3-4 ngày |
| 2 | ai-scan-service: Upload + lưu kết quả | user-service ✅ | 3-4 ngày |
| 3 | Knowledge Base: ingredients, routine rules, conflicts | — | 2-3 ngày |
| 4 | Formula Engine: scoring + routine builder | #3 | 3-4 ngày |
| 5 | Dataset: thu thập + label ảnh da (500+/class) | — | 5-7 ngày |
| 6 | ML Training: skin type + condition classifier (CNN) | #5 | 6-8 ngày |
| 7 | FastAPI service + tích hợp ai-scan-service | #2, #4, #6 | 2-3 ngày |
| 8 | recommendation-service: Tạo routine + gợi ý SP | #1, #7 | 4-5 ngày |
| 9 | Web App: Hoàn thiện Scan + Analysis UI | #7 | 3-4 ngày |
| 10 | Web App: Products + Routine + Progress UI | #8 | 4-5 ngày |
| 11 | Web App: Dashboard tổng hợp | #9, #10 | 2-3 ngày |
| 12 | Docker packaging toàn bộ hệ thống | #1-#11 | 2-3 ngày |

**Tổng ước lượng:** ~40-53 ngày làm việc

> **Chiến lược song song:** Task #5 (dataset) có thể làm đồng thời với #1-#4. Task #3-#4 (Formula Engine) có thể test với dummy data trước khi model sẵn sàng.

---

## Tech Stack tổng hợp

| Layer | Technology |
|-------|-----------|
| Backend Framework | Spring Boot 4.0.6 |
| Java Version | 21 |
| Service Discovery | Netflix Eureka |
| API Gateway | Spring Cloud Gateway (WebMVC) |
| Database | MongoDB |
| Cache/Session | Redis |
| Auth | JWT (jjwt) + OTP |
| AI/ML Framework | PyTorch (EfficientNet-B3 / ResNet-50 transfer learning) |
| AI Service | Python 3.11 + FastAPI + Uvicorn |
| ML Libraries | torchvision, OpenCV, Pillow, NumPy, scikit-learn |
| Recommendation | Rule-based Formula Engine (scoring + ingredient matching) |
| Frontend Web | React 19 + Vite + Ant Design + TailwindCSS |
| Frontend Mobile | Flutter (tạm hoãn) |
| Containerization | Docker + Docker Compose |
| API Docs | SpringDoc OpenAPI 3 |

---

## Ghi chú

- Mobile app (Flutter) tạm hoãn đến khi có domain để deploy web
- Mỗi service đăng ký Eureka và giao tiếp qua Gateway
- Tất cả API đều đi qua api-gateway, client không gọi trực tiếp service
- AI model có thể bắt đầu bằng rule-based đơn giản, sau nâng cấp lên ML model
- Docker packaging là milestone cuối cùng trong phase này (chưa deploy lên cloud)
- API sử dụng REST (JSON), **không phải GraphQL** như doc cũ ghi

---

## Tài liệu chi tiết (my-doc/skill/)

| Thư mục | File | Nội dung |
|---------|------|----------|
| context/ | project_overview.md | Tổng quan dự án, thành phần, tiến độ |
| context/ | architecture.md | Kiến trúc microservices, sơ đồ, quyết định |
| context/ | tech_stack.md | Công nghệ, phiên bản, dependencies |
| context/ | project_technical.md | Chi tiết kỹ thuật, luồng dữ liệu, Docker |
| context/ | coding_conventions.md | Quy ước code, naming, git, patterns |
| api/ | api_specification.md | Đặc tả API endpoints đầy đủ |
| requirement/ | product_requirements.md | Yêu cầu sản phẩm, use cases, NFRs |
| be/ | conceptual_erd.md | ERD khái niệm (9 collections, relationships) |
| be/ | physical_erd.md | Schema MongoDB chi tiết (data types, indexes) |
| stitch/ | 00-07_*.md | Prompt thiết kế UI cho từng màn hình (Google Stitch) |