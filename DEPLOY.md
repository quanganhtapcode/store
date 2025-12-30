# Deploy Backend lên VPS
scp -i "C:\Users\PC\Downloads\jp.pem" server.js san_pham_2025-12-30.csv deploy-vps.sh azureuser@20.18.160.76:~/gemini-pos-api/

# SSH vào VPS và chạy deployment script
ssh -i "C:\Users\PC\Downloads\jp.pem" azureuser@20.18.160.76 "cd ~/gemini-pos-api && chmod +x deploy-vps.sh && ./deploy-vps.sh"

# Sau khi deploy xong, API sẽ chạy tại: http://20.18.160.76:3001/api
