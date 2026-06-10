# Architecture

> Kiến trúc tổng thể của hệ thống.

## 1. Sơ đồ kiến trúc tổng thể

```
┌─────────────────┐         ┌─────────────────┐
│  Flutter App    │         │   React Web     │
│  (Mobile)       │         │   (Browser)     │
└────────┬────────┘         └────────┬────────┘
         │                           │
         └───────────┬───────────────┘
                     │ GraphQL
         ┌───────────▼────────────┐
         │   API Gateway          │
         │   (SpringBoot)         │
         └───────────┬────────────┘
                     │
         ┌───────────┴────────────┐
         │                        │
┌────────▼─────────┐    ┌────────▼──────────┐
│  Business Logic  │    │   AI/ML Service   │
│  Service         │    │   (Python)        │
│  (SpringBoot)    │    │                   │
└────────┬─────────┘    └────────┬──────────┘
         │                       │
         └───────┬───────────────┘
                 │
     ┌───────────┼───────────┐
     │           │           │
┌────▼────┐ ┌───▼────┐ ┌───▼─────┐
│ MongoDB │ │ Redis  │ │ Storage │
│         │ │ Cache  │ │ (Images)│
└─────────┘ └────────┘ └─────────┘
```

## 2. Các thành phần chính (Components)

| Thành phần | Trách nhiệm | Công nghệ |
|------------|-------------|-----------|
| Flutter Mobile App | Chụp ảnh khuôn mặt, hiển thị kết quả | Flutter |
| React Web App | Quản lý, xem chi tiết phân tích, lộ trình chăm sóc | React |
| API Gateway | Routing, authentication, rate limiting | SpringBoot + GraphQL |
| Business Logic Service | User management, skincare routine generation, product recommendation | SpringBoot |
| AI/ML Service | Image processing, skin analysis, condition detection | Python (TensorFlow/PyTorch) |
| MongoDB | Lưu trữ user data, analysis results, skincare routines | MongoDB |
| Redis | Session, caching, temporary data | Redis |
| Image Storage | Lưu trữ ảnh khuôn mặt | S3/MinIO |

## 3. Giao tiếp giữa các thành phần

- **Client ↔ API Gateway:** GraphQL over HTTPS
- **API Gateway ↔ Services:** REST API / gRPC (internal)
- **Services ↔ Database:** MongoDB driver, Redis client
- **Đồng bộ:** GraphQL queries, REST calls
- **Bất đồng bộ:** Message queue (khuyến nghị) cho AI processing tasks

## 4. Quyết định kiến trúc (Architecture Decisions)

| Quyết định | Lý do | Đánh đổi |
|-----------|-------|----------|
| Microservices | Tách biệt business logic và AI processing, dễ scale | Phức tạp hơn monolith, cần orchestration |
| GraphQL | Flexible queries, giảm over-fetching | Learning curve, caching phức tạp hơn REST |
| MongoDB | Schema flexibility cho dữ liệu phân tích đa dạng | Không có ACID transactions mạnh như SQL |
| Redis | Fast caching, session management | In-memory, cần backup strategy |
| Python cho AI | Ecosystem ML/AI mạnh nhất | Cần tích hợp với Java services |

## 5. Ràng buộc kiến trúc

- **Bảo mật:** Dữ liệu hình ảnh và thông tin sức khỏe phải được mã hóa
- **Hiệu năng:** AI processing phải < 5s cho trải nghiệm tốt
- **Khả năng mở rộng:** Services phải stateless để scale horizontal
- **Tuân thủ:** Phải tuân thủ quy định bảo vệ dữ liệu cá nhân và y tế
