const express = require('express');
const router = express.Router();
const { db, dbRun, dbGet, dbAll, logActivity } = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { validateOrder, generateOrderCode, getDayRangeVI } = require('../utils/helpers');

// GET ORDERS (Pagination + Filtering)
router.get('/', async (req, res) => {
    const { startDate, endDate, limit, offset } = req.query;

    const limitNum = Math.min(parseInt(limit) || 50, 200);
    const offsetNum = parseInt(offset) || 0;

    let baseQuery = "SELECT * FROM orders";
    let countQuery = "SELECT COUNT(*) as total, SUM(total) as totalRevenue FROM orders";
    let params = [];
    let whereClause = "";

    if (startDate) {
        const rangeStart = getDayRangeVI(startDate);
        const rangeEnd = getDayRangeVI(endDate || startDate);

        whereClause = " WHERE timestamp >= ? AND timestamp <= ?";
        params = [rangeStart.start, rangeEnd.end];
    }

    try {
        const totalResult = await dbGet(countQuery + whereClause, params);
        const total = totalResult.total;
        const totalRevenue = totalResult.totalRevenue || 0;

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
                totalRevenue,
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
    const { items, total, original_total, discount, customer_name, payment_method, note, timestamp } = req.body;

    const errors = validateOrder({ total, items });
    if (errors.length > 0) return res.status(400).json({ error: errors.join(', ') });

    try {
        await dbRun('BEGIN TRANSACTION');

        const countResult = await dbGet("SELECT COUNT(*) as count FROM orders");
        const orderCode = generateOrderCode((countResult?.count || 0) + 1);
        const itemsStr = JSON.stringify(items);

        // 1. Insert Order (with discount)
        const orderResult = await dbRun(
            `INSERT INTO orders (order_code, total, original_total, discount, timestamp, items, customer_name, payment_method, status, note) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [orderCode, total, original_total || total, discount || 0, timestamp || Date.now(), itemsStr, customer_name || 'Khách lẻ', payment_method || 'cash', 'completed', note || '']
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

        const discountLog = discount > 0 ? ` (Chiết khấu: ${discount}đ)` : '';
        logActivity('CREATE_ORDER', `New Order ${orderCode} - ${total}đ${discountLog}`);
        res.json({ id: orderId, order_code: orderCode, success: true });

    } catch (error) {
        await dbRun('ROLLBACK').catch(() => { });
        console.error('Order Error:', error);
        res.status(500).json({ error: error.message || 'Lỗi tạo đơn hàng' });
    }
});

// UPDATE ORDER (Full edit: items, total, payment_method, customer_name, note)
router.put('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { items, total, payment_method, customer_name, note } = req.body;

    try {
        const order = await dbGet("SELECT * FROM orders WHERE id = ?", [id]);
        if (!order) return res.status(404).json({ error: 'Đơn hàng không tồn tại' });

        // Build update query dynamically
        const updates = [];
        const params = [];
        const changes = []; // Track changes for logging

        // Validate and update payment_method (only cash or transfer allowed)
        if (payment_method !== undefined) {
            const validPayments = ['cash', 'transfer'];
            if (!validPayments.includes(payment_method)) {
                return res.status(400).json({ error: 'Phương thức thanh toán không hợp lệ (chỉ tiền mặt hoặc chuyển khoản)' });
            }
            if (payment_method !== order.payment_method) {
                updates.push('payment_method = ?');
                params.push(payment_method);
                changes.push(`Thanh toán: ${order.payment_method} → ${payment_method}`);
            }
        }

        // Update items and total
        if (items !== undefined && Array.isArray(items)) {
            const itemsStr = JSON.stringify(items);
            updates.push('items = ?');
            params.push(itemsStr);

            // Calculate new total from items
            const newTotal = total || items.reduce((sum, item) => sum + ((item.finalPrice || 0) * item.quantity), 0);
            if (newTotal !== order.total) {
                updates.push('total = ?');
                params.push(newTotal);
                changes.push(`Tổng tiền: ${order.total?.toLocaleString()}đ → ${newTotal?.toLocaleString()}đ`);
            }

            // Compare items count
            const oldItems = JSON.parse(order.items || '[]');
            if (oldItems.length !== items.length) {
                changes.push(`Số SP: ${oldItems.length} → ${items.length}`);
            }
        } else if (total !== undefined && total !== order.total) {
            updates.push('total = ?');
            params.push(total);
            changes.push(`Tổng tiền: ${order.total?.toLocaleString()}đ → ${total?.toLocaleString()}đ`);
        }

        if (customer_name !== undefined && customer_name !== order.customer_name) {
            updates.push('customer_name = ?');
            params.push(customer_name);
            changes.push(`Khách: ${order.customer_name} → ${customer_name}`);
        }

        if (note !== undefined && note !== order.note) {
            updates.push('note = ?');
            params.push(note);
            changes.push(`Ghi chú: cập nhật`);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'Không có dữ liệu thay đổi' });
        }

        params.push(id);
        await dbRun(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`, params);

        // Log activity with details
        const orderCode = order.order_code || `#${id}`;
        const logMessage = changes.length > 0
            ? `Sửa đơn ${orderCode}: ${changes.join(', ')}`
            : `Sửa đơn ${orderCode}`;
        logActivity('UPDATE_ORDER', logMessage);

        res.json({ success: true, message: 'Cập nhật đơn hàng thành công' });

    } catch (error) {
        console.error('Update Order Error:', error);
        res.status(500).json({ error: error.message || 'Lỗi cập nhật đơn hàng' });
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
