# 🚀 FIX LỖI MIXED CONTENT & CẬP NHẬT DOMAIN

Bạn đã setup Domain `vps.quanganh.org` thành công trên VPS. Bây giờ chỉ cần cập nhật Vercel.

## Bước 1: Cập nhật Vercel Environment Variable
1. Vào Dashboard project trên Vercel.
2. Vào **Settings** -> **Environment Variables**.
3. Tìm variable `VITE_API_URL`.
4. Bấm **Edit** và đổi giá trị thành:
   ```
   https://vps.quanganh.org/api
   ```
   *(Lưu ý: dùng HTTPS)*

5. **Lưu lại** và **Redeploy** (Quay lại tab Deployments -> Redeploy nút 3 chấm).

## Bước 2: Kiểm tra Cloudflare (Rất quan trọng)
Đảm bảo trên Cloudflare dashboard:
1. Record `vps` trỏ về `20.18.160.76` đang bật **Proxied** (đám mây màu cam).
2. Vào mục **SSL/TLS**: Chọn chế độ **Flexible** hoặc **Full**.
   - Nếu chọn **Full (Strict)** có thể bị lỗi nếu VPS chưa config SSL certificate chuẩn.
   - An toàn nhất: Chọn **Full** (nếu VPS có self-signed cert) hoặc **Flexible** (Cloudflare nối HTTP tới VPS). Do ta setup Nginx port 80 nên **Flexible** là lựa chọn dễ nhất lúc này.

## Bước 3: Kiểm tra API
Thử truy cập trực tiếp trên trình duyệt:
https://vps.quanganh.org/api/products

Nếu ra dữ liệu JSON -> Thành công 100%!
