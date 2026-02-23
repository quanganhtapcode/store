const express = require('express');
const router = express.Router();
const { dbAll } = require('../config/database');
const { getVNTodayStr, getDayRangeVI } = require('../utils/helpers');

// ─── Helpers ────────────────────────────────────────────────────────────────
const calculateMedian = (arr) => {
    if (!arr || arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const getDateRange = (days) => {
    const now = Date.now();
    return now - days * 24 * 60 * 60 * 1000;
};

const getPeriodRange = (period) => {
    const todayStr = getVNTodayStr();
    const todayStart = getDayRangeVI(todayStr).start;
    const firstDayOfMonthStr = todayStr.slice(0, 8) + '01';
    const firstDayOfMonth = getDayRangeVI(firstDayOfMonthStr).start;

    const firstDayOfLastMonthStr = new Date(
        new Date(firstDayOfMonthStr).getTime() - 86400000
    ).toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).slice(0, 8) + '01';
    const firstDayOfLastMonth = getDayRangeVI(firstDayOfLastMonthStr).start;

    return { todayStart, firstDayOfMonth, firstDayOfLastMonth };
};

// ─── GET /analytics/daily-revenue?days=30 ──────────────────────────────────
router.get('/daily-revenue', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const since = getDateRange(days);

        const rows = await dbAll(`
            SELECT 
                strftime('%m/%d', timestamp / 1000, 'unixepoch', '+7 hours') as label,
                CAST(strftime('%d', timestamp / 1000, 'unixepoch', '+7 hours') AS INTEGER) as day,
                SUM(total) as value,
                COUNT(*) as orderCount
            FROM orders
            WHERE timestamp >= ? AND status = 'completed'
            GROUP BY strftime('%Y-%m-%d', timestamp / 1000, 'unixepoch', '+7 hours')
            ORDER BY timestamp ASC
        `, [since]);

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /analytics/top-products?limit=10&period=month ─────────────────────
router.get('/top-products', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const { firstDayOfMonth } = getPeriodRange(req.query.period);
        const since = req.query.period === 'month' ? firstDayOfMonth : 0;

        const rows = await dbAll(`
            SELECT p.name, SUM(oi.quantity) as sold, SUM(oi.price * oi.quantity) as revenue
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            JOIN products p ON oi.product_id = p.id
            WHERE o.timestamp >= ? AND o.status = 'completed'
            GROUP BY p.id
            ORDER BY revenue DESC
            LIMIT ?
        `, [since, limit]);

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /analytics/categories ─────────────────────────────────────────────
router.get('/categories', async (req, res) => {
    try {
        const { firstDayOfMonth } = getPeriodRange('month');

        const rows = await dbAll(`
            SELECT p.category as label, SUM(oi.price * oi.quantity) as value, COUNT(DISTINCT o.id) as orderCount
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            JOIN products p ON oi.product_id = p.id
            WHERE o.timestamp >= ? AND o.status = 'completed' AND p.category IS NOT NULL AND p.category != ''
            GROUP BY p.category
            ORDER BY value DESC
            LIMIT 8
        `, [firstDayOfMonth]);

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /analytics/brands ─────────────────────────────────────────────────
router.get('/brands', async (req, res) => {
    try {
        const { firstDayOfMonth } = getPeriodRange('month');

        const rows = await dbAll(`
            SELECT COALESCE(p.brand, 'Khác') as label, SUM(oi.price * oi.quantity) as value, COUNT(DISTINCT o.id) as orderCount
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            JOIN products p ON oi.product_id = p.id
            WHERE o.timestamp >= ? AND o.status = 'completed'
            GROUP BY p.brand
            ORDER BY value DESC
            LIMIT 8
        `, [firstDayOfMonth]);

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /analytics/comparison?period=month ────────────────────────────────
router.get('/comparison', async (req, res) => {
    try {
        const { todayStart, firstDayOfMonth, firstDayOfLastMonth } = getPeriodRange(req.query.period);
        const yesterdayStart = todayStart - 86400000;

        const rows = await dbAll(`
            SELECT 
                IFNULL(SUM(CASE WHEN timestamp >= ? THEN total ELSE 0 END), 0) as todayRevenue,
                COUNT(CASE WHEN timestamp >= ? THEN 1 END) as todayOrders,
                IFNULL(SUM(CASE WHEN timestamp >= ? AND timestamp < ? THEN total ELSE 0 END), 0) as yesterdayRevenue,
                COUNT(CASE WHEN timestamp >= ? AND timestamp < ? THEN 1 END) as yesterdayOrders,
                IFNULL(SUM(CASE WHEN timestamp >= ? THEN total ELSE 0 END), 0) as monthRevenue,
                COUNT(CASE WHEN timestamp >= ? THEN 1 END) as monthOrders,
                IFNULL(SUM(CASE WHEN timestamp >= ? AND timestamp < ? THEN total ELSE 0 END), 0) as lastMonthRevenue,
                COUNT(CASE WHEN timestamp >= ? AND timestamp < ? THEN 1 END) as lastMonthOrders
            FROM orders
            WHERE timestamp >= ? AND status = 'completed'
        `, [
            todayStart, todayStart,
            yesterdayStart, todayStart, yesterdayStart, todayStart,
            firstDayOfMonth, firstDayOfMonth,
            firstDayOfLastMonth, firstDayOfMonth, firstDayOfLastMonth, firstDayOfMonth,
            firstDayOfLastMonth
        ]);

        res.json(rows[0] || {});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /analytics/hourly-pattern?days=30  (MEDIAN) ───────────────────────
router.get('/hourly-pattern', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const since = getDateRange(days);

        // Get revenue grouped by (date, hour) so we can compute median per hour
        const rows = await dbAll(`
            SELECT 
                strftime('%Y-%m-%d', timestamp / 1000, 'unixepoch', '+7 hours') as date,
                CAST(strftime('%H', timestamp / 1000, 'unixepoch', '+7 hours') AS INTEGER) as hour,
                SUM(total) as revenue,
                COUNT(*) as orderCount
            FROM orders
            WHERE timestamp >= ? AND status = 'completed'
            GROUP BY date, hour
            ORDER BY hour, date
        `, [since]);

        // Group daily revenues by hour
        const byHour = {};
        for (let h = 0; h < 24; h++) byHour[h] = { revenues: [], orderCounts: [] };

        rows.forEach(r => {
            byHour[r.hour].revenues.push(r.revenue);
            byHour[r.hour].orderCounts.push(r.orderCount);
        });

        // Build result with median
        const data = Object.keys(byHour).map(h => {
            const hour = parseInt(h);
            const revenues = byHour[h].revenues;
            const medianRevenue = calculateMedian(revenues);
            const avgOrderCount = revenues.length > 0
                ? Math.round(byHour[h].orderCounts.reduce((a, b) => a + b, 0) / revenues.length)
                : 0;
            return {
                hour,
                label: `${hour}h:00`,
                medianRevenue,
                sampleDays: revenues.length,
                avgOrderCount
            };
        });

        // Find peak hour (highest median revenue, only hours with data)
        const activeHours = data.filter(d => d.medianRevenue > 0);
        const peakHour = activeHours.length > 0
            ? activeHours.reduce((max, d) => d.medianRevenue > max.medianRevenue ? d : max)
            : null;

        res.json({ data, peakHour: peakHour ? peakHour.hour : null });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /analytics/metrics?period=month ───────────────────────────────────
router.get('/metrics', async (req, res) => {
    try {
        const { firstDayOfMonth, firstDayOfLastMonth } = getPeriodRange(req.query.period);
        const since = req.query.period === 'month' ? firstDayOfMonth : 0;

        const [metrics, products] = await Promise.all([
            dbAll(`
                SELECT 
                    COUNT(*) as totalOrders,
                    IFNULL(SUM(total), 0) as totalRevenue,
                    IFNULL(AVG(total), 0) as avgOrderValue,
                    MAX(total) as maxOrderValue
                FROM orders WHERE timestamp >= ? AND status = 'completed'
            `, [since]),
            dbAll(`
                SELECT COUNT(*) as totalProducts, IFNULL(SUM(stock), 0) as totalStock
                FROM products WHERE stock > 0
            `, [])
        ]);

        res.json({ ...(metrics[0] || {}), ...(products[0] || {}) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /analytics/day-of-week?days=90  (MEDIAN) ──────────────────────────
router.get('/day-of-week', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 90;
        const since = getDateRange(days);

        // Get total revenue per date grouped so we can compute median per weekday
        const rows = await dbAll(`
            SELECT 
                CAST(strftime('%w', timestamp / 1000, 'unixepoch', '+7 hours') AS INTEGER) as dayOfWeek,
                strftime('%Y-%m-%d', timestamp / 1000, 'unixepoch', '+7 hours') as date,
                SUM(total) as revenue,
                COUNT(*) as orderCount
            FROM orders
            WHERE timestamp >= ? AND status = 'completed'
            GROUP BY date
            ORDER BY dayOfWeek, date
        `, [since]);

        const DAY_LABELS = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
        const grouped = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
        const groupedOrders = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

        rows.forEach(r => {
            grouped[r.dayOfWeek].push(r.revenue);
            groupedOrders[r.dayOfWeek].push(r.orderCount);
        });

        // Return days Mon-Sun (1-6, 0) for display
        const displayOrder = [1, 2, 3, 4, 5, 6, 0];
        const data = displayOrder.map(day => ({
            day,
            label: DAY_LABELS[day],
            medianRevenue: calculateMedian(grouped[day]),
            avgOrderCount: groupedOrders[day].length > 0
                ? Math.round(groupedOrders[day].reduce((a, b) => a + b, 0) / groupedOrders[day].length)
                : 0,
            sampleWeeks: grouped[day].length
        }));

        const bestDay = data.reduce((max, d) => d.medianRevenue > max.medianRevenue ? d : max, data[0]);

        res.json({ data, bestDay: bestDay?.label || '' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /analytics/customer-spending?period=month ─────────────────────────
router.get('/customer-spending', async (req, res) => {
    try {
        const { firstDayOfMonth } = getPeriodRange(req.query.period);
        const since = req.query.period === 'month' ? firstDayOfMonth : 0;

        const rows = await dbAll(`
            SELECT total FROM orders
            WHERE timestamp >= ? AND status = 'completed'
            ORDER BY total
        `, [since]);

        if (rows.length === 0) {
            return res.json({ segments: [], summary: { avgSpending: 0, vipCustomers: 0 } });
        }

        const totals = rows.map(r => r.total);
        const avg = totals.reduce((a, b) => a + b, 0) / totals.length;

        const segments = [
            { segment: 'Dưới 50,000đ',  min: 0,       max: 50000,   order_count: 0 },
            { segment: '50K - 100K',     min: 50000,   max: 100000,  order_count: 0 },
            { segment: '100K - 200K',    min: 100000,  max: 200000,  order_count: 0 },
            { segment: '200K - 500K',    min: 200000,  max: 500000,  order_count: 0 },
            { segment: 'Trên 500,000đ',  min: 500000,  max: Infinity,order_count: 0 },
        ];

        totals.forEach(t => {
            const seg = segments.find(s => t >= s.min && t < s.max);
            if (seg) seg.order_count++;
        });

        const vipCustomers = totals.filter(t => t >= 500000).length;

        res.json({
            segments: segments.map(({ segment, order_count }) => ({ segment, order_count })),
            summary: { avgSpending: Math.round(avg), vipCustomers }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /analytics/monthly-trend?year=2026 ────────────────────────────────
router.get('/monthly-trend', async (req, res) => {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear();

        const rows = await dbAll(`
            SELECT 
                CAST(strftime('%m', timestamp / 1000, 'unixepoch', '+7 hours') AS INTEGER) as month,
                SUM(total) as revenue,
                COUNT(*) as orderCount
            FROM orders
            WHERE strftime('%Y', timestamp / 1000, 'unixepoch', '+7 hours') = ? AND status = 'completed'
            GROUP BY month
            ORDER BY month
        `, [String(year)]);

        // Fill all 12 months
        const monthLabels = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];
        const result = monthLabels.map((label, idx) => {
            const found = rows.find(r => r.month === idx + 1);
            return { label, value: found ? found.revenue : 0, orderCount: found ? found.orderCount : 0 };
        });

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /analytics/peak-hours?days=30  (based on MEDIAN revenue) ──────────
router.get('/peak-hours', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const since = getDateRange(days);

        const rows = await dbAll(`
            SELECT 
                strftime('%Y-%m-%d', timestamp / 1000, 'unixepoch', '+7 hours') as date,
                CAST(strftime('%H', timestamp / 1000, 'unixepoch', '+7 hours') AS INTEGER) as hour,
                SUM(total) as revenue,
                COUNT(*) as orderCount
            FROM orders
            WHERE timestamp >= ? AND status = 'completed'
            GROUP BY date, hour
            ORDER BY hour, date
        `, [since]);

        const byHour = {};
        rows.forEach(r => {
            if (!byHour[r.hour]) byHour[r.hour] = { revenues: [], orderCounts: [] };
            byHour[r.hour].revenues.push(r.revenue);
            byHour[r.hour].orderCounts.push(r.orderCount);
        });

        const hourStats = Object.keys(byHour).map(h => {
            const hour = parseInt(h);
            const revenues = byHour[h].revenues;
            const medianRevenue = calculateMedian(revenues);
            const medianOrders = calculateMedian(byHour[h].orderCounts);
            return {
                hour,
                label: `${hour}:00 - ${hour + 1}:00`,
                revenue: Math.round(medianRevenue),
                orderCount: Math.round(medianOrders),
                avgOrderValue: medianOrders > 0 ? Math.round(medianRevenue / medianOrders) : 0
            };
        });

        // Top 3 by median revenue
        const peakHours = hourStats
            .filter(h => h.revenue > 0)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 3);

        res.json({ peakHours });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
