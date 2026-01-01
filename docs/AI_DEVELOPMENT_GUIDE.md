# 🤖 AI Development Guide - Gemini POS

Tài liệu này dành cho các AI assistant (Claude, GPT, Gemini, etc.) hiểu cách làm việc với codebase Gemini POS.

---

## 📁 Cấu trúc Dự án

```
gemini-pos/
├── frontend/           # React + Vite (Deploy: Vercel)
│   └── src/
│       ├── components/ # React components
│       └── App.jsx     # Main app + routing
│
├── backend/            # Express.js API (Deploy: VPS)
│   ├── server.cjs      # Main server file
│   └── public/images/  # Product images (local storage)
│
├── database/           # SQLite database
│   ├── pos.db          # Main database file
│   └── schema.sql      # Schema reference
│
├── docs/               # Documentation
├── scripts/            # Deployment scripts
└── data/               # CSV data files
```

---

## 🔗 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        PRODUCTION                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────────┐         ┌──────────────────────────┐     │
│   │   VERCEL     │         │         VPS              │     │
│   │  (Frontend)  │  ────▶  │      (Backend)           │     │
│   │              │   API   │                          │     │
│   │ React + Vite │         │  Express.js + SQLite     │     │
│   │              │         │  + Static Images         │     │
│   └──────────────┘         └──────────────────────────┘     │
│                                                              │
│   URL: store-six-fawn      URL: vps.quanganh.org            │
│         .vercel.app                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Các File Quan Trọng

### Frontend

| File | Mô tả | Khi nào cần sửa |
|------|-------|-----------------|
| `frontend/src/App.jsx` | Main app, routing, API calls | Thêm route mới, sửa logic |
| `frontend/src/components/POSView.jsx` | Giao diện bán hàng | UI bán hàng, giỏ hàng |
| `frontend/src/components/AdminPage.jsx` | Trang quản trị | Quản lý SP, thống kê |
| `frontend/src/components/OrderModal.jsx` | Modal đơn hàng | Chi tiết, sửa đơn hàng |
| `frontend/vite.config.js` | Vite config | Build config, proxy |
| `frontend/tailwind.config.js` | Tailwind config | Theme, colors |

### Backend

| File | Mô tả | Khi nào cần sửa |
|------|-------|-----------------|
| `backend/server.cjs` | Express server, tất cả API | Thêm API mới, sửa logic |
| `backend/package.json` | Dependencies | Thêm thư viện mới |

### Database

| File | Mô tả | Khi nào cần sửa |
|------|-------|-----------------|
| `database/pos.db` | SQLite database | Không sửa trực tiếp |
| `database/schema.sql` | Schema reference | Cập nhật khi thay đổi schema |
| `database/migrate-db.cjs` | Migration script | Thêm cột mới |

---

## 🔌 API Endpoints (Quick Reference)

```javascript
const API_URL = 'https://vps.quanganh.org/api';

// Products
GET    /api/products           // Lấy tất cả sản phẩm
POST   /api/products           // Thêm sản phẩm
PUT    /api/products/:id       // Cập nhật sản phẩm
DELETE /api/products/:id       // Xóa sản phẩm

// Orders
GET    /api/orders             // Lấy đơn hàng
GET    /api/orders/:id         // Chi tiết đơn hàng
POST   /api/orders             // Tạo đơn hàng
PUT    /api/orders/:id         // Cập nhật đơn hàng

// Others
GET    /api/stats              // Thống kê doanh thu
POST   /api/imports            // Nhập hàng
GET    /api/logs               // Nhật ký hoạt động
```

---

## 📊 Database Schema (Quick Reference)

```sql
-- Products: Sản phẩm
products(id TEXT PK, name, brand, category, price INT, 
         case_price INT, units_per_case INT, stock INT, 
         code TEXT, image TEXT, total_sold INT)

-- Orders: Đơn hàng  
orders(id INT PK AUTO, order_code TEXT, total INT, 
       timestamp INT, items TEXT/JSON, customer_name TEXT,
       payment_method TEXT, status TEXT, note TEXT)

-- Activity Logs: Nhật ký
activity_logs(id INT PK AUTO, action TEXT, details TEXT, timestamp INT)

-- Import Notes: Phiếu nhập
import_notes(id TEXT PK, timestamp INT, total_cost INT, 
             note TEXT, items TEXT/JSON)
```

