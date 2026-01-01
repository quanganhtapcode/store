const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const app = express();
const port = 3001;

// --- Authentication Config ---
const AUTH_CONFIG = {
    // Default credentials (should be overridden by environment variables)
    // Default credentials (should be overridden by environment variables)
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'gemini2024',
    // Secret key for token generation
    secretKey: process.env.SECRET_KEY || 'gemini-pos-secret-key-2024',
    // Token expiry (24 hours in milliseconds)
    tokenExpiry: 24 * 60 * 60 * 1000
};

// Simple token storage (in production, use Redis or database)
const activeTokens = new Map();

// --- Generate Auth Token ---
const generateToken = (username) => {
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = Date.now() + AUTH_CONFIG.tokenExpiry;
    activeTokens.set(token, { username, expiry });
    return token;
};

// --- Verify Token Middleware ---
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

// --- Middlewares ---
// Cho phép CORS từ biến môi trường (an toàn hơn)
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// --- Static Image Serving (Tối ưu tốc độ + Cache) ---
const imagesDir = path.join(__dirname, 'public/images');
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

// Cache images for 30 days (immutable since image content rarely changes)
app.use('/images', express.static(imagesDir, {
    maxAge: '30d',           // Cache 30 ngày
    etag: true,              // Enable ETag for validation
    lastModified: true,      // Enable Last-Modified header
    immutable: true          // Tell browser: this file won't change
}));

// Also serve public folder with caching
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '7d'
}));

// Structure: /images/original/..., /images/grid/..., /images/detail/...

// --- Database Path (Flexible for local dev and VPS) ---
const getDbPath = () => {
    const possiblePaths = [
        path.join(__dirname, '../database/pos.db'),  // Local: gemini-pos/backend/../database/
        path.join(__dirname, 'database/pos.db'),     // VPS: gemini-pos-api/database/
        path.join(__dirname, 'pos.db'),              // VPS fallback: gemini-pos-api/pos.db
    ];

    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            console.log(`📂 Database found at: ${p}`);
            return p;
        }
    }

    // Default to first path (will create new db)
    const defaultPath = possiblePaths[1]; // VPS path
    console.log(`📂 Creating new database at: ${defaultPath}`);

    // Ensure directory exists
    const dir = path.dirname(defaultPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    return defaultPath;
};

const dbPath = getDbPath();
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Database opening error:', err);
    } else {
        console.log('✅ Connected to SQLite database.');
        // WAL Mode for generic performance
        db.run("PRAGMA journal_mode = WAL;");
    }
});

// --- Promisify Database for async/await support ---
const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
};

const dbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// --- Input Validation Helpers ---
const validateProduct = (data) => {
    const errors = [];

    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
        errors.push('Tên sản phẩm không được để trống');
    }
    if (data.price !== undefined && (isNaN(data.price) || data.price < 0)) {
        errors.push('Giá phải là số dương');
    }
    if (data.stock !== undefined && (isNaN(data.stock) || data.stock < 0)) {
        errors.push('Số lượng tồn kho không được âm');
    }
    if (data.case_price !== undefined && (isNaN(data.case_price) || data.case_price < 0)) {
        errors.push('Giá thùng phải là số dương');
    }
    if (data.units_per_case !== undefined && (isNaN(data.units_per_case) || data.units_per_case < 1)) {
        errors.push('Số lượng/thùng phải >= 1');
    }

    return errors;
};

const validateOrder = (data) => {
    const errors = [];

    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
        errors.push('Đơn hàng phải có ít nhất 1 sản phẩm');
    }
    if (data.total !== undefined && (isNaN(data.total) || data.total < 0)) {
        errors.push('Tổng tiền không hợp lệ');
    }

    // Validate each item
    if (data.items && Array.isArray(data.items)) {
        data.items.forEach((item, idx) => {
            if (!item.id) errors.push(`Sản phẩm ${idx + 1} thiếu ID`);
            if (!item.quantity || item.quantity < 1) errors.push(`Sản phẩm ${idx + 1} số lượng không hợp lệ`);
        });
    }

    return errors;
};

