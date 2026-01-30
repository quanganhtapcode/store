const express = require('express');
const router = express.Router();
const { db, dbAll } = require('../config/database');
const { getVNTodayStr, getDayRangeVI } = require('../utils/helpers');

// GET GENERAL STATS
router.get('/', (req, res) => {
    const todayStr = getVNTodayStr();
    const todayStart = getDayRangeVI(todayStr).start;

    // First day of current month in VN
    const firstDayOfMonthStr = todayStr.slice(0, 8) + '01';
    const firstDayOfMonth = getDayRangeVI(firstDayOfMonthStr).start;

    db.serialize(() => {
        const result = {};

        // 1. Today Revenue
        db.all("SELECT total FROM orders WHERE timestamp >= ?", [todayStart], (e, r) => {
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

// GET DETAILED ANALYTICS (Payment methods, Day of week, Time of day)
router.get('/detailed', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let whereClause = "";
        let params = [];

        if (startDate && endDate) {
            whereClause = "WHERE timestamp >= ? AND timestamp <= ?";
            params = [Number(startDate), Number(endDate)];
        }

        // Payment Methods
        const paymentData = await dbAll(`
            SELECT payment_method, COUNT(*) as count, SUM(total) as total
            FROM orders
            ${whereClause}
            GROUP BY payment_method
        `, params);

        // Day of Week (0=Sunday, 1=Monday, ..., 6=Saturday)
        const dayOfWeekData = await dbAll(`
            SELECT CAST(strftime('%w', timestamp / 1000, 'unixepoch', '+7 hours') AS INTEGER) as day, COUNT(*) as count, SUM(total) as total
            FROM orders
            ${whereClause}
            GROUP BY day
            ORDER BY day
        `, params);

        // Hour of Day (Fixed with '+7 hours')
        const hourData = await dbAll(`
            SELECT CAST(strftime('%H', timestamp / 1000, 'unixepoch', '+7 hours') AS INTEGER) as hour, COUNT(*) as count, SUM(total) as total
            FROM orders
            ${whereClause}
            GROUP BY hour
            ORDER BY hour
        `, params);

        // Top Products by Revenue
        const topProductsData = await dbAll(`
            SELECT p.name, SUM(oi.quantity) as sold, SUM(oi.price * oi.quantity) as revenue
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            JOIN products p ON oi.product_id = p.id
            ${whereClause}
            GROUP BY p.id
            ORDER BY revenue DESC
            LIMIT 5
        `, params);

        // Category Distribution
        const categoryData = await dbAll(`
            SELECT p.category, SUM(oi.price * oi.quantity) as revenue
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            JOIN products p ON oi.product_id = p.id
            ${whereClause}
            GROUP BY p.category
            ORDER BY revenue DESC
        `, params);

        // KPI Comparisons - Vietnam Time Aware
        const todayStr = getVNTodayStr();
        const todayStart = getDayRangeVI(todayStr).start;
        const yesterdayStart = todayStart - 86400000;

        const firstDayOfMonthStr = todayStr.slice(0, 8) + '01';
        const firstDayOfLastMonthStr = new Date(new Date(firstDayOfMonthStr).getTime() - 86400000).toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).slice(0, 8) + '01';

        const firstDayOfMonth = getDayRangeVI(firstDayOfMonthStr).start;
        const firstDayOfLastMonth = getDayRangeVI(firstDayOfLastMonthStr).start;

        const kpiComparisons = await dbAll(`
            SELECT 
                IFNULL(SUM(CASE WHEN timestamp >= ? THEN total ELSE 0 END), 0) as todayRevenue,
                COUNT(CASE WHEN timestamp >= ? THEN 1 END) as todayOrders,
                IFNULL(SUM(CASE WHEN timestamp >= ? AND timestamp < ? THEN total ELSE 0 END), 0) as yesterdayRevenue,
                COUNT(CASE WHEN timestamp >= ? AND timestamp < ? THEN 1 END) as yesterdayOrders,
                IFNULL(SUM(CASE WHEN timestamp >= ? THEN total ELSE 0 END), 0) as monthRevenue,
                IFNULL(SUM(CASE WHEN timestamp >= ? AND timestamp < ? THEN total ELSE 0 END), 0) as lastMonthRevenue
            FROM orders
            WHERE timestamp >= ?
        `, [
            todayStart, todayStart,
            yesterdayStart, todayStart, yesterdayStart, todayStart,
            firstDayOfMonth,
            firstDayOfLastMonth, firstDayOfMonth,
            firstDayOfLastMonth
        ]);

        // Daily Trend for Current Month
        const currentMonthTrend = await dbAll(`
            SELECT CAST(strftime('%d', timestamp / 1000, 'unixepoch', '+7 hours') AS INTEGER) as day, SUM(total) as total
            FROM orders
            WHERE timestamp >= ?
            GROUP BY day
            ORDER BY day
        `, [firstDayOfMonth]);

        // Daily Trend for Last Month
        const lastMonthTrend = await dbAll(`
            SELECT CAST(strftime('%d', timestamp / 1000, 'unixepoch', '+7 hours') AS INTEGER) as day, SUM(total) as total
            FROM orders
            WHERE timestamp >= ? AND timestamp < ?
            GROUP BY day
            ORDER BY day
        `, [firstDayOfLastMonth, firstDayOfMonth]);

        res.json({
            paymentMethods: paymentData,
            dayOfWeek: dayOfWeekData,
            timeOfDay: hourData,
            topProducts: topProductsData,
            categories: categoryData,
            dailyTrend: {
                current: currentMonthTrend,
                previous: lastMonthTrend
            },
            kpis: kpiComparisons[0] || {
                todayRevenue: 0, todayOrders: 0, yesterdayRevenue: 0,
                yesterdayOrders: 0, monthRevenue: 0, lastMonthRevenue: 0
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
