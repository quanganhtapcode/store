import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import csv from 'csv-parser';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const verboseSqlite = sqlite3.verbose();

const DB_PATH = path.join(__dirname, 'pos.db');
const CSV_PATH = path.join(__dirname, 'san_pham_2025-12-30.csv');
const SRC_IMAGES_DIR = path.join(__dirname, 'images');
const PUBLIC_IMAGES_DIR = path.join(__dirname, 'public/images');

// Ensure destination directories exist
['original', 'grid', 'detail'].forEach(dir => {
    const p = path.join(PUBLIC_IMAGES_DIR, dir);
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

const db = new verboseSqlite.Database(DB_PATH);

const productMap = new Map(); // Name -> Old ID (from CSV)

console.log("🚀 Starting Final Image Migration...");

// Step 1: Read CSV to map Product Name -> Old ID (slug)
fs.createReadStream(CSV_PATH)
    .pipe(csv())
    .on('data', (row) => {
        // Fix potential BOM issue in headers
        const cleanRow = {};
        Object.keys(row).forEach(k => {
            // Remove BOM and trim
            const cleanKey = k.replace(/^[\uFEFF\s]+|[\s]+$/g, '');
            cleanRow[cleanKey] = row[k];
        });

        const code = cleanRow['Mã sản phẩm'];
        const name = cleanRow['Tên sản phẩm'];
        if (code && name) {
            productMap.set(name.trim(), code.trim());
        }
    })
    .on('end', () => {
        console.log(`Loaded ${productMap.size} products from CSV.`);
        processDatabase();
    });

function processDatabase() {
    db.all("SELECT id, name FROM products", [], (err, rows) => {
        if (err) { console.error(err); return; }

        console.log(`Found ${rows.length} products in DB.`);
        let updateCount = 0;

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");

            rows.forEach(row => {
                const oldCode = productMap.get(row.name.trim());
                if (!oldCode) {
                    console.warn(`   ⚠️ No CSV match for: ${row.name}`);
                    return;
                }

                // Process each version
                const versions = ['original', 'grid', 'detail'];
                let fileFound = false;

                versions.forEach(ver => {
                    // Try to find the file in source images/{ver}
                    const srcDir = path.join(SRC_IMAGES_DIR, ver);
                    if (!fs.existsSync(srcDir)) return;

                    const files = fs.readdirSync(srcDir);
                    const match = files.find(f => f.startsWith(oldCode + '_') || f.startsWith(oldCode + '.'));

                    if (match) {
                        const srcFile = path.join(srcDir, match);
                        const destFile = path.join(PUBLIC_IMAGES_DIR, ver, `${row.id}.jpg`);

                        // Copy/Move
                        try {
                            fs.copyFileSync(srcFile, destFile);
                            // console.log(`      ✅ Copied ${ver}: ${match} -> ${row.id}.jpg`);
                            if (ver === 'grid') fileFound = true; // Mark availability based on grid or detail
                            if (ver === 'detail') fileFound = true;
                        } catch (e) {
                            console.error(`      ❌ Error copying ${match}: ${e.message}`);
                        }
                    }
                });

                // Update DB to point to the 'grid' version as main
                const newPath = `/images/grid/${row.id}.jpg`;
                db.run("UPDATE products SET image = ? WHERE id = ?", [newPath, row.id]);
                updateCount++;
            });

            db.run("COMMIT", () => {
                console.log(`🎉 Migration Complete. Updated ${updateCount} products.`);
            });
        });
    });
}