const validateImport = (data) => {
    const errors = [];

    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
        errors.push('Phiếu nhập phải có ít nhất 1 sản phẩm');
    }
    if (data.total_cost !== undefined && (isNaN(data.total_cost) || data.total_cost < 0)) {
        errors.push('Tổng chi phí không hợp lệ');
    }

    return errors;
};

// --- Professional Helpers ---
const generateId = (prefix) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return `${prefix}-${result}`; // Total 10 chars (Ex: PRD-A1B2C3)
};

const generateOrderCode = (index) => {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const seq = String(index).padStart(4, '0');
    return `ORD-${date}-${seq}`;
};

const logActivity = (action, details) => {
    const timestamp = Date.now();
    db.run(`INSERT INTO activity_logs (action, details, timestamp) VALUES (?, ?, ?)`, [action, details, timestamp]);
};

// --- Database Init ---
db.serialize(() => {
    // 1. PRODUCTS (Thêm total_sold)
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT,
        brand TEXT,
        category TEXT,
        price INTEGER,
        case_price INTEGER,
        units_per_case INTEGER,
        stock INTEGER,
        code TEXT,
        image TEXT,
        total_sold INTEGER DEFAULT 0
    )`);

    // 2. ORDERS (Thêm order_code)
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_code TEXT,
        total INTEGER,
        timestamp INTEGER,
        items TEXT,
        customer_name TEXT,
        payment_method TEXT, 
        status TEXT,
        note TEXT
    )`);

    // 3. LOGS
    db.run(`CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT,
        details TEXT,
        timestamp INTEGER
    )`);

    // 4. IMPORT NOTES
    db.run(`CREATE TABLE IF NOT EXISTS import_notes (
        id TEXT PRIMARY KEY,
        timestamp INTEGER,
        total_cost INTEGER,
        note TEXT,
        items TEXT
    )`);

    // 5. ORDER ITEMS (Normalized Data for better stats)
    db.run(`CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        product_id TEXT,
        quantity INTEGER,
        price INTEGER,
        FOREIGN KEY(order_id) REFERENCES orders(id),
        FOREIGN KEY(product_id) REFERENCES products(id)
    )`);

    // Check migration
    db.get("SELECT COUNT(*) as count FROM order_items", (err, row) => {
        if (!err && row.count === 0) {
            // Run migration if empty
            // migrateOrderItems(); // Uncomment if you want automatic migration on start
        }
    });
});

// Helper Function: Migrate old JSON items to new table
const migrateOrderItems = () => {
    console.log("🔄 Starting Migration: JSON -> order_items...");
    db.all("SELECT id, items FROM orders", [], (err, rows) => {
        if (err) return console.error("Migration Read Error:", err);

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            const stmt = db.prepare("INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)");

            rows.forEach(order => {
                try {
                    const items = JSON.parse(order.items);
                    items.forEach(item => {
                        stmt.run(order.id, item.id, item.quantity, item.finalPrice || item.price);
                    });
                } catch (e) { /* ignore bad json */ }
            });

            stmt.finalize();
            db.run("COMMIT", (err) => {
                if (err) console.error("Migration Commit Error:", err);
                else console.log("✅ Migration Completed: All orders migrated to order_items table.");
            });
        });
    });
};

// Start migration 5 seconds after boot to not block initial requests 
setTimeout(migrateOrderItems, 5000);
// Migration logic (Safe column adding)
const addCol = (tbl, col, type) => {
    db.all(`PRAGMA table_info(${tbl})`, (e, r) => {
        if (!r.some(x => x.name === col)) {
            db.run(`ALTER TABLE ${tbl} ADD COLUMN ${col} ${type}`);
        }
    });
};
addCol('products', 'total_sold', 'INTEGER DEFAULT 0');
addCol('orders', 'order_code', 'TEXT');
});

