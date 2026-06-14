# Conceptual ERD - MSS (Medical Skin Solution)

## 📌 PROJECT CONTEXT

**Database Type:** NoSQL (MongoDB/Firestore)  
**Architecture:** Microservices  
**Scope:** Skin analysis + Product recommendation (NO e-commerce)

---

## 🎯 TỔNG QUAN COLLECTIONS

### **Số lượng collections:**
- **Core Collections:** 9
- **Master Data Collections:** 4 (Brands, Categories, Ingredients, ML_Models)
- **Transaction Collections:** 5 (Users, Scan_Logs, Treatment_Plans, Product_Recommendations, Products)

---

## 📊 DANH SÁCH COLLECTIONS

### **1. Core User & Analysis Flow**

#### **1.1. Users**
- **Mô tả:** Thông tin user và skin profile (embed 1-1)
- **Service Owner:** User Service
- **Relationships:**
  - `1 → N` Scan_Logs (reference by userId)
  - `1 → N` Treatment_Plans (reference by userId)
  - `1 → N` Product_Recommendations (reference by userId)
- **Key Fields:**
  - User info (email, phone, fullName)
  - Embedded: skinProfile (current profile)
  - Optional: profileHistory (versioning array)

---

#### **1.2. Scan_Logs**
- **Mô tả:** Lịch sử quét da + analysis results (embed 1-1)
- **Service Owner:** AI Scan Service
- **Relationships:**
  - `N → 1` Users (reference userId)
  - `1 → 1` Analysis_Result (embedded)
  - `1 → N` Treatment_Plans (referenced by scanLogId)
  - `1 → N` Product_Recommendations (referenced by scanLogId)
- **Key Fields:**
  - images[] (array URLs)
  - mlModelVersion
  - status (pending/processing/completed/failed)
  - Embedded: analysisResult (overall + faceGroupAnalysis[])
  - deviceInfo

---

### **2. Treatment & Recommendation**

#### **2.1. Treatment_Plans**
- **Mô tả:** Lộ trình chăm sóc da (morning/evening routine)
- **Service Owner:** Recommendation Service
- **Relationships:**
  - `N → 1` Users (reference userId)
  - `N → 1` Scan_Logs (reference scanLogId)
  - `1 → N` Routine Steps (embedded)
  - `N → N` Products (denormalized in steps)
- **Key Fields:**
  - planType (morning_routine/evening_routine)
  - Embedded: steps[] (order, name, instructions, recommendedProducts[])

---

#### **2.2. Product_Recommendations**
- **Mô tả:** Danh sách sản phẩm đề xuất (standalone, khác với routine)
- **Service Owner:** Recommendation Service
- **Relationships:**
  - `N → 1` Users (reference userId)
  - `N → 1` Scan_Logs (reference scanLogId)
  - `N → N` Products (denormalized with metadata)
- **Key Fields:**
  - userConcerns[] (from analysis)
  - skinType
  - Embedded: products[] (denormalized product info + matchScore + reasons)

---

### **3. Product Catalog**

#### **3.1. Products**
- **Mô tả:** Catalog sản phẩm skincare
- **Service Owner:** Product Service
- **Relationships:**
  - `N → 1` Brands (reference brandId)
  - `N → 1` Categories (reference categoryId)
  - `N → N` Ingredients (embedded or hybrid reference)
- **Key Fields:**
  - Product info (name, description, price, imageUrl)
  - Embedded: ingredients[] (with percentage, isKey)
  - Denormalized: keyIngredientIds[], targetConcerns[]

---

#### **3.2. Brands**
- **Mô tả:** Thương hiệu sản phẩm (master data)
- **Service Owner:** Product Service
- **Relationships:**
  - `1 → N` Products (referenced by brandId)
- **Key Fields:**
  - name, country, description, logoUrl

---

#### **3.3. Categories**
- **Mô tả:** Phân loại sản phẩm (cleanser, serum, moisturizer...)
- **Service Owner:** Product Service
- **Relationships:**
  - `1 → N` Products (referenced by categoryId)
- **Key Fields:**
  - name, slug, description, displayOrder

---

#### **3.4. Ingredients**
- **Mô tả:** Thành phần hoạt chất (master data, optional separate collection)
- **Service Owner:** Product Service
- **Relationships:**
  - `N → N` Products (referenced by ingredientId hoặc embedded)
- **Key Fields:**
  - name, aliases[], benefits[], concerns[], contraindications[]

---

### **4. ML & System**

