# 📊 Database Schema - Hệ thống Quản lý Bán hàng Chuyên nghiệp

## 🏗️ Tổng quan Kiến trúc

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         HỆ THỐNG POS CHUYÊN NGHIỆP                       │
├─────────────────────────────────────────────────────────────────────────┤
│  QUẢN LÝ KHO    │  QUẢN LÝ BÁN HÀNG  │  TÀI CHÍNH    │  BÁO CÁO         │
│  - Sản phẩm     │  - Đơn hàng        │  - Thu chi    │  - Doanh thu     │
│  - Nhập hàng    │  - Khách hàng      │  - Nợ KH      │  - Tồn kho       │
│  - Tồn kho      │  - Khuyến mãi      │  - Nhà cung   │  - Lợi nhuận     │
│  - Kiểm kê      │  - Trả hàng        │  - Công nợ NCC│  - Trending      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 1. QUẢN LÝ SẢN PHẨM

### 1.1 `products` - Sản phẩm
```sql
CREATE TABLE products (
    id TEXT PRIMARY KEY,              -- PRD-XXXXXX (10 ký tự)
    name TEXT NOT NULL,               -- Tên sản phẩm
    brand TEXT,                       -- Thương hiệu
    category_id TEXT,                 -- FK → categories
    
    -- GIÁ BÁN
    price INTEGER NOT NULL,           -- Giá bán lẻ (VND)
    case_price INTEGER,               -- Giá bán thùng
    units_per_case INTEGER DEFAULT 1, -- Số lượng/thùng
    
    -- GIÁ VỐN
    cost_price INTEGER DEFAULT 0,     -- Giá nhập gần nhất
    avg_cost_price INTEGER DEFAULT 0, -- Giá vốn trung bình
    
    -- TỒN KHO
    stock INTEGER DEFAULT 0,          -- Số lượng tồn kho
    min_stock INTEGER DEFAULT 0,      -- Mức tồn tối thiểu (cảnh báo)
    max_stock INTEGER DEFAULT 0,      -- Mức tồn tối đa
    
    -- THÔNG TIN KHÁC
    barcode TEXT UNIQUE,              -- Mã vạch
    sku TEXT UNIQUE,                  -- Mã SKU nội bộ
    image TEXT,                       -- Đường dẫn ảnh
    description TEXT,                 -- Mô tả
    unit TEXT DEFAULT 'cái',          -- Đơn vị tính
    
    -- THỐNG KÊ
    total_sold INTEGER DEFAULT 0,     -- Tổng đã bán (trending)
    total_imported INTEGER DEFAULT 0, -- Tổng đã nhập
    
    -- TRẠNG THÁI
    is_active BOOLEAN DEFAULT 1,      -- Còn kinh doanh
    is_featured BOOLEAN DEFAULT 0,    -- Sản phẩm nổi bật
    
    -- TIMESTAMPS
    created_at INTEGER,               -- Ngày tạo
    updated_at INTEGER                -- Ngày cập nhật
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_brand ON products(brand);
```

### 1.2 `categories` - Danh mục
```sql
CREATE TABLE categories (
    id TEXT PRIMARY KEY,              -- CAT-XXXXXX
    name TEXT NOT NULL,               -- Tên danh mục
    parent_id TEXT,                   -- Danh mục cha (NULL = root)
    icon TEXT,                        -- Icon/Emoji
    sort_order INTEGER DEFAULT 0,     -- Thứ tự hiển thị
    is_active BOOLEAN DEFAULT 1,
    created_at INTEGER
);
```

### 1.3 `product_batches` - Lô hàng (FIFO/LIFO)
```sql
CREATE TABLE product_batches (
    id TEXT PRIMARY KEY,              -- BAT-XXXXXX
    product_id TEXT NOT NULL,         -- FK → products
    import_note_id TEXT,              -- FK → import_notes
    
    quantity INTEGER NOT NULL,        -- Số lượng ban đầu
    remaining INTEGER NOT NULL,       -- Số lượng còn lại
    cost_price INTEGER NOT NULL,      -- Giá nhập lô này
    
    expiry_date INTEGER,              -- Ngày hết hạn (nếu có)
    batch_number TEXT,                -- Số lô nhà SX
    
    created_at INTEGER,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX idx_batches_product ON product_batches(product_id);
CREATE INDEX idx_batches_expiry ON product_batches(expiry_date);
```

