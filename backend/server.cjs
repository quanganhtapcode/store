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
const { verifyToken, generateToken, deleteToken, AUTH_CONFIG } = require('./middleware/auth');
const { validateImport } = require('./utils/helpers');
const { verifyOTP, getQRCode } = require('./utils/otp');

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

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

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
app.use('/api/suppliers', require('./routes/suppliers'));

// Reports route (with DB init)
const reportsRoute = require('./routes/reports');
reportsRoute.initDB(dbAll, dbRun);
app.use('/api/reports', reportsRoute.router);

// --- AUTH ROUTE ---
// --- AUTH ROUTE ---
app.post('/api/auth/login', async (req, res) => {
    const { username, password, otp } = req.body;

    // Check Username
    if (username !== AUTH_CONFIG.username) {
        return res.status(401).json({ error: 'Tài khoản không đúng' });
    }

    let isAuthenticated = false;

    // Case 1: Password
    if (password && password === AUTH_CONFIG.password) {
        isAuthenticated = true;
    }
    // Case 2: OTP (2FA)
    else if (otp) {
        // Remove spaces if any
        const cleanOtp = otp.toString().replace(/\s/g, '');
        if (verifyOTP(cleanOtp)) {
            isAuthenticated = true;
        } else {
            return res.status(401).json({ error: 'Mã OTP sai hoặc hết hạn' });
        }
    }

    if (isAuthenticated) {
        const token = await generateToken(username);
        res.json({ success: true, token, user: username, expiresIn: AUTH_CONFIG.tokenExpiry });
    } else {
        res.status(401).json({ error: 'Sai mật khẩu' });
    }
});

