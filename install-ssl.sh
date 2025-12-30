#!/bin/bash

DOMAIN="vps.quanganh.org"
EMAIL="quanganh@example.com" # Email để nhận thông báo (tùy chọn)

echo "🔒 Installing Let's Encrypt SSL for $DOMAIN..."

# 1. Ensure Certbot is installed
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# 2. Obtain Certificate
# --non-interactive: Chạy tự động không hỏi
# --agree-tos: Đồng ý điều khoản
# --redirect: Tự động chuyển HTTP sang HTTPS
echo "🚀 Requesting Certificate..."
sudo certbot --nginx --non-interactive --agree-tos --email $EMAIL -d $DOMAIN --redirect

# 3. Reload Nginx
sudo systemctl reload nginx

echo "✅ SSL Installed Successfully!"
echo "👉 API is now secure at: https://$DOMAIN/api"
