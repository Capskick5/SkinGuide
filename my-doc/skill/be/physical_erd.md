# Physical ERD / Schema Design - MSS (Medical Skin Solution)

Dựa trên **Conceptual ERD**, hệ thống sử dụng cơ sở dữ liệu NoSQL (MongoDB). Dưới đây là thiết kế Schema vật lý chi tiết với các lựa chọn kiểu dữ liệu (Data Types), ràng buộc (Constraints) và index phù hợp cho 9 collection cốt lõi.

---

## 1. Core User & Analysis Flow

### 1.1. Users Collection
**Mô tả:** Lưu trữ thông tin định danh người dùng và hồ sơ da (Skin Profile) hiện tại (Embedded 1-1).

{
  _id: ObjectId,                    // MongoDB auto-generated
  email: string,                    // REQUIRED, UNIQUE, Indexed (lowercase)
  password: string,                 // REQUIRED, bcrypt hash
  isActive: boolean,                // Default: true. False = soft deleted
  createdAt: Date,
  skinProfile: {
    skinType: "normal" | "oily" | "dry" | "combination" | "sensitive" | null,
    currentConcerns: string[],      // Enum: ["acne", "dark_spots", "wrinkles", ...]
    allergies: string[],            // Enum: ["fragrance", "alcohol", "parabens", ...]
    sensitiveSkin: boolean,         // Default: false
    gender: "male" | "female" | "other" | null,
  } | null,
}

### 1.2. Scan_Logs Collection
**Mô tả:** Ghi nhận mỗi lần quét da, nhúng kèm kết quả phân tích nếu thành công.

{
  _id: ObjectId,
  userId: ObjectId,                 // REQUIRED, Ref -> Users (Indexed)
  
  // Input Data
  images: string[],                 // REQUIRED, Array of S3 Object URLs
  deviceInfo: {
    os: string,                     // e.g., "iOS 16.4"
    appVersion: string,             // e.g., "1.0.2"
    deviceModel: string             // e.g., "iPhone 13 Pro"
  },
  
  // Process Details
  mlModelVersion: string,           // Ref version of ML_Models (e.g., "v2.1.3")
  status: "pending" | "processing" | "completed" | "failed", // Indexed
  errorMessage: string | null,      // Present if status == "failed"
  
  // Embedded 1-1: Result (Present only when status == "completed")
  analysisResult: {
    overallScore: number,           // 0 - 100
    skinAge: number,                // Estimated age
    
    // Array of 7 regions (Forehead, Nose, Cheeks, etc.)
    faceGroupAnalysis: [
      {
        groupId: "forehead" | "nose" | "left_cheek" | "right_cheek" | "chin",
        groupName: string,          // Display name: "Trán", "Mũi"...
        overallScore: number,       // 0 - 100 for this region
        conditions: [
          {
            conditionName: string,  // Enum: "acne", "pores", "redness"
            severity: "low" | "medium" | "high",
            score: number           // 0 - 100
          }
        ]
      }
    ]
  } | null,
  
  createdAt: Date,                  // Indexed (for descending history view)
  updatedAt: Date
}
```

---

## 2. Treatment & Recommendation

### 2.1. Treatment_Plans Collection
**Mô tả:** Lưu trữ các lộ trình chăm sóc da có thứ tự các bước.

```typescript
{
  _id: ObjectId,
  userId: ObjectId,                 // REQUIRED, Ref -> Users (Indexed)
  scanLogId: ObjectId,              // REQUIRED, Ref -> Scan_Logs (Indexed)
  
  // Plan Info
  title: string,                    // e.g., "Lộ trình phục hồi da mụn sáng"
  planType: "morning_routine" | "evening_routine" | "weekly_treatment",
  status: "active" | "completed" | "abandoned",
  
  // Embedded 1-N: Steps
  steps: [
    {
      stepOrder: number,            // 1, 2, 3... (Sequential)
      stepName: string,             // Enum: "cleansing", "toning", "treatment"...
      instructions: string,         // e.g., "Lấy 1 lượng bằng hạt đậu..."
      
      // Denormalized products for this step (Performance optimization)
      recommendedProducts: [
        {
          productId: ObjectId,      // Ref -> Products
          productName: string,      // Denormalized from Products
          brandName: string,        // Denormalized from Brands
          price: number,            // Snapshot price at generation time
          imageUrl: string          // Denormalized thumbnail
        }
      ]
    }
  ],
  
  createdAt: Date,
  updatedAt: Date
}
```

### 2.2. Product_Recommendations Collection
**Mô tả:** Lưu trữ danh sách sản phẩm gợi ý độc lập (không theo thứ tự bước chăm sóc).

```typescript
{
  _id: ObjectId,
  userId: ObjectId,                 // REQUIRED, Ref -> Users (Indexed)
  scanLogId: ObjectId | null,       // Optional, Ref -> Scan_Logs
  
  // Snapshot Context
  skinType: string,                 // Snapshot lúc recommend
  userConcerns: string[],           // Snapshot lúc recommend
  
  // Denormalized matched products
  products: [
    {
      productId: ObjectId,
      productName: string,
      brandName: string,
      price: number,
      imageUrl: string,
      matchScore: number,           // 0 - 100 (Độ tương thích)
      matchReasons: string[]        // ["Chứa Niacinamide giảm mụn", "Phù hợp da dầu"]
    }
  ],
  
  createdAt: Date,
  updatedAt: Date
}
```

---

## 3. Product Catalog

### 3.1. Products Collection
**Mô tả:** Catalog sản phẩm chính.

```typescript
{
  _id: ObjectId,
  name: string,                     // REQUIRED, Text Indexed
  slug: string,                     // REQUIRED, Unique
  description: string,              // HTML/Markdown content
  price: number,                    // REQUIRED (> 0)
  // Media
  imageUrl: string,                 // Main thumbnail
  images: string[],                 // Additional gallery images
  
  brandId: ObjectId,                // Ref -> Brands (Indexed)
  categoryId: ObjectId,             // Ref -> Categories (Indexed)
  
  // Matching criteria for Recommendation Engine
  targetConcerns: string[],         // ["acne", "redness"] (Indexed)
  targetSkinTypes: string[],        // ["dry", "oily", "combination", "all"]
  
  // Hybrid Reference: Ingredients
  keyIngredientIds: ObjectId[],     // Array of Ref -> Ingredients (Indexed)
  ingredients: [
    {
      ingredientId: ObjectId,       // Ref -> Ingredients
      name: string,                 // Denormalized name
      percentage: number | null,    // Optional (e.g., 5.0 for 5%)
      isKey: boolean,               // True if it's an active ingredient
      concerns: string[]            // Denormalized target concerns
    }
  ],
  
  isActive: boolean,                // Default: true
  createdAt: Date,
  updatedAt: Date
}
```

### 3.2. Brands Collection
**Mô tả:** Master data nhãn hàng.
{
  _id: ObjectId,
  name: string,                     // REQUIRED
  slug: string,                     // Unique
  country: string,                  // e.g., "Hàn Quốc", "Pháp"
  description: string,
  logoUrl: string,
  isActive: boolean,                // Default: true
  createdAt: Date,
  updatedAt: Date
}

### 3.3. Categories Collection
**Mô tả:** Master data phân loại sản phẩm.
{
  _id: ObjectId,
  name: string,                     // "Sữa rửa mặt", "Serum"
  slug: string,                     // Unique
  description: string,
  displayOrder: number,             // Default: 0. Used for UI sorting
  isActive: boolean,                // Default: true
  createdAt: Date,
  updatedAt: Date
}
```