---

## 🛒 2. QUẢN LÝ BÁN HÀNG

### 2.1 `orders` - Đơn hàng bán
```sql
CREATE TABLE orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_code TEXT UNIQUE NOT NULL,  -- ORD-YYYYMMDD-NNNN
    
    -- THANH TOÁN
    subtotal INTEGER NOT NULL,        -- Tạm tính
    discount_amount INTEGER DEFAULT 0,-- Giảm giá
    total INTEGER NOT NULL,           -- Tổng thanh toán
    paid_amount INTEGER DEFAULT 0,    -- Đã thanh toán
    change_amount INTEGER DEFAULT 0,  -- Tiền thừa
    
    -- KHÁCH HÀNG
    customer_id TEXT,                 -- FK → customers (NULL = khách lẻ)
    customer_name TEXT DEFAULT 'Khách lẻ',
    customer_phone TEXT,
    
    -- THÔNG TIN KHÁC
    payment_method TEXT DEFAULT 'cash', -- cash/transfer/momo/card
    status TEXT DEFAULT 'completed',    -- pending/completed/cancelled/refunded
    note TEXT,
    
    -- NHÂN VIÊN
    staff_id TEXT,                    -- FK → users
    shift_id TEXT,                    -- FK → shifts
    
    -- DISCOUNT/PROMO
    promotion_id TEXT,                -- FK → promotions
    voucher_code TEXT,                -- Mã giảm giá
    
    -- TIMESTAMPS
    timestamp INTEGER NOT NULL,       -- Thời gian đặt
    completed_at INTEGER,             -- Thời gian hoàn thành
    created_at INTEGER
);

CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_date ON orders(timestamp);
CREATE INDEX idx_orders_status ON orders(status);
```

### 2.2 `order_items` - Chi tiết đơn hàng
```sql
CREATE TABLE order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,        -- FK → orders
    product_id TEXT NOT NULL,         -- FK → products
    batch_id TEXT,                    -- FK → product_batches (FIFO)
    
    product_name TEXT NOT NULL,       -- Snapshot tên SP
    quantity INTEGER NOT NULL,        -- Số lượng
    unit_price INTEGER NOT NULL,      -- Đơn giá tại thời điểm
    cost_price INTEGER DEFAULT 0,     -- Giá vốn
    
    sale_type TEXT DEFAULT 'unit',    -- unit/case
    discount_percent INTEGER DEFAULT 0,
    discount_amount INTEGER DEFAULT 0,
    line_total INTEGER NOT NULL,      -- Thành tiền
    
    note TEXT,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
```

### 2.3 `order_returns` - Trả hàng
```sql
CREATE TABLE order_returns (
    id TEXT PRIMARY KEY,              -- RET-XXXXXX
    order_id INTEGER NOT NULL,        -- FK → orders (đơn gốc)
    
    return_amount INTEGER NOT NULL,   -- Số tiền hoàn
    return_method TEXT,               -- Hoàn tiền mặt/chuyển khoản
    reason TEXT,                      -- Lý do trả
    
    status TEXT DEFAULT 'completed',
    processed_by TEXT,                -- FK → users
    
    timestamp INTEGER,
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE return_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    return_id TEXT NOT NULL,
    order_item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    refund_amount INTEGER NOT NULL,
    return_to_stock BOOLEAN DEFAULT 1, -- Nhập lại kho?
    FOREIGN KEY (return_id) REFERENCES order_returns(id)
);
```

---

## 📥 3. QUẢN LÝ NHẬP HÀNG

