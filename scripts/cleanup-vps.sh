#!/bin/bash

# Script dọn dẹp thư mục API trên VPS
# Di chuyển các file không liên quan ra khỏi thư mục dự án

TARGET_DIR="/var/www/vps.quanganh.org/api"
BACKUP_DIR="/root/cleanup_backup_$(date +%Y%m%d_%H%M%S)"

echo "=== Bắt đầu dọn dẹp $TARGET_DIR ==="
echo "Các file hệ thống/rác sẽ được di chuyển sang $BACKUP_DIR"

mkdir -p "$BACKUP_DIR"

cd "$TARGET_DIR" || exit

# Danh sách các file/folder cần giữ lại (Project files)
# server.cjs, package.json, package-lock.json, node_modules, public, routes, utils, config, database, middleware, backups
# .env (nếu là cur project config), .gitignore
# pm2 related? .pm2 is usually system wide or home. Project might have ecosystem.config.js

# Danh sách các file/folder hệ thống cần loại bỏ (Move to backup)
FILES_TO_REMOVE=(
    ".bash_history"
    ".bashrc"
    ".cache"
    ".config"
    ".dotnet"
    ".lesshst"
    ".local"
    ".npm"
    ".pm2"
    ".profile"
    ".ssh"
    ".vnstock"
    ".vscode-server"
    ".wg-easy"
    ".wget-hsts"
    "snap"
    "speedtest-cli"
    "wireguard-install"
    "wg0-client-16pm.conf"
    "wg0-client-backup.conf"
    "wg0-client-elite845.conf"
    "apps" 
)

for file in "${FILES_TO_REMOVE[@]}"; do
    if [ -e "$file" ]; then
        echo "Di chuyển: $file"
        mv "$file" "$BACKUP_DIR/"
    fi
done

echo "=== Dọn dẹp hoàn tất ==="
echo "Kiểm tra lại thư mục $TARGET_DIR"
ls -la "$TARGET_DIR"
