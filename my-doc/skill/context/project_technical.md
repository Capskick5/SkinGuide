# Project Technical

> Chi tiết kỹ thuật của dự án.

## Kiến trúc
**Microservices Architecture**

## Tech Stack

### Backend
- **SpringBoot**: Business logic, API Gateway, User management
- **Python**: AI/ML services cho xử lý và phân tích hình ảnh da

### Frontend
- **React**: Web application
- **Flutter**: Mobile application (iOS & Android)

### Database
- **MongoDB**: NoSQL database chính cho dữ liệu người dùng, kết quả phân tích
- **Redis**: Caching, session management

### API
- **GraphQL**: API layer cho communication giữa frontend và backend

## Luồng dữ liệu chính
1. Mobile app (Flutter) chụp ảnh khuôn mặt
2. Ảnh được upload lên backend qua GraphQL API
3. Python service xử lý AI/ML phân tích hình ảnh
4. SpringBoot service xử lý business logic, tạo lộ trình chăm sóc
5. Kết quả được lưu vào MongoDB
6. Web/Mobile hiển thị kết quả và đề xuất sản phẩm