### 3.1 `suppliers` - Nhà cung cấp
```sql
CREATE TABLE suppliers (
    id TEXT PRIMARY KEY,              -- SUP-XXXXXX
    name TEXT NOT NULL,               -- Tên NCC
    contact_name TEXT,                -- Người liên hệ
    phone TEXT,
    email TEXT,
    address TEXT,
    tax_code TEXT,                    -- Mã số thuế
    
    -- CÔNG NỢ
    debt_limit INTEGER DEFAULT 0,     -- Hạn mức nợ
    current_debt INTEGER DEFAULT 0,   -- Nợ hiện tại
    
    bank_name TEXT,
    bank_account TEXT,
    
    note TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at INTEGER
);
```

### 3.2 `import_notes` - Phiếu nhập kho
```sql
CREATE TABLE import_notes (
    id TEXT PRIMARY KEY,              -- IMP-XXXXXX
    import_code TEXT UNIQUE,          -- Mã phiếu tự sinh
    
    supplier_id TEXT,                 -- FK → suppliers
    supplier_name TEXT,               -- Snapshot tên NCC
    
    -- THANH TOÁN
    subtotal INTEGER NOT NULL,        -- Tổng tiền hàng
    discount_amount INTEGER DEFAULT 0,
    total_cost INTEGER NOT NULL,      -- Tổng phải trả
    paid_amount INTEGER DEFAULT 0,    -- Đã trả
    debt_amount INTEGER DEFAULT 0,    -- Còn nợ
    
    payment_status TEXT DEFAULT 'unpaid', -- unpaid/partial/paid
    payment_method TEXT,
    
    -- TRẠNG THÁI
    status TEXT DEFAULT 'pending',    -- pending/received/cancelled
    
    note TEXT,
    received_by TEXT,                 -- FK → users
    
    timestamp INTEGER,
    received_at INTEGER,              -- Ngày nhận hàng thực tế
    created_at INTEGER,
    
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE INDEX idx_imports_supplier ON import_notes(supplier_id);
CREATE INDEX idx_imports_date ON import_notes(timestamp);
```

### 3.3 `import_items` - Chi tiết phiếu nhập
```sql
CREATE TABLE import_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    import_note_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    
    product_name TEXT NOT NULL,       -- Snapshot
    quantity INTEGER NOT NULL,        -- SL đặt
    received_quantity INTEGER DEFAULT 0, -- SL nhận thực tế
    
    unit_cost INTEGER NOT NULL,       -- Đơn giá nhập
    line_total INTEGER NOT NULL,      -- Thành tiền
    
    expiry_date INTEGER,              -- HSD (nếu có)
    batch_number TEXT,
    
    note TEXT,
    FOREIGN KEY (import_note_id) REFERENCES import_notes(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);
```

---

## 👥 4. QUẢN LÝ KHÁCH HÀNG

### 4.1 `customers` - Khách hàng
```sql
CREATE TABLE customers (
    id TEXT PRIMARY KEY,              -- CUS-XXXXXX
    name TEXT NOT NULL,
    phone TEXT UNIQUE,
    email TEXT,
    address TEXT,
    
    -- PHÂN LOẠI
    customer_type TEXT DEFAULT 'retail', -- retail/wholesale/vip
    customer_group_id TEXT,           -- FK → customer_groups
    
    -- TÍCH ĐIỂM
    loyalty_points INTEGER DEFAULT 0,
    total_spent INTEGER DEFAULT 0,    -- Tổng chi tiêu
    order_count INTEGER DEFAULT 0,    -- Số đơn hàng
    
    -- CÔNG NỢ
    debt_limit INTEGER DEFAULT 0,
    current_debt INTEGER DEFAULT 0,
    
    -- THÔNG TIN KHÁC
    birthday INTEGER,                 -- Ngày sinh (discount sinh nhật)
    gender TEXT,
    tax_code TEXT,                    -- MST (khách sỉ)
    company_name TEXT,
    
    note TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at INTEGER,
    last_purchase_at INTEGER
);

CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_type ON customers(customer_type);
```

