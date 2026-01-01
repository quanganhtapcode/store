// Migration script to add missing columns to orders table
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'pos.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Running database migration...');

const addColumn = (table, column, type) => {
    return new Promise((resolve) => {
        db.all(`PRAGMA table_info(${table})`, (err, rows) => {
            if (err) {
                console.error(`  ❌ Error checking ${table}:`, err.message);
                return resolve();
            }

            const hasColumn = rows.some(r => r.name === column);
            if (hasColumn) {
                console.log(`  ✓ Column ${column} already exists`);
                return resolve();
            }

            db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`, (err) => {
                if (err) {
                    console.error(`  ❌ Error adding ${column}:`, err.message);
                } else {
                    console.log(`  ✅ Added column ${column}`);
                }
                resolve();
            });
        });
    });
};

async function migrate() {
    // Orders table columns
    await addColumn('orders', 'order_code', 'TEXT');
    await addColumn('orders', 'customer_name', 'TEXT');
    await addColumn('orders', 'payment_method', 'TEXT');
    await addColumn('orders', 'status', 'TEXT');
    await addColumn('orders', 'note', 'TEXT');

    // Products table columns  
    await addColumn('products', 'total_sold', 'INTEGER DEFAULT 0');

    console.log('🎉 Migration complete!');
    db.close();
}

migrate();
