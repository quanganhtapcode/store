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

        // === SQLite Performance Optimizations ===
        db.run("PRAGMA journal_mode = WAL;");           // Write-Ahead Logging - tăng tốc write
        db.run("PRAGMA synchronous = NORMAL;");         // Cân bằng giữa tốc độ và an toàn (FULL quá chậm)
        db.run("PRAGMA cache_size = -64000;");          // 64MB cache (mặc định chỉ 2MB)
        db.run("PRAGMA temp_store = MEMORY;");          // Temp tables trong RAM
        db.run("PRAGMA mmap_size = 268435456;");        // 256MB memory-mapped I/O
        db.run("PRAGMA busy_timeout = 5000;");          // Đợi 5s nếu DB bị lock
        db.run("PRAGMA foreign_keys = ON;");            // Enforce FK constraints
        console.log('⚡ SQLite optimizations applied.');
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

        // Suppliers
        db.run(`CREATE TABLE IF NOT EXISTS suppliers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            contact_person TEXT,
            phone TEXT,
            email TEXT,
            address TEXT,
            note TEXT,
            created_at INTEGER,
            updated_at INTEGER
        )`);

        // Add supplier_id to import_notes if not exists
        db.run(`ALTER TABLE import_notes ADD COLUMN supplier_id TEXT`, (err) => {
            if (err && !err.message.includes('duplicate column')) {
                // Column may already exist
            }
        });

        // Add discount and original_total columns if not exist
        db.run(`ALTER TABLE orders ADD COLUMN discount INTEGER DEFAULT 0`, (err) => {
            if (err && !err.message.includes('duplicate column')) {
                console.log('Note: Column discount already exists or error:', err.message);
            }
        });
        db.run(`ALTER TABLE orders ADD COLUMN original_total INTEGER`, (err) => {
            if (err && !err.message.includes('duplicate column')) {
                console.log('Note: Column original_total already exists or error:', err.message);
            }
        });

        // Add cost_price to products if not exists
        db.run(`ALTER TABLE products ADD COLUMN cost_price INTEGER DEFAULT 0`, (err) => {
            if (err && !err.message.includes('duplicate column')) {
                // Column may already exist
            }
        });

        // ── Inventory Batches (FIFO) ──
        db.run(`CREATE TABLE IF NOT EXISTS inventory_batches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id TEXT NOT NULL,
            import_id TEXT,
            quantity INTEGER NOT NULL,
            remaining INTEGER NOT NULL,
            cost_price INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL,
            FOREIGN KEY(product_id) REFERENCES products(id),
            FOREIGN KEY(import_id) REFERENCES import_notes(id)
        )`);

        // Sessions (persistent token store)
        db.run(`CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            username TEXT NOT NULL,
            expiry INTEGER NOT NULL,
            created_at INTEGER NOT NULL
        )`);

        // Supplier-Product catalogue (many-to-many with per-supplier price)
        db.run(`CREATE TABLE IF NOT EXISTS supplier_products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            supplier_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            import_price INTEGER NOT NULL DEFAULT 0,
            note TEXT DEFAULT '',
            updated_at INTEGER NOT NULL,
            UNIQUE(supplier_id, product_id),
            FOREIGN KEY(supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
            FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
        )`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier ON supplier_products(supplier_id)`);

        // Add cost_price to order_items if not exists
        db.run(`ALTER TABLE order_items ADD COLUMN cost_price INTEGER DEFAULT 0`, (err) => {
            if (err && !err.message.includes('duplicate column')) {
                // Column may already exist
            }
        });

        // Trigger migration check
        setTimeout(migrateOrderItems, 2000);
        setTimeout(migrateInventoryBatches, 4000);

        // === CREATE INDEXES for faster queries ===
        db.run(`CREATE INDEX IF NOT EXISTS idx_orders_timestamp ON orders(timestamp)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_import_notes_timestamp ON import_notes(timestamp)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_inventory_batches_product ON inventory_batches(product_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_inventory_batches_remaining ON inventory_batches(remaining)`);
    });
};

// --- Migration: Seed inventory_batches from existing data ---
const migrateInventoryBatches = () => {
    db.get("SELECT COUNT(*) as count FROM inventory_batches", (err, row) => {
        if (err) { console.error('❌ inventory_batches check error:', err.message); return; }
        if (row && row.count > 0) {
            console.log(`✅ inventory_batches already has ${row.count} records, skip migration.`);
            return;
        }

        console.log("🔄 Starting Migration: Seed inventory_batches from import_notes + stock...");

        db.all("SELECT * FROM import_notes ORDER BY timestamp ASC", [], (err, imports) => {
            if (err) { console.error('❌ import_notes read error:', err.message); return; }

            // Track how much was imported per product
            const importedQty = {};

            db.serialize(() => {
                db.run("BEGIN TRANSACTION");

                const stmt = db.prepare(
                    "INSERT INTO inventory_batches (product_id, import_id, quantity, remaining, cost_price, created_at) VALUES (?, ?, ?, ?, ?, ?)"
                );

                // 1. Create batches from existing import_notes
                for (const imp of imports) {
                    let items;
                    try { items = JSON.parse(imp.items); } catch (e) { continue; }
                    for (const item of items) {
                        const costPrice = item.importPrice || item.price || 0;
                        // remaining = quantity (we'll adjust after)
                        stmt.run(item.id, imp.id, item.quantity, item.quantity, costPrice, imp.timestamp);
                        importedQty[item.id] = (importedQty[item.id] || 0) + item.quantity;
                    }
                }

                stmt.finalize();

                // 2. For products with stock > imported quantity, create an "initial stock" batch
                db.all("SELECT id, stock, cost_price FROM products", [], (err2, products) => {
                    if (err2) { db.run("ROLLBACK"); return; }

                    const stmt2 = db.prepare(
                        "INSERT INTO inventory_batches (product_id, import_id, quantity, remaining, cost_price, created_at) VALUES (?, ?, ?, ?, ?, ?)"
                    );

                    for (const p of products) {
                        const totalImported = importedQty[p.id] || 0;
                        const untracked = p.stock; // Current stock is what remains
                        // If product has stock but no import data covering it, create initial batch
                        if (untracked > 0 && totalImported === 0) {
                            stmt2.run(p.id, null, untracked, untracked, p.cost_price || 0, Date.now());
                        } else if (totalImported > 0) {
                            // Adjust remaining on batches to match current stock using FIFO
                            // Total sold = totalImported - currentStock + (pre-import stock)
                            // Since we don't know pre-import stock precisely, we'll set
                            // remaining on the batches so that SUM(remaining) = current stock
                        }
                    }

                    stmt2.finalize();

                    // 3. Now adjust remaining on batches so SUM(remaining) per product = product.stock
                    db.all(`SELECT product_id, SUM(quantity) as total_qty FROM inventory_batches GROUP BY product_id`, [], (err3, batchSums) => {
                        if (err3) { db.run("ROLLBACK"); return; }

                        const adjustments = [];
                        for (const bs of batchSums) {
                            const product = products.find(p => p.id === bs.product_id);
                            if (!product) continue;
                            const currentStock = product.stock;
                            const totalBatched = bs.total_qty;
                            const totalSold = totalBatched - currentStock;

                            if (totalSold > 0) {
                                adjustments.push({ productId: bs.product_id, toDeduct: totalSold });
                            }
                        }

                        // FIFO deduct from oldest batches
                        let pending = adjustments.length;
                        if (pending === 0) {
                            db.run("COMMIT", () => console.log("✅ inventory_batches migration completed."));
                            return;
                        }

                        for (const adj of adjustments) {
                            db.all(
                                "SELECT id, remaining FROM inventory_batches WHERE product_id = ? AND remaining > 0 ORDER BY created_at ASC",
                                [adj.productId],
                                (err4, batches) => {
                                    let toDeduct = adj.toDeduct;
                                    for (const batch of batches) {
                                        if (toDeduct <= 0) break;
                                        const deduct = Math.min(batch.remaining, toDeduct);
                                        db.run("UPDATE inventory_batches SET remaining = remaining - ? WHERE id = ?", [deduct, batch.id]);
                                        toDeduct -= deduct;
                                    }
                                    pending--;
                                    if (pending === 0) {
                                        db.run("COMMIT", () => console.log("✅ inventory_batches migration completed (with FIFO adjustments)."));
                                    }
                                }
                            );
                        }
                    });
                });
            });
        });
    });
};

// Helper: Log activity
const logActivity = (action, details) => {
    const timestamp = Date.now();
    db.run(`INSERT INTO activity_logs (action, details, timestamp) VALUES (?, ?, ?)`, [action, details, timestamp]);
};

module.exports = { db, dbRun, dbGet, dbAll, initDatabase, logActivity };