// --- Image Download Utility ---
const downloadImage = (url, filename) => {
    return new Promise((resolve, reject) => {
        const filepath = path.join(imagesDir, filename);
        const file = fs.createWriteStream(filepath);
        https.get(url, response => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve(`/images/${filename}`);
            });
        }).on('error', err => {
            fs.unlink(filepath, () => { }); // Delete partial
            reject(err);
        });
    });
};

// --- Helper: Check if local image exists ---
const getLocalImagePath = (productId) => {
    const localPath = `/images/${productId}.jpg`;
    const fullPath = path.join(imagesDir, `${productId}.jpg`);
    return fs.existsSync(fullPath) ? localPath : null;
};

// ============================================
// --- AUTHENTICATION APIs ---
// ============================================

// Login
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    if (username === AUTH_CONFIG.username && password === AUTH_CONFIG.password) {
        const token = generateToken(username);
        console.log(`✅ Login successful: ${username}`);
        logActivity('LOGIN', `User ${username} logged in`);

        res.json({
            success: true,
            token,
            user: { username },
            expiresIn: AUTH_CONFIG.tokenExpiry
        });
    } else {
        console.log(`❌ Login failed: ${username}`);
        logActivity('LOGIN_FAILED', `Failed login attempt for ${username}`);
        res.status(401).json({ error: 'Invalid username or password' });
    }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        if (activeTokens.has(token)) {
            const user = activeTokens.get(token).username;
            activeTokens.delete(token);
            console.log(`✅ Logout: ${user}`);
            logActivity('LOGOUT', `User ${user} logged out`);
        }
    }

    res.json({ success: true, message: 'Logged out successfully' });
});

// Verify token (check if still valid)
app.get('/api/auth/verify', verifyToken, (req, res) => {
    res.json({
        valid: true,
        user: { username: req.user }
    });
});

// ============================================
// --- PUBLIC APIs (No auth required) ---
// ============================================

// PRODUCTS - Auto map local images if exist
app.get('/api/products', (req, res) => {
    db.all("SELECT * FROM products ORDER BY total_sold DESC, name ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err });
        // Auto map to local image if exists
        const result = rows.map(p => {
            const localImg = getLocalImagePath(p.id);
            return localImg ? { ...p, image: localImg } : p;
        });
        res.json(result);
    });
});

// Chức năng mới: Sync Images (Tải ảnh từ URL về server local)
app.post('/api/products/sync-images', async (req, res) => {
    db.all("SELECT id, image FROM products WHERE image LIKE 'http%'", [], async (err, rows) => {
        if (err) return res.json({ error: err.message });

        let count = 0;
        for (const row of rows) {
            try {
                const ext = path.extname(row.image) || '.jpg';
                const filename = `${row.id}${ext}`;
                const localPath = await downloadImage(row.image, filename);

                db.run("UPDATE products SET image = ? WHERE id = ?", [localPath, row.id]);
                count++;
            } catch (e) { console.error(`Failed to dl image for ${row.id}`, e); }
        }
        res.json({ processed: count });
    });
});

// --- Helper: Delete old images of a product (all extensions) ---
const deleteOldImages = (productId) => {
    const extensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    let deleted = [];

    extensions.forEach(ext => {
        const oldPath = path.join(imagesDir, `${productId}.${ext}`);
        if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
            deleted.push(`${productId}.${ext}`);
        }
    });

    if (deleted.length > 0) {
        console.log(`🗑️ Deleted old images: ${deleted.join(', ')}`);
    }

    return deleted;
};

// --- Image Config ---
const IMAGE_CONFIG = {
    maxSizeBytes: 5 * 1024 * 1024,  // 5MB max
    allowedFormats: ['jpeg', 'jpg', 'png', 'webp', 'gif'],
    outputFormat: 'jpg'              // Always save as JPG
};