---

## 🖼️ Image Handling

### Local Image Storage
- **Location:** `backend/public/images/`
- **Format:** `{product_id}.jpg` (e.g., `PRD-A1B2C3.jpg`)
- **URL:** `https://vps.quanganh.org/images/PRD-A1B2C3.jpg`

### Image Upload Flow
1. Frontend gửi base64 image trong request body
2. Backend extract và lưu vào `public/images/{id}.jpg`
3. Database lưu path: `/images/{id}.jpg`
4. Frontend hiển thị: `{API_BASE}/images/{id}.jpg`

```javascript
// Backend: Save base64 to file
const saveBase64Image = (base64Data, productId) => {
    const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
    const filename = `${productId}.jpg`;
    fs.writeFileSync(`public/images/${filename}`, Buffer.from(matches[2], 'base64'));
    return `/images/${filename}`;
};
```

---

## 🚀 Deployment Commands

### Push to GitHub (auto-deploys Vercel)
```bash
git add .
git commit -m "Update: description"
git push origin main
```

### Deploy Backend to VPS
```bash
./scripts/update-vps.sh
# hoặc
./scripts/deploy.sh vps
```

### Full Deployment (GitHub + VPS)
```bash
./scripts/deploy.sh all
```

### SSH vào VPS
```bash
ssh -i ~/Desktop/key.pem root@203.55.176.10
```

---

## ⚠️ Lưu ý Quan Trọng cho AI

### 1. Environment Variables
```bash
# Frontend (Vercel)
VITE_API_URL=https://vps.quanganh.org/api

# Backend (.env không cần, hardcoded port 3001)
```

### 2. File Extensions
- Frontend: `.jsx` (React components)
- Backend: `.cjs` (CommonJS for Node.js)

### 3. Database Path
```javascript
// Backend reads database from:
const dbPath = path.join(__dirname, '../database/pos.db');
```

### 4. CORS
- Backend cho phép tất cả origins: `cors({ origin: '*' })`

### 5. ID Format
- Products: `PRD-XXXXXX` (random 6 chars)
- Orders: `ORD-YYYYMMDD-NNNN` (date + sequence)
- Imports: `IMP-XXXXXX`

---

## 📝 Khi AI cần thay đổi code

### Thêm API mới
1. Mở `backend/server.cjs`
2. Thêm route handler
3. Test local: `cd backend && node server.cjs`
4. Deploy: `./scripts/update-vps.sh`

### Thêm Component mới
1. Tạo file trong `frontend/src/components/`
2. Import vào `App.jsx` hoặc component cha
3. Test local: `cd frontend && npm run dev`
4. Push GitHub (Vercel auto-deploy)

### Thay đổi Database Schema
1. Cập nhật `database/schema.sql` 
2. Thêm migration trong `backend/server.cjs` (db.serialize block)
3. Cập nhật `docs/DATABASE_SCHEMA.md`

---

## 🔍 Debug Commands

```bash
# Check VPS server status
ssh -i ~/Desktop/key.pem root@203.55.176.10 "pm2 status"

# View VPS logs
ssh -i ~/Desktop/key.pem root@203.55.176.10 "pm2 logs gemini-pos --lines 50"

# Restart VPS server
ssh -i ~/Desktop/key.pem root@203.55.176.10 "pm2 restart gemini-pos"

# Test API
curl https://vps.quanganh.org/api/products
```

---

## 📂 Quan hệ giữa các file

```
User → POSView.jsx → App.jsx → API → server.cjs → pos.db
         ↓
    AdminPage.jsx
         ↓
    OrderModal.jsx
```

---

*Cập nhật lần cuối: 2026-01-01*