### 4.2 `customer_groups` - Nhóm khách hàng
```sql
CREATE TABLE customer_groups (
    id TEXT PRIMARY KEY,              -- CGR-XXXXXX
    name TEXT NOT NULL,               -- VD: Khách VIP, Đại lý, Sỉ...
    discount_percent INTEGER DEFAULT 0, -- % giảm mặc định
    min_spent INTEGER DEFAULT 0,      -- Điều kiện chi tiêu tối thiểu
    description TEXT,
    is_active BOOLEAN DEFAULT 1
);
```

---

## 💰 5. QUẢN LÝ TÀI CHÍNH

### 5.1 `cash_transactions` - Thu chi tiền mặt
```sql
CREATE TABLE cash_transactions (
    id TEXT PRIMARY KEY,              -- TXN-XXXXXX
    transaction_type TEXT NOT NULL,   -- income/expense
    
    amount INTEGER NOT NULL,
    category TEXT,                    -- Danh mục thu/chi
    
    reference_type TEXT,              -- order/import/salary/expense/other
    reference_id TEXT,                -- ID tham chiếu
    
    payment_method TEXT DEFAULT 'cash',
    description TEXT,
    
    staff_id TEXT,                    -- FK → users
    shift_id TEXT,                    -- FK → shifts
    
    timestamp INTEGER,
    created_at INTEGER
);

CREATE INDEX idx_transactions_date ON cash_transactions(timestamp);
CREATE INDEX idx_transactions_type ON cash_transactions(transaction_type);
```

### 5.2 `debt_records` - Sổ công nợ
```sql
CREATE TABLE debt_records (
    id TEXT PRIMARY KEY,
    
    party_type TEXT NOT NULL,         -- customer/supplier
    party_id TEXT NOT NULL,           -- ID khách hoặc NCC
    party_name TEXT NOT NULL,
    
    transaction_type TEXT NOT NULL,   -- debt/payment
    amount INTEGER NOT NULL,
    
    reference_type TEXT,              -- order/import/payment
    reference_id TEXT,
    
    balance_before INTEGER,           -- Dư nợ trước
    balance_after INTEGER,            -- Dư nợ sau
    
    note TEXT,
    timestamp INTEGER,
    created_at INTEGER
);

CREATE INDEX idx_debt_party ON debt_records(party_type, party_id);
```

---

## 📊 6. KIỂM KÊ & BÁO CÁO

### 6.1 `inventory_checks` - Phiếu kiểm kê
```sql
CREATE TABLE inventory_checks (
    id TEXT PRIMARY KEY,              -- CHK-XXXXXX
    check_code TEXT UNIQUE,
    
    status TEXT DEFAULT 'in_progress', -- in_progress/completed/cancelled
    
    total_products INTEGER DEFAULT 0, -- Số SP kiểm
    total_difference INTEGER DEFAULT 0, -- Tổng chênh lệch
    
    note TEXT,
    checked_by TEXT,                  -- FK → users
    approved_by TEXT,
    
    started_at INTEGER,
    completed_at INTEGER,
    created_at INTEGER
);

CREATE TABLE inventory_check_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    check_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    
    product_name TEXT,
    system_quantity INTEGER NOT NULL, -- Số lượng hệ thống
    actual_quantity INTEGER,          -- Số lượng thực tế
    difference INTEGER,               -- Chênh lệch
    
    note TEXT,
    FOREIGN KEY (check_id) REFERENCES inventory_checks(id)
);
```

### 6.2 `stock_movements` - Lịch sử xuất nhập kho
```sql
CREATE TABLE stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id TEXT NOT NULL,
    
    movement_type TEXT NOT NULL,      -- import/sale/return/adjustment/transfer
    quantity INTEGER NOT NULL,        -- + nhập, - xuất
    
    before_stock INTEGER,             -- Tồn trước
    after_stock INTEGER,              -- Tồn sau
    
    reference_type TEXT,              -- order/import/check/return
    reference_id TEXT,
    
    cost_price INTEGER,               -- Giá vốn
    note TEXT,
    
    created_by TEXT,
    created_at INTEGER
);

CREATE INDEX idx_movements_product ON stock_movements(product_id);
CREATE INDEX idx_movements_date ON stock_movements(created_at);
```

