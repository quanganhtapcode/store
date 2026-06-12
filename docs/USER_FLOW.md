# 🔄 User Flow - Cát Hải POS

Tài liệu mô tả chi tiết luồng hoạt động của người dùng trong hệ thống Cát Hải POS.

---

## 👥 Các vai trò người dùng

| Vai trò | Quyền hạn |
|---------|-----------|
| **Nhân viên bán hàng** | Sử dụng POS để bán hàng, thanh toán |
| **Quản lý cửa hàng** | Truy cập Admin Panel, quản lý sản phẩm, xem báo cáo |

---

## 🛒 Flow 1: Bán hàng (POS)

### Mô tả
Nhân viên sử dụng giao diện POS để thực hiện giao dịch bán hàng.

### Diagram

```
┌────────────────┐
│   Mở ứng dụng  │
└───────┬────────┘
        ▼
┌────────────────────────────────────────────┐
│                  POS VIEW                   │
│  ┌──────────┐  ┌────────────────────────┐  │
│  │  Tìm SP  │  │    Danh sách SP        │  │
│  │ hoặc Quét│  │  ┌────┐┌────┐┌────┐   │  │
│  │    QR    │  │  │ SP ││ SP ││ SP │   │  │
│  └────┬─────┘  │  └────┘└────┘└────┘   │  │
│       │        └────────────┬───────────┘  │
│       ▼                     ▼              │
│  ┌─────────────────────────────────────┐   │
│  │           CHỌN SẢN PHẨM             │   │
│  │  • Bấm vào SP → Thêm 1 đơn vị       │   │
│  │  • Giữ lâu → Chọn bán Lẻ/Thùng     │   │
│  └─────────────────┬───────────────────┘   │
│                    ▼                        │
│  ┌─────────────────────────────────────┐   │
│  │             GIỎ HÀNG                 │   │
│  │  Coca-Cola 330ml × 2     24,000đ    │   │
│  │  Pepsi (thùng) × 1      260,000đ    │   │
│  │  ─────────────────────────────────  │   │
│  │  TỔNG:                  284,000đ    │   │
│  └─────────────────┬───────────────────┘   │
│                    ▼                        │
│  ┌─────────────────────────────────────┐   │
│  │         CHỌN THANH TOÁN             │   │
│  │  [💵 Tiền mặt]  [💳 Chuyển khoản]  │   │
│  └─────────────────┬───────────────────┘   │
│                    ▼                        │
│  ┌─────────────────────────────────────┐   │
│  │         ✅ HOÀN THÀNH               │   │
│  │   Đơn hàng ORD-20260101-0001        │   │
│  │   Giỏ hàng được reset               │   │
│  └─────────────────────────────────────┘   │
└────────────────────────────────────────────┘
```

### Các bước chi tiết

1. **Mở ứng dụng** → Trang POS hiển thị mặc định
2. **Tìm sản phẩm** theo 3 cách:
   - Gõ tên trong ô tìm kiếm
   - Chọn theo thương hiệu (tab filter)
   - Quét mã vạch/QR bằng camera
3. **Thêm vào giỏ**:
   - Click/tap → Thêm 1 đơn vị lẻ
   - Long press → Popup chọn Lẻ/Thùng
4. **Xem giỏ hàng**:
   - Điều chỉnh số lượng (+/-)
   - Xóa sản phẩm
   - Xem tổng tiền real-time
5. **Thanh toán**:
   - Chọn phương thức (Tiền mặt/Chuyển khoản)
   - Giao dịch được xử lý ngay lập tức
6. **Hoàn thành**:
   - Giỏ hàng reset
   - Tồn kho tự động cập nhật

---

## 📊 Flow 2: Quản trị (Admin Panel)

### Truy cập Admin

```
POS View → Bấm icon ⚙️ (góc trên phải) → Admin Panel
```

### 2.1 Dashboard

```
┌────────────────────────────────────────────┐
│               ADMIN DASHBOARD              │
├────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Hôm nay  │  │ Tháng    │  │ Đơn hàng │ │
│  │1,500,000đ│  │45,000,000│  │    15    │ │
│  └──────────┘  └──────────┘  └──────────┘ │
│                                            │
│  📈 TOP SẢN PHẨM BÁN CHẠY                 │
│  1. Coca-Cola 330ml - 1,250 đã bán         │
│  2. Pepsi 330ml - 980 đã bán               │
│  3. Aquafina 500ml - 750 đã bán            │
└────────────────────────────────────────────┘
```

### 2.2 Quản lý Sản phẩm

```
┌────────────────────────────────────────────┐
│    QUẢN LÝ SẢN PHẨM           [+ Thêm SP] │
├────────────────────────────────────────────┤
│  🔍 Tìm kiếm sản phẩm...                   │
├────────────────────────────────────────────┤
│ ID          | Tên           | Giá   | Tồn  │
│ PRD-A1B2C3  | Coca 330ml    | 12K   | 150  │
│ PRD-D4E5F6  | Pepsi 330ml   | 11K   | 200  │
│             |               |       |      │
│           [✏️ Sửa]  [🗑️ Xóa]              │
└────────────────────────────────────────────┘
```

**Thêm sản phẩm:**
1. Bấm "Thêm SP"
2. Điền form: Tên, Thương hiệu, Giá lẻ, Giá thùng, Mã vạch
3. Chụp ảnh hoặc upload
4. Lưu → ID tự động tạo (PRD-XXXXXX)

