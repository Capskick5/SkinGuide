# SkinGuide

SkinGuide là hệ thống skincare thu nhỏ: quét ảnh da, tạo routine, gợi ý sản phẩm và hỗ trợ luồng mua hàng có quản lý tồn kho.

## Chạy local

Yêu cầu: Java 21, Node.js, Docker Desktop và hai Python virtual environment đã được cài.

```bash
./scripts/setup-python.sh  # chỉ chạy lần đầu
./scripts/start-dev.sh
```

Mở terminal khác để kiểm tra:

```bash
./scripts/status-dev.sh
./scripts/smoke-test.sh
```

Các địa chỉ chính:

| Thành phần | Địa chỉ |
|---|---|
| Web | http://127.0.0.1:5174 |
| API Gateway | http://127.0.0.1:8080 |
| User Swagger | http://127.0.0.1:8081/swagger-ui.html |
| Product và kho Swagger | http://127.0.0.1:8082/swagger-ui.html |
| Order Swagger | http://127.0.0.1:8083/swagger-ui.html |

Tắt toàn bộ service:

```bash
./scripts/stop-dev.sh
```

## MongoDB Atlas và seed data

Các service ghi dữ liệu vào MongoDB URI trong `aiskin-server/.env`. Nếu URI trỏ tới Atlas thì dữ liệu seed cũng được lưu trên Atlas; repo chỉ giữ script và file nguồn để có thể tạo lại dữ liệu.

Sau khi product-service đã chạy:

```bash
./scripts/seed-demo.sh
```

Script import 500 sản phẩm từ `my-doc/data/product_dataset.json`. Endpoint seed dùng token nội bộ và import theo `slug`, vì vậy chạy lại sẽ bỏ qua sản phẩm đã có thay vì tạo trùng. Số lượng tồn kho được nhập riêng tại trang **Admin > Inventory**, vì tồn kho là giao dịch nghiệp vụ cần có lịch sử movement.

## Checklist trước khi demo

1. `./scripts/status-dev.sh` không còn service `DOWN`.
2. `./scripts/smoke-test.sh` báo `All smoke checks passed`.
3. Catalog có sản phẩm, variant và tồn kho khả dụng.
4. Dùng ảnh mặt rõ, một khuôn mặt để demo AI scan.
5. Chạy thử một đơn: thêm giỏ, checkout, giữ kho và hủy/hoàn tất đơn.

Không commit `aiskin-server/.env`, mật khẩu demo, JWT secret hoặc MongoDB Atlas URI.
Project môn MSS301
