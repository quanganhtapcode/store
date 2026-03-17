const crypto = require('crypto');
const { dbRun, dbGet } = require('../config/database');

// Validate required environment variables
const requiredEnvVars = ['ADMIN_PASSWORD', 'SECRET_KEY'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
    console.error(`❌ FATAL: Missing required environment variables: ${missingVars.join(', ')}`);
    console.error('💡 Please set these in your .env file before starting the server.');
    process.exit(1);
}

const AUTH_CONFIG = {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD,
    secretKey: process.env.SECRET_KEY,
    tokenExpiry: 24 * 60 * 60 * 1000 // 24 hours
};

// Generate token and persist to DB
const generateToken = async (username) => {
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = Date.now() + AUTH_CONFIG.tokenExpiry;
    await dbRun(
        'INSERT INTO sessions (token, username, expiry, created_at) VALUES (?, ?, ?, ?)',
        [token, username, expiry, Date.now()]
    );
    return token;
};

// Delete a specific token (logout)
const deleteToken = async (token) => {
    await dbRun('DELETE FROM sessions WHERE token = ?', [token]);
};

// Purge expired sessions (call periodically)
const cleanupExpiredSessions = () => {
    dbRun('DELETE FROM sessions WHERE expiry < ?', [Date.now()])
        .catch(e => console.error('Session cleanup error:', e));
};

// Run cleanup every hour
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

// Verify Token Middleware
const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const session = await dbGet('SELECT * FROM sessions WHERE token = ?', [token]);
        if (!session) return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        if (Date.now() > session.expiry) {
            await dbRun('DELETE FROM sessions WHERE token = ?', [token]);
            return res.status(401).json({ error: 'Unauthorized: Token expired' });
        }
        req.user = session.username;
        next();
    } catch (e) {
        return res.status(500).json({ error: 'Auth error' });
    }
};

module.exports = { AUTH_CONFIG, generateToken, deleteToken, verifyToken };
