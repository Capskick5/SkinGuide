# Product Requirements

> Mô tả mục tiêu sản phẩm, người dùng và các tính năng cốt lõi.

## 1. Tổng quan sản phẩm
- **Tên sản phẩm:** MSS (Medical Skin Solution)
- **Mục tiêu chính:** Cung cấp giải pháp phân tích da và tư vấn chăm sóc da cá nhân hóa dựa trên AI
- **Vấn đề cần giải quyết:** 
  - Khó tiếp cận chuyên gia da liễu
  - Không biết tình trạng da của mình
  - Chọn sản phẩm chăm sóc da không phù hợp
- **Giá trị mang lại:**
  - Phân tích da nhanh chóng, chính xác qua AI
  - Lộ trình chăm sóc da cá nhân hóa
  - Tư vấn sản phẩm phù hợp với từng loại da

## 2. Đối tượng người dùng (User Personas)

| Persona | Vai trò | Nhu cầu chính | Pain points |
|---------|---------|----------------|-------------|
| Người dùng cuối | Người quan tâm chăm sóc da (18-45 tuổi) | Biết tình trạng da, nhận tư vấn sản phẩm | Không biết da mình có vấn đề gì, sản phẩm nào phù hợp |
| Quản trị viên | Quản lý hệ thống & sản phẩm | Quản lý catalog sản phẩm, giám sát hoạt động | Cần dashboard quản trị, CRUD sản phẩm |

> **Ghi chú:** Persona "Chuyên gia da liễu" tạm loại khỏi MVP, cân nhắc cho phase 2.

## 3. Use Cases chính

1. **Phân tích da qua ảnh**
   - User chụp ảnh khuôn mặt trên mobile app
   - Hệ thống phân tích và trả về kết quả (loại da, vấn đề da)

2. **Nhận lộ trình chăm sóc da**
   - Dựa trên kết quả phân tích, hệ thống tạo lộ trình chăm sóc cá nhân hóa
   - User xem lộ trình trên web/mobile

3. **Tư vấn sản phẩm**
   - Hệ thống đề xuất sản phẩm phù hợp với tình trạng da
   - User xem thông tin chi tiết sản phẩm

4. **Theo dõi tiến trình**
   - User chụp ảnh định kỳ để theo dõi cải thiện
   - Hệ thống so sánh và hiển thị tiến trình

## 4. Tính năng cốt lõi (Core Features)

### Phase hiện tại (MVP → Docker packaging)
- [x] Đăng ký / Đăng nhập (JWT + OTP)
- [x] Quản lý user profile & skin profile
- [x] API Gateway + Service Discovery
- [ ] Chụp/upload ảnh khuôn mặt (Web)
- [ ] Phân tích hình ảnh da bằng AI
- [ ] Phát hiện vấn đề da (mụn, nám, lão hóa, lỗ chân lông...)
- [ ] Tạo lộ trình chăm sóc da cá nhân hóa (morning + evening)
- [ ] Tư vấn sản phẩm phù hợp
- [ ] Lịch sử phân tích
- [ ] Theo dõi tiến trình cải thiện da
- [ ] Docker packaging toàn bộ hệ thống

### Phase 2 (Sau deploy)
- [ ] Mobile app (Flutter) QR scan + face capture
- [ ] Thông báo nhắc nhở chăm sóc da
- [ ] Tư vấn chuyên gia (kết nối bác sĩ da liễu)
- [ ] Đa ngôn ngữ

## 5. Tính năng ngoài phạm vi (Out of Scope — MVP)

- Chẩn đoán y khoa chính thức (chỉ là tư vấn, không thay thế bác sĩ)
- Bán sản phẩm trực tiếp (chỉ tư vấn, không e-commerce)
- Tư vấn trực tiếp với bác sĩ (phase 2)
- Phân tích toàn thân (chỉ tập trung vào da mặt)
- Mobile app deploy (chờ domain)
- Cloud deployment (dừng ở Docker packaging)
- CI/CD pipeline
- Đa ngôn ngữ (phase 2)

## 6. Yêu cầu phi chức năng (Non-functional)

- **Hiệu năng:**
  - Thời gian phân tích ảnh: < 5 giây
  - API response time: < 500ms
  - Mobile app load time: < 2 giây

- **Khả năng mở rộng:**
  - Hỗ trợ 10,000+ concurrent users
  - Xử lý 1000+ ảnh/giờ

- **Trải nghiệm người dùng:**
  - UI/UX đơn giản, dễ sử dụng
  - Hỗ trợ đa ngôn ngữ (Tiếng Việt, English)
  - Responsive design

- **Bảo mật:**
  - Mã hóa dữ liệu hình ảnh
  - Tuân thủ quy định bảo vệ dữ liệu cá nhân

## 7. Tiêu chí thành công (Success Metrics)

- **Adoption:** 10,000 users trong 6 tháng đầu
- **Engagement:** 60% users quay lại sau lần đầu sử dụng
- **Accuracy:** AI accuracy > 85% trong phát hiện vấn đề da
- **Performance:** 95% requests hoàn thành trong < 5s
- **Satisfaction:** User rating > 4.0/5.0