---

## 👤 7. QUẢN LÝ NHÂN SỰ & PHÂN QUYỀN

### 7.1 `users` - Người dùng
```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,              -- USR-XXXXXX
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    avatar TEXT,
    
    role TEXT DEFAULT 'staff',        -- admin/manager/staff/cashier
    permissions TEXT,                 -- JSON array of permissions
    
    is_active BOOLEAN DEFAULT 1,
    last_login_at INTEGER,
    created_at INTEGER
);
```

### 7.2 `shifts` - Ca làm việc
```sql
CREATE TABLE shifts (
    id TEXT PRIMARY KEY,              -- SHF-XXXXXX
    staff_id TEXT NOT NULL,
    
    start_time INTEGER NOT NULL,
    end_time INTEGER,
    
    opening_cash INTEGER DEFAULT 0,   -- Tiền đầu ca
    closing_cash INTEGER,             -- Tiền cuối ca
    expected_cash INTEGER,            -- Tiền kỳ vọng
    difference INTEGER,               -- Chênh lệch
    
    total_sales INTEGER DEFAULT 0,    -- Tổng bán
    total_orders INTEGER DEFAULT 0,   -- Số đơn
    total_returns INTEGER DEFAULT 0,  -- Số trả hàng
    
    status TEXT DEFAULT 'open',       -- open/closed
    note TEXT,
    
    FOREIGN KEY (staff_id) REFERENCES users(id)
);
```

---

## 🎁 8. KHUYẾN MÃI & VOUCHER

### 8.1 `promotions` - Chương trình khuyến mãi
```sql
CREATE TABLE promotions (
    id TEXT PRIMARY KEY,              -- PRM-XXXXXX
    name TEXT NOT NULL,
    description TEXT,
    
    promotion_type TEXT,              -- discount_percent/discount_amount/buy_x_get_y/gift
    
    discount_value INTEGER,           -- Giá trị giảm
    min_order_amount INTEGER,         -- Đơn tối thiểu
    max_discount INTEGER,             -- Giảm tối đa
    
    applicable_products TEXT,         -- JSON: all/category_ids/product_ids
    applicable_customers TEXT,        -- JSON: all/customer_group_ids
    
    start_date INTEGER,
    end_date INTEGER,
    
    usage_limit INTEGER,              -- Giới hạn lượt dùng
    used_count INTEGER DEFAULT 0,
    
    is_active BOOLEAN DEFAULT 1,
    created_at INTEGER
);
```

### 8.2 `vouchers` - Mã giảm giá
```sql
CREATE TABLE vouchers (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,        -- Mã voucher (VD: SALE2025)
    
    promotion_id TEXT,                -- FK → promotions
    
    discount_type TEXT,               -- percent/fixed
    discount_value INTEGER,
    min_order INTEGER,
    max_discount INTEGER,
    
    usage_limit INTEGER,
    used_count INTEGER DEFAULT 0,
    
    valid_from INTEGER,
    valid_until INTEGER,
    
    is_active BOOLEAN DEFAULT 1,
    created_at INTEGER
);
```

---

## 📝 9. ACTIVITY LOGS

```sql
CREATE TABLE activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    user_id TEXT,
    user_name TEXT,
    
    action TEXT NOT NULL,             -- CREATE/UPDATE/DELETE/LOGIN/EXPORT...
    entity_type TEXT,                 -- product/order/customer/...
    entity_id TEXT,
    
    old_data TEXT,                    -- JSON snapshot trước
    new_data TEXT,                    -- JSON snapshot sau
    
    ip_address TEXT,
    user_agent TEXT,
    
    details TEXT,
    timestamp INTEGER
);

CREATE INDEX idx_logs_user ON activity_logs(user_id);
CREATE INDEX idx_logs_action ON activity_logs(action);
CREATE INDEX idx_logs_date ON activity_logs(timestamp);
```

