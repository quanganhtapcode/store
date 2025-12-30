const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3001;

// --- CORS Configuration ---
const allowedOrigins = [
    'https://store-six-fawn.vercel.app',
    'https://store-git-main-quanganhtapcodes-projects.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.some(o => origin.startsWith(o)) || origin.includes('vercel.app')) {
            callback(null, true);
        } else {
            console.log('Blocked by CORS:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

const dbPath = path.join(__dirname, 'pos.db');
const db = new sqlite3.Database(dbPath);

// --- Helpers ---
const logActivity = (action, details) => {
    const timestamp = Date.now();
    db.run(`INSERT INTO activity_logs (action, details, timestamp) VALUES (?, ?, ?)`, [action, details, timestamp]);
};

// --- Database Initialization & Migration ---
db.serialize(() => {
    // 1. Table Products
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
        image TEXT
    )`);

    // 2. Table Orders (Enhanced)
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        total INTEGER,
        timestamp INTEGER,
        items TEXT,
        customer_name TEXT,
        payment_method TEXT, -- 'cash', 'transfer'
        status TEXT, -- 'completed', 'cancelled'
        note TEXT
    )`);

    // 2.1 Migration: Add missing columns to orders if they don't exist
    const ensureColumn = (table, column, type) => {
        db.all(`PRAGMA table_info(${table})`, (err, rows) => {
            if (!rows.some(r => r.name === column)) {
                console.log(`Migrating: Adding ${column} to ${table}`);
                db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
            }
        });
    };
    ensureColumn('orders', 'customer_name', 'TEXT');
    ensureColumn('orders', 'payment_method', 'TEXT');
    ensureColumn('orders', 'status', 'TEXT');
    ensureColumn('orders', 'note', 'TEXT');

    // 3. Table Activity Logs
    db.run(`CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT,
        details TEXT,
        timestamp INTEGER
    )`);

    // Import CSV loop logic (Keep existing logic)
    db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
        if (row && row.count === 0) {
            const csvPath = path.join(__dirname, 'san_pham_2025-12-30.csv');
            if (fs.existsSync(csvPath)) {
                fs.createReadStream(csvPath)
                    .pipe(csv())
                    .on('data', (data) => {
                        const id = data['Mã sản phẩm'];
                        if (!id) return;
                        const name = data['Tên sản phẩm'];
                        const brand = data['Thương hiệu'] || '';
                        const category = data['Danh mục'] || '';
                        const price = parseInt(data['Giá lẻ (VND)']) || 0;
                        const case_price = parseInt(data['Giá thùng (VND)']) || 0;
                        const units_per_case = parseInt(data['Số lượng/thùng']) || 1;
                        const stock = 100;
                        const code = data['Mã sản phẩm'];
                        const image = data['Hình ảnh'] || '';

                        db.run(`INSERT INTO products (id, name, brand, category, price, case_price, units_per_case, stock, code, image) 
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [id, name, brand, category, price, case_price, units_per_case, stock, code, image]);
                    });
                logActivity('SYSTEM_IMPORT', 'Imported initial products from CSV');
            }
        }
    });
});

// --- API Endpoints ---

// 1. Products
app.get('/api/products', (req, res) => {
    db.all("SELECT * FROM products", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/products', (req, res) => {
    const { name, brand, category, price, case_price, units_per_case, stock, code, image } = req.body;
    const id = `PROD-${Date.now()}`;
    db.run(`INSERT INTO products (id, name, brand, category, price, case_price, units_per_case, stock, code, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, name, brand || '', category || '', price, case_price || 0, units_per_case || 1, stock || 0, code || '', image || ''],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            logActivity('ADD_PRODUCT', `Added product: ${name}`);
            res.json({ id, success: true });
        }
    );
});

app.put('/api/products/:id', (req, res) => {
    const { id } = req.params;
    const { name, brand, category, price, case_price, units_per_case, stock, code, image } = req.body;
    db.run(`UPDATE products SET name=?, brand=?, category=?, price=?, case_price=?, units_per_case=?, stock=?, code=?, image=? WHERE id=?`,
        [name, brand, category, price, case_price, units_per_case, stock, code, image, id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            logActivity('UPDATE_PRODUCT', `Updated product: ${name} (${id})`);
            res.json({ updated: this.changes });
        }
    );
});

app.delete('/api/products/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM products WHERE id=?`, [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        logActivity('DELETE_PRODUCT', `Deleted product ID: ${id}`);
        res.json({ deleted: this.changes });
    });
});

// 2. Orders (Enhanced with Filter & Update)
app.get('/api/orders', (req, res) => {
    const { startDate, endDate } = req.query;
    let query = "SELECT * FROM orders";
    let params = [];

    if (startDate && endDate) {
        // Assume format YYYY-MM-DD
        const start = new Date(startDate).setHours(0, 0, 0, 0);
        const end = new Date(endDate).setHours(23, 59, 59, 999);
        query += " WHERE timestamp BETWEEN ? AND ?";
        params = [start, end];
    }

    query += " ORDER BY timestamp DESC";

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const processedRows = rows.map(r => ({
            ...r,
            items: JSON.parse(r.items || '[]')
        }));
        res.json(processedRows);
    });
});

app.post('/api/orders', (req, res) => {
    const { total, items, timestamp, customer_name, payment_method, note } = req.body;
    const itemsStr = JSON.stringify(items);

    db.run(`INSERT INTO orders (total, timestamp, items, customer_name, payment_method, status, note) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [total, timestamp, itemsStr, customer_name || 'Khách lẻ', payment_method || 'cash', 'completed', note || ''],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });

            // Update stock
            const updatePromises = items.map(item => {
                const qty = item.saleType === 'case' ? (item.quantity * item.units_per_case) : item.quantity;
                return new Promise((resolve) => {
                    db.run(`UPDATE products SET stock = stock - ? WHERE id = ?`, [qty, item.id], resolve);
                });
            });

            Promise.all(updatePromises).then(() => {
                logActivity('CREATE_ORDER', `Created Order #${this.lastID} - Total: ${total}`);
                res.json({ id: this.lastID });
            });
        });
});

app.put('/api/orders/:id', (req, res) => {
    const { id } = req.params;
    const { customer_name, payment_method, note, status, total, items } = req.body;

    // Logic updates could be complex (restocking if cancelled). 
    // For now, simple update of fields.
    let sql = `UPDATE orders SET customer_name=?, payment_method=?, note=?`;
    let params = [customer_name, payment_method, note];

    if (status) {
        sql += `, status=?`;
        params.push(status);
    }
    if (total && items) {
        sql += `, total=?, items=?`;
        params.push(total);
        params.push(JSON.stringify(items));
    }

    sql += ` WHERE id=?`;
    params.push(id);

    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        logActivity('UPDATE_ORDER', `Updated Order #${id}`);
        res.json({ updated: this.changes });
    });
});

// 3. Activity Logs
app.get('/api/logs', (req, res) => {
    db.all("SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 100", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.listen(port, () => {
    console.log(`🚀 Enhanced API running at port ${port}`);
});
