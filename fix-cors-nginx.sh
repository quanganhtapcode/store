#!/bin/bash

# Configuration
DOMAIN="vps.quanganh.org"
APP_PORT=3001

echo "🚀 Updating Nginx Config with CORS for $DOMAIN..."

# Create Nginx Config with explicit CORS support
sudo tee /etc/nginx/sites-available/gemini-pos <<EOF
server {
    server_name $DOMAIN;

    location / {
        # CORS Headers
        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' 'https://store-six-fawn.vercel.app';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
        
        # Proxy settings
        proxy_pass http://localhost:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        
        # Pass headers properly
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOF

# Restart Nginx
sudo nginx -t
sudo systemctl restart nginx
echo "✅ Nginx Updated with CORS support!"
