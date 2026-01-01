const express = require('express');
const router = express.Router();
const { db, dbRun, dbGet, dbAll, logActivity } = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { validateOrder, generateOrderCode } = require('../utils/helpers');

// GET ORDERS (Pagination + Filtering)
router.get('/', async (req, res) => {
    const { startDate, endDate, limit, offset } = req.query;

    const limitNum = Math.min(parseInt(limit) || 50, 200);
    const offsetNum = parseInt(offset) || 0;

    let baseQuery = "SELECT * FROM orders";
    let countQuery = "SELECT COUNT(*) as total FROM orders";
    let params = [];
    let whereClause = "";

    if (startDate && endDate) {
        whereClause = " WHERE timestamp >= ? AND timestamp <= ?";
        params = [new Date(startDate).getTime(), new Date(endDate).getTime()];
    }

    try {
        const totalResult = await dbGet(countQuery + whereClause, params);
        const total = totalResult.total;

        const query = `${baseQuery}${whereClause} ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
        const orders = await dbAll(query, [...params, limitNum, offsetNum]);

        // Parse items JSON for frontend
        const parsedOrders = orders.map(o => ({
            ...o,
            items: JSON.parse(o.items)
        }));

        res.json({
            data: parsedOrders,
            pagination: {
                total,
                limit: limitNum,
                offset: offsetNum,
                hasMore: offsetNum + limitNum < total
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CREATE ORDER (Transaction + Normalized Data)
router.post('/', async (req, res) => {
    const { items, total, customer_name, payment_method, note, timestamp } = req.body;

    const errors = validateOrder({ total, items });
    if (errors.length > 0) return res.status(400).json({ error: errors.join(', ') });

    try {
        await dbRun('BEGIN TRANSACTION');

        const countResult = await dbGet("SELECT COUNT(*) as count FROM orders");
        const orderCode = generateOrderCode((countResult?.count || 0) + 1);
        const itemsStr = JSON.stringify(items);

        // 1. Insert Order
        const orderResult = await dbRun(
            `INSERT INTO orders (order_code, total, timestamp, items, customer_name, payment_method, status, note) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [orderCode, total, timestamp || Date.now(), itemsStr, customer_name || 'Khách lẻ', payment_method || 'cash', 'completed', note || '']
        );
        const orderId = orderResult.lastID;

        // 2. Update Stock & Insert Order Items
        for (const item of items) {
            const qty = item.saleType === 'case' ? (item.quantity * (item.units_per_case || 1)) : item.quantity;

            // Deduct Stock
            await dbRun(
                `UPDATE products SET stock = stock - ?, total_sold = total_sold + ? WHERE id = ?`,
                [qty, qty, item.id]
            );

            // Normalized Insert
            await dbRun(
                `INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)`,
                [orderId, item.id, item.quantity, item.finalPrice || item.price || 0]
            );
        }

        await dbRun('COMMIT');

        logActivity('CREATE_ORDER', `New Order ${orderCode} - ${total}đ`);
        res.json({ id: orderId, order_code: orderCode, success: true });

    } catch (error) {
        await dbRun('ROLLBACK').catch(() => { });
        console.error('Order Error:', error);
        res.status(500).json({ error: error.message || 'Lỗi tạo đơn hàng' });
    }
});

// DELETE ORDER (Restore Stock)
router.delete('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    try {
        const order = await dbGet("SELECT items FROM orders WHERE id = ?", [id]);
        if (!order) return res.status(404).json({ error: 'Đơn hàng không tồn tại' });

        await dbRun('BEGIN TRANSACTION');

        // Restore Stock
        const items = JSON.parse(order.items);
        for (const item of items) {
            const qty = item.saleType === 'case' ? (item.quantity * (item.units_per_case || 1)) : item.quantity;
            await dbRun(
                `UPDATE products SET stock = stock + ?, total_sold = total_sold - ? WHERE id = ?`,
                [qty, qty, item.id]
            );
        }

        // Delete records
        await dbRun("DELETE FROM order_items WHERE order_id = ?", [id]);
        await dbRun("DELETE FROM orders WHERE id = ?", [id]);

        await dbRun('COMMIT');
        logActivity('DELETE_ORDER', `Deleted Order ID ${id}`);
        res.json({ success: true });

    } catch (error) {
        await dbRun('ROLLBACK').catch(() => { });
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
