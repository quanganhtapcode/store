const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const https = require('https');
const { dbRun, dbGet, dbAll, logActivity } = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { validateProduct, generateId } = require('../utils/helpers');

// Image Handling Helper
const saveImage = (imageData, productId) => {
    if (!imageData) return null;

    // Check if it's already a local path
    if (imageData.startsWith('/images/')) return imageData;

    const matches = imageData.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return imageData; // Return original if not base64

    const ext = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const fileName = `${productId}.${ext}`;

    // Save to multiple sizes (mock logic handles folders)
    // Structure: public/images/original/
    const publicDir = path.join(__dirname, '../public/images');
    const originalDir = path.join(publicDir, 'original');

    if (!fs.existsSync(originalDir)) fs.mkdirSync(originalDir, { recursive: true });

    fs.writeFileSync(path.join(originalDir, fileName), buffer);
    return `/images/original/${fileName}`;
};

// GET PRODUCTS
router.get('/', async (req, res) => {
    try {
        const products = await dbAll("SELECT * FROM products");
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ADD PRODUCT
router.post('/', verifyToken, async (req, res) => {
    const data = req.body;
    const validationErrors = validateProduct(data);
    if (validationErrors.length > 0) return res.status(400).json({ error: validationErrors.join(', ') });

    try {
        const id = generateId('PRD');
        const imageUrl = saveImage(data.image, id);

        await dbRun(
            `INSERT INTO products (id, name, brand, category, price, case_price, units_per_case, stock, code, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, data.name, data.brand || '', data.category || 'Khác', data.price, data.case_price || 0, data.units_per_case || 1, data.stock || 0, data.code || '', imageUrl]
        );

        logActivity('ADD_PRODUCT', `Added ${data.name}`);
        res.json({ id, message: 'Thêm sản phẩm thành công' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE PRODUCT
router.put('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    const validationErrors = validateProduct(data);
    if (validationErrors.length > 0) return res.status(400).json({ error: validationErrors.join(', ') });

    try {
        const current = await dbGet("SELECT image FROM products WHERE id = ?", [id]);
        if (!current) return res.status(404).json({ error: 'Sản phẩm không tồn tại' });

        let imageUrl = current.image;
        if (data.image && data.image !== current.image) {
            imageUrl = saveImage(data.image, id);
        }

        await dbRun(
            `UPDATE products SET name = ?, brand = ?, category = ?, price = ?, case_price = ?, units_per_case = ?, stock = ?, code = ?, image = ? WHERE id = ?`,
            [data.name, data.brand, data.category, data.price, data.case_price, data.units_per_case, data.stock, data.code, imageUrl, id]
        );

        logActivity('UPDATE_PRODUCT', `Updated ${data.name}`);
        res.json({ message: 'Cập nhật thành công' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE PRODUCT
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        await dbRun("DELETE FROM products WHERE id = ?", [req.params.id]);
        logActivity('DELETE_PRODUCT', `Deleted product ${req.params.id}`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// SYNC IMAGES (Download external images)
router.post('/sync-images', verifyToken, async (req, res) => {
    try {
        const products = await dbAll("SELECT id, image FROM products WHERE image LIKE 'http%'");
        let count = 0;

        const downloadImage = (url, filepath) => {
            return new Promise((resolve, reject) => {
                const file = fs.createWriteStream(filepath);
                https.get(url, (response) => {
                    response.pipe(file);
                    file.on('finish', () => {
                        file.close(resolve);
                    });
                }).on('error', (err) => {
                    fs.unlink(filepath, () => { }); // Delete info
                    reject(err);
                });
            });
        };

        const publicDir = path.join(__dirname, '../public/images/optimized'); // Use optimized folder
        if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

        for (const p of products) {
            try {
                const ext = path.extname(p.image).split('?')[0] || '.jpg';
                const filename = `${p.id}${ext}`;
                const filepath = path.join(publicDir, filename);

                await downloadImage(p.image, filepath);

                // Update DB to local path
                const localPath = `/images/optimized/${filename}`;
                await dbRun("UPDATE products SET image = ? WHERE id = ?", [localPath, p.id]);
                count++;
            } catch (e) { console.error(`Failed to sync ${p.id}:`, e.message); }
        }
        res.json({ message: `Synced ${count} images` });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
