# 🔌 API Reference - Cát Hải POS

Tài liệu chi tiết về tất cả API endpoints của hệ thống Cát Hải POS.

---

## 🌐 Base URL

| Môi trường | Base URL |
|------------|----------|
| Development | `http://localhost:3001/api` |
| Production | `https://api.quanganh.org/v1/store` |

---

## 📦 Products API

### GET /api/products

Lấy danh sách tất cả sản phẩm.

**Request:**
```http
GET /api/products
```

**Response:**
```json
[
    {
        "id": "PRD-A1B2C3",
        "name": "Coca-Cola 330ml",
        "brand": "Coca-Cola",
        "category": "Nước ngọt",
        "price": 12000,
        "case_price": 260000,
        "units_per_case": 24,
        "stock": 150,
        "code": "8934822100022",
        "image": "/images/PRD-A1B2C3.jpg",
        "total_sold": 1250
    }
]
```

**Lưu ý:** Sản phẩm được sắp xếp theo `total_sold DESC` (trending) rồi `name ASC`.

---

### POST /api/products

Thêm sản phẩm mới.

**Request:**
```http
POST /api/products
Content-Type: application/json

{
    "name": "Coca-Cola 330ml",
    "brand": "Coca-Cola",
    "category": "Nước ngọt",
    "price": 12000,
    "case_price": 260000,
    "units_per_case": 24,
    "stock": 100,
    "cost_price": 8500,
    "code": "8934822100022",
    "image": "data:image/jpeg;base64,..." // hoặc URL
}
```

**Response:**
```json
{
    "id": "PRD-A1B2C3",
    "success": true,
    "image": "/images/PRD-A1B2C3.jpg"
}
```

**Lưu ý:** 
- ID được tự động tạo với format `PRD-XXXXXX`
- Nếu gửi ảnh base64, server tự động lưu thành file

---

### PUT /api/products/:id

Cập nhật sản phẩm.

**Request:**
```http
PUT /api/products/PRD-A1B2C3
Content-Type: application/json

{
    "name": "Coca-Cola 330ml (Updated)",
    "price": 13000,
    "stock": 200,
    "cost_price": 9000
}
```

**Response:**
```json
{
    "success": true,
    "changes": 1,
    "image": "/images/PRD-A1B2C3.jpg"
}
```

---

### DELETE /api/products/:id

Xóa sản phẩm.

**Request:**
```http
DELETE /api/products/PRD-A1B2C3
```

**Response:**
```json
{
    "success": true,
    "changes": 1
}
```

---

### POST /api/products/sync-images

Tải ảnh từ URL về server local.

**Request:**
```http
POST /api/products/sync-images
```

**Response:**
```json
{
    "processed": 15
}
```

---

## 🧾 Orders API

### GET /api/orders

Lấy danh sách đơn hàng.

**Request:**
```http
GET /api/orders
GET /api/orders?startDate=2026-01-01&endDate=2026-01-31
```

**Response:**
```json
[
    {
        "id": 1,
        "order_code": "ORD-20260101-0001",
        "total": 284000,
        "timestamp": 1735689600000,
        "items": "[...]",
        "customer_name": "Khách lẻ",
        "payment_method": "cash",
        "status": "completed",
        "note": ""
    }
]
```

---

### GET /api/orders/:id

Lấy chi tiết 1 đơn hàng.

**Request:**
```http
GET /api/orders/1
```

**Response:**
```json
{
    "id": 1,
    "order_code": "ORD-20260101-0001",
    "total": 284000,
    "timestamp": 1735689600000,
    "items": "[{\"id\":\"PRD-A1B2C3\",\"name\":\"Coca-Cola\",\"quantity\":2}]",
    "customer_name": "Khách lẻ",
    "payment_method": "cash",
    "status": "completed",
    "note": ""
}
```

---

### POST /api/orders

Tạo đơn hàng mới.

**Request:**
```http
POST /api/orders
Content-Type: application/json

{
    "total": 284000,
    "items": [
        {
            "id": "PRD-A1B2C3",
            "name": "Coca-Cola 330ml",
            "price": 12000,
            "quantity": 2,
            "saleType": "unit",
            "finalPrice": 12000
        }
    ],
    "timestamp": 1735689600000,
    "customer_name": "Nguyễn Văn A",
    "payment_method": "cash",
    "note": "Giao hàng nhanh"
}
```

