# Coding Conventions

> Quy ước code và cấu trúc dự án MSS.

## 1. Quy tắc đặt tên

### Java (Backend)
- **Package:** lowercase, dạng `mss.servicename.layer` (ví dụ: `mss.userservice.controller`)
- **Class:** PascalCase (ví dụ: `UserService`, `AuthController`, `JwtAuthFilter`)
- **Method / Biến:** camelCase (ví dụ: `getUserById`, `accessToken`)
- **Constants:** UPPER_SNAKE_CASE (ví dụ: `TOKEN_EXPIRY_MS`)
- **DTO:** PascalCase + suffix `Request`/`Response` (ví dụ: `LoginRequest`, `UserResponse`)
- **Repository:** PascalCase + suffix `Repository` (ví dụ: `UserRepository`)

### JavaScript/React (Frontend)
- **Component:** PascalCase (ví dụ: `DashboardPage`, `ProductCard`)
- **File component:** PascalCase.jsx (ví dụ: `AuthPage.jsx`, `RoutinePage.jsx`)
- **Hook:** camelCase, prefix `use` (ví dụ: `useAuth`, `useScanResult`)
- **Utility / API:** camelCase.js (ví dụ: `authApi.js`, `httpClient.js`)
- **Biến / hàm:** camelCase
- **Constants:** UPPER_SNAKE_CASE hoặc camelCase tùy context

### File & Thư mục
- **Backend service folder:** kebab-case (ví dụ: `user-service`, `ai-scan-service`)
- **Frontend page folder:** lowercase (ví dụ: `auth/`, `dashboard/`, `scan/`)
- **Frontend component folder:** lowercase `components/`

## 2. Cấu trúc thư mục

### Backend Service Pattern
```
service-name/
├── src/main/java/mss/servicename/
│   ├── config/          # @Configuration beans
│   ├── controller/      # @RestController (thin, chỉ validate + delegate)
│   ├── dto/             # Request/Response objects (không dùng Entity trực tiếp)
│   ├── exception/       # Custom exceptions + @ControllerAdvice handler
│   ├── model/           # @Document MongoDB entities
│   ├── repository/      # Spring Data interfaces
│   ├── security/        # Filters, JWT utils (nếu cần)
│   └── service/         # Business logic (@Service)
└── src/main/resources/
    └── application.yml
```

### Frontend Page Pattern
```
page/
├── feature-name/
│   ├── FeaturePage.jsx       # Main page component
│   ├── components/           # Page-specific components
│   └── hooks/                # Page-specific hooks (nếu có)
```

## 3. Phong cách code (Style)

### Java
- **Lombok:** Sử dụng `@Data`, `@Builder`, `@AllArgsConstructor`, `@NoArgsConstructor` cho model/DTO
- **Validation:** Dùng `@Valid` + Bean Validation annotations trên DTO
- **Response:** Trả về `ResponseEntity<>` với HTTP status phù hợp
- **Exception:** Global handler với `@ControllerAdvice`, trả JSON error format thống nhất
- **Comments:** Javadoc cho public methods phức tạp, inline comment cho logic khó hiểu

### React/JavaScript
- **State Management:** React hooks (useState, useEffect, useContext)
- **HTTP Client:** Axios-based httpClient (đã có trong `src/api/httpClient.js`)
- **UI Components:** Ant Design components, custom styling bằng TailwindCSS
- **Routing:** React Router DOM v7 (file-based organization trong `src/page/`)

## 4. Quy ước Git

- **Branch naming:**
  - `feature/ten-tinh-nang` — tính năng mới
  - `fix/mo-ta-bug` — sửa lỗi
  - `refactor/mo-ta` — tái cấu trúc
- **Commit message:** Tiếng Anh, dạng imperative
  - `feat: add product search endpoint`
  - `fix: resolve JWT expiry issue`
  - `refactor: extract scan validation logic`
- **Quy trình:** Feature branch → PR → Review → Merge to main

## 5. Mẫu thiết kế ưu tiên (Patterns)

- **Backend:**
  - Controller → Service → Repository (3-layer)
  - DTO pattern (không expose entity ra controller)
  - Database-per-service (mỗi microservice có MongoDB database riêng)
  - JWT stateless authentication
  - Global exception handling

- **Frontend:**
  - Container/Presentational component pattern
  - Custom hooks cho logic phức tạp
  - Centralized API layer (`src/api/`)
  - Route-based code splitting

## 6. Quy ước API

- **Base path:** `/api/{resource}` (ví dụ: `/api/users`, `/api/products`)
- **Naming:** Plural nouns cho resources
- **HTTP Methods:** GET (read), POST (create), PUT (update), DELETE (remove)
- **Response format:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```
- **Error format:**
```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable message",
  "timestamp": "2026-06-14T10:00:00Z"
}
```
