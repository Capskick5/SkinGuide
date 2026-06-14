# Project Technical

> Chi tiết kỹ thuật của dự án MSS.

## Kiến trúc
**Microservices Architecture** với Service Discovery (Eureka) và API Gateway pattern.

## Tech Stack

### Backend
- **Java 21** + **Spring Boot 4.0.6** + **Spring Cloud 2025.1.1**
- **Services:**
  - discovery-server (Eureka Server)
  - api-gateway (Spring Cloud Gateway WebMVC + LoadBalancer)
  - user-service (Web + Security + MongoDB + Redis + JWT)
  - product-service (Web + MongoDB)
  - ai-scan-service (Web + MongoDB)
  - recommendation-service (Web + MongoDB)
- **Python 3.11+** + **FastAPI**: AI/ML service
  - CNN model (EfficientNet-B3 / ResNet-50 transfer learning) cho phân tích ảnh da
  - Formula Engine (rule-based scoring) cho routine generation + product matching

### Frontend
- **React 19** + **Vite 8**: Web application
- **Ant Design 5** + **TailwindCSS 4**: UI components & styling
- **React Router DOM 7**: Client-side routing
- **Flutter** (Dart): Mobile application (tạm hoãn)

### Database
- **MongoDB**: NoSQL database cho mọi service (database-per-service)
- **Redis**: JWT refresh token store, OTP storage, caching

### API
- **REST** (JSON): Giao tiếp client ↔ gateway ↔ services
- **SpringDoc OpenAPI 3**: API documentation (Swagger UI)
- **JWT**: Authentication (access token + refresh token + OTP)

## Cấu trúc thư mục Backend (mỗi service)

```
service-name/
├── pom.xml
├── src/main/java/mss/servicename/
│   ├── ServiceNameApplication.java
│   ├── config/          # Cấu hình (Security, CORS, MongoDB...)
│   ├── controller/      # REST controllers
│   ├── dto/             # Request/Response DTOs
│   ├── exception/       # Custom exceptions + GlobalHandler
│   ├── model/           # MongoDB documents (entities)
│   ├── repository/      # Spring Data MongoDB repositories
│   ├── security/        # JWT filter, OTP store (user-service)
│   └── service/         # Business logic
└── src/main/resources/
    └── application.yml  # Config (port, eureka, mongodb, redis)
```

## Cấu trúc thư mục Frontend Web

```
aiskin-web-app/src/
├── api/              # HTTP client, auth API, token storage
├── assets/           # Static assets
├── components/       # Shared components
├── config/           # App configuration
├── data/             # Static data / constants
├── hook/             # Custom React hooks
├── main/             # App entry point
├── page/             # Pages (auth, dashboard, scan, analysis, products, routine, progress, history, profile)
│   ├── auth/
│   ├── dashboard/
│   ├── scan/
│   ├── analysis/
│   ├── products/
│   ├── routine/
│   ├── progress/
│   ├── history/
│   ├── profile/
│   └── misc/
└── route/            # Route definitions
```

## Luồng dữ liệu chính

```
1. [Auth Flow]
   Web App → API Gateway → User Service → MongoDB/Redis → JWT tokens

2. [Scan Flow]
   Web App (upload ảnh) → API Gateway → AI Scan Service → Python AI Model → Kết quả phân tích → MongoDB

3. [Recommendation Flow]
   Kết quả scan → Recommendation Service → (gọi Product Service lấy SP) → Routine + Gợi ý SP → MongoDB

4. [Product Flow]
   Web App → API Gateway → Product Service → MongoDB → Danh sách sản phẩm

5. [Progress Flow]
   Web App → API Gateway → Recommendation Service → So sánh scan history → Timeline cải thiện
```

## Service Communication

| Từ | Đến | Phương thức | Mục đích |
|----|-----|------------|----------|
| Client | API Gateway | REST/HTTPS | Mọi request |
| API Gateway | Eureka | Service lookup | Tìm instance |
| API Gateway | All services | HTTP (lb://) | Route request |
| AI Scan Service | AI Model (Python) | HTTP internal | Gửi ảnh → CNN inference → nhận kết quả phân tích |
| Recommendation Service | AI Model (Python) | HTTP internal | Gọi Formula Engine → nhận routine + product scores |
| Recommendation Service | Product Service | HTTP internal | Lấy thông tin sản phẩm |
| Recommendation Service | AI Scan Service | HTTP internal | Lấy kết quả scan |

## Docker Architecture

```
docker-compose.yml
├── mongodb (port 27017, volume: mongo-data)
├── redis (port 6379, volume: redis-data)
├── discovery-server (port 8761)
├── api-gateway (port 8080, depends: discovery-server)
├── user-service (port 8081, depends: discovery-server, mongodb, redis)
├── product-service (port 8082, depends: discovery-server, mongodb)
├── ai-scan-service (port 8083, depends: discovery-server, mongodb)
├── recommendation-service (port 8084, depends: discovery-server, mongodb)
├── ai-model-service (port 5000)
└── web-app (port 80, nginx)
```