---

## 📈 10. SUMMARY TABLES (Tổng hợp báo cáo)

```sql
-- Báo cáo doanh thu theo ngày
CREATE TABLE daily_reports (
    date TEXT PRIMARY KEY,            -- YYYY-MM-DD
    
    total_revenue INTEGER DEFAULT 0,
    total_cost INTEGER DEFAULT 0,
    gross_profit INTEGER DEFAULT 0,
    
    order_count INTEGER DEFAULT 0,
    return_count INTEGER DEFAULT 0,
    
    cash_sales INTEGER DEFAULT 0,
    transfer_sales INTEGER DEFAULT 0,
    
    import_cost INTEGER DEFAULT 0,
    expense_total INTEGER DEFAULT 0,
    
    top_products TEXT,                -- JSON: top 10 SP
    
    created_at INTEGER
);

-- Thống kê sản phẩm theo tháng
CREATE TABLE monthly_product_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id TEXT NOT NULL,
    year_month TEXT NOT NULL,         -- YYYY-MM
    
    quantity_sold INTEGER DEFAULT 0,
    revenue INTEGER DEFAULT 0,
    cost INTEGER DEFAULT 0,
    profit INTEGER DEFAULT 0,
    
    UNIQUE(product_id, year_month)
);
```

---

## 🔄 MIGRATION SCRIPT

```javascript
// Chạy script này để tạo/update database
const migrations = [
    // V1: Core tables
    'products', 'categories', 'orders', 'order_items',
    
    // V2: Import management
    'suppliers', 'import_notes', 'import_items', 'product_batches',
    
    // V3: Customer & Loyalty
    'customers', 'customer_groups',
    
    // V4: Finance
    'cash_transactions', 'debt_records',
    
    // V5: Inventory
    'inventory_checks', 'stock_movements',
    
    // V6: Staff & Auth
    'users', 'shifts',
    
    // V7: Promotions
    'promotions', 'vouchers',
    
    // V8: Reports
    'daily_reports', 'monthly_product_stats', 'activity_logs'
];
```

---

## 🎯 ƯU TIÊN TRIỂN KHAI

### Phase 1 - MVP (Tuần 1-2)
- [x] products ✅
- [x] orders + order_items ✅
- [x] import_notes + import_items ✅
- [x] activity_logs ✅

### Phase 2 - Khách hàng & Tài chính (Tuần 3-4)
- [ ] customers + customer_groups
- [ ] suppliers
- [ ] cash_transactions
- [ ] debt_records

### Phase 3 - Nâng cao (Tuần 5-6)
- [ ] users + authentication
- [ ] shifts
- [ ] inventory_checks
- [ ] stock_movements

### Phase 4 - Khuyến mãi & Báo cáo (Tuần 7-8)
- [ ] promotions + vouchers
- [ ] daily_reports
- [ ] monthly_product_stats
- [ ] Báo cáo Excel export

---

## 📱 API ENDPOINTS CẦN PHÁT TRIỂN

### Products
- `GET /api/products` ✅
- `POST /api/products` ✅
- `PUT /api/products/:id` ✅
- `DELETE /api/products/:id` ✅
- `GET /api/products/low-stock` - SP sắp hết

### Orders
- `GET /api/orders` ✅
- `POST /api/orders` ✅
- `PUT /api/orders/:id` ✅
- `POST /api/orders/:id/return` - Trả hàng

### Import
- `GET /api/imports` - Danh sách phiếu nhập
- `POST /api/imports` ✅
- `PUT /api/imports/:id/receive` - Xác nhận nhận hàng

### Customers
- `GET /api/customers`
- `POST /api/customers`
- `GET /api/customers/:id/history`
- `PUT /api/customers/:id/points`

### Reports
- `GET /api/reports/daily`
- `GET /api/reports/monthly`
- `GET /api/reports/products/bestseller`
- `GET /api/reports/inventory`
- `GET /api/export/excel`

### Auth
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/shifts/open`
- `POST /api/shifts/close`
