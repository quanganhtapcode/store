const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // Support large base64 images
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

const dbPath = path.join(__dirname, 'pos.db');
const db = new sqlite3.Database(dbPath);

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

    // Import CSV if products table is empty
    db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
        if (row && row.count === 0) {
            console.log("Importing products from CSV...");
            const csvPath = path.join(__dirname, 'san_pham_2025-12-30.csv');
            if (fs.existsSync(csvPath)) {
                fs.createReadStream(csvPath)
                    .pipe(csv())
                    .on('data', (data) => {
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
                    })
                    .on('end', () => {
                        console.log('CSV import finished.');
                    });
            }
        }
    });
});

// === PRODUCT APIs ===

// Get all products
app.get('/api/products', (req, res) => {
    db.all("SELECT * FROM products", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Add new product
app.post('/api/products', (req, res) => {
    const { name, brand, category, price, case_price, units_per_case, stock, code, image } = req.body;
    const id = `PROD-${Date.now()}`;

    db.run(
        `INSERT INTO products (id, name, brand, category, price, case_price, units_per_case, stock, code, image) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, name, brand || '', category || '', price, case_price || 0, units_per_case || 1, stock || 0, code || '', image || ''],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id, success: true });
        }
    );
});

// Update product
app.put('/api/products/:id', (req, res) => {
    const { id } = req.params;
    const { name, brand, category, price, case_price, units_per_case, stock, code, image } = req.body;

    db.run(
        `UPDATE products SET name = ?, brand = ?, category = ?, price = ?, case_price = ?, units_per_case = ?, stock = ?, code = ?, image = ? WHERE id = ?`,
        [name, brand, category, price, case_price || 0, units_per_case || 1, stock, code || '', image || '', id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ updated: this.changes });
        }
    );
});

// Delete product
app.delete('/api/products/:id', (req, res) => {
    const { id } = req.params;

    db.run(`DELETE FROM products WHERE id = ?`, [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

// === ORDER APIs ===

app.get('/api/orders', (req, res) => {
    db.all("SELECT * FROM orders ORDER BY timestamp DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const processedRows = rows.map(r => ({
            ...r,
            items: JSON.parse(r.items)
        }));
        res.json(processedRows);
    });
});

app.post('/api/orders', (req, res) => {
    const { total, items, timestamp } = req.body;
    const itemsStr = JSON.stringify(items);

    db.run(`INSERT INTO orders (total, timestamp, items) VALUES (?, ?, ?)`,
        [total, timestamp, itemsStr],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });

            // Update stock
            const updatePromises = items.map(item => {
                const qtyToDeduct = item.saleType === 'case' ? (item.quantity * item.units_per_case) : item.quantity;
                return new Promise((resolve, reject) => {
                    db.run(`UPDATE products SET stock = stock - ? WHERE id = ?`, [qtyToDeduct, item.id], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            });

            Promise.all(updatePromises)
                .then(() => res.json({ id: this.lastID }))
                .catch(err => res.status(500).json({ error: err.message }));
        }
    );
});

app.listen(port, () => {
    console.log(`🚀 Gemini POS API running at http://localhost:${port}`);
    console.log(`📦 Database: ${dbPath}`);
});