### 3.4. Ingredients Collection
**Mô tả:** Master data thành phần (từ điển hoạt chất).

```typescript
{
  _id: ObjectId,
  name: string,                     // REQUIRED, e.g., "Niacinamide"
  slug: string,                     // Unique
  aliases: string[],                // ["Vitamin B3", "Nicotinamide"]
  description: string,
  
  // Metadata for recommendation matching
  benefits: string[],               // Lợi ích chung
  concerns: string[],               // Vấn đề giải quyết ("acne", "pores")
  contraindications: string[],      // Không dùng chung với ("vitamin_c")
  
  ewgScore: number | null,          // Điểm an toàn EWG (1-10)
  createdAt: Date,
  updatedAt: Date
}
```

---

## 4. ML & System

### 4.1. ML_Models Collection
**Mô tả:** Quản lý các version của AI model.

```typescript
{
  _id: ObjectId,
  version: string,                  // REQUIRED, Unique ("v2.1.3")
  modelType: "skin_analysis" | "recommendation",
  s3Path: string,                   // Path to weights file
  accuracy: number,                 // 0 - 100
  isActive: boolean,                // True if this is the active default model
  metadata: any,                    // Flexible config parameters
  trainedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 5. Indexes Summary (MongoDB)

Để tối ưu hóa truy vấn cho các pattern đã định:

1. **Users:** 
   - `{ email: 1 }` (Unique)
   - `{ "skinProfile.currentConcerns": 1 }`
2. **Scan_Logs:** 
   - `{ userId: 1, createdAt: -1 }` (Tra cứu lịch sử scan của user)
   - `{ status: 1 }` (Lọc các job đang xử lý)
3. **Products:** 
   - `{ brandId: 1, categoryId: 1 }`
   - `{ targetConcerns: 1 }`
   - `{ keyIngredientIds: 1 }`
   - `{ name: "text" }` (Full-text search)
4. **Treatment_Plans / Recommendations:** 
   - `{ userId: 1, createdAt: -1 }`
   - `{ scanLogId: 1 }`

---

## Lựa chọn Thiết kế (Design Choices)

1. **Kiểu dữ liệu Enum (String):** Các field như `status`, `gender`, `skinType`, `planType` sử dụng union type string (e.g., `"pending"`, `"active"`) thay vì integer để dễ debug và dễ đọc khi query trên MongoDB Compass.
2. **Denormalization (Chuẩn hóa ngược):** Ở `Treatment_Plans` và `Product_Recommendations`, thông tin sản phẩm (name, image, price, brand) được nhúng thẳng. Tránh việc phải dùng `$lookup` liên tục, tăng tốc độ đọc dữ liệu (Read-heavy application).
3. **Array/List:** Những field như `concerns`, `images` được lưu dưới dạng mảng vì MongoDB hỗ trợ multikey-index rất tốt để query (ví dụ: tìm tất cả user có concern chứa "acne").
4. **Soft Delete (`isActive`):** Hầu hết các collection dùng flag `isActive` thay vì xóa vật lý, đảm bảo an toàn dữ liệu và tính toàn vẹn các tham chiếu lịch sử.