// --- Helper: Save base64 image to file (IMPROVED) ---
const saveBase64Image = (base64Data, productId) => {
    if (!base64Data || !base64Data.startsWith('data:image')) return null;

    try {
        // Extract base64 content
        const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches) return null;

        const originalFormat = matches[1].toLowerCase();
        const data = matches[2];
        const buffer = Buffer.from(data, 'base64');

        // Check file size
        if (buffer.length > IMAGE_CONFIG.maxSizeBytes) {
            console.error(`❌ Image too large: ${(buffer.length / 1024 / 1024).toFixed(2)}MB (max: ${IMAGE_CONFIG.maxSizeBytes / 1024 / 1024}MB)`);
            return null;
        }

        // Check format
        if (!IMAGE_CONFIG.allowedFormats.includes(originalFormat)) {
            console.error(`❌ Invalid format: ${originalFormat}. Allowed: ${IMAGE_CONFIG.allowedFormats.join(', ')}`);
            return null;
        }

        // Delete old images first (all extensions)
        deleteOldImages(productId);

        // Always save as JPG for consistency
        const filename = `${productId}.${IMAGE_CONFIG.outputFormat}`;
        const filepath = path.join(imagesDir, filename);

        // Write file
        fs.writeFileSync(filepath, buffer);

        const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);
        console.log(`✅ Saved image: ${filename} (${sizeMB}MB, from ${originalFormat})`);

        return `/images/${filename}`;
    } catch (err) {
        console.error('Failed to save image:', err);
        return null;
    }
};

// ============================================
// --- PROTECTED APIs (Auth required) ---
// ============================================

// ADD PRODUCT (Protected)
app.post('/api/products', verifyToken, (req, res) => {
    const p = req.body;

    // Validation
    const errors = validateProduct(p);
    if (errors.length > 0) return res.status(400).json({ error: errors.join(', ') });

    const id = generateId('PRD'); // ID Chuyên nghiệp 10 ký tự

    // Auto save base64 image to file
    let imagePath = p.image;
    if (p.image && p.image.startsWith('data:image')) {
        const savedPath = saveBase64Image(p.image, id);
        if (savedPath) imagePath = savedPath;
    }

    db.run(`INSERT INTO products (id, name, brand, category, price, case_price, units_per_case, stock, code, image, total_sold) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, p.name, p.brand, p.category, p.price, p.case_price, p.units_per_case, p.stock, p.code, imagePath, 0],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            logActivity('ADD_PRODUCT', `Added ${p.name}`);
            res.json({ id, image: imagePath });
        }
    );
});

// ORDERS - With Transaction & Validation
app.post('/api/orders', async (req, res) => {
    const { total, items, timestamp, customer_name, payment_method, note } = req.body;

    // 1. Input Validation
    const errors = validateOrder({ total, items });
    if (errors.length > 0) {
        return res.status(400).json({ error: errors.join(', ') });
    }

    try {
        // 2. Begin Transaction
        await dbRun('BEGIN TRANSACTION');

        // 3. Generate order code
        const countResult = await dbGet("SELECT COUNT(*) as count FROM orders");
        const orderCode = generateOrderCode((countResult?.count || 0) + 1);
        const itemsStr = JSON.stringify(items);

        // 4. Insert order
        const orderResult = await dbRun(
            `INSERT INTO orders (order_code, total, timestamp, items, customer_name, payment_method, status, note) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [orderCode, total, timestamp || Date.now(), itemsStr, customer_name || 'Khách lẻ', payment_method || 'cash', 'completed', note || '']
        );
        const orderId = orderResult.lastID;

        // 5. Update stock & Insert order_items (within same transaction)
        for (const item of items) {
            const qty = item.saleType === 'case' ? (item.quantity * (item.units_per_case || 1)) : item.quantity;

            // Update Stock
            await dbRun(
                `UPDATE products SET stock = stock - ?, total_sold = total_sold + ? WHERE id = ?`,
                [qty, qty, item.id]
            );

            // Insert into order_items for normalized reporting
            await dbRun(
                `INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)`,
                [orderId, item.id, item.quantity, item.finalPrice || item.price || 0]
            );
        }

        // 6. Commit transaction
        await dbRun('COMMIT');

        logActivity('CREATE_ORDER', `New Order ${orderCode} - ${total}đ`);
        res.json({ id: orderResult.lastID, order_code: orderCode, success: true });

    } catch (error) {
        // Rollback on any error
        await dbRun('ROLLBACK').catch(() => { }); // Ignore rollback error
        console.error('Order Error:', error);
        res.status(500).json({ error: error.message || 'Lỗi tạo đơn hàng' });
    }
});

