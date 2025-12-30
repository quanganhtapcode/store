const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const https = require('https');

const app = express();
const port = 3001;

// --- Middlewares ---
app.use(cors({ origin: '*', credentials: true })); // Allow all origins explicitly to fix CORS issues on Vercel
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// --- Static Image Serving (Tối ưu tốc độ) ---
const imagesDir = path.join(__dirname, 'public/images');
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
app.use('/images', express.static(imagesDir));

// Served via /images from public/images
// Structure will be: /images/original/..., /images/grid/..., /images/detail/...

const dbPath = path.join(__dirname, 'pos.db');
const db = new sqlite3.Database(dbPath);

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

    // 4. IMPORT NOTES (Phiếu nhập hàng - Chuyên nghiệp)
    db.run(`CREATE TABLE IF NOT EXISTS import_notes (
        id TEXT PRIMARY KEY,
        timestamp INTEGER,
        total_cost INTEGER,
        note TEXT,
        items TEXT -- JSON list of imported items
    )`);

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

// --- APIs ---

// PRODUCTS
app.get('/api/products', (req, res) => {
    // Sắp xếp theo bán chạy (total_sold) để hiển thị Thịnh hành
    db.all("SELECT * FROM products ORDER BY total_sold DESC, name ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err });
        res.json(rows);
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

app.post('/api/products', (req, res) => {
    const p = req.body;
    const id = generateId('PRD'); // ID Chuyên nghiệp 10 ký tự
    db.run(`INSERT INTO products (id, name, brand, category, price, case_price, units_per_case, stock, code, image, total_sold) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [id, p.name, p.brand, p.category, p.price, p.case_price, p.units_per_case, p.stock, p.code, p.image],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            logActivity('ADD_PRODUCT', `Added ${p.name}`);
            res.json({ id, success: true });
        }
    );
});

// ORDERS
app.post('/api/orders', (req, res) => {
    const { total, items, timestamp, customer_name, payment_method, note } = req.body;

    // Tạo mã đơn hàng chuyên nghiệp
    db.get("SELECT COUNT(*) as count FROM orders", (err, row) => {
        const orderCode = generateOrderCode((row?.count || 0) + 1);
        const itemsStr = JSON.stringify(items);

        db.run(`INSERT INTO orders (order_code, total, timestamp, items, customer_name, payment_method, status, note) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [orderCode, total, timestamp, itemsStr, customer_name || 'Khách lẻ', payment_method || 'cash', 'completed', note || ''],
            function (err) {
                if (err) return res.status(500).json({ error: err.message });

                // Trừ kho & Tăng lượt bán (Trending logic)
                items.forEach(item => {
                    const qty = item.saleType === 'case' ? (item.quantity * item.units_per_case) : item.quantity;
                    // Logic update thông minh: Giảm tồn kho, Tăng đã bán
                    db.run(`UPDATE products SET stock = stock - ?, total_sold = total_sold + ? WHERE id = ?`,
                        [qty, qty, item.id]);
                });

                logActivity('CREATE_ORDER', `New Order ${orderCode} - ${total}đ`);
                res.json({ id: this.lastID, order_code: orderCode });
            });
    });
});

// STATS (Thống kê cho Admin)
app.get('/api/stats', (req, res) => {
    const today = new Date().setHours(0, 0, 0, 0);
    const firstDayOfMonth = new Date(new Date().setDate(1)).setHours(0, 0, 0, 0);

    db.serialize(() => {
        const result = {};

        // Doanh thu hôm nay
        db.all("SELECT total FROM orders WHERE timestamp >= ?", [today], (e, r) => {
            result.todayRevenue = r.reduce((ack, x) => ack + x.total, 0);
            result.todayOrders = r.length;

            // Doanh thu tháng
            db.all("SELECT total FROM orders WHERE timestamp >= ?", [firstDayOfMonth], (e2, r2) => {
                result.monthRevenue = r2.reduce((ack, x) => ack + x.total, 0);

                // Top sản phẩm bán chạy
                db.all("SELECT name, total_sold FROM products ORDER BY total_sold DESC LIMIT 5", (e3, r3) => {
                    result.topProducts = r3;
                    res.json(result);
                });
            });
        });
    });
});

// IMPORT (Nhập hàng)
app.post('/api/imports', (req, res) => {
    const { items, total_cost, note } = req.body;
    const id = generateId('IMP');
    const timestamp = Date.now();

    db.run(`INSERT INTO import_notes (id, timestamp, total_cost, note, items) VALUES (?, ?, ?, ?, ?)`,
        [id, timestamp, total_cost, note, JSON.stringify(items)],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });

            // Tăng số lượng tồn kho
            items.forEach(item => {
                db.run(`UPDATE products SET stock = stock + ? WHERE id = ?`, [item.quantity, item.id]);
            });

            logActivity('IMPORT_STOCK', `Imported Stock ${id} - ${total_cost}đ`);
            res.json({ success: true, id });
        }
    );
});

app.listen(port, () => {
    console.log(`🚀 Professional Retail Server running at port ${port}`);
});
