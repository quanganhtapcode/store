#!/bin/bash

# Gemini POS Backend Deployment Script for VPS

echo "🚀 Deploying Gemini POS Backend to VPS..."

# Update system
echo "📦 Updating system packages..."
sudo apt update

# Install Node.js if not installed
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# Install PM2 globally if not installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    sudo npm install -g pm2
fi

# Create app directory
mkdir -p ~/gemini-pos-api
cd ~/gemini-pos-api

# Install dependencies
echo "📦 Installing dependencies..."
npm install express sqlite3 cors body-parser csv-parser

# Start app with PM2
echo "🚀 Starting application with PM2..."
pm2 stop gemini-pos-api 2>/dev/null || true
pm2 delete gemini-pos-api 2>/dev/null || true
pm2 start server.js --name gemini-pos-api
pm2 save
pm2 startup

# Setup firewall
echo "🔥 Configuring firewall..."
sudo ufw allow 3001/tcp

echo "✅ Backend deployed successfully!"
echo "📍 API URL: http://$(curl -s ifconfig.me):3001/api"
echo "📊 Check status: pm2 status"
echo "📝 View logs: pm2 logs gemini-pos-api"
