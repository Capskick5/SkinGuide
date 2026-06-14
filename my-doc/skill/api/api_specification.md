# API Specification

> Đặc tả các API endpoints của hệ thống MSS.

## Quy ước chung
- **Base URL:** `http://localhost:8080/api` (qua API Gateway)
- **Xác thực (Auth):** Bearer Token (JWT) trong header `Authorization: Bearer <token>`
- **Định dạng dữ liệu:** JSON (`Content-Type: application/json`)
- **Quy ước mã lỗi:**

| HTTP Code | Ý nghĩa |
|-----------|----------|
| 200 | Thành công |
| 201 | Tạo mới thành công |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (token missing/expired) |
| 403 | Forbidden (không có quyền) |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## 1. Auth Endpoints (User Service)

### [POST] /api/auth/register
- **Mô tả:** Đăng ký tài khoản mới
- **Quyền truy cập:** Public
- **Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "fullName": "Nguyen Van A"
}
```
- **Response (201):**
```json
{
  "success": true,
  "message": "Registration successful. Please verify OTP.",
  "data": { "userId": "664..." }
}
```

### [POST] /api/auth/login
- **Mô tả:** Đăng nhập
- **Quyền truy cập:** Public
- **Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```
- **Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG...",
    "tokenType": "Bearer",
    "expiresIn": 3600
  }
}
```

### [POST] /api/auth/refresh
- **Mô tả:** Làm mới access token
- **Quyền truy cập:** Public (cần refresh token)
- **Request:**
```json
{
  "refreshToken": "eyJhbG..."
}
```
- **Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbG...(new)",
    "refreshToken": "eyJhbG...(new)"
  }
}
```

### [POST] /api/auth/verify-otp
- **Mô tả:** Xác thực OTP (đăng ký / forgot password)
- **Quyền truy cập:** Public
- **Request:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

### [POST] /api/auth/forgot-password
- **Mô tả:** Yêu cầu reset password (gửi OTP qua email)
- **Quyền truy cập:** Public

### [POST] /api/auth/logout
- **Mô tả:** Đăng xuất (xóa refresh token khỏi Redis)
- **Quyền truy cập:** Authenticated

---

## 2. User Endpoints (User Service)

### [GET] /api/users/me
- **Mô tả:** Lấy thông tin user hiện tại
- **Quyền truy cập:** Authenticated
- **Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "664...",
    "email": "user@example.com",
    "fullName": "Nguyen Van A",
    "role": "USER",
    "skinProfile": {
      "skinType": "oily",
      "currentConcerns": ["acne", "enlarged_pores"],
      "allergies": [],
      "sensitiveSkin": false,
      "gender": "female"
    }
  }
}
```

### [PUT] /api/users/me
- **Mô tả:** Cập nhật profile
- **Quyền truy cập:** Authenticated

### [PUT] /api/users/me/skin-profile
- **Mô tả:** Cập nhật skin profile
- **Quyền truy cập:** Authenticated

### [GET] /api/admin/users (Admin)
- **Mô tả:** Danh sách users (phân trang)
- **Quyền truy cập:** ADMIN role

---

## 3. Product Endpoints (Product Service)

### [GET] /api/products
- **Mô tả:** Danh sách sản phẩm (phân trang + filter)
- **Quyền truy cập:** Authenticated
- **Query Params:** `page`, `size`, `category`, `skinType`, `concern`, `brand`
- **Response (200):**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "...",
        "name": "Gentle Cleanser",
        "brandName": "CeraVe",
        "categoryName": "Cleanser",
        "price": 350000,
        "imageUrl": "https://...",
        "targetSkinTypes": ["oily", "combination"],
        "targetConcerns": ["acne"]
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 150
  }
}
```

### [GET] /api/products/{id}
- **Mô tả:** Chi tiết sản phẩm
- **Quyền truy cập:** Authenticated

### [GET] /api/products/search?q=keyword
- **Mô tả:** Tìm kiếm sản phẩm theo keyword
- **Quyền truy cập:** Authenticated

### [POST] /api/products (Admin)
- **Mô tả:** Thêm sản phẩm mới
- **Quyền truy cập:** ADMIN role

