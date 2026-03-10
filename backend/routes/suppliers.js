const express = require('express');
const router = express.Router();
const { dbRun, dbGet, dbAll, logActivity } = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// Generate supplier ID
const generateSupplierId = () => 'SUP-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();

// GET ALL SUPPLIERS
router.get('/', async (req, res) => {
    try {
        const suppliers = await dbAll("SELECT * FROM suppliers ORDER BY created_at DESC");
        res.json(suppliers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET SINGLE SUPPLIER
router.get('/:id', async (req, res) => {
    try {
        const supplier = await dbGet("SELECT * FROM suppliers WHERE id = ?", [req.params.id]);
        if (!supplier) return res.status(404).json({ error: 'Nhà cung cấp không tồn tại' });
        res.json(supplier);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ADD SUPPLIER
router.post('/', verifyToken, async (req, res) => {
    const { name, contact_person, phone, email, address, note } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Tên nhà cung cấp không được để trống' });
    }

    try {
        const id = generateSupplierId();
        const now = Date.now();
        await dbRun(
            `INSERT INTO suppliers (id, name, contact_person, phone, email, address, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, name.trim(), contact_person || '', phone || '', email || '', address || '', note || '', now, now]
        );
        logActivity('ADD_SUPPLIER', `Added supplier: ${name}`);
        res.json({ id, message: 'Thêm nhà cung cấp thành công' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE SUPPLIER
router.put('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { name, contact_person, phone, email, address, note } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Tên nhà cung cấp không được để trống' });
    }

    try {
        const existing = await dbGet("SELECT * FROM suppliers WHERE id = ?", [id]);
        if (!existing) return res.status(404).json({ error: 'Nhà cung cấp không tồn tại' });

        await dbRun(
            `UPDATE suppliers SET name = ?, contact_person = ?, phone = ?, email = ?, address = ?, note = ?, updated_at = ? WHERE id = ?`,
            [name.trim(), contact_person || '', phone || '', email || '', address || '', note || '', Date.now(), id]
        );
        logActivity('UPDATE_SUPPLIER', `Updated supplier: ${name}`);
        res.json({ message: 'Cập nhật nhà cung cấp thành công' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE SUPPLIER
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        // Check if supplier has imports
        const imports = await dbAll("SELECT COUNT(*) as count FROM import_notes WHERE supplier_id = ?", [req.params.id]);
        if (imports[0]?.count > 0) {
            return res.status(400).json({ error: `Không thể xóa. Nhà cung cấp có ${imports[0].count} phiếu nhập liên quan.` });
        }

        await dbRun("DELETE FROM suppliers WHERE id = ?", [req.params.id]);
        logActivity('DELETE_SUPPLIER', `Deleted supplier ${req.params.id}`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET SUPPLIER STATS
router.get('/:id/stats', async (req, res) => {
    try {
        const imports = await dbAll(
            "SELECT * FROM import_notes WHERE supplier_id = ? ORDER BY timestamp DESC LIMIT 50",
            [req.params.id]
        );
        const totalImports = imports.length;
        const totalCost = imports.reduce((sum, imp) => sum + (imp.total_cost || 0), 0);
        const totalItems = imports.reduce((sum, imp) => {
            try {
                const items = typeof imp.items === 'string' ? JSON.parse(imp.items) : imp.items;
                return sum + items.reduce((s, i) => s + (i.quantity || 0), 0);
            } catch { return sum; }
        }, 0);

        res.json({
            totalImports,
            totalCost,
            totalItems,
            recentImports: imports.slice(0, 10)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
