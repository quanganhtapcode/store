#!/bin/bash

# =====================================================
# Gemini POS - Full Deployment Script
# =====================================================
# Sử dụng: ./scripts/deploy.sh [option]
# Options:
#   all      - Deploy cả GitHub + VPS (default)
#   github   - Chỉ push GitHub (Frontend auto deploy qua Vercel)
#   vps      - Chỉ deploy Backend lên VPS
#   images   - Chỉ sync images lên VPS
# =====================================================

set -e

# ============== CONFIGURATION ==============
VPS_IP="203.55.176.10"
VPS_USER="root"
KEY_PATH="$HOME/Desktop/key.pem"
REMOTE_PATH="/root/gemini-pos-api"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# ============== FUNCTIONS ==============

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  🚀 Gemini POS - Deployment Script${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

deploy_github() {
    echo -e "${YELLOW}📤 Pushing to GitHub...${NC}"
    echo ""
    
    # Add all changes
    git add .
    
    # Get commit message
    echo -e "${GREEN}Enter commit message (or press Enter for default):${NC}"
    read -r commit_msg
    
    if [ -z "$commit_msg" ]; then
        commit_msg="Update: $(date '+%Y-%m-%d %H:%M')"
    fi
    
    # Commit and push
    git commit -m "$commit_msg" || echo "Nothing to commit"
    git push origin main
    
    echo ""
    echo -e "${GREEN}✅ GitHub push completed!${NC}"
    echo -e "${GREEN}   → Vercel will auto-deploy frontend${NC}"
    echo ""
}

deploy_vps() {
    echo -e "${YELLOW}📤 Deploying Backend to VPS...${NC}"
    echo ""
    
    # Files to sync
    echo -e "${BLUE}Syncing backend files...${NC}"
    
    scp -i "$KEY_PATH" "$PROJECT_DIR/backend/server.cjs" "$VPS_USER@$VPS_IP:$REMOTE_PATH/"
    echo -e "   ${GREEN}✅ server.cjs${NC}"
    
    scp -i "$KEY_PATH" "$PROJECT_DIR/backend/package.json" "$VPS_USER@$VPS_IP:$REMOTE_PATH/"
    echo -e "   ${GREEN}✅ package.json${NC}"
    
    # SSH to restart server
    echo ""
    echo -e "${BLUE}Restarting server...${NC}"
    
    ssh -i "$KEY_PATH" "$VPS_USER@$VPS_IP" << 'ENDSSH'
cd /root/gemini-pos-api

# Create directories if needed
mkdir -p database
mkdir -p public/images

# Install dependencies
npm install --production 2>/dev/null || true

# Restart PM2
pm2 restart gemini-pos 2>/dev/null || pm2 start server.cjs --name gemini-pos
pm2 save

echo ""
echo "✅ Server restarted!"
pm2 status gemini-pos
ENDSSH

    echo ""
    echo -e "${GREEN}✅ VPS deployment completed!${NC}"
    echo ""
}

sync_images() {
    echo -e "${YELLOW}📤 Syncing images to VPS...${NC}"
    echo ""
    
    # Count images
    local img_count=$(ls -1 "$PROJECT_DIR/backend/public/images/"*.jpg 2>/dev/null | wc -l)
    echo -e "${BLUE}Found $img_count images to sync${NC}"
    
    # Sync using rsync for efficiency
    rsync -avz --progress -e "ssh -i $KEY_PATH" \
        "$PROJECT_DIR/backend/public/images/" \
        "$VPS_USER@$VPS_IP:$REMOTE_PATH/public/images/"
    
    echo ""
    echo -e "${GREEN}✅ Images synced!${NC}"
    echo ""
}

sync_database() {
    echo -e "${YELLOW}⚠️  Database Sync${NC}"
    echo -e "${RED}WARNING: This will OVERWRITE the remote database!${NC}"
    echo ""
    read -p "Are you sure? (type 'yes' to confirm): " confirm
    
    if [ "$confirm" = "yes" ]; then
        scp -i "$KEY_PATH" "$PROJECT_DIR/database/pos.db" "$VPS_USER@$VPS_IP:$REMOTE_PATH/database/"
        echo -e "${GREEN}✅ Database synced!${NC}"
    else
        echo -e "${YELLOW}⏭️  Skipped database sync${NC}"
    fi
}

show_status() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━ Deployment URLs ━━━━━━━━━━━━━${NC}"
    echo -e "  🌐 Frontend: ${GREEN}https://store-six-fawn.vercel.app${NC}"
    echo -e "  🔌 API:      ${GREEN}https://vps.quanganh.org/api${NC}"
    echo -e "  🖼️  Images:   ${GREEN}https://vps.quanganh.org/images/PRD-XXXXXX.jpg${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# ============== MAIN ==============

print_header

case "${1:-all}" in
    github)
        deploy_github
        ;;
    vps)
        deploy_vps
        ;;
    images)
        sync_images
        ;;
    db|database)
        sync_database
        ;;
    all)
        deploy_github
        deploy_vps
        ;;
    *)
        echo "Usage: $0 [all|github|vps|images|db]"
        exit 1
        ;;
esac

show_status
