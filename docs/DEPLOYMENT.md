# 🚀 Deployment Guide - Gemini POS (Cát Hải Store)

*Cập nhật lần cuối: 2026-01-02*

Tài liệu hướng dẫn deploy và cấu trúc hệ thống Gemini POS trên VPS.

---

## 📋 Tổng quan Kiến trúc
Hệ thống Backend đã được **chuẩn hóa** về thư mục `/var/www/vps.quanganh.org` (thay vì `/root/gemini-pos-api` cũ) để tăng cường bảo mật và dễ quản lý.

```
┌─────────────────────────────────────────────────────────────────┐
│                        INTERNET                                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│    VERCEL     │   │     VPS       │   │   CLOUDFLARE  │
│   (Frontend)  │   │   (Backend)   │   │     (DNS)     │
│ React + Vite  │   │ Node.js API   │   │  SSL + Cache  │
│               │   │ /var/www/...  │   │               │
└───────────────┘   └───────────────┘   └───────────────┘
```

---

## 📦 1. Deploy Frontend (Vercel)

*(Phần này giữ nguyên, không thay đổi)*

### Bước 1: Chuẩn bị
```bash
cd frontend
npm run build
```

### Bước 2: Push và Deploy
Push code lên GitHub (`main` branch), Vercel sẽ tự động deploy.

- **URL Production:** `https://store-six-fawn.vercel.app`
- **Biến môi trường (Vercel):** `VITE_API_URL=https://vps.quanganh.org/api`

---

## 🖥️ 2. Cấu Trúc Server & Backend (VPS)

**IP VPS:** `203.55.176.10`

### 2.1. Cấu Trúc Thư Mục Mới
Toàn bộ hệ thống nằm tại: **`/var/www/vps.quanganh.org/`**

| Đường dẫn con | Chức năng | Ghi chú |
|--------------|-----------|---------|
| `/api/` | **Source Code chính** | Code Node.js, Express Server (Port 3001) |
| `/api/database/` | **Database SQLite** | File `pos.db` chứa dữ liệu |
| `/backups/` | **Kho lưu trữ Backup** | Chứa các file `pos_YYYY-MM-DD_HH.db` |
| `/scripts/` | **Script tự động** | Chứa `backup.sh` chạy cronjob |

### 2.2. Quản Lý Service (PM2)
Bên Backend chạy dưới PM2 với tên process là `pos-api`.

- **Start/Restart:** `pm2 restart pos-api`
- **Check Status:** `pm2 status` hoặc `pm2 logs pos-api`
- **Port:** `3001`

### 2.3. Quy trình Deploy Code Mới

1. **SSH vào VPS:**
   ```bash
   ssh root@203.55.176.10
   ```
2. **Pull code & Update:**
   ```bash
   cd /var/www/vps.quanganh.org/api
   # Nếu dùng git
   git pull origin main
   npm install
   pm2 restart pos-api
   ```
   *(Hoặc copy thủ công file server.cjs nếu không dùng git trực tiếp trên VPS)*

### 2.4. Cấu hình Nginx (Tham khảo)
File: `/etc/nginx/sites-available/vps.quanganh.org`

```nginx
server {
    server_name vps.quanganh.org;
    # ... SSL config ...
    location / {
        proxy_pass http://localhost:3001;
        # ... Headers ...
    }
}
```

---

## 💾 3. Hệ Thống Backup Tự Động

Server đã được cấu hình tự động sao lưu Database mỗi giờ.

- **Script:** `/var/www/vps.quanganh.org/scripts/backup.sh`
- **Cơ chế:**
  - Chạy mỗi tiếng một lần (phút 00).
  - Copy `pos.db` (kèm WAL/SHM) sang thư mục `/backups/`.
  - Tự động xóa backup cũ hơn **7 ngày**.
- **Kiểm tra lịch:** `crontab -l`

**Lệnh Backup thủ công (nếu cần):**
```bash
/var/www/vps.quanganh.org/scripts/backup.sh
```

---

## 🖼️ 4. Đồng bộ ảnh sản phẩm

Ảnh sản phẩm nằm tại: `/var/www/vps.quanganh.org/api/public/images/`

**Upload ảnh từ máy local lên VPS:**
```bash
scp -r backend/public/images/* root@203.55.176.10:/var/www/vps.quanganh.org/api/public/images/
```

**URL truy cập ảnh:** `https://vps.quanganh.org/images/PRD-XXXXXX.jpg`

---

## ⚠️ 5. Troubleshooting & Maintenance

### Kiểm tra Logs
```bash
pm2 logs pos-api
```

### Nếu Server API không phản hồi
1. Check PM2: `pm2 status` xem `pos-api` có online không.
2. Restart: `pm2 restart pos-api`.
3. Check Nginx: `systemctl status nginx`.

### Khôi phục dữ liệu từ Backup
1. Stop service: `pm2 stop pos-api`
2. Copy file backup từ `/backups/` về `/api/database/`.
3. Đổi tên thành `pos.db`.
4. Start service: `pm2 start pos-api`
