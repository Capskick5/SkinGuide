# Project Overview

> Tổng quan về dự án, mục tiêu và phạm vi.

## Tên dự án
MSS — Medical Skin Solution (AiSkin)

## Mô tả
Hệ thống AI phân tích da mặt từ ảnh chụp, nhận diện loại da và vấn đề da, tạo lộ trình chăm sóc da cá nhân hóa và tư vấn sản phẩm skincare phù hợp. Kiến trúc microservices, hỗ trợ cả web và mobile.

## Mục tiêu chính
- Phân tích tình trạng da qua hình ảnh khuôn mặt (AI-powered)
- Nhận diện loại da (oily, dry, combination, normal, sensitive)
- Phát hiện vấn đề da (acne, dark spots, wrinkles, redness, enlarged pores...)
- Tạo lộ trình chăm sóc da cá nhân hóa (morning + evening routine)
- Tư vấn sản phẩm skincare phù hợp với từng loại da và vấn đề
- Theo dõi tiến triển da theo thời gian

## Thành phần hệ thống

### Client
| App | Công nghệ | Trạng thái | Vai trò |
|-----|-----------|-----------|---------|
| Web App | React 19 + Vite + Ant Design + TailwindCSS | 🟡 Đang phát triển | Auth, Dashboard, Scan, Analysis, Products, Routine, Progress |
| Mobile App | Flutter | 🔒 Tạm hoãn | QR scan + Face capture (chờ domain) |

### Backend (Microservices — Spring Boot 4.0.6 / Java 21)
| Service | Trạng thái | Vai trò |
|---------|-----------|---------|
| discovery-server | ✅ Done | Eureka service registry |
| api-gateway | ✅ Done | Routing, load balancing, Swagger aggregation |
| user-service | ✅ Done | Auth (JWT+OTP), user profile, RBAC, MongoDB + Redis |
| product-service | 🟡 Scaffold | CRUD sản phẩm skincare |
| ai-scan-service | ⬜ Chưa bắt đầu | Upload ảnh, gọi AI model, lưu kết quả |
| recommendation-service | ⬜ Chưa bắt đầu | Tạo routine, gợi ý sản phẩm, tracking |
| ai-model-service (Python) | ⬜ Chưa bắt đầu | Phân tích ảnh da bằng ML model |

## Đối tượng người dùng
- **Người dùng cuối (18-45 tuổi):** Người quan tâm đến chăm sóc da, cần biết tình trạng da và nhận tư vấn
- **Quản trị viên:** Quản lý hệ thống, sản phẩm, dữ liệu

## Phạm vi hiện tại (MVP → Docker packaging)
- ✅ Authentication & Authorization hoàn chỉnh
- 🎯 CRUD sản phẩm + AI scan + Recommendation
- 🎯 Frontend web kết nối đầy đủ với backend
- 🎯 Docker packaging toàn bộ hệ thống
- ❌ Chưa deploy cloud, chưa setup CI/CD
