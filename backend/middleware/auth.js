const crypto = require('crypto');

// Validate required environment variables
const requiredEnvVars = ['ADMIN_PASSWORD', 'SECRET_KEY'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
    console.error(`❌ FATAL: Missing required environment variables: ${missingVars.join(', ')}`);
    console.error('💡 Please set these in your .env file before starting the server.');
    process.exit(1);
}

// Auth Configuration
const AUTH_CONFIG = {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD,
    secretKey: process.env.SECRET_KEY,
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
