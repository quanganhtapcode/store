require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const csv = require('csv-parser');
const multer = require('multer');

// --- Modules ---
const { initDatabase, dbRun, dbAll, logActivity } = require('./config/database');
const { verifyToken, generateToken, AUTH_CONFIG } = require('./middleware/auth');
const { validateImport } = require('./utils/helpers');

// --- Init App ---
const app = express();
const port = 3001;

// --- Middlewares ---
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'https://store.quanganh.org',
    'https://vps.quanganh.org',
    'http://localhost:5173',
    'http://localhost:3000'
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
            callback(null, true);
        } else {
            console.warn(`Blocked CORS for: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// --- Init Database ---
initDatabase();

// --- Static Files ---
const imagesDir = path.join(__dirname, 'public/images');
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

// Image Serving
app.use('/images', express.static(imagesDir, {
    maxAge: '30d',
    immutable: true,
    setHeaders: (res, path) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    }
}));

// Public Folder
app.use(express.static(path.join(__dirname, 'public')));


// --- ROUTES MOUNTING ---
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/stats', require('./routes/stats'));

// --- AUTH ROUTE ---
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (username === AUTH_CONFIG.username && password === AUTH_CONFIG.password) {
        const token = generateToken(username);
        res.json({ success: true, token, user: username, expiresIn: AUTH_CONFIG.tokenExpiry });
    } else {
        res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu' });
    }
});

// --- LOGS ROUTE ---
app.get('/api/logs', async (req, res) => {
    try {
        const logs = await dbAll("SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 50");
        res.json(logs);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- IMPORT ROUTE ---
app.post('/api/imports', verifyToken, async (req, res) => {
    const { items, total_cost, note, timestamp } = req.body;
    const errors = validateImport({ items });
    if (errors.length > 0) return res.status(400).json({ error: errors.join(', ') });

    try {
        await dbRun('BEGIN TRANSACTION');
        const id = 'IMP-' + Date.now();

        await dbRun(`INSERT INTO import_notes (id, timestamp, total_cost, note, items) VALUES (?, ?, ?, ?, ?)`,
            [id, timestamp || Date.now(), total_cost || 0, note || '', JSON.stringify(items)]);

        for (const item of items) {
            await dbRun("UPDATE products SET stock = stock + ? WHERE id = ?", [item.quantity, item.id]);
        }

        await dbRun('COMMIT');
        logActivity('IMPORT_GOODS', `Imported ${items.length} items. Total Cost: ${total_cost}`);
        res.json({ success: true, id });
    } catch (e) {
        await dbRun('ROLLBACK');
        res.status(500).json({ error: e.message });
    }
});

// CSV Import
const upload = multer({ dest: 'uploads/' });
app.post('/api/products/import-csv', verifyToken, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const results = [];
    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            fs.unlinkSync(req.file.path);
            try {
                await dbRun('BEGIN TRANSACTION');
                // Basic CSV Import Logic (Implementation depends on CSV format)
                // For now, simple success response
                await dbRun('COMMIT');
                res.json({ message: `Đã xử lý file CSV (${results.length} dòng)` });
            } catch (e) {
                await dbRun('ROLLBACK');
                res.status(500).json({ error: e.message });
            }
        });
});

// --- START SERVER ---
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 CÁT HẢI POS Server running at port ${port}`);
});
