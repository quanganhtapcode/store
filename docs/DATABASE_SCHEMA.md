# 📊 Database Schema - Cát Hải POS

Tài liệu mô tả chi tiết cấu trúc cơ sở dữ liệu SQLite cho hệ thống Cát Hải POS.

---

## 🗂️ Tổng quan

Hệ thống sử dụng **SQLite** làm database chính với các bảng sau:

| Bảng | Mô tả | Số lượng records (ước tính) |
|------|-------|----------------------------|
| `products` | Thông tin sản phẩm | ~100-500 |
| `orders` | Đơn hàng | Tăng theo thời gian |
| `order_items` | Chi tiết trong mặt hàng | Tăng theo thời gian x Số SP |
| `suppliers` | Thông tin Nhà cung cấp | ~10-100 |
| `import_notes` | Phiếu nhập hàng | Theo nhu cầu |
| `activity_logs` | Nhật ký hoạt động | Giới hạn 100 gần nhất |

---

## 📦 Bảng: `products`

Lưu trữ thông tin tất cả sản phẩm trong cửa hàng.

### Cấu trúc

```sql
CREATE TABLE products (
    id TEXT PRIMARY KEY,          -- Mã sản phẩm (PRD-XXXXXX)
    name TEXT NOT NULL,           -- Tên sản phẩm
    brand TEXT,                   -- Thương hiệu
    category TEXT,                -- Danh mục
    price INTEGER NOT NULL,       -- Giá bán lẻ (VNĐ)
    case_price INTEGER,           -- Giá bán theo thùng (VNĐ)
    units_per_case INTEGER,       -- Số đơn vị trong 1 thùng
    stock INTEGER DEFAULT 0,      -- Số lượng tồn kho
    cost_price INTEGER DEFAULT 0, -- Giá nhập trung bình
    code TEXT,                    -- Mã vạch/Barcode
    image TEXT,                   -- URL hoặc path ảnh local
    total_sold INTEGER DEFAULT 0  -- Tổng số lượng đã bán (trending)
);
```

### Mô tả chi tiết

| Cột | Kiểu | Null | Mô tả |
|-----|------|------|-------|
| `id` | TEXT | NO | Mã sản phẩm duy nhất, format: `PRD-XXXXXX` (6 ký tự random) |
| `name` | TEXT | NO | Tên đầy đủ của sản phẩm |
| `brand` | TEXT | YES | Thương hiệu (VD: Coca-Cola, Pepsi, Aquafina) |
| `category` | TEXT | YES | Danh mục sản phẩm |
| `price` | INTEGER | NO | Giá bán lẻ tính bằng VNĐ (không có dấu thập phân) |
| `case_price` | INTEGER | YES | Giá bán theo thùng, null nếu không bán thùng |
| `units_per_case` | INTEGER | YES | Số chai/lon trong 1 thùng |
| `stock` | INTEGER | NO | Số lượng tồn kho hiện tại |
| `cost_price` | INTEGER | NO | Giá nhập hàng hiện tại (để tính tỷ suất lợi nhuận) |
| `code` | TEXT | YES | Mã vạch để quét |
| `image` | TEXT | YES | Đường dẫn ảnh: `/images/PRD-XXXXXX.jpg` hoặc URL |
| `total_sold` | INTEGER | NO | Tổng số đã bán để xếp hạng Trending |

### Ví dụ dữ liệu

```json
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
```

---

## 🧾 Bảng: `orders`

Lưu trữ lịch sử đơn hàng.

### Cấu trúc

```sql
CREATE TABLE orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,  -- ID tự tăng
    order_code TEXT UNIQUE,                -- Mã đơn hàng (ORD-YYYYMMDD-NNNN)
    total INTEGER NOT NULL,                -- Tổng tiền (VNĐ) đã chiết khấu
    original_total INTEGER,                -- Tiền trước chiết khấu
    discount INTEGER DEFAULT 0,            -- Số tiền giảm giá
    timestamp INTEGER NOT NULL,            -- Thời gian tạo (Unix ms)
    items TEXT NOT NULL,                   -- Chi tiết sản phẩm (JSON dạng chuỗi để fallback)
    customer_name TEXT DEFAULT 'Khách lẻ', -- Tên khách hàng
    payment_method TEXT DEFAULT 'cash',    -- Phương thức thanh toán
    status TEXT DEFAULT 'completed',       -- Trạng thái
    note TEXT                              -- Ghi chú
);
```

