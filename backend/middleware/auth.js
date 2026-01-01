const crypto = require('crypto');

// Auth Configuration
const AUTH_CONFIG = {
    username: process.env.ADMIN_USERNAME || 'admin',
    // WARNING: Default credentials should be overridden in production using .env
    password: process.env.ADMIN_PASSWORD || 'gemini2024',
    secretKey: process.env.SECRET_KEY || 'gemini-pos-secret-key-2024',
    tokenExpiry: 24 * 60 * 60 * 1000 // 24 hours
};

// In-memory token storage (Use Redis in production for scalability)
const activeTokens = new Map();

// Generate Token
const generateToken = (username) => {
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = Date.now() + AUTH_CONFIG.tokenExpiry;
    activeTokens.set(token, { username, expiry });
    return token;
};

// Verify Token Middleware
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const tokenData = activeTokens.get(token);

    if (!tokenData) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    if (Date.now() > tokenData.expiry) {
        activeTokens.delete(token);
        return res.status(401).json({ error: 'Unauthorized: Token expired' });
    }

    req.user = tokenData.username;
    next();
};

module.exports = { AUTH_CONFIG, generateToken, verifyToken };
