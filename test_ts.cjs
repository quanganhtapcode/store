const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve('database/pos.db');
const db = new sqlite3.Database(dbPath);

console.log('--- TEST DATABASE TIMESTAMPS ---');
const now = Date.now();
console.log('Current JS timestamp (ms):', now);

db.all("SELECT id, total, timestamp, datetime(timestamp / 1000, 'unixepoch', 'localtime') as dt FROM orders ORDER BY timestamp DESC LIMIT 10", (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log('Latest 10 orders:');
        if (rows.length === 0) {
            console.log('NO ORDERS FOUND');
        } else {
            rows.forEach(r => console.log(`ID: ${r.id}, Total: ${r.total}, TS: ${r.timestamp}, Date: ${r.dt}`));
        }
    }
    db.close();
});