### [PUT] /api/products/{id} (Admin)
- **Mô tả:** Cập nhật sản phẩm
- **Quyền truy cập:** ADMIN role

### [DELETE] /api/products/{id} (Admin)
- **Mô tả:** Xóa sản phẩm (soft delete)
- **Quyền truy cập:** ADMIN role

---

## 4. Scan Endpoints (AI Scan Service)

### [POST] /api/scans/analyze
- **Mô tả:** Upload ảnh da và nhận kết quả phân tích
- **Quyền truy cập:** Authenticated
- **Content-Type:** `multipart/form-data`
- **Request:** `file` (image/jpeg, image/png)
- **Response (200):**
```json
{
  "success": true,
  "data": {
    "scanId": "...",
    "status": "completed",
    "analysisResult": {
      "overallScore": 72,
      "skinAge": 25,
      "skinType": "oily",
      "faceGroupAnalysis": [
        {
          "groupId": "forehead",
          "groupName": "Trán",
          "overallScore": 68,
          "conditions": [
            { "conditionName": "acne", "severity": "medium", "score": 45 },
            { "conditionName": "pores", "severity": "low", "score": 30 }
          ]
        }
      ]
    }
  }
}
```

### [GET] /api/scans/history
- **Mô tả:** Lịch sử scan của user
- **Quyền truy cập:** Authenticated
- **Query Params:** `page`, `size`

### [GET] /api/scans/{id}
- **Mô tả:** Chi tiết 1 lần scan
- **Quyền truy cập:** Authenticated (owner only)

### [GET] /api/scans/compare?scan1={id1}&scan2={id2}
- **Mô tả:** So sánh 2 lần scan (tiến triển)
- **Quyền truy cập:** Authenticated (owner only)

---

## 5. Recommendation Endpoints (Recommendation Service)

### [POST] /api/recommendations/generate
- **Mô tả:** Tạo lộ trình chăm sóc từ kết quả scan
- **Quyền truy cập:** Authenticated
- **Request:**
```json
{
  "scanId": "..."
}
```
- **Response (201):**
```json
{
  "success": true,
  "data": {
    "morningRoutine": {
      "id": "...",
      "title": "Lộ trình sáng - Da dầu mụn",
      "steps": [
        {
          "stepOrder": 1,
          "stepName": "Cleansing",
          "instructions": "Rửa mặt với sữa rửa mặt dịu nhẹ...",
          "recommendedProducts": [
            { "productId": "...", "productName": "CeraVe Foaming Cleanser", "price": 350000 }
          ]
        }
      ]
    },
    "eveningRoutine": { ... }
  }
}
```

### [GET] /api/recommendations/routine
- **Mô tả:** Lấy routine hiện tại của user
- **Quyền truy cập:** Authenticated

### [PUT] /api/recommendations/routine/{id}
- **Mô tả:** Cập nhật routine (user tùy chỉnh)
- **Quyền truy cập:** Authenticated

### [GET] /api/recommendations/products
- **Mô tả:** Danh sách sản phẩm được gợi ý cho user
- **Quyền truy cập:** Authenticated

### [GET] /api/recommendations/progress
- **Mô tả:** Tiến triển da theo thời gian
- **Quyền truy cập:** Authenticated
- **Response (200):**
```json
{
  "success": true,
  "data": {
    "timeline": [
      { "date": "2026-05-01", "overallScore": 60, "scanId": "..." },
      { "date": "2026-06-01", "overallScore": 72, "scanId": "..." }
    ],
    "improvement": "+12 points in 30 days"
  }
}
```

---

## 6. AI Model Internal API (Python — Không expose qua Gateway)

### [POST] http://ai-model-service:5000/predict
- **Mô tả:** Nhận ảnh, trả kết quả phân tích (chỉ ai-scan-service gọi)
- **Request:** `multipart/form-data` — `file` (image)
- **Response:**
```json
{
  "skinType": "oily",
  "overallScore": 72,
  "skinAge": 25,
  "faceGroups": [
    {
      "groupId": "forehead",
      "score": 68,
      "conditions": [
        { "name": "acne", "severity": "medium", "score": 45 }
      ]
    }
  ]
}
```
