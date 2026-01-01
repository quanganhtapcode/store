#!/bin/bash

# --- CẤU HÌNH CLOUDFLARE R2 (HÃY ĐIỀN THÔNG TIN CỦA BẠN VÀO ĐÂY) ---
# Bạn lấy thông tin này tại Cloudflare Dashboard > R2 > Manage R2 API Tokens
export R2_ACCESS_KEY_ID="588e8168b31e88d845383124fd89d0c5"
export R2_SECRET_ACCESS_KEY=""
export R2_BUCKET_NAME="sql-db"
export R2_ENDPOINT="https://thay_bang_account_id_cua_ban.r2.cloudflarestorage.com"

# --- KHÔNG SỬA DƯỚI DÒNG NÀY ---
echo "🚀 Bắt đầu cài đặt Litestream cho SQLite..."

# 1. Download Litestream
if ! command -v litestream &> /dev/null; then
    echo "⬇️ Đang tải Litestream..."
    wget https://github.com/benbjohnson/litestream/releases/download/v0.3.13/litestream-v0.3.13-linux-amd64.deb
    dpkg -i litestream-v0.3.13-linux-amd64.deb
    rm litestream-v0.3.13-linux-amd64.deb
    echo "✅ Đã cài đặt Litestream."
else
    echo "✅ Litestream đã được cài đặt."
fi

# 2. Tạo Config File
cat > /etc/litestream.yml <<EOF
dbs:
  - path: /root/gemini-pos-api/database/pos.db
    replicas:
      - url: s3://${R2_BUCKET_NAME}/pos.db
        endpoint: ${R2_ENDPOINT}
        access-key-id: ${R2_ACCESS_KEY_ID}
        secret-access-key: ${R2_SECRET_ACCESS_KEY}
EOF
echo "✅ Đã tạo file cấu hình /etc/litestream.yml"

# 3. Tạo Systemd Service để chạy ngầm
cat > /etc/systemd/system/litestream.service <<EOF
[Unit]
Description=Litestream
After=network.target

[Service]
ExecStart=/usr/bin/litestream replicate
Restart=always
RestartSec=1s

[Install]
WantedBy=multi-user.target
EOF

# 4. Khởi động
systemctl daemon-reload
systemctl enable litestream
systemctl restart litestream

echo "🎉 HOÀN TẤT! Litestream đang chạy nền."
echo "➡️ Kiểm tra trạng thái: systemctl status litestream"
echo "💡 Để khôi phục dữ liệu (Time Travel): litestream restore -v -t '2025-01-01T12:00:00Z' -o /path/to/restore.db s3://${R2_BUCKET_NAME}/pos.db"