// STATS (Thống kê - Caching 5 minutes)
let statsCache = { data: null, expiry: 0 };

app.get('/api/stats', (req, res) => {
    // Return cached data if valid
    if (statsCache.data && Date.now() < statsCache.expiry) {
        return res.json(statsCache.data);
    }

    const today = new Date().setHours(0, 0, 0, 0);
    const firstDayOfMonth = new Date(new Date().setDate(1)).setHours(0, 0, 0, 0);

    db.serialize(() => {
        const result = {};

        // Doanh thu hôm nay
        db.all("SELECT total FROM orders WHERE timestamp >= ?", [today], (e, r) => {
            if (e) return res.status(500).json({ error: e.message });
            result.todayRevenue = r.reduce((ack, x) => ack + x.total, 0);
            result.todayOrders = r.length;

            // Doanh thu tháng
            db.all("SELECT total FROM orders WHERE timestamp >= ?", [firstDayOfMonth], (e2, r2) => {
                if (e2) return res.status(500).json({ error: e2.message });
                result.monthRevenue = r2.reduce((ack, x) => ack + x.total, 0);

                // Top sản phẩm bán chạy
                db.all("SELECT name, total_sold FROM products ORDER BY total_sold DESC LIMIT 5", (e3, r3) => {
                    if (e3) return res.status(500).json({ error: e3.message });
                    result.topProducts = r3;

                    // Update cache
                    statsCache = {
                        data: result,
                        expiry: Date.now() + 5 * 60 * 1000 // Cache for 5 mins
                    };

                    res.json(result);
                });
            });
        });
    });
});

// STATS DETAILED (Thống kê chi tiết sản phẩm tháng này)
app.get('/api/stats/monthly-products', (req, res) => {
    const firstDayOfMonth = new Date(new Date().setDate(1)).setHours(0, 0, 0, 0);

    // Lấy tất cả đơn hàng trong tháng
    db.all("SELECT items, timestamp FROM orders WHERE timestamp >= ?", [firstDayOfMonth], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const productStats = {};

        rows.forEach(order => {
            try {
                const items = JSON.parse(order.items);
                items.forEach(item => {
                    if (!productStats[item.id]) {
                        productStats[item.id] = {
                            id: item.id,
                            name: item.displayName || item.name,
                            image: item.image,
                            total_sold: 0,
                            revenue: 0,
                            cases_sold: 0
                        };
                    }

                    const p = productStats[item.id];
                    const qty = item.saleType === 'case' ? (item.quantity * (item.units_per_case || 1)) : item.quantity;
                    const revenue = (item.finalPrice || 0) * item.quantity;

                    p.total_sold += qty;
                    p.revenue += revenue;
                    if (item.saleType === 'case') p.cases_sold += item.quantity;
                });
            } catch (e) { /* ignore parse error */ }
        });

        // Convert to array and sort by revenue
        const result = Object.values(productStats).sort((a, b) => b.revenue - a.revenue);
        res.json(result);
    });
});


