const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3001;

// Cấu hình CORS chặt chẽ
const allowedOrigins = [
    'https://store-six-fawn.vercel.app',
    'https://store-git-main-quanganhtapcodes-projects.vercel.app', // Vercel preview URLs
    'http://localhost:3000',
    'http://localhost:5173'
];

app.use(cors({
    origin: function (origin, callback) {
        // Cho phép request không có origin (như mobile apps hoặc curl)
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

// ... (Phần còn lại giữ nguyên như cũ)
// Initialize Database
db.serialize(() => {
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

    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        total INTEGER,
        timestamp INTEGER,
        items TEXT
    )`);

    // Import CSV loop logic...
    db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
        if (row && row.count === 0) {
            const csvPath = path.join(__dirname, 'san_pham_2025-12-30.csv');
            if (fs.existsSync(csvPath)) {
                fs.createReadStream(csvPath)
                    .pipe(csv())
                    .on('data', (data) => {
                        // ... import logic
                        const id = data['Mã sản phẩm'];
                        const name = data['Tên sản phẩm'];
                        const brand = data['Thương hiệu'];
                        const category = data['Danh mục'];
                        const price = parseInt(data['Giá lẻ (VND)']) || 0;
                        const case_price = parseInt(data['Giá thùng (VND)']) || 0;
                        const units_per_case = parseInt(data['Số lượng/thùng']) || 1;
                        const stock = 100;
                        const code = data['Mã sản phẩm'];
                        const image = data['Hình ảnh'];

                        db.run(`INSERT INTO products (id, name, brand, category, price, case_price, units_per_case, stock, code, image) 
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [id, name, brand, category, price, case_price, units_per_case, stock, code, image]);
                    });
            }
        }
    });
});

// APIs
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
            res.json({ updated: this.changes });
        }
    );
});

app.delete('/api/products/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM products WHERE id=?`, [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

app.get('/api/orders', (req, res) => {
    db.all("SELECT * FROM orders ORDER BY timestamp DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const processedRows = rows.map(r => ({ ...r, items: JSON.parse(r.items) }));
        res.json(processedRows);
    });
});

app.post('/api/orders', (req, res) => {
    const { total, items, timestamp } = req.body;
    const itemsStr = JSON.stringify(items);
    db.run(`INSERT INTO orders (total, timestamp, items) VALUES (?, ?, ?)`, [total, timestamp, itemsStr], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        // Update stock logic...
        const updatePromises = items.map(item => {
            const qty = item.saleType === 'case' ? (item.quantity * item.units_per_case) : item.quantity;
            return new Promise((resolve) => {
                db.run(`UPDATE products SET stock = stock - ? WHERE id = ?`, [qty, item.id], resolve);
            });
        });
        Promise.all(updatePromises).then(() => res.json({ id: this.lastID }));
    });
});

app.listen(port, () => {
    console.log(`🚀 API running at port ${port}`);
});