**Sửa sản phẩm:**
1. Bấm icon ✏️
2. Chỉnh sửa thông tin
3. Lưu

**Xóa sản phẩm:**
1. Bấm icon 🗑️
2. Xác nhận xóa

### 2.3 Lịch sử Đơn hàng

```
┌────────────────────────────────────────────┐
│               LỊCH SỬ ĐƠN HÀNG             │
├────────────────────────────────────────────┤
│ Mã đơn              | Tổng    | Thời gian  │
│ ORD-20260101-0001   | 284K    | 10:30      │
│ ORD-20260101-0002   | 156K    | 11:45      │
│                                            │
│         [Click để xem chi tiết]            │
└───────────────────────┬────────────────────┘
                        ▼
┌────────────────────────────────────────────┐
│        CHI TIẾT ĐƠN HÀNG                   │
├────────────────────────────────────────────┤
│ Mã: ORD-20260101-0001                      │
│ Thời gian: 01/01/2026 10:30                │
│ Khách: Khách lẻ                            │
│ Thanh toán: Tiền mặt                       │
│ ───────────────────────────────────────    │
│ Sản phẩm:                                  │
│ • Coca-Cola 330ml × 2 = 24,000đ            │
│ • Pepsi thùng × 1 = 260,000đ               │
│ ───────────────────────────────────────    │
│ TỔNG: 284,000đ                             │
│                                            │
│ [✏️ Sửa thông tin khách hàng]              │
└────────────────────────────────────────────┘
```

### 2.4 Nhập hàng

```
┌────────────────────────────────────────────┐
│                NHẬP HÀNG                   │
├────────────────────────────────────────────┤
│  🔍 Quét hoặc tìm sản phẩm...              │
│                                            │
│  Sản phẩm nhập:                           │
│  ┌──────────────────────────────────────┐  │
│  │ Coca-Cola 330ml [+10] [+thùng]       │  │
│  │ Số lượng: 100                         │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  Ghi chú: Nhập từ NCC ABC                  │
│                                            │
│           [💾 Lưu phiếu nhập]              │
└────────────────────────────────────────────┘
```

**Flow nhập hàng:**
1. Tìm/quét sản phẩm cần nhập
2. Nhập số lượng (có thể +1, +10, +thùng)
3. Thêm ghi chú (optional)
4. Lưu → Tồn kho tự động cập nhật

### 2.5 Nhật ký Hoạt động

```
┌────────────────────────────────────────────┐
│            NHẬT KÝ HOẠT ĐỘNG               │
├────────────────────────────────────────────┤
│ 10:45 | CREATE_ORDER | ORD-001 - 284,000đ  │
│ 10:30 | ADD_PRODUCT  | Thêm Coca-Cola      │
│ 09:15 | IMPORT_STOCK | Nhập hàng IMP-X7Y8  │
│ 09:00 | UPDATE_PRODUCT | Cập nhật Pepsi    │
└────────────────────────────────────────────┘
```

---

## 🔄 Flow 3: Quét mã vạch

```
┌────────────────┐
│  Bấm icon 📷  │
└───────┬────────┘
        ▼
┌────────────────────────────────────────────┐
│           QUÉT MÃ VẠCH/QR                  │
│                                            │
│   ┌────────────────────────────────────┐   │
│   │                                    │   │
│   │         📷 Camera View             │   │
│   │                                    │   │
│   │    [═══════════════════════]      │   │
│   │         Scan line                  │   │
│   │                                    │   │
│   └────────────────────────────────────┘   │
│                                            │
│            [❌ Đóng]                       │
└───────────────────────┬────────────────────┘
                        │ Quét thành công
                        ▼
┌────────────────────────────────────────────┐
│   ✅ Tìm thấy: Coca-Cola 330ml             │
│   → Tự động thêm vào giỏ hàng              │
└────────────────────────────────────────────┘
        hoặc
┌────────────────────────────────────────────┐
│   ❌ Không tìm thấy sản phẩm               │
│   Mã: 8934822100022                        │
└────────────────────────────────────────────┘
```

---

## 📱 Responsive Design

### Desktop (>1024px)
- Layout 2 cột: Sản phẩm (trái) + Giỏ hàng (phải)
- Grid sản phẩm 4-5 cột

### Tablet (768px - 1024px)
- Layout 2 cột với sidebar thu gọn
- Grid sản phẩm 3-4 cột

### Mobile (<768px)
- Layout 1 cột
- Giỏ hàng ở bottom sheet
- Grid sản phẩm 2 cột

---

## ⌨️ Phím tắt (Desktop)

| Phím | Hành động |
|------|-----------|
| `/` | Focus ô tìm kiếm |
| `Esc` | Đóng modal/popup |
| `Enter` | Xác nhận thanh toán (khi ở giỏ hàng) |

---

## 🔔 Thông báo

| Loại | Khi nào | Màu |
|------|---------|-----|
| Success | Thanh toán thành công, Lưu thành công | 🟢 Xanh |
| Error | Lỗi API, Hết hàng | 🔴 Đỏ |
| Warning | Sắp hết hàng (< 10) | 🟡 Vàng |
| Info | Thông tin chung | 🔵 Xanh dương |
