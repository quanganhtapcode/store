#!/bin/bash

# --- CẤU HÌNH ---
BACKUP_DIR="/root/backups"
DB_PATH="/root/gemini-pos-api/database/pos.db"
SCRIPT_PATH="/root/backup-cron.sh"

echo "🚀 Bắt đầu cài đặt Backup tự động (Giữ 7 ngày)..."

# 1. Tạo thư mục backup nếu chưa có
mkdir -p $BACKUP_DIR
echo "✅ Đã tạo thư mục: $BACKUP_DIR"

# 2. Tạo file script thực hiện backup
# Lưu ý: Dùng EOF trong ngoặc đơn để không bị biến $ biến thành giá trị ngay bây giờ
cat > $SCRIPT_PATH <<'EOF'
#!/bin/bash
BACKUP_DIR="/root/backups"
DB_PATH="/root/gemini-pos-api/database/pos.db"

# Tên file: pos_YYYY-MM-DD_HH.db
TIMESTAMP=$(date +"%Y-%m-%d_%Hh")
TARGET="$BACKUP_DIR/pos_$TIMESTAMP.db"

# Copy file (Dùng sqlite3 .backup thì an toàn hơn copy thường khi DB đang chạy, nhưng cp file WAL cũng tạm ổn)
# Ở đây ta dùng cp đơn giản. SQLite WAL mode cho phép copy file chính an toàn.
cp "$DB_PATH" "$TARGET"
# Copy luôn file WAL/SHM nếu có (để đảm bảo vẹn toàn nhất nếu cần restore nóng)
[ -f "$DB_PATH-wal" ] && cp "$DB_PATH-wal" "$TARGET-wal"
[ -f "$DB_PATH-shm" ] && cp "$DB_PATH-shm" "$TARGET-shm"

# Xóa các file cũ hơn 7 ngày
find "$BACKUP_DIR" -name "pos_*" -type f -mtime +7 -delete
EOF

chmod +x $SCRIPT_PATH
echo "✅ Đã tạo script backup logic tại: $SCRIPT_PATH"

# 3. Cài đặt vào Crontab (Chạy phút thứ 0 mỗi giờ)
# Lệnh này sẽ nối thêm dòng cron nếu chưa có
(crontab -l 2>/dev/null | grep -v "$SCRIPT_PATH"; echo "0 * * * * $SCRIPT_PATH") | crontab -
echo "✅ Đã lập lịch Cronjob: 0 * * * * (Mỗi tiếng 1 lần)"

# 4. Chạy thử ngay lập tức một bản
echo "⏳ Đang chạy thử backup lần đầu..."
$SCRIPT_PATH

echo "🎉 HOÀN TẤT!"
echo "📂 Danh sách file backup hiện tại:"
ls -lh $BACKUP_DIR
