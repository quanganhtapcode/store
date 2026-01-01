-- =====================================================
-- Gemini POS - Database Schema
-- SQLite 3
-- =====================================================

-- 1. PRODUCTS TABLE
-- Lưu trữ thông tin sản phẩm
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,              -- PRD-XXXXXX (6 ký tự random)
    name TEXT NOT NULL,               -- Tên sản phẩm
    brand TEXT,                       -- Thương hiệu
    category TEXT,                    -- Danh mục
    price INTEGER NOT NULL,           -- Giá bán lẻ (VNĐ)
    case_price INTEGER,               -- Giá bán theo thùng
    units_per_case INTEGER,           -- Số lượng trong 1 thùng
    stock INTEGER DEFAULT 0,          -- Tồn kho hiện tại
    code TEXT,                        -- Mã vạch/Barcode
    image TEXT,                       -- Đường dẫn ảnh
    total_sold INTEGER DEFAULT 0      -- Tổng đã bán (trending)
);

-- 2. ORDERS TABLE
-- Lưu trữ lịch sử đơn hàng
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_code TEXT UNIQUE,           -- ORD-YYYYMMDD-NNNN
    total INTEGER NOT NULL,           -- Tổng tiền
    timestamp INTEGER NOT NULL,       -- Thời gian tạo (Unix ms)
    items TEXT NOT NULL,              -- Chi tiết SP (JSON)
    customer_name TEXT DEFAULT 'Khách lẻ',
    payment_method TEXT DEFAULT 'cash',  -- cash, transfer, card
    status TEXT DEFAULT 'completed',     -- completed, pending, cancelled
    note TEXT
);

-- 3. ACTIVITY LOGS TABLE
-- Nhật ký hoạt động hệ thống
CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,             -- ADD_PRODUCT, CREATE_ORDER, etc.
    details TEXT,                     -- Chi tiết hành động
    timestamp INTEGER NOT NULL        -- Thời gian
);

-- 4. IMPORT NOTES TABLE
-- Phiếu nhập hàng
CREATE TABLE IF NOT EXISTS import_notes (
    id TEXT PRIMARY KEY,              -- IMP-XXXXXX
    timestamp INTEGER NOT NULL,       -- Thời gian nhập
    total_cost INTEGER,               -- Tổng chi phí
    note TEXT,                        -- Ghi chú
    items TEXT NOT NULL               -- Chi tiết hàng nhập (JSON)
);

-- =====================================================
-- INDEXES (Tối ưu truy vấn)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_total_sold ON products(total_sold DESC);
CREATE INDEX IF NOT EXISTS idx_orders_timestamp ON orders(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_code ON orders(order_code);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON activity_logs(timestamp DESC);

-- =====================================================
-- SAMPLE DATA (Uncomment to insert)
-- =====================================================
-- INSERT INTO products (id, name, brand, price, stock) 
-- VALUES ('PRD-SAMPLE', 'Sample Product', 'Test Brand', 10000, 100);
