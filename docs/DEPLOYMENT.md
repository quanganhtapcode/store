# 🚀 Deployment Guide - Gemini POS

Hướng dẫn chi tiết cách deploy hệ thống Gemini POS lên production.

---

## 📋 Tổng quan Kiến trúc Deployment

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
│               │   │               │   │               │
│ React + Vite  │   │ Express + DB  │   │  SSL + Cache  │
│ store.vercel  │   │ vps.quanganh  │   │               │
│    .app       │   │    .org       │   │               │
└───────────────┘   └───────────────┘   └───────────────┘
```

---

## 📦 1. Deploy Frontend (Vercel)

### Bước 1: Chuẩn bị

```bash
cd frontend
npm run build   # Test build locally
```

### Bước 2: Push lên GitHub

```bash
git add .
git commit -m "Deploy: Update frontend"
git push origin main
```

### Bước 3: Setup Vercel

1. Truy cập [vercel.com](https://vercel.com)
2. Import project từ GitHub
3. Cấu hình:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

### Bước 4: Environment Variables

Thêm biến môi trường trên Vercel Dashboard:

```
VITE_API_URL=https://vps.quanganh.org/api
```

### Bước 5: Deploy

Vercel tự động deploy mỗi khi push lên `main`.

**URL Production:** `https://store-six-fawn.vercel.app`

---

## 🖥️ 2. Deploy Backend (VPS)

### Yêu cầu VPS
- OS: Ubuntu 20.04+ / Debian 11+
- RAM: ≥ 1GB
- Node.js: ≥ 18
- PM2: Process Manager
- Nginx: Reverse Proxy

### Bước 1: SSH vào VPS

```bash
ssh -i ~/Desktop/key.pem root@10.66.66.1
```

### Bước 2: Cài đặt dependencies (Lần đầu)

```bash
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install PM2
npm install -g pm2

# Install Nginx
apt-get install -y nginx
```

### Bước 3: Tạo thư mục project

```bash
mkdir -p /root/gemini-pos-api
cd /root/gemini-pos-api
```

### Bước 4: Deploy bằng script

Từ máy local:

```bash
./scripts/update-vps.sh
```

Script này sẽ:
1. Copy `backend/server.cjs` và `backend/package.json` lên VPS
2. Install dependencies
3. Restart PM2

### Bước 5: Cấu hình Nginx

```bash
nano /etc/nginx/sites-available/gemini-pos
```

```nginx
server {
    listen 80;
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
}
```

```bash
ln -s /etc/nginx/sites-available/gemini-pos /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### Bước 6: SSL Certificate (Let's Encrypt)

```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d vps.quanganh.org
```

---

## 🔧 3. PM2 Commands

```bash
# Xem trạng thái
pm2 status

# Xem logs
pm2 logs gemini-pos

# Restart
pm2 restart gemini-pos

# Stop
pm2 stop gemini-pos

# Delete
pm2 delete gemini-pos

# Save cấu hình (để tự khởi động khi reboot)
pm2 save
pm2 startup
```

---

## 💾 4. Database Backup

### Manual Backup

```bash
# Trên VPS
cp /root/gemini-pos-api/database/pos.db /root/backups/pos_$(date +%Y%m%d).db
```

### Auto Backup (Cron)

```bash
crontab -e
```

Thêm dòng:
```
0 2 * * * cp /root/gemini-pos-api/database/pos.db /root/backups/pos_$(date +\%Y\%m\%d).db
```

→ Backup lúc 2:00 AM mỗi ngày

### Download Backup về Local

```bash
scp -i ~/Desktop/key.pem root@10.66.66.1:/root/backups/pos_20260101.db ./
```

---

## 🖼️ 5. Sync Product Images

### Upload ảnh lên VPS

```bash
scp -i ~/Desktop/key.pem -r backend/public/images/* root@10.66.66.1:/root/gemini-pos-api/public/images/
```

### Cấu trúc thư mục ảnh trên VPS

```
/root/gemini-pos-api/
└── public/
    └── images/
        ├── PRD-A1B2C3.jpg
        ├── PRD-D4E5F6.jpg
        └── ...
```

---

## 🔄 6. CI/CD (Optional)

### GitHub Actions

Tạo file `.github/workflows/deploy.yml`:

```yaml
name: Deploy to VPS

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.VPS_HOST }}
          username: root
          key: ${{ secrets.VPS_KEY }}
          script: |
            cd /root/gemini-pos-api
            git pull origin main
            npm install --production
            pm2 restart gemini-pos
```

---

## 🔍 7. Monitoring

### Check Health

```bash
curl https://vps.quanganh.org/api/stats
```

### PM2 Monitoring

```bash
pm2 monit
```

### Logs

```bash
# Real-time logs
pm2 logs gemini-pos --lines 100

# Error logs only
pm2 logs gemini-pos --err
```

---

## ⚠️ 8. Troubleshooting

### Frontend không kết nối được API

1. Kiểm tra biến môi trường `VITE_API_URL` trên Vercel
2. Kiểm tra CORS trên backend
3. Kiểm tra Nginx proxy

### Backend không start

```bash
cd /root/gemini-pos-api
node server.cjs  # Chạy manual để xem lỗi
```

### Database bị lock

```bash
pm2 restart gemini-pos
```

### Port đang bị dùng

```bash
lsof -i :3001
kill -9 <PID>
```

---

## 📞 URLs Production

| Service | URL |
|---------|-----|
| Frontend | https://store-six-fawn.vercel.app |
| Backend API | https://vps.quanganh.org/api |
| Images | https://vps.quanganh.org/images/PRD-XXXXXX.jpg |
