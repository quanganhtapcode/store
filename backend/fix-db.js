const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database/pos.db');
const db = new sqlite3.Database(dbPath);

console.log("Fixing Image Paths...");
db.serialize(() => {
    // 1. Fix /original/
    db.run("UPDATE products SET image = REPLACE(image, '/images/original/', '/images/') WHERE image LIKE '%/images/original/%'", function (err) {
        console.log("Fixed original paths:", this.changes);
    });

    // 2. Fix /optimized/
    db.run("UPDATE products SET image = REPLACE(image, '/images/optimized/', '/images/') WHERE image LIKE '%/images/optimized/%'", function (err) {
        console.log("Fixed optimized paths:", this.changes);
    });

    // 3. Fix /grid/ (just in case)
    db.run("UPDATE products SET image = REPLACE(image, '/images/grid/', '/images/') WHERE image LIKE '%/images/grid/%'", function (err) {
        console.log("Fixed grid paths:", this.changes);
    });
});
