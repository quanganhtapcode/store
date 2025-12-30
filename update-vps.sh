#!/usr/bin/env bash

# ------------------------------------------------------------
# Deploy and synchronize the Gemini POS application to the VPS.
# ------------------------------------------------------------
# Usage:
#   ./update-vps.sh
# Ensure you have the SSH private key at ~/Desktop/key.pem and
# that the key has appropriate permissions (chmod 600).
# ------------------------------------------------------------

# Configuration
SSH_KEY="/mnt/c/Users/PC/Desktop/key.pem"
# The IP of your VPS
VPS_IP="10.66.66.1"
VPS_USER="root"
REMOTE_ROOT="/root/gemini-pos-api"   # Correct path found on server

# Local paths (relative to this script's location)
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
LOCAL_PROJECT="$SCRIPT_DIR"
LOCAL_IMAGES="$SCRIPT_DIR/public/images"

# Helper: ensure the SSH key exists
if [[ ! -f "$SSH_KEY" ]]; then
  echo "Error: SSH key not found at $SSH_KEY"
  exit 1
fi

# Fix for WSL/Windows permissions (SSH requires 600, but /mnt/c is 777)
TARGET_KEY="/tmp/deploy_key_$(date +%s)"
cp "$SSH_KEY" "$TARGET_KEY"
chmod 600 "$TARGET_KEY"
SSH_KEY="$TARGET_KEY"

# cleanup on exit
trap "rm -f $SSH_KEY" EXIT

# ------------------------------------------------------------
# Step 1: Sync the project source code (excluding node_modules and .git)
# ------------------------------------------------------------
rsync -avz -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
  --exclude "node_modules" \
  --exclude ".git" \
  --exclude "dist" \
  --exclude "images" \
  --exclude "public/images" \
  "$LOCAL_PROJECT/" "$VPS_USER@$VPS_IP:$REMOTE_ROOT/"

# ------------------------------------------------------------
# Step 2: Sync the optimized images directory (public/images)
# ------------------------------------------------------------
# The server serves images from the "public/images" folder.
REMOTE_IMAGES="$REMOTE_ROOT/public/images"
rsync -avz -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
  "$LOCAL_IMAGES/" "$VPS_USER@$VPS_IP:$REMOTE_IMAGES/"

# ------------------------------------------------------------
# Step 3: Install dependencies and restart the Node.js server
# ------------------------------------------------------------
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" <<'EOF'
  set -e
  cd "$REMOTE_ROOT"
  echo "Installing npm dependencies..."
  npm ci --production
  echo "Building frontend (Vite)..."
  npm run build
  echo "Restarting the server..."
  # If you use PM2, you can replace the following line with `pm2 restart app`
  pkill -f "node server.js" || true
  nohup node server.js > server.log 2>&1 &
  echo "Deployment complete."
EOF

# ------------------------------------------------------------
# Finished
# ------------------------------------------------------------
echo "All steps completed successfully."
