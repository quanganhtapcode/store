const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve('database/pos.db');
const db = new sqlite3.Database(dbPath);

const now = new Date();
const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
const yesterdayStart = todayStart - 86400000;
const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();

console.log('Today Start:', todayStart, new Date(todayStart).toLocaleString());
console.log('Yesterday Start:', yesterdayStart, new Date(yesterdayStart).toLocaleString());
console.log('Month Start:', firstDayOfMonth, new Date(firstDayOfMonth).toLocaleString());
console.log('Last Month Start:', firstDayOfLastMonth, new Date(firstDayOfLastMonth).toLocaleString());

const query = `
    SELECT 
        IFNULL(SUM(CASE WHEN timestamp >= ? THEN total ELSE 0 END), 0) as todayRevenue,
        COUNT(CASE WHEN timestamp >= ? THEN 1 END) as todayOrders,
        IFNULL(SUM(CASE WHEN timestamp >= ? AND timestamp < ? THEN total ELSE 0 END), 0) as yesterdayRevenue,
        COUNT(CASE WHEN timestamp >= ? AND timestamp < ? THEN 1 END) as yesterdayOrders,
        IFNULL(SUM(CASE WHEN timestamp >= ? THEN total ELSE 0 END), 0) as monthRevenue,
        IFNULL(SUM(CASE WHEN timestamp >= ? AND timestamp < ? THEN total ELSE 0 END), 0) as lastMonthRevenue
    FROM orders
    WHERE timestamp >= ?
`;

const params = [
    todayStart, todayStart,
    yesterdayStart, todayStart, yesterdayStart, todayStart,
    firstDayOfMonth,
    firstDayOfLastMonth, firstDayOfMonth,
    firstDayOfLastMonth
];

db.get(query, params, (err, row) => {
    if (err) {
        console.error(err);
    } else {
        console.log('QUERY RESULT:', row);
    }
    db.close();
});