**Response:**
```json
{
    "id": 1,
    "order_code": "ORD-20260101-0001"
}
```

**Side Effects:**
- Trừ `stock` của sản phẩm
- Tăng `total_sold` của sản phẩm
- Ghi `activity_logs`

---

### PUT /api/orders/:id

Cập nhật đơn hàng.

**Request:**
```http
PUT /api/orders/1
Content-Type: application/json

{
    "customer_name": "Trần Văn B",
    "status": "cancelled",
    "note": "Khách huỷ đơn"
}
```

**Response:**
```json
{
    "success": true,
    "changes": 1,
    "order": {
        "id": 1,
        "order_code": "ORD-20260101-0001",
        "customer_name": "Trần Văn B",
        "status": "cancelled",
        ...
    }
}
```

---

## 📊 Statistics API

### GET /api/stats

Lấy thống kê doanh thu.

**Request:**
```http
GET /api/stats
```

**Response:**
```json
{
    "todayRevenue": 1500000,
    "todayOrders": 15,
    "monthRevenue": 45000000,
    "topProducts": [
        { "name": "Coca-Cola 330ml", "total_sold": 1250 },
        { "name": "Pepsi 330ml", "total_sold": 980 },
        { "name": "Aquafina 500ml", "total_sold": 750 }
    ]
}
```

---

### GET /api/stats/detailed

Lấy báo cáo theo ngày, giờ, hình thức thanh toán và danh mục.

**Request:**
```http
GET /api/stats/detailed?startDate=...&endDate=...
```

**Response:**
```json
{
    "paymentMethods": [...],
    "dayOfWeek": [...],
    "timeOfDay": [...],
    "topProducts": [...],
    "categories": [...],
    "dailyTrend": { "current": [...], "previous": [...] },
    "medianDayOfWeek": [...],
    "medianTimeOfDay": [...],
    "kpis": { "todayRevenue": 10000, ... }
}
```

---

### GET /api/stats/profit-analysis

Phân tích lợi nhuận dựa trên `price` và `cost_price`.

**Request:**
```http
GET /api/stats/profit-analysis
```

---

### GET /api/stats/purchase-recommendations

Gợi ý mua hàng dựa trên AI tồn kho và tốc độ bán (`sold30d` và `sold7d`).

**Request:**
```http
GET /api/stats/purchase-recommendations
```

---

## 🏢 Suppliers API

### GET /api/suppliers

Lấy danh sách nhà cung cấp.

**Request:**
```http
GET /api/suppliers
```

### POST /api/suppliers

Thêm nhà cung cấp mới. (Hỗ trợ PUT cho cập nhật và DELETE cho xoá).

---

## 📥 Import API

### POST /api/imports

Tạo phiếu nhập hàng.

**Request:**
```http
POST /api/imports
Content-Type: application/json

{
    "supplier_id": "SUP-123456",
    "items": [
        { "id": "PRD-A1B2C3", "quantity": 100, "cost": 8000 },
        { "id": "PRD-D4E5F6", "quantity": 50, "cost": 150000 }
    ],
    "total_cost": 8300000,
    "note": "Nhập kho đợt 1"
}
```

**Response:**
```json
{
    "success": true,
    "id": "IMP-X7Y8Z9"
}
```

**Side Effects:**
- Tăng `stock` của các sản phẩm
- Ghi `activity_logs`

---

## 📝 Logs API

### GET /api/logs

Lấy nhật ký hoạt động (100 bản ghi gần nhất).

**Request:**
```http
GET /api/logs
```

**Response:**
```json
[
    {
        "id": 100,
        "action": "CREATE_ORDER",
        "details": "New Order ORD-20260101-0001 - 284,000đ",
        "timestamp": 1735689600000
    }
]
```

---

## 🖼️ Static Files

### Ảnh sản phẩm

```http
GET /images/PRD-A1B2C3.jpg
```

**Headers:**
- `Cache-Control: max-age=2592000, immutable` (30 ngày)
- `ETag: ...`

---

## ⚠️ Error Responses

### 400 Bad Request
```json
{
    "error": "Invalid request body"
}
```

### 404 Not Found
```json
{
    "error": "Order not found"
}
```

### 500 Internal Server Error
```json
{
    "error": "Database error message"
}
```

---

## 🔐 CORS

API cho phép tất cả origins để tương thích với Vercel frontend:

```javascript
app.use(cors({ origin: '*', credentials: true }));
```
