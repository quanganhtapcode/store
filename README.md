# Gemini POS

Modern Point of Sale system với giao diện Apple-inspired, được xây dựng với React + Node.js + SQLite.

## 🚀 Deployment Guide

### Frontend (Vercel)

1. **Push code lên GitHub**:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/gemini-pos.git
git push -u origin main
```

2. **Deploy lên Vercel**:
   - Truy cập [vercel.com](https://vercel.com)
   - Import repository từ GitHub
   - Thêm Environment Variable:
     - `VITE_API_URL` = `https://your-vps-ip:3001/api` (hoặc domain của bạn)
   - Deploy!

### Backend (VPS)

1. **Upload files lên VPS**:
```bash
# Trên máy local
scp -r server.js pos.db san_pham_2025-12-30.csv package.json user@your-vps-ip:/home/user/gemini-pos-api
```

2. **Cài đặt trên VPS**:
```bash
ssh user@your-vps-ip
cd gemini-pos-api

# Cài dependencies
npm install

# Chạy với PM2 (để server chạy mãi mãi)
npm install -g pm2
pm2 start server.js --name gemini-pos-api
pm2 save
pm2 startup
```

3. **Setup Nginx Reverse Proxy** (Optional nhưng recommended):
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api {
        proxy_pass http://localhost:3001/api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📦 Cấu trúc Project

```
gemini-pos/
├── src/
│   ├── App.jsx              # Main app
│   ├── POSView.jsx          # Giao diện bán hàng
│   ├── AdminView.jsx        # Quản lý (3 tabs)
│   ├── QRScanner.jsx        # Quét mã QR
│   └── ReceiptModal.jsx     # Hóa đơn
├── server.js                # Backend API
├── pos.db                   # SQLite database
├── vercel.json              # Vercel config
└── package.json
```

## ✨ Tính năng

**POS View**:
- Hiển thị sản phẩm theo hãng (horizontal scroll)
- Tự động tách sản phẩm lẻ/thùng
- Giỏ hàng thông minh với quản lý số lượng
- Quét QR code

**Admin View**:
- **Dashboard**: Thống kê doanh thu, đơn hàng, AI assistant
- **Products**: Quản lý sản phẩm (sửa tên, giá lẻ, giá thùng)
- **Orders**: Xem chi tiết tất cả đơn hàng

## 🛠 Development

```bash
# Frontend
npm run dev

# Backend
node server.js
```

## 📝 Notes

- Database: SQLite (file `pos.db`)
- Frontend: React + Vite + TailwindCSS
- Backend: Express + SQLite3
- Styling: Apple-inspired design system
