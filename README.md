# 🛒 Gemini POS - Hệ thống Bán hàng Chuyên nghiệp

Hệ thống Point of Sale (POS) hiện đại với giao diện Apple-style, được thiết kế cho các cửa hàng bán lẻ.

![React](https://img.shields.io/badge/React-18.2-blue?logo=react)
![Vite](https://img.shields.io/badge/Vite-4.4-purple?logo=vite)
![SQLite](https://img.shields.io/badge/SQLite-3-green?logo=sqlite)
![Express](https://img.shields.io/badge/Express-4.18-black?logo=express)

## ✨ Tính năng

### 🏪 POS - Giao diện Bán hàng
- **Giao diện Apple-style**: Thiết kế hiện đại, tối ưu cho màn hình cảm ứng
- **Tìm kiếm thông minh**: Tìm sản phẩm theo tên hoặc mã vạch
- **Quét mã QR/Barcode**: Hỗ trợ quét mã bằng camera
- **Phân loại theo thương hiệu**: Sắp xếp sản phẩm theo brand
- **Sản phẩm Thịnh hành**: Hiển thị top sản phẩm bán chạy
- **Hỗ trợ bán lẻ + thùng**: Bán theo đơn vị lẻ hoặc theo thùng với giá khác nhau
- **Giỏ hàng trực quan**: Thêm/bớt số lượng, xem tổng tiền real-time

### 📊 Admin Panel - Quản trị
- **Dashboard thống kê**: Doanh thu hôm nay, tháng này, top sản phẩm
- **Quản lý sản phẩm**: Thêm, sửa, xóa sản phẩm với quét mã vạch
- **Nhập hàng**: Tạo phiếu nhập kho, tự động cập nhật tồn
- **Lịch sử đơn hàng**: Click để xem chi tiết, sửa thông tin đơn hàng
- **Nhật ký hoạt động**: Theo dõi mọi thao tác trong hệ thống
- **Ảnh local tự động**: Server tự động map ảnh local nếu có sẵn

### 🔧 Backend API
- **RESTful API**: CRUD đầy đủ cho products, orders, imports
- **Mã ID chuyên nghiệp**: PRD-XXXXXX cho sản phẩm, ORD-YYYYMMDD-NNNN cho đơn hàng
- **SQLite database**: Dễ dàng backup và di chuyển
- **CORS enabled**: Hỗ trợ deploy frontend riêng (Vercel, etc.)
- **Static image serving**: Serve ảnh sản phẩm từ local

## 🏗️ Cấu trúc Project

```
gemini-pos/
├── server.cjs          # Backend Express API (CommonJS)
├── App.jsx             # Main React App với routing
├── POSView.jsx         # Giao diện bán hàng chính
├── AdminPage.jsx       # Trang quản trị + OrderModal
├── QRScanner.jsx       # Component quét mã
├── ReceiptModal.jsx    # Modal hoá đơn
├── main.jsx            # React entry point
├── index.html          # HTML template
├── index.css           # Global styles
├── package.json        # Dependencies
├── vite.config.js      # Vite configuration
├── tailwind.config.js  # Tailwind CSS config
├── postcss.config.js   # PostCSS config
├── .env.example        # Environment template
├── vercel.json         # Vercel deployment config
├── update-vps.sh       # VPS deployment script
└── public/images/      # Local product images (PRD-XXXXXX.jpg)
```

## 🚀 Cài đặt Local

### Yêu cầu
- Node.js >= 18
- npm hoặc yarn

### Bước 1: Clone và Install
```bash
git clone <repo-url>
cd gemini-pos
npm install
```

### Bước 2: Cấu hình Environment
```bash
cp .env.example .env
# Edit .env với API URL của bạn
```

### Bước 3: Chạy Development
```bash
# Terminal 1: Backend
npm run dev:server

# Terminal 2: Frontend
npm run dev
```

Mở http://localhost:5173 để xem ứng dụng.

## 🌐 Deployment

### Frontend (Vercel)
1. Push code lên GitHub
2. Connect repo với Vercel
3. Set environment variable: `VITE_API_URL=https://your-api-domain.com/api`
4. Deploy!

### Backend (VPS)
1. SSH vào server
2. Setup PM2 + Nginx
3. Chạy script deploy:
```bash
./update-vps.sh
```

### Nginx Config mẫu
```nginx
server {
    server_name vps.quanganh.org;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl;
    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;
}
```

## 📡 API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/products` | Lấy tất cả sản phẩm (auto-map local images) |
| POST | `/api/products` | Thêm sản phẩm mới |
| PUT | `/api/products/:id` | Cập nhật sản phẩm |
| DELETE | `/api/products/:id` | Xóa sản phẩm |
| GET | `/api/orders` | Lấy lịch sử đơn hàng |
| GET | `/api/orders/:id` | Lấy chi tiết 1 đơn hàng |
| POST | `/api/orders` | Tạo đơn hàng mới |
| PUT | `/api/orders/:id` | Cập nhật đơn hàng (khách hàng, trạng thái, ghi chú) |
| GET | `/api/stats` | Thống kê doanh thu |
| POST | `/api/imports` | Tạo phiếu nhập kho |
| GET | `/api/logs` | Nhật ký hoạt động |

## 🔐 Database Schema

### Products
```sql
CREATE TABLE products (
    id TEXT PRIMARY KEY,        -- PRD-XXXXXX
    name TEXT,
    brand TEXT,
    category TEXT,
    price INTEGER,              -- Giá lẻ
    case_price INTEGER,         -- Giá thùng
    units_per_case INTEGER,     -- Số lượng/thùng
    stock INTEGER,              -- Tồn kho
    code TEXT,                  -- Barcode
    image TEXT,                 -- URL hoặc path local
    total_sold INTEGER          -- Tổng đã bán (trending)
);
```

### Orders
```sql
CREATE TABLE orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_code TEXT,            -- ORD-YYYYMMDD-NNNN
    total INTEGER,
    timestamp INTEGER,
    items TEXT,                 -- JSON
    customer_name TEXT,
    payment_method TEXT,
    status TEXT,
    note TEXT
);
```

## 🛠️ Ghi chú

- **Ảnh sản phẩm**: Đặt tại `/public/images/PRD-XXXXXX.jpg` trên VPS
- **Auto-map**: Server tự động sử dụng ảnh local nếu tồn tại, không cần tải từ ibb

## 📝 License

MIT License - Free to use and modify.

## 👨‍💻 Author

Made with ❤️ by Quang Anh
