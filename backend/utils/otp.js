const { authenticator } = require('otplib');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

const SECRET_FILE = path.join(__dirname, '../config/2fa_secret.key');

// Load or Generate Secret
const getSecret = () => {
    if (fs.existsSync(SECRET_FILE)) {
        return fs.readFileSync(SECRET_FILE, 'utf-8').trim();
    }
    // Generate new secret
    const secret = authenticator.generateSecret();
    fs.writeFileSync(SECRET_FILE, secret);
    return secret;
};

// Verify Token
const verifyOTP = (token) => {
    const secret = getSecret();
    try {
        return authenticator.verify({ token, secret });
    } catch (err) {
        console.error("OTP Verify Error:", err);
        return false;
    }
};

// Get QR Code Data URL for Setup
const getQRCode = async (user = 'Admin', service = 'CatHaiPOS') => {
    const secret = getSecret();
    const otpauth = authenticator.keyuri(user, service, secret);
    return await qrcode.toDataURL(otpauth);
};

module.exports = { verifyOTP, getQRCode };
