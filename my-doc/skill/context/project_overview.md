# Project Overview

> Tổng quan về dự án, mục tiêu và phạm vi.

## Tên dự án
AiSkin

## Mô tả
Hệ thống xử lý hình ảnh da mặt từ mobile app để phân tích tình trạng da, tạo lộ trình chăm sóc da cá nhân hóa và tư vấn sản phẩm điều trị phù hợp.

## Mục tiêu chính
- Phân tích tình trạng da qua hình ảnh khuôn mặt
- Tạo lộ trình chăm sóc da cá nhân hóa
- Tư vấn sản phẩm điều trị phù hợp với từng loại da

## Thành phần hệ thống
1. **Mobile App (Flutter)**: Chụp ảnh khuôn mặt và gửi lên server
2. **Web Platform (React)**: Xử lý hình ảnh, hiển thị kết quả phân tích và lộ trình chăm sóc
3. **Backend Services (Microservices)**: 
   - SpringBoot: Xử lý business logic, API gateway
   - Python: Xử lý AI/ML cho phân tích hình ảnh da

## Đối tượng người dùng
- Người dùng cuối: Người quan tâm đến chăm sóc da
- Chuyên gia da liễu: Tư vấn và theo dõi khách hàng
- Quản trị viên: Quản lý hệ thống và dữ liệu
