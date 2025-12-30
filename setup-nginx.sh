#!/bin/bash

# Configuration
DOMAIN="vps.quanganh.org"
APP_PORT=3001

echo "🚀 Setting up Nginx for $DOMAIN..."

# 1. Install Nginx
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

# 2. Setup Firewall
echo "🔥 Opening Ports 80 and 443..."
sudo ufw allow 'Nginx Full'
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 3. Create Nginx Config
echo "📝 Creating Nginx Configuration..."
sudo tee /etc/nginx/sites-available/gemini-pos <<EOF
server {
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        
        # IP forwarding headers
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOF

# 4. Enable Site
sudo ln -sf /etc/nginx/sites-available/gemini-pos /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 5. Fix Database Permissions (Crucial for SQLite)
echo "🔧 Fixing Database Permissions..."
cd ~/gemini-pos-api
sudo chown -R $USER:$USER .
chmod 664 pos.db
chmod 775 .

echo "✅ Setup Complete!"
echo "👉 Now configure SSL:"
echo "   Method A (Cloudflare Flexible/Full): Already works on http://$DOMAIN (Cloudflare handles HTTPS)"
echo "   Method B (Real SSL on VPS): Run 'sudo certbot --nginx -d $DOMAIN'"
