# 🚀 HƯỚNG DẪN DEPLOY FRONTEND LÊN VERCEL

## Bước 1: Truy cập Vercel
1. Vào https://vercel.com
2. Login bằng GitHub

## Bước 2: Import Project
1. Click **"Add New Project"**
2. Chọn repository: **quanganhtapcode/store**
3. Click **"Import"**

## Bước 3: Cấu hình Build Settings
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

## Bước 4: Thêm Environment Variables
Trong phần **Environment Variables**, thêm:

```
VITE_API_URL = http://20.18.160.76:3001/api
```

## Bước 5: Deploy
1. Click **"Deploy"**
2. Đợi 2-3 phút
3. ✅ Xong! Website của bạn sẽ có URL dạng: `https://store-xxx.vercel.app`

---

## 🔧 Sau khi Deploy

### Test API Connection
Mở browser console trên Vercel app và chạy:
```javascript
fetch('http://20.18.160.76:3001/api/products')
  .then(r => r.json())
  .then(console.log)
```

### Fix CORS (nếu gặp lỗi kết nối)
Nếu gặp lỗi CORS, cần update `server.js` trên VPS:

```bash
ssh -i "C:\Users\PC\Downloads\jp.pem" azureuser@20.18.160.76
cd ~/gemini-pos-api
nano server.js
```

Thay dòng `app.use(cors());` thành:
```javascript
app.use(cors({
  origin: ['https://store-xxx.vercel.app', 'http://localhost:3000'],
  credentials: true
}));
```

Sau đó restart PM2:
```bash
pm2 restart gemini-pos-api
```

---

## 📱 Truy cập ứng dụng

- **Frontend**: https://store-xxx.vercel.app (URL Vercel cung cấp)
- **Backend API**: http://20.18.160.76:3001/api
- **Admin Dashboard**: Nhấn icon Settings trên POS

---

## 🎯 Lưu ý quan trọng

1. **Azure VPS cần mở port 3001**:
```bash
# Trên VPS
sudo ufw allow 3001/tcp
sudo ufw status
```

2. **Database sẽ reset khi restart server** (vì dùng SQLite in-memory).
   - Để data persist, đảm bảo file `pos.db` nằm trong folder `~/gemini-pos-api/`

3. **SSL cho API** (optional):
   - Nếu muốn HTTPS cho API, cần setup Nginx reverse proxy với Let's Encrypt

---

## 🆘 Troubleshooting

### API không kết nối được
```bash
# Check PM2 status
ssh -i "C:\Users\PC\Downloads\jp.pem" azureuser@20.18.160.76 "pm2 logs gemini-pos-api"
```

### Database bị mất
```bash
# Check if pos.db exists
ssh -i "C:\Users\PC\Downloads\jp.pem" azureuser@20.18.160.76 "ls -la ~/gemini-pos-api/"
```

### Update code
```bash
# Upload new server.js
scp -i "C:\Users\PC\Downloads\jp.pem" server.js azureuser@20.18.160.76:~/gemini-pos-api/
ssh -i "C:\Users\PC\Downloads\jp.pem" azureuser@20.18.160.76 "pm2 restart gemini-pos-api"
```