#### **4.1. ML_Models**
- **Mô tả:** Quản lý phiên bản model AI
- **Service Owner:** AI Scan Service
- **Relationships:**
  - `1 → N` Scan_Logs (referenced by mlModelVersion)
- **Key Fields:**
  - version, modelType, s3Path, accuracy, isActive, trainedAt, metadata

---

## 🔗 CORE RELATIONSHIPS

### **Main Analysis Flow:**
```
User
  ↓ (creates)
Scan_Log [embed: Analysis_Result [embed: faceGroupAnalysis[]]]
  ↓ (generates)
  ├─→ Treatment_Plan [embed: steps[] [embed: recommendedProducts[]]]
  └─→ Product_Recommendation [embed: products[]]
```

### **Product Matching Flow:**
```
Analysis_Result.concerns[]
  ↓ (match with)
Product.targetConcerns[]
  ↓ (contains)
Product.ingredients[] ←→ Ingredient (master)
  ↓ (from)
Product.brandId → Brand
Product.categoryId → Category
```

### **Routine Execution:**
```
Treatment_Plan
  ├─→ steps[].stepOrder
  └─→ steps[].recommendedProducts[] (denormalized Product data)
```

---

## 📐 DESIGN PATTERNS

### **1. Embed vs Reference Strategy**

| **Relationship** | **Pattern** | **Lý do** |
|------------------|-------------|-----------|
| User ↔ Skin_Profile | **Embed** | 1-1, query cùng lúc, ít update |
| Scan_Log ↔ Analysis_Result | **Embed** | 1-1, query cùng lúc, immutable |
| Treatment_Plan ↔ Steps | **Embed** | 1-N nhỏ (<20), query cùng lúc |
| Product ↔ Ingredient | **Hybrid** | N-N, embed info + keep reference IDs |
| User → Scan_Logs | **Reference** | 1-N lớn (có thể >1000), riêng query |
| Product ↔ Brand | **Reference** | N-1, master data tách biệt |

---

### **2. Denormalization Strategy**

#### **Khi nào denormalize:**
- Recommendation list → embed product name, price, imageUrl
- Treatment steps → embed product info
- Analysis result → embed face group names

#### **Sync strategy:**
```
Products update (giá, tên, ảnh)
  ↓
Background job sync denormalized data
  ├─→ Treatment_Plans.steps[].recommendedProducts[]
  └─→ Product_Recommendations.products[]
```

---

### **3. Data Versioning**

#### **Skin Profile Versioning:**
```javascript
// Option A: Array history trong User doc
users: {
  skinProfile: {current},
  profileHistory: [
    {version: 1, skinType, concerns, updatedAt},
    {version: 2, skinType, concerns, updatedAt}
  ]
}

// Option B: Snapshot từ Analysis_Result
// Query scan_logs để xem historical profiles
```

#### **ML Model Versioning:**
```javascript
ml_models: {
  version: "v2.1.3",
  isActive: true,
  trainedAt: ISODate(...)
}

scan_logs: {
  mlModelVersion: "v2.1.3" // track which model
}
```

## 📝 KEY DESIGN DECISIONS

### **1. Embedded Analysis Result**
**Decision:** Analysis_Result embed vào Scan_Log thay vì collection riêng

**Lý do:**
- Relationship 1-1 và immutable (không thay đổi sau khi tạo)
- Luôn query cùng lúc (xem scan → xem kết quả)
- Giảm queries từ 2 xuống 1

---

### **2. Face Group Analysis Structure**
**Decision:** Không tạo Face_Group collection riêng, embed trực tiếp

**Before (SQL thinking):**
```
Face_Group (collection) ←→ Analysis_Result_Detail (bridge) ←→ Analysis_Result
```

**After (NoSQL thinking):**
```javascript
analysisResult: {
  faceGroupAnalysis: [
    {groupId: "forehead", groupName: "Trán", conditions: [...], score: 65}
  ]
}
```

**Lý do:**
- Face groups là 7 vùng cố định (forehead, nose, cheeks...)
- Không cần normalize vì data ít thay đổi
- Query performance tốt hơn (1 document thay vì JOIN)

---

### **3. Treatment Plan vs Product Recommendation**
**Decision:** Tách làm 2 collections riêng

**Treatment_Plans:**
- Lộ trình routine (sáng/tối)
- Có thứ tự steps (cleanser → serum → moisturizer)
- Mỗi step có nhiều sản phẩm đề xuất