// 2FA Setup (Get QR)
app.get('/api/auth/2fa/setup', verifyToken, async (req, res) => {
    try {
        const qrData = await getQRCode(AUTH_CONFIG.username);
        res.json({ qrCode: qrData });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Logout
app.post('/api/auth/logout', verifyToken, async (req, res) => {
    const token = req.headers.authorization.split(' ')[1];
    await deleteToken(token);
    res.json({ success: true });
});

// --- LOGS ROUTE ---
app.get('/api/logs', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 100000, 100000);
        const logs = await dbAll('SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT ?', [limit]);
        res.json(logs);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- IMPORT ROUTES ---
app.get('/api/imports', async (req, res) => {
    try {
        const imports = await dbAll("SELECT * FROM import_notes ORDER BY timestamp DESC LIMIT 100");
        res.json(imports);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- INVENTORY BATCHES ---
app.get('/api/inventory/batches', async (req, res) => {
    try {
        const batches = await dbAll(`
            SELECT ib.*, p.name as product_name, p.brand, p.price as sell_price
            FROM inventory_batches ib
            JOIN products p ON ib.product_id = p.id
            WHERE ib.remaining > 0
            ORDER BY ib.created_at ASC
        `);
        res.json(batches);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/inventory/batches/:productId', async (req, res) => {
    try {
        const batches = await dbAll(`
            SELECT ib.*, imp.note as import_note
            FROM inventory_batches ib
            LEFT JOIN import_notes imp ON ib.import_id = imp.id
            WHERE ib.product_id = ? AND ib.remaining > 0
            ORDER BY ib.created_at ASC
        `, [req.params.productId]);
        res.json(batches);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/imports', verifyToken, async (req, res) => {
    const { items, total_cost, note, timestamp, supplier_id } = req.body;
    const errors = validateImport({ items });
    if (errors.length > 0) return res.status(400).json({ error: errors.join(', ') });

    // Validate importPrice is provided for every item
    for (const item of items) {
        if (!item.importPrice || item.importPrice <= 0) {
            return res.status(400).json({ error: `Sản phẩm "${item.name}" chưa có giá nhập. Vui lòng nhập giá nhập cho tất cả sản phẩm.` });
        }
    }

    try {
        await dbRun('BEGIN TRANSACTION');
        const id = 'IMP-' + Date.now();
        const ts = timestamp || Date.now();

        await dbRun(`INSERT INTO import_notes (id, timestamp, total_cost, note, items, supplier_id) VALUES (?, ?, ?, ?, ?, ?)`,
            [id, ts, total_cost || 0, note || '', JSON.stringify(items), supplier_id || null]);

        for (const item of items) {
            // Update stock
            await dbRun("UPDATE products SET stock = stock + ? WHERE id = ?", [item.quantity, item.id]);
            // Update cost_price (latest import price as reference)
            await dbRun("UPDATE products SET cost_price = ? WHERE id = ?", [item.importPrice, item.id]);
            // Create inventory batch for FIFO tracking
            await dbRun(
                "INSERT INTO inventory_batches (product_id, import_id, quantity, remaining, cost_price, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                [item.id, id, item.quantity, item.quantity, item.importPrice, ts]
            );
        }

        await dbRun('COMMIT');
        logActivity('IMPORT_GOODS', `Imported ${items.length} items. Total Cost: ${total_cost}`);
        res.json({ success: true, id });
    } catch (e) {
        await dbRun('ROLLBACK');
        res.status(500).json({ error: e.message });
    }
});

// --- PROFIT ANALYSIS ---
app.get('/api/stats/profit-analysis', async (req, res) => {
    try {
        const thirtyDaysAgo = Date.now() - 30 * 86400000;

        // Get all products with cost & selling price
        const products = await dbAll("SELECT id, name, brand, price, cost_price, stock, total_sold FROM products");

        // Get 30-day sales per product with FIFO cost from order_items
        // Revenue uses effective price after distributing order-level discount proportionally
        const sales30d = await dbAll(`
            SELECT oi.product_id,
                   SUM(oi.quantity) as qty_sold,
                   SUM(oi.price * oi.quantity * CASE WHEN o.original_total > 0 THEN CAST(o.total AS REAL) / o.original_total ELSE 1.0 END) as revenue,
                   SUM(CASE WHEN oi.cost_price > 0 THEN oi.cost_price * oi.quantity ELSE 0 END) as total_cost_fifo,
                   SUM(CASE WHEN oi.cost_price > 0 THEN oi.quantity ELSE 0 END) as qty_with_cost
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE o.timestamp >= ?
            GROUP BY oi.product_id
        `, [thirtyDaysAgo]);

        const salesMap = {};
        sales30d.forEach(s => { salesMap[s.product_id] = s; });

        const analysis = products.map(p => {
            const s = salesMap[p.id] || { qty_sold: 0, revenue: 0, total_cost_fifo: 0, qty_with_cost: 0 };
            const sellPrice = p.price || 0;
            const fallbackCost = p.cost_price || 0;
            
            // Use FIFO cost from order_items where available, fallback for old orders
            const qtyWithoutCost = s.qty_sold - (s.qty_with_cost || 0);
            const totalCost = (s.total_cost_fifo || 0) + (qtyWithoutCost * fallbackCost);
            const avgCost = s.qty_sold > 0 ? Math.round(totalCost / s.qty_sold) : fallbackCost;
            
            const margin = sellPrice > 0 && avgCost > 0 ? ((sellPrice - avgCost) / sellPrice * 100) : 0;
            const profit30d = s.revenue - totalCost;
            const dailyAvgSales = s.qty_sold / 30;
            const daysOfStock = dailyAvgSales > 0 ? Math.round(p.stock / dailyAvgSales) : 999;

            return {
                id: p.id,
                name: p.name,
                brand: p.brand,
                sellPrice,
                costPrice: avgCost,
                margin: Math.round(margin * 10) / 10,
                stock: p.stock,
                sold30d: s.qty_sold,
                revenue30d: s.revenue,
                profit30d,
                dailyAvgSales: Math.round(dailyAvgSales * 10) / 10,
                daysOfStock,
            };
        }).filter(p => p.sold30d > 0);

        // Sort by profit descending
        analysis.sort((a, b) => b.profit30d - a.profit30d);

        res.json({
            products: analysis,
            summary: {
                totalRevenue30d: analysis.reduce((s, p) => s + p.revenue30d, 0),
                totalCost30d: analysis.reduce((s, p) => s + (p.revenue30d - p.profit30d), 0),
                totalProfit30d: analysis.reduce((s, p) => s + p.profit30d, 0),
                avgMargin: analysis.length > 0
                    ? Math.round(analysis.reduce((s, p) => s + p.margin, 0) / analysis.filter(p => p.margin > 0).length * 10) / 10
                    : 0,
            }
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- PURCHASE RECOMMENDATIONS ---
app.get('/api/stats/purchase-recommendations', async (req, res) => {
    try {
        const thirtyDaysAgo = Date.now() - 30 * 86400000;

        const products = await dbAll("SELECT id, name, brand, price, cost_price, stock FROM products");
        const sales30d = await dbAll(`
            SELECT oi.product_id, SUM(oi.quantity) as qty_sold
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE o.timestamp >= ?
            GROUP BY oi.product_id
        `, [thirtyDaysAgo]);

        const salesMap = {};
        sales30d.forEach(s => { salesMap[s.product_id] = s.qty_sold; });

        const recommendations = products.map(p => {
            const sold30d = salesMap[p.id] || 0;
            const dailyAvg = sold30d / 30;
            const targetDays = 14; // restock for 14 days
            const suggestedQty = Math.max(0, Math.ceil(dailyAvg * targetDays) - p.stock);
            const costPrice = p.cost_price || 0;
            const margin = p.price > 0 && costPrice > 0 ? ((p.price - costPrice) / p.price * 100) : 0;
            const urgency = p.stock <= 0 ? 'critical' : (p.stock <= dailyAvg * 3) ? 'high' : (p.stock <= dailyAvg * 7) ? 'medium' : 'low';

            return {
                id: p.id,
                name: p.name,
                brand: p.brand,
                stock: p.stock,
                sold30d,
                dailyAvg: Math.round(dailyAvg * 10) / 10,
                suggestedQty,
                estimatedCost: suggestedQty * costPrice,
                costPrice,
                sellPrice: p.price,
                margin: Math.round(margin * 10) / 10,
                urgency,
            };
        }).filter(r => r.suggestedQty > 0);

        // Sort by urgency then margin
        const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        recommendations.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency] || b.margin - a.margin);

        res.json(recommendations);
    } catch (e) { res.status(500).json({ error: e.message }); }
});


// UPDATE IMPORT (add invoice PDF link, note, etc.)
app.put('/api/imports/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { note, invoice_url } = req.body;

    try {
        // Check if invoice_url column exists, if not add it
        await dbRun("UPDATE import_notes SET note = ?, invoice_url = ? WHERE id = ?", [note || '', invoice_url || '', id]);
        res.json({ success: true });
    } catch (e) {
        // If invoice_url column doesn't exist, try without it
        try {
            await dbRun("UPDATE import_notes SET note = ? WHERE id = ?", [note || '', id]);
            res.json({ success: true, warning: 'invoice_url not saved' });
        } catch (e2) {
            res.status(500).json({ error: e2.message });
        }
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
    console.log(`🚀 Cát Hải Server running at port ${port}`);
});