// GET ORDERS (Lấy danh sách đơn hàng - với Pagination)
app.get('/api/orders', (req, res) => {
    const { startDate, endDate, limit, offset } = req.query;

    // Default: 50 orders, offset 0
    const limitNum = Math.min(parseInt(limit) || 50, 200);  // Max 200
    const offsetNum = parseInt(offset) || 0;

    let baseQuery = "SELECT * FROM orders";
    let countQuery = "SELECT COUNT(*) as total FROM orders";
    let params = [];
    let whereClause = "";

    if (startDate && endDate) {
        whereClause = " WHERE timestamp >= ? AND timestamp <= ?";
        params = [new Date(startDate).getTime(), new Date(endDate).getTime()];
    }

    const orderByClause = " ORDER BY timestamp DESC";
    const paginationClause = ` LIMIT ${limitNum} OFFSET ${offsetNum}`;

    // Get total count first
    db.get(countQuery + whereClause, params, (err, countResult) => {
        if (err) return res.status(500).json({ error: err.message });

        const total = countResult?.total || 0;

        // Then get paginated results
        db.all(baseQuery + whereClause + orderByClause + paginationClause, params, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });

            // Return with pagination metadata
            res.json({
                data: rows,
                pagination: {
                    total,
                    limit: limitNum,
                    offset: offsetNum,
                    hasMore: offsetNum + rows.length < total
                }
            });
        });
    });
});

// GET SINGLE ORDER
app.get('/api/orders/:id', (req, res) => {
    const { id } = req.params;
    db.get("SELECT * FROM orders WHERE id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Order not found' });
        res.json(row);
    });
});

// DELETE ORDER (Protected - Hoàn lại kho)
app.delete('/api/orders/:id', verifyToken, async (req, res) => {
    const { id } = req.params;

    try {
        await dbRun('BEGIN TRANSACTION');

        // 1. Get order details to restore stock
        const order = await dbGet("SELECT items, order_code FROM orders WHERE id = ?", [id]);
        if (!order) {
            await dbRun('ROLLBACK');
            return res.status(404).json({ error: 'Order not found' });
        }

        const items = JSON.parse(order.items);

        // 2. Restore stock for each item
        for (const item of items) {
            const qty = item.saleType === 'case' ? (item.quantity * (item.units_per_case || 1)) : item.quantity;
            await dbRun(
                `UPDATE products SET stock = stock + ?, total_sold = total_sold - ? WHERE id = ?`,
                [qty, qty, item.id] // Cộng lại kho, Trừ đi đã bán
            );
        }

        // 3. Delete the order
        await dbRun("DELETE FROM orders WHERE id = ?", [id]);

        await dbRun('COMMIT');

        // Invalidate stats cache so it updates immediately
        statsCache = { data: null, expiry: 0 };

        logActivity('DELETE_ORDER', `Deleted Order ${order.order_code}`);
        res.json({ success: true, changes: this.changes });

    } catch (error) {
        await dbRun('ROLLBACK').catch(() => { });
        res.status(500).json({ error: error.message });
    }
});
app.put('/api/orders/:id', (req, res) => {
    const { id } = req.params;
    const { customer_name, payment_method, status, note, items, total } = req.body;

    // First get old order for logging
    db.get("SELECT * FROM orders WHERE id = ?", [id], (err, oldOrder) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!oldOrder) return res.status(404).json({ error: 'Order not found' });

        const oldItems = typeof oldOrder.items === 'string' ? JSON.parse(oldOrder.items) : oldOrder.items;
        const newItems = items || oldItems;
        const newTotal = total !== undefined ? total : oldOrder.total;
        const itemsStr = JSON.stringify(newItems);

        // Build update query
        db.run(`UPDATE orders SET 
                customer_name = ?, 
                payment_method = ?, 
                status = ?, 
                note = ?,
                items = ?,
                total = ?
                WHERE id = ?`,
            [
                customer_name || oldOrder.customer_name,
                payment_method || oldOrder.payment_method,
                status || oldOrder.status,
                note !== undefined ? note : oldOrder.note,
                itemsStr,
                newTotal,
                id
            ],
            function (err) {
                if (err) return res.status(500).json({ error: err.message });

                // Log detailed changes
                const changes = [];
                if (customer_name && customer_name !== oldOrder.customer_name) {
                    changes.push(`Tên KH: ${oldOrder.customer_name} → ${customer_name}`);
                }
                if (status && status !== oldOrder.status) {
                    changes.push(`Trạng thái: ${oldOrder.status} → ${status}`);
                }
                if (total !== undefined && total !== oldOrder.total) {
                    changes.push(`Tổng tiền: ${oldOrder.total?.toLocaleString()}đ → ${total?.toLocaleString()}đ`);
                }
                if (items && JSON.stringify(oldItems) !== JSON.stringify(items)) {
                    // Compare items
                    const oldCount = oldItems?.length || 0;
                    const newCount = items?.length || 0;
                    if (oldCount !== newCount) {
                        changes.push(`Số SP: ${oldCount} → ${newCount}`);
                    }
                    changes.push('Đã sửa chi tiết sản phẩm');
                }

                const logMessage = changes.length > 0
                    ? `Order #${id} (${oldOrder.order_code}): ${changes.join(', ')}`
                    : `Order #${id} (${oldOrder.order_code}): Đã cập nhật`;

                logActivity('UPDATE_ORDER', logMessage);

                res.json({
                    success: true,
                    changes: this.changes,
                    order: {
                        id,
                        order_code: oldOrder.order_code,
                        items: newItems,
                        total: newTotal,
                        customer_name: customer_name || oldOrder.customer_name,
                        payment_method: payment_method || oldOrder.payment_method,
                        status: status || oldOrder.status,
                        note: note !== undefined ? note : oldOrder.note
                    }
                });
            }
        );
    });
});