**Product_Recommendations:**
- Danh sách sản phẩm standalone
- Không có thứ tự bắt buộc
- User có thể browse và chọn

**Lý do:**
- 2 use cases khác nhau
- Recommend có thể tồn tại độc lập (không cần routine)
- Dễ extend features riêng cho từng loại

---

### **4. Product-Ingredient Relationship**
**Decision:** Hybrid approach (embed + keep reference IDs)

```javascript
products: {
  ingredients: [
    {
      id: "niacinamide",          // reference ID
      name: "Niacinamide",        // denormalized
      percentage: 5.0,
      isKey: true,
      concerns: ["acne"]          // denormalized
    }
  ],
  keyIngredientIds: ["niacinamide", "salicylic_acid"] // for query
}

ingredients: {
  _id: "niacinamide",
  name: "Niacinamide",
  aliases: ["Vitamin B3"],
  benefits: [...],
  contraindications: [...]
}
```

**Lý do:**
- Query speed: Embed name để hiển thị nhanh
- Flexibility: Keep reference để update centrally
- Search: Index keyIngredientIds để filter

---

### **5. Denormalization for Performance**
**Decision:** Denormalize product info trong recommendations

```javascript
treatment_plans: {
  steps: [
    {
      recommendedProducts: [
        {
          productId: "prod_123",
          // Denormalized
          productName: "La Roche-Posay Effaclar",
          brandName: "La Roche-Posay",
          price: 450000,
          imageUrl: "https://..."
        }
      ]
    }
  ]
}
```

**Trade-off:**
- ✅ Pro: Giảm queries (không cần JOIN Products)
- ❌ Con: Cần sync khi Product update (background job)

**Khi nào sync:**
- Product name/price/image thay đổi
- Chạy batch job nightly
- Hoặc event-driven (Product.updated → sync recommendations)

## ✅ VALIDATION RULES

### **Business Rules:**

#### **User:**
- ✅ Chỉ 1 active Skin_Profile per user
- ✅ Email unique
- ✅ Soft delete (isActive flag)

#### **Scan_Log:**
- ✅ Status flow: `pending → processing → completed/failed`
- ✅ Không thể xóa scan đã có Treatment_Plan

#### **Analysis_Result:**
- ✅ overallScore: 0-100
- ✅ faceGroupAnalysis: phải có ít nhất 1 group
- ✅ Immutable (không sửa sau khi tạo)

#### **Treatment_Plan:**
- ✅ steps[].stepOrder: sequential, no gaps
- ✅ Mỗi step phải có ít nhất 1 recommended product

#### **Product:**
- ✅ price > 0
- ✅ ingredients[].percentage: 0-100
- ✅ Tổng percentage không vượt 100%

---

## 🔐 DATA PRIVACY & COMPLIANCE

### **Sensitive Data:**
- User images (face photos) → S3 with encryption
- Analysis results → personal health data
- Skin profile → personal characteristics

### **GDPR/PDPA Requirements:**
1. **User Consent:** Track consent timestamp
2. **Right to Access:** Export user data on request
3. **Right to Delete:** Cascade delete all user data
4. **Data Retention:** Auto-delete scans older than 2 years (configurable)

### **Audit Log (Optional for Phase 2):**
```javascript
audit_logs: {
  userId,
  action: "scan_uploaded" | "analysis_viewed" | "profile_updated",
  resourceType: "scan_log" | "analysis_result",
  resourceId,
  ipAddress,
  userAgent,
  timestamp
}

## 📊 COLLECTION SUMMARY

| **Collection**            | **Type**      | **Owner Service**      | **Embed/Ref** | **Growth Rate** |
|---------------------------|---------------|------------------------|---------------|-----------------|
| Users                     | Transaction   | User Service           | Embed Profile | Slow            |
| Scan_Logs                 | Transaction   | AI Scan Service        | Embed Analysis| Medium          |
| Treatment_Plans           | Transaction   | Skincare Service       | Embed Steps   | Medium          |
| Product_Recommendations   | Transaction   | Recommendation Service | Embed Products| Medium          |
| Products                  | Master Data   | Product Service        | Hybrid        | Slow            |
| Brands                    | Master Data   | Product Service        | Reference     | Very Slow       |
| Categories                | Master Data   | Product Service        | Reference     | Very Slow       |
| Ingredients               | Master Data   | Product Service        | Hybrid        | Slow            |
| ML_Models                 | System        | AI Scan Service        | Reference     | Slow            |
