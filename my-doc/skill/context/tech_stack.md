# Tech Stack

> Công nghệ, framework và thư viện sử dụng trong hệ thống MSS.

## Frontend

### Web App
- **Framework:** React 19
- **Build Tool:** Vite 8
- **UI Library:** Ant Design 5 + @ant-design/icons 6
- **CSS:** TailwindCSS 4
- **Routing:** React Router DOM 7
- **QR Code:** qrcode.react 4
- **Compiler:** React Compiler (babel-plugin-react-compiler)
- **Linter:** ESLint 10

### Mobile App (Tạm hoãn — chờ domain)
- **Framework:** Flutter (Dart)
- **Chức năng:** QR scan + Face capture
- **Platforms:** Android / iOS

## Backend (Microservices)

### Core Framework
- **Java:** 21 (LTS)
- **Spring Boot:** 4.0.6
- **Spring Cloud:** 2025.1.1

### Services & Libraries
| Service | Dependencies chính |
|---------|-------------------|
| discovery-server | Spring Cloud Netflix Eureka Server |
| api-gateway | Spring Cloud Gateway WebMVC, Spring Cloud LoadBalancer, SpringDoc OpenAPI 3.0.3 |
| user-service | Spring Web, Spring Security, Spring Data MongoDB, Spring Data Redis, JJWT 0.12.6, Spring Validation, SpringDoc OpenAPI 3.0.3, Lombok |
| product-service | Spring Web, Spring Data MongoDB, Eureka Client, SpringDoc OpenAPI *(cần bổ sung)* |
| ai-scan-service | Spring Web, Spring Data MongoDB, Eureka Client *(cần xây dựng)* |
| recommendation-service | Spring Web, Spring Data MongoDB, Eureka Client *(cần xây dựng)* |

### AI/ML Service
- **Ngôn ngữ:** Python 3.11+
- **Framework:** FastAPI + Uvicorn
- **ML Framework:** PyTorch (primary) hoặc TensorFlow/Keras
- **Model Architecture:** Transfer Learning — EfficientNet-B3 / ResNet-50 (pre-trained ImageNet)
- **ML Tasks:**
  - Skin Type Classification (single-label, 5 classes)
  - Skin Condition Detection (multi-label, 7 conditions)
  - Severity Regression (0-100 per condition per region)
- **Computer Vision:** OpenCV, Pillow (face detection, preprocessing)
- **Data Science:** NumPy, scikit-learn, pandas (evaluation, metrics)
- **Recommendation:** Rule-based Formula Engine (scoring + ingredient matching + routine generation)
- **Knowledge Base:** JSON files (ingredients, routine rules, conflicts)
- **Mục đích:** Phân tích hình ảnh da bằng CNN → Formula Engine tính toán → output routine + sản phẩm

## Database
- **Primary Database:** MongoDB 7+ (NoSQL — từng service có DB riêng)
- **Cache / Token Store:** Redis 7+ (JWT refresh tokens, OTP storage, caching)

## API Layer
- **Protocol:** REST over HTTPS (JSON)
- **API Docs:** SpringDoc OpenAPI 3 (Swagger UI) — aggregated qua Gateway
- **Authentication:** JWT (Access Token + Refresh Token) + OTP verification

## Hạ tầng / DevOps

| Mục | Công nghệ | Ghi chú |
|-----|-----------|---------|
| Containerization | Docker + Docker Compose | Mỗi service 1 Dockerfile |
| Service Discovery | Netflix Eureka | Tự động register/deregister |
| Load Balancing | Spring Cloud LoadBalancer | lb:// routing qua Gateway |
| Image Storage | Local / MinIO *(tạm thời)* | Chuyển S3 khi deploy cloud |
| CI/CD | *(Chưa setup)* | Sẽ bổ sung sau phase Docker |
| Monitoring | *(Chưa setup)* | Actuator + Prometheus/Grafana khuyến nghị |

## Công cụ phát triển
- **IDE:** IntelliJ IDEA / VS Code
- **Build Tool:** Maven (mvnw wrapper)
- **API Testing:** Swagger UI (tích hợp sẵn) / Postman
- **Version Control:** Git