// GET LOGS (Nhật ký hoạt động)
app.get('/api/logs', (req, res) => {
    db.all("SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 100", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// UPDATE PRODUCT (Protected)
app.put('/api/products/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    const p = req.body;

    // Validation
    const errors = validateProduct(p);
    if (errors.length > 0) return res.status(400).json({ error: errors.join(', ') });

    // Auto save base64 image to file
    let imagePath = p.image;
    if (p.image && p.image.startsWith('data:image')) {
        const savedPath = saveBase64Image(p.image, id);
        if (savedPath) imagePath = savedPath;
    }

    db.run(`UPDATE products SET name = ?, brand = ?, category = ?, price = ?, case_price = ?, units_per_case = ?, stock = ?, code = ?, image = ? WHERE id = ?`,
        [p.name, p.brand, p.category, p.price, p.case_price, p.units_per_case, p.stock, p.code, imagePath, id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            logActivity('UPDATE_PRODUCT', `Updated ${p.name}`);
            res.json({ success: true, changes: this.changes, image: imagePath });
        }
    );
});

// DELETE PRODUCT (Protected)
app.delete('/api/products/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM products WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        logActivity('DELETE_PRODUCT', `Deleted product ${id}`);
        res.json({ success: true, changes: this.changes });
    });
});

// IMPORT (Nhập hàng - Protected Using Transaction)
app.post('/api/imports', verifyToken, async (req, res) => {
    const { items, total_cost, note } = req.body;

    const errors = validateImport(req.body);
    if (errors.length > 0) return res.status(400).json({ error: errors.join(', ') });

    const id = generateId('IMP');
    const timestamp = Date.now();

    try {
        await dbRun('BEGIN TRANSACTION');

        await dbRun(`INSERT INTO import_notes (id, timestamp, total_cost, note, items) VALUES (?, ?, ?, ?, ?)`,
            [id, timestamp, total_cost, note, JSON.stringify(items)]);

        // Tăng số lượng tồn kho
        for (const item of items) {
            await dbRun(`UPDATE products SET stock = stock + ? WHERE id = ?`, [item.quantity, item.id]);
        }

        await dbRun('COMMIT');

        logActivity('IMPORT_STOCK', `Imported Stock ${id} - ${total_cost}đ`);
        res.json({ success: true, id });

    } catch (err) {
        await dbRun('ROLLBACK').catch(() => { });
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`🚀 Professional Retail Server running at port ${port}`);
});
