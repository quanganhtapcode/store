const express = require('express');
const router = express.Router();
const { db, dbAll } = require('../config/database');

// Simple Cache
let statsCache = { data: null, expiry: 0 };

// GET GENERAL STATS
router.get('/', (req, res) => {
    // Return cached data if valid
    if (statsCache.data && Date.now() < statsCache.expiry) {
        return res.json(statsCache.data);
    }

    const today = new Date().setHours(0, 0, 0, 0);
    const firstDayOfMonth = new Date(new Date().setDate(1)).setHours(0, 0, 0, 0);

    db.serialize(() => {
        const result = {};

        // 1. Today Revenue
        db.all("SELECT total FROM orders WHERE timestamp >= ?", [today], (e, r) => {
            if (e) return res.status(500).json({ error: e.message });
            result.todayRevenue = r.reduce((ack, x) => ack + x.total, 0);
            result.todayOrders = r.length;

            // 2. Month Revenue
            db.all("SELECT total FROM orders WHERE timestamp >= ?", [firstDayOfMonth], (e2, r2) => {
                if (e2) return res.status(500).json({ error: e2.message });
                result.monthRevenue = r2.reduce((ack, x) => ack + x.total, 0);

                // 3. Top Products
                db.all("SELECT name, total_sold FROM products ORDER BY total_sold DESC LIMIT 5", (e3, r3) => {
                    if (e3) return res.status(500).json({ error: e3.message });
                    result.topProducts = r3;

                    // Update cache
                    statsCache = {
                        data: result,
                        expiry: Date.now() + 5 * 60 * 1000 // Cache 5 mins
                    };

                    res.json(result);
                });
            });
        });
    });
});

// GET MONTHLY PRODUCT DETAILED STATS
router.get('/monthly-products', async (req, res) => {
    try {
        const firstDayOfMonth = new Date(new Date().setDate(1)).setHours(0, 0, 0, 0);

        // Use the new order_items table for extreme speed if possible
        // But for backward compatibility with un-migrated data, we might stick to JSON parsing or UNION
        // Let's use the new table for forward compatibility. 
        // NOTE: If migration hasn't finished, this might return partial data. 
        // But since we run migration on start, it should be fine.

        // QUERY: Sum quantity & revenue from order_items joined with orders (for date filter) and products (for name)
        const query = `
            SELECT 
                p.name, 
                p.id, 
                SUM(oi.quantity) as total_sold, 
                SUM(oi.price * oi.quantity) as revenue
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            JOIN products p ON oi.product_id = p.id
            WHERE o.timestamp >= ?
            GROUP BY p.id
            ORDER BY revenue DESC
        `;

        const rows = await dbAll(query, [firstDayOfMonth]);

        // Fallback: If rows empty (maybe migration failed?), try old JSON method?
        // No, let's trust the migation.

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
