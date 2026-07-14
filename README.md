# SkinGuide

SkinGuide là hệ thống skincare thu nhỏ: quét ảnh da, tạo routine, gợi ý sản phẩm và hỗ trợ luồng mua hàng có quản lý tồn kho.

## Core flow

```text
Ảnh mặt -> AI guard -> Model A loại da -> Model B vấn đề da (nếu có)
-> routine sáng/tối -> thành phần mục tiêu -> sản phẩm active/còn hàng
-> variant -> giỏ hàng -> đơn hàng -> giữ/trừ/hoàn tồn kho
```

## Đọc code theo module

| Module | Công nghệ | Trách nhiệm chính |
|---|---|---|
| `aiskin-client/aiskin-web-app` | React | Giao diện khách hàng và admin |
| `aiskin-server/api-gateway` | Spring Cloud Gateway | Một cổng vào và định tuyến service |
| `aiskin-server/user-service` | Spring Boot | Auth, JWT, role, profile và địa chỉ |
| `aiskin-server/product-service` | Spring Boot | Sản phẩm, variant, kho, reserve/release/commit |
| `aiskin-server/order-service` | Spring Boot | Checkout, đơn, thanh toán, GHN, return/refund |
| `aiskin-server/ai-scan-service` | FastAPI/PyTorch | Kiểm tra ảnh, Model A/B, lịch sử scan và routine |
| `aiskin-server/recommendation-service` | FastAPI/scikit-learn | Lọc catalog, match thành phần, chatbot server-side |

Java giữ nghiệp vụ bán hàng và dữ liệu giao dịch. Python chỉ xử lý AI/rule/recommendation; cả hai đều xác minh cùng JWT do `user-service` phát hành.

## Chạy local

Yêu cầu: Java 21, Node.js, Docker Desktop, Python 3 và `jq`.

```bash
cp aiskin-server/.env.example aiskin-server/.env
# Điền MongoDB/JWT và các sandbox key cần dùng
./scripts/setup-python.sh  # chỉ chạy lần đầu
./scripts/start-dev.sh
```

Mở terminal khác để kiểm tra:

```bash
./scripts/status-dev.sh
./scripts/smoke-test.sh
./scripts/check-demo-data.sh
./scripts/core-flow-test.sh
```

Để kiểm tra cả AI upload bằng một ảnh mặt local:

```bash
./scripts/core-flow-test.sh /duong-dan/toi/anh-mat.jpg
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

`seed-demo.sh` ghi vào database được cấu hình trong `.env`, không mặc định là local. Script sẽ in hostname và tên database đích trước khi import.

## Checklist trước khi demo

1. `./scripts/status-dev.sh` không còn service `DOWN`.
2. `./scripts/smoke-test.sh` báo `All smoke checks passed`.
3. Catalog có sản phẩm, variant và tồn kho khả dụng.
4. Dùng ảnh mặt rõ, một khuôn mặt để demo AI scan.
5. Chạy thử một đơn: thêm giỏ, checkout, giữ kho và hủy/hoàn tất đơn.

## Sự thật về AI hiện tại

- Model A production là MobileNetV2, phân loại `Dry/Normal/Oily`. Checkpoint hiện tại được train trên dataset Kaggle Apache 2.0 gồm 3.152 ảnh gốc; sau chống trùng và production face guard còn 2.225 ảnh (`1.698/261/266`). Test sạch đạt accuracy `69,92%`, macro F1 `68,96%`; confidence được temperature-calibrate trên validation.
- Kết quả test `100%` cũ không được dùng làm bằng chứng vì dataset gốc có ảnh trùng xuyên split. Chạy audit và tạo split theo nhóm ảnh trước khi train lại:

```bash
cd aiskin-server/ai-scan-service
./venv/bin/python training/audit_skin_type_dataset.py \
  --data-root /duong-dan/toi/skin-type-dataset \
  --output-dir /tmp/skin-type-audit \
  --check-production-input
```

- Input guard bắt buộc một khuôn mặt rõ và từ chối ảnh sai thay vì cho model đoán.
- Model B chưa có `ultimate_skin_resnet.pth`; UI chỉ tạo routine nền tảng theo loại da và không giả nhãn `Healthy`.
- Catalog có 10.977 dòng thành phần nhưng chưa có dữ liệu `percentage`; recommendation chỉ nói thành phần khớp và ghi rõ nồng độ chưa được cung cấp.
- Kết quả chỉ hỗ trợ chăm sóc da, không thay thế chẩn đoán bác sĩ.

Không commit `aiskin-server/.env`, mật khẩu demo, JWT secret hoặc MongoDB Atlas URI.