### Mô tả chi tiết

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | INTEGER | ID tự động tăng |
| `order_code` | TEXT | Mã đơn: `ORD-20260101-0001` (ngày + số thứ tự) |
| `total` | INTEGER | Tổng tiền hiển thị khách hàng thu cuối cùng |
| `original_total` | INTEGER | Tổng tiền ban đầu |
| `discount` | INTEGER | Số tiền được giảm giá |
| `timestamp` | INTEGER | Unix timestamp (milliseconds) |
| `items` | TEXT | JSON array chứa chi tiết sản phẩm |
| `customer_name` | TEXT | Tên khách hàng hoặc "Khách lẻ" |
| `payment_method` | TEXT | `cash`, `transfer`, `card` |
| `status` | TEXT | `completed`, `pending`, `cancelled` |
| `note` | TEXT | Ghi chú của nhân viên |

### Format của `items` (JSON)

```json
[
    {
        "id": "PRD-A1B2C3",
        "name": "Coca-Cola 330ml",
        "price": 12000,
        "quantity": 2,
        "saleType": "unit",
        "finalPrice": 12000
    },
    {
        "id": "PRD-D4E5F6",
        "name": "Pepsi 24 lon",
        "price": 260000,
        "quantity": 1,
        "saleType": "case",
        "finalPrice": 260000,
        "units_per_case": 24
    }
]
```

---

## 🛒 Bảng: `order_items`

Bảng chuẩn hóa chi tiết sản phẩm trong từng đơn hàng, chuyên dụng cho truy vấn cực nhanh báo cáo/thống kê thay cho việc Query JSON array `items` trong bảng `orders`.

### Cấu trúc

```sql
CREATE TABLE order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    product_id TEXT,
    quantity INTEGER,
    price INTEGER,
    FOREIGN KEY(order_id) REFERENCES orders(id),
    FOREIGN KEY(product_id) REFERENCES products(id)
);
```

---

## 🏬 Bảng: `suppliers`

Lưu trữ thông tin Nhà Cung Cấp hàng hoá.

### Cấu trúc

```sql
CREATE TABLE suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    note TEXT,
    created_at INTEGER,
    updated_at INTEGER
);
```

---

## 📝 Bảng: `activity_logs`

Nhật ký mọi hoạt động trong hệ thống.

### Cấu trúc

```sql
CREATE TABLE activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,       -- Loại hành động
    details TEXT,               -- Chi tiết
    timestamp INTEGER NOT NULL  -- Thời gian
);
```

### Các loại `action`

| Action | Mô tả |
|--------|-------|
| `ADD_PRODUCT` | Thêm sản phẩm mới |
| `UPDATE_PRODUCT` | Cập nhật sản phẩm |
| `DELETE_PRODUCT` | Xóa sản phẩm |
| `CREATE_ORDER` | Tạo đơn hàng mới |
| `UPDATE_ORDER` | Cập nhật đơn hàng |
| `IMPORT_STOCK` | Nhập hàng |

---

## 📥 Bảng: `import_notes`

Lưu trữ phiếu nhập hàng.

### Cấu trúc

```sql
CREATE TABLE import_notes (
    id TEXT PRIMARY KEY,          -- Mã phiếu nhập (IMP-XXXXXX)
    supplier_id TEXT,             -- Mã nhà cung cấp (FK)
    timestamp INTEGER NOT NULL,   -- Thời gian nhập
    total_cost INTEGER,           -- Tổng chi phí nhập
    note TEXT,                    -- Ghi chú
    items TEXT NOT NULL           -- Chi tiết hàng nhập (JSON)
);
```

### Format của `items` (JSON)

```json
[
    {
        "id": "PRD-A1B2C3",
        "name": "Coca-Cola 330ml",
        "quantity": 100
    }
]
```

---

## 🔗 Quan hệ giữa các bảng

```
┌─────────────┐       ┌─────────────┐
│  products   │◄──────│ order_items │◄─────┐
│             │       └─────────────┘      │
└─────────────┘                            │
       ▲                                   │
       ├─────────────────────┐      ┌──────┴──────┐
       │                     │      │   orders    │
       │              ┌──────▼──────┐─────────────┘
       │              │activity_logs│
       │              └─────────────┘
       │                     ▲  
┌──────┴──────┐              │
│import_notes │      ┌───────┴─────┐
│supplier_id  │◄─────┤  suppliers  │
└─────────────┘      └─────────────┘
```

- `order_items.product_id` tham chiếu đến `products.id`
- `order_items.order_id` tham chiếu đến `orders.id`
- `import_notes.supplier_id` tham chiếu đến `suppliers.id`
- `activity_logs` ghi lại mọi thay đổi

---

## 📍 Vị trí Database

```
cat-hai-pos/
└── database/
    └── pos.db          # File SQLite chính
```

### Backup Database

```bash
# Sao lưu database
cp database/pos.db database/pos_backup_$(date +%Y%m%d).db
```

---

## 🔧 Migration

Khi cần thêm cột mới, sử dụng script migration:

```bash
cd database
node migrate-db.cjs
```

Script sẽ tự động kiểm tra và thêm các cột mới an toàn.
