#!/bin/bash

# --- CẤU HÌNH ---
BACKUP_DIR="/var/www/store/backups"
DB_PATH="/var/www/store/api/database/pos.db"
SCRIPT_PATH="/var/www/store/scripts/backup.sh"

echo "🚀 Bắt đầu cài đặt Backup tự động (Giữ 7 ngày)..."

# 1. Tạo thư mục backup nếu chưa có
mkdir -p $BACKUP_DIR
mkdir -p $(dirname $SCRIPT_PATH)
echo "✅ Đã tạo thư mục: $BACKUP_DIR"

# 2. Tạo file script thực hiện backup
cat > $SCRIPT_PATH <<'EOF'
#!/bin/bash
BACKUP_DIR="/var/www/store/backups"
DB_PATH="/var/www/store/api/database/pos.db"

mkdir -p $BACKUP_DIR

# Tên file: pos_YYYY-MM-DD_HH.db
TIMESTAMP=$(date +"%Y-%m-%d_%Hh")
TARGET="$BACKUP_DIR/pos_$TIMESTAMP.db"

if [ -f "$DB_PATH" ]; then
    # Copy file (SQLite WAL mode cho phép copy file chính an toàn)
    cp "$DB_PATH" "$TARGET"
    # Copy luôn file WAL/SHM nếu có
    [ -f "$DB_PATH-wal" ] && cp "$DB_PATH-wal" "$TARGET-wal"
    [ -f "$DB_PATH-shm" ] && cp "$DB_PATH-shm" "$TARGET-shm"
    echo "Backup created: $TARGET"
else
    echo "Database not found: $DB_PATH"
fi

# Xóa các file cũ hơn 7 ngày
find "$BACKUP_DIR" -name "pos_*" -type f -mtime +7 -delete
EOF

chmod +x $SCRIPT_PATH
echo "✅ Đã tạo script backup logic tại: $SCRIPT_PATH"

# 3. Cài đặt vào Crontab (Chạy phút thứ 0 mỗi giờ)
(crontab -l 2>/dev/null | grep -v "backup.sh"; echo "0 * * * * $SCRIPT_PATH") | crontab -
echo "✅ Đã lập lịch Cronjob: 0 * * * * (Mỗi tiếng 1 lần)"

# 4. Chạy thử ngay lập tức một bản
echo "⏳ Đang chạy thử backup lần đầu..."
$SCRIPT_PATH

echo "🎉 HOÀN TẤT!"
echo "📂 Danh sách file backup hiện tại:"
ls -lh $BACKUP_DIR | tail -10
