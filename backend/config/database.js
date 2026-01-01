const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// --- 1. Database Path Resolution ---
const getDbPath = () => {
    // Priority: Env Var -> Local Folders
    if (process.env.DB_PATH) return process.env.DB_PATH;

    const rootDir = path.resolve(__dirname, '..'); // backend/
    const possiblePaths = [
        path.join(rootDir, '../database/pos.db'),  // Project root/database
        path.join(rootDir, 'database/pos.db'),     // backend/database
        path.join(rootDir, 'pos.db'),              // backend/pos.db
    ];

    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            console.log(`📂 Database found at: ${p}`);
            return p;
        }
    }

    // Default: Create in backend/database if not exists
    const defaultPath = path.join(rootDir, 'database/pos.db');
    console.log(`📂 Using database path: ${defaultPath}`);
    return defaultPath;
};

const dbPath = getDbPath();
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

// --- 2. Connect Database ---
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('❌ Database opening error:', err);
    else {
        console.log('✅ Connected to SQLite database.');
        db.run("PRAGMA journal_mode = WAL;");
    }
});

// --- 3. Async Wrappers ---
const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
    });
});

const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
    });
});

const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
    });
});

// --- 4. Migration Logic ---
const migrateOrderItems = () => {
    // Chỉ run nếu bảng order_items trống
    db.get("SELECT COUNT(*) as count FROM order_items", (err, row) => {
        if (!err && row && row.count === 0) {
            console.log("🔄 Starting Migration: JSON -> order_items...");
            db.all("SELECT id, items FROM orders", [], (err, rows) => {
                if (err) return;

                db.serialize(() => {
                    db.run("BEGIN TRANSACTION");
                    const stmt = db.prepare("INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)");

                    rows.forEach(order => {
                        try {
                            const items = JSON.parse(order.items);
                            items.forEach(item => {
                                stmt.run(order.id, item.id, item.quantity, item.finalPrice || item.price || 0);
                            });
                        } catch (e) { }
                    });

                    stmt.finalize();
                    db.run("COMMIT", () => console.log("✅ Migration Completed."));
                });
            });
        }
    });
};

// --- 5. Init Tables ---
const initDatabase = () => {
    db.serialize(() => {
        // Products
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

        // Orders
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

        // Order Items (Normalized)
        db.run(`CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER,
            product_id TEXT,
            quantity INTEGER,
            price INTEGER,
            FOREIGN KEY(order_id) REFERENCES orders(id),
            FOREIGN KEY(product_id) REFERENCES products(id)
        )`);

        // Activity Logs
        db.run(`CREATE TABLE IF NOT EXISTS activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action TEXT,
            details TEXT,
            timestamp INTEGER
        )`);

        // Import Notes
        db.run(`CREATE TABLE IF NOT EXISTS import_notes (
            id TEXT PRIMARY KEY,
            timestamp INTEGER,
            total_cost INTEGER,
            note TEXT,
            items TEXT
        )`);

        // Trigger migration check
        setTimeout(migrateOrderItems, 2000);
    });
};

// Helper: Log activity
const logActivity = (action, details) => {
    const timestamp = Date.now();
    db.run(`INSERT INTO activity_logs (action, details, timestamp) VALUES (?, ?, ?)`, [action, details, timestamp]);
};

module.exports = { db, dbRun, dbGet, dbAll, initDatabase, logActivity };
