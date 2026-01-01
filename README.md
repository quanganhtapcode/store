# 🛒 Gemini POS - Hệ thống Bán hàng Chuyên nghiệp

Hệ thống Point of Sale (POS) hiện đại với giao diện Apple-style, được thiết kế cho các cửa hàng bán lẻ.

![React](https://img.shields.io/badge/React-19.2-blue?logo=react)
![Vite](https://img.shields.io/badge/Vite-7.3-purple?logo=vite)
![SQLite](https://img.shields.io/badge/SQLite-3-green?logo=sqlite)
![Express](https://img.shields.io/badge/Express-5.2-black?logo=express)

---

## 📁 Cấu trúc Dự án

```
gemini-pos/
├── 📂 frontend/                 # React + Vite Frontend
│   ├── 📂 src/
│   │   ├── 📂 components/       # React Components
│   │   │   ├── AdminPage.jsx    # Trang quản trị
│   │   │   ├── POSView.jsx      # Giao diện bán hàng
│   │   │   ├── QRScanner.jsx    # Quét mã QR/Barcode
│   │   │   ├── ReceiptModal.jsx # Modal hoá đơn
│   │   │   └── OrderModal.jsx   # Modal chi tiết đơn hàng
│   │   ├── App.jsx              # Main App với routing
│   │   ├── main.jsx             # Entry point
│   │   └── index.css            # Global styles
│   ├── index.html               # HTML template
│   ├── vite.config.js           # Vite configuration
│   ├── tailwind.config.js       # Tailwind CSS config
│   ├── postcss.config.js        # PostCSS config
│   └── package.json             # Frontend dependencies
│
├── 📂 backend/                  # Express.js Backend
│   ├── server.cjs               # Main API server
│   ├── public/                  # Static files
│   │   └── images/              # Ảnh sản phẩm
│   └── package.json             # Backend dependencies
│
├── 📂 database/                 # Database
│   ├── pos.db                   # SQLite database
│   └── migrate-db.cjs           # Migration script
│
├── 📂 docs/                     # Documentation
│   ├── DATABASE_SCHEMA.md       # Cấu trúc database
│   ├── API_REFERENCE.md         # API endpoints
│   ├── USER_FLOW.md             # Luồng người dùng
│   └── DEPLOYMENT.md            # Hướng dẫn deploy
│
├── 📂 scripts/                  # Utility scripts
│   └── update-vps.sh            # VPS deployment script
│
├── 📂 data/                     # Data files
│   └── san_pham_*.csv           # Dữ liệu sản phẩm
│
├── .env.example                 # Environment template
├── .gitignore                   # Git ignore rules
├── vercel.json                  # Vercel deployment config
└── README.md                    # File này
```

---

## 🚀 Bắt đầu nhanh

### Yêu cầu hệ thống
- **Node.js** >= 18
- **npm** hoặc **yarn**

### Bước 1: Clone và cài đặt

```bash
git clone <repo-url>
cd gemini-pos

# Cài đặt Backend
cd backend
npm install

# Cài đặt Frontend  
cd ../frontend
npm install
```

### Bước 2: Cấu hình Environment

```bash
# Tại thư mục gốc
cp .env.example .env

# Chỉnh sửa với API URL của bạn
VITE_API_URL=http://localhost:3001/api
```

### Bước 3: Chạy Development

```bash
# Terminal 1: Backend (port 3001)
cd backend
npm run dev

# Terminal 2: Frontend (port 3000)
cd frontend
npm run dev
```

Mở **http://localhost:3000** để xem ứng dụng.

---

## ✨ Tính năng chính

### 🏪 POS - Giao diện Bán hàng
- Giao diện Apple-style hiện đại, tối ưu cho màn hình cảm ứng
- Tìm kiếm thông minh theo tên hoặc mã vạch
- Quét mã QR/Barcode bằng camera
- Phân loại sản phẩm theo thương hiệu
- Hiển thị sản phẩm thịnh hành
- Bán theo đơn vị lẻ hoặc thùng

### 📊 Admin Panel - Quản trị
- Dashboard thống kê doanh thu
- Quản lý sản phẩm (CRUD)
- Nhập hàng với phiếu nhập kho
- Lịch sử đơn hàng chi tiết
- Nhật ký hoạt động

### 🔧 Backend API
- RESTful API đầy đủ
- Mã ID chuyên nghiệp (PRD-XXXXXX, ORD-YYYYMMDD-NNNN)
- SQLite database dễ backup
- Static image serving với cache

---

## 📚 Tài liệu chi tiết

| Tài liệu | Mô tả |
|----------|-------|
| [📊 DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) | Cấu trúc bảng dữ liệu |
| [🔌 API_REFERENCE.md](docs/API_REFERENCE.md) | Danh sách API endpoints |
| [🔄 USER_FLOW.md](docs/USER_FLOW.md) | Luồng người dùng & diagrams |
| [🚀 DEPLOYMENT.md](docs/DEPLOYMENT.md) | Hướng dẫn deploy lên VPS/Vercel |

---

## 🌐 Deployment

### Frontend → Vercel
1. Push code lên GitHub
2. Connect repo với Vercel
3. Set environment: `VITE_API_URL=https://your-api.com/api`
4. Deploy!

### Backend → VPS
```bash
./scripts/update-vps.sh
```

---

## 📝 License

MIT License - Free to use and modify.

## 👨‍💻 Author

Made with ❤️ by **Quang Anh**
