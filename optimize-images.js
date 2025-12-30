const sqlite3 = require('sqlite3').verbose();
const https = require('https');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'pos.db');
const imagesDir = path.join(__dirname, 'public/images');
const db = new sqlite3.Database(dbPath);

if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

console.log("🚀 Starting Image Optimization Process...");

const downloadImage = (url, filename) => {
    return new Promise((resolve, reject) => {
        const filepath = path.join(imagesDir, filename);
        if (fs.existsSync(filepath)) {
            console.log(`   ⏭️ Skipped (Exists): ${filename}`);
            return resolve(`/images/${filename}`);
        }

        const file = fs.createWriteStream(filepath);
        https.get(url, response => {
            if (response.statusCode === 200) {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    console.log(`   ✅ Downloaded: ${filename}`);
                    resolve(`/images/${filename}`);
                });
            } else {
                file.close();
                fs.unlink(filepath, () => { });
                reject(`Status ${response.statusCode}`);
            }
        }).on('error', err => {
            fs.unlink(filepath, () => { });
            reject(err.message);
        });
    });
};

db.all("SELECT id, image, name FROM products", [], async (err, rows) => {
    if (err) throw err;
    console.log(`Found ${rows.length} products.`);

    for (const row of rows) {
        if (!row.image || !row.image.startsWith('http')) continue;

        try {
            const ext = path.extname(row.image.split('?')[0]) || '.jpg';
            // Tạo tên file an toàn từ ID sản phẩm
            const safeId = row.id.replace(/[^a-zA-Z0-9]/g, '_');
            const filename = `${safeId}${ext}`;

            const localPath = await downloadImage(row.image, filename);

            // Cập nhật DB
            db.run("UPDATE products SET image = ? WHERE id = ?", [localPath, row.id], (err) => {
                if (!err) console.log(`   🔄 Updated DB for ${row.name}`);
            });

        } catch (error) {
            console.error(`   ❌ Failed ${row.name}: ${error}`);
        }
    }
    console.log("🎉 Optimization Complete!");
});
