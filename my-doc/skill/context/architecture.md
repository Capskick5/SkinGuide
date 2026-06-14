# Architecture

> Kiến trúc tổng thể của hệ thống MSS (Medical Skin Solution).

## 1. Sơ đồ kiến trúc tổng thể

```
┌─────────────────┐         ┌─────────────────┐
│  Flutter App    │         │   React Web     │
│  (Mobile)       │         │   (Vite + Antd) │
│  [Tạm hoãn]    │         │                 │
└────────┬────────┘         └────────┬────────┘
         │                           │
         └───────────┬───────────────┘
                     │ REST / HTTPS
         ┌───────────▼────────────┐
         │   API Gateway          │
         │   (Spring Cloud GW)    │
         │   Port: 8080           │
         └───────────┬────────────┘
                     │ lb:// (LoadBalancer)
         ┌───────────▼────────────┐
         │   Discovery Server     │
         │   (Eureka)             │
         │   Port: 8761           │
         └───────────┬────────────┘
                     │ Service Registry
    ┌────────────────┼────────────────────────┐
    │                │                        │
┌───▼──────┐  ┌─────▼──────┐  ┌─────────────▼──┐
│ user-    │  │ product-   │  │ ai-scan-       │
│ service  │  │ service    │  │ service        │
│ :8081    │  │ :8082      │  │ :8083          │
└───┬──────┘  └─────┬──────┘  └──────┬─────────┘
    │               │                 │
    │               │          ┌──────▼─────────┐
    │               │          │ AI Model Svc   │
    │               │          │ (Python/FastAPI)│
    │               │          │ :5000          │
    │               │          └──────┬─────────┘
    │               │                 │
    └───────┬───────┴─────────────────┘
            │
  ┌─────────┼─────────────┐
  │         │             │
┌─▼───┐  ┌─▼──────┐  ┌───▼─────┐
│Mongo│  │ Redis  │  │ Storage │
│DB   │  │ Cache  │  │ (Images)│
└─────┘  └────────┘  └─────────┘

         ┌──────────────────────┐
         │ recommendation-      │
         │ service  :8084       │
         │ (gọi product + scan) │
         └──────────────────────┘
```

## 2. Các thành phần chính (Components)

| Thành phần | Trách nhiệm | Công nghệ | Port |
|------------|-------------|-----------|------|
| Flutter Mobile App | QR scan, chụp ảnh khuôn mặt | Flutter (tạm hoãn) | — |
| React Web App | Auth, Dashboard, Scan, Routine, Products, Progress | React 19 + Vite + Ant Design + TailwindCSS | 5173 (dev) |
| API Gateway | Routing, load balancing, CORS | Spring Cloud Gateway WebMVC | 8080 |
| Discovery Server | Service registry & health check | Netflix Eureka Server | 8761 |
| User Service | Auth (JWT+OTP), user profile, RBAC | Spring Boot + MongoDB + Redis | 8081 |
| Product Service | CRUD sản phẩm skincare, search, filter | Spring Boot + MongoDB | 8082 |
| AI Scan Service | Upload ảnh, gọi AI model, lưu kết quả | Spring Boot + MongoDB | 8083 |
| Recommendation Service | Tạo routine, gợi ý sản phẩm, theo dõi tiến triển | Spring Boot + MongoDB | 8084 |
| AI Model Service | Phân tích ảnh da bằng CNN (transfer learning), Formula Engine tạo routine | Python FastAPI + PyTorch + OpenCV | 5000 |
| MongoDB | Lưu trữ user data, scan results, products, routines | MongoDB 7+ | 27017 |
| Redis | JWT refresh tokens, OTP storage, caching | Redis 7+ | 6379 |

## 3. Giao tiếp giữa các thành phần

- **Client → API Gateway:** REST over HTTPS (JSON)
- **API Gateway → Services:** HTTP qua Eureka `lb://SERVICE-NAME`
- **Services → Services:** REST internal (qua Eureka discovery)
- **AI Scan Service → AI Model Service:** HTTP (gửi ảnh, nhận JSON kết quả)
- **Services → Database:** MongoDB Java Driver, Spring Data Redis
- **Đồng bộ:** REST calls cho tất cả luồng chính
- **Bất đồng bộ:** Có thể bổ sung Message Queue cho AI processing nặng (future)

## 4. Quyết định kiến trúc (Architecture Decisions)

| Quyết định | Lý do | Đánh đổi |
|-----------|-------|----------|
| Microservices + Eureka | Tách biệt domain, scale độc lập, service discovery tự động | Phức tạp hơn monolith, cần Docker orchestration |
| REST API (thay vì GraphQL) | Đơn giản, phổ biến, dễ debug, team quen thuộc | Có thể over-fetching, cần thiết kế DTO cẩn thận |
| Spring Cloud Gateway | Tích hợp native với Eureka, load balancing sẵn | Chỉ hỗ trợ Java ecosystem |
| MongoDB | Schema flexibility cho dữ liệu phân tích đa dạng, embed documents | Không có ACID transactions mạnh như SQL |
| Redis | JWT refresh token + OTP storage nhanh, TTL tự động expire | In-memory, cần persistence config |
| Python cho AI | Ecosystem ML/AI mạnh nhất (PyTorch, OpenCV). Transfer learning giảm data cần thiết | Cần HTTP bridge từ Java service |
| Transfer Learning CNN | Tận dụng pre-trained weights, cần ít data hơn train from scratch | Phụ thuộc vào quality dataset |
| Formula Engine (Rule-based) | Deterministic, dễ debug, dựa trên kiến thức da liễu đã kiểm chứng | Cần expert input, không tự học thêm |
| JWT + OTP | Stateless auth, hỗ trợ mobile, OTP cho verify email/phone | Token revocation phức tạp hơn session |

## 5. Ràng buộc kiến trúc

- **Bảo mật:** Dữ liệu hình ảnh và thông tin sức khỏe phải được mã hóa. JWT cho mọi request qua Gateway
- **Hiệu năng:** AI processing phải < 5s cho trải nghiệm tốt
- **Khả năng mở rộng:** Services phải stateless để scale horizontal (Docker replicas)
- **Tuân thủ:** Phải tuân thủ quy định bảo vệ dữ liệu cá nhân
- **Containerization:** Mỗi service đóng gói Docker riêng, orchestrate bằng docker-compose
- **Service Independence:** Mỗi service có database riêng (database-per-service pattern)

## 6. Luồng dữ liệu chính

```
1. User đăng nhập → API Gateway → User Service → JWT token
2. User upload ảnh → API Gateway → AI Scan Service → AI Model (Python) → Kết quả phân tích
3. Kết quả scan → Recommendation Service → Tạo routine + gợi ý sản phẩm
4. User xem sản phẩm → API Gateway → Product Service → Danh sách sản phẩm
5. User xem tiến triển → API Gateway → Recommendation Service → So sánh scan history
```
