const express = require('express');
const ExcelJS = require('exceljs');
const router = express.Router();

// Database helper functions will be passed from server.cjs
let dbAll, dbRun;

const initDB = (dbAllFn, dbRunFn) => {
    dbAll = dbAllFn;
    dbRun = dbRunFn;
};

// Helper: Format Vietnamese date
const formatDateVN = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

// Helper: Format currency
const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN').format(value || 0);
};

// Helper: Style header row
const styleHeaderRow = (row, worksheet) => {
    row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0071E3' }
    };
    row.alignment = { horizontal: 'center', vertical: 'middle' };
    row.height = 25;

    // Auto-fit columns
    worksheet.columns.forEach(column => {
        column.width = Math.max(column.width || 10, 12);
    });
};

// Helper: Add title and info rows
const addReportHeader = (worksheet, title, dateRange) => {
    // Title
    worksheet.mergeCells('A1:H1');
    const titleRow = worksheet.getRow(1);
    titleRow.getCell(1).value = title;
    titleRow.getCell(1).font = { bold: true, size: 16 };
    titleRow.getCell(1).alignment = { horizontal: 'center' };
    titleRow.height = 30;

    // Company
    worksheet.mergeCells('A2:H2');
    const companyRow = worksheet.getRow(2);
    companyRow.getCell(1).value = 'Đơn vị: Cát Hải';
    companyRow.getCell(1).font = { size: 12 };
    companyRow.getCell(1).alignment = { horizontal: 'center' };

    // Date range
    worksheet.mergeCells('A3:H3');
    const dateRow = worksheet.getRow(3);
    dateRow.getCell(1).value = `Kỳ báo cáo: ${dateRange}`;
    dateRow.getCell(1).font = { size: 11, italic: true };
    dateRow.getCell(1).alignment = { horizontal: 'center' };

    // Empty row
    worksheet.addRow([]);
};

// ====================
// EXPORT ENDPOINT
// ====================
router.post('/export', async (req, res) => {
    const { type, startDate, endDate } = req.body;

    if (!type || !startDate || !endDate) {
        return res.status(400).json({ error: 'Missing type, startDate or endDate' });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const dateRange = `Từ ${formatDateVN(startDate)} đến ${formatDateVN(endDate)}`;

    try {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Cát Hải POS';
        workbook.created = new Date();

        let filename = '';

        switch (type) {
            case 'sales_detail':
                await generateSalesDetail(workbook, start, end, dateRange);
                filename = `SoChiTietBanHang_${startDate}_${endDate}.xlsx`;
                break;

            case 'inventory':
                await generateInventoryReport(workbook, start, end, dateRange);
                filename = `BaoCaoXuatNhapTon_${startDate}_${endDate}.xlsx`;
                break;

            case 'revenue_summary':
                await generateRevenueSummary(workbook, start, end, dateRange);
                filename = `TongHopDoanhThu_${startDate}_${endDate}.xlsx`;
                break;

            case 'import_detail':
                await generateImportDetail(workbook, start, end, dateRange);
                filename = `SoChiTietNhapHang_${startDate}_${endDate}.xlsx`;
                break;

            case 'full_report':
                // Generate all reports in one file with multiple sheets
                await generateSalesDetail(workbook, start, end, dateRange);
                await generateInventoryReport(workbook, start, end, dateRange);
                await generateImportDetail(workbook, start, end, dateRange);
                filename = `BaoCaoTongHop_${startDate}_${endDate}.xlsx`;
                break;

            default:
                return res.status(400).json({ error: 'Invalid report type' });
        }

        // Set response headers for Excel download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

        // Write to response
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ====================
// 1. SỔ CHI TIẾT BÁN HÀNG
// ====================
async function generateSalesDetail(workbook, start, end, dateRange) {
    const worksheet = workbook.addWorksheet('Sổ Chi Tiết Bán Hàng');

    // Get orders in date range
    const orders = await dbAll(`
        SELECT * FROM orders 
        WHERE timestamp >= ? AND timestamp <= ?
        ORDER BY timestamp DESC
    `, [start.getTime(), end.getTime()]);

    addReportHeader(worksheet, 'SỔ CHI TIẾT BÁN HÀNG (Mẫu S1-HKD)', dateRange);

    // Column headers
    worksheet.columns = [
        { header: 'Ngày', key: 'date', width: 12 },
        { header: 'Mã đơn', key: 'code', width: 15 },
        { header: 'Tên sản phẩm', key: 'product', width: 35 },
        { header: 'ĐVT', key: 'unit', width: 8 },
        { header: 'Số lượng', key: 'quantity', width: 10 },
        { header: 'Đơn giá', key: 'price', width: 15 },
        { header: 'Thành tiền', key: 'total', width: 15 },
        { header: 'Thanh toán', key: 'payment', width: 12 },
        { header: 'Ghi chú', key: 'note', width: 20 }
    ];

    const headerRow = worksheet.getRow(5);
    headerRow.values = ['Ngày', 'Mã đơn', 'Tên sản phẩm', 'ĐVT', 'Số lượng', 'Đơn giá', 'Thành tiền', 'Thanh toán', 'Ghi chú'];
    styleHeaderRow(headerRow, worksheet);

    let totalRevenue = 0;
    let totalQty = 0;
    let rowIndex = 6;

    for (const order of orders) {
        const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
        const orderDate = formatDateVN(order.timestamp);
        const orderCode = order.order_code || `#${order.id}`;
        const paymentMethod = order.payment_method === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt';

        for (const item of items) {
            const itemTotal = (item.finalPrice || item.price) * item.quantity;
            totalRevenue += itemTotal;
            totalQty += item.quantity;

            const row = worksheet.getRow(rowIndex);
            row.values = [
                orderDate,
                orderCode,
                item.displayName || item.name,
                item.isCase ? 'Thùng' : 'Cái',
                item.quantity,
                item.finalPrice || item.price,
                itemTotal,
                paymentMethod,
                order.note || ''
            ];

            // Format numbers
            row.getCell(6).numFmt = '#,##0';
            row.getCell(7).numFmt = '#,##0';

            rowIndex++;
        }
    }

    // Summary row
    const summaryRow = worksheet.getRow(rowIndex + 1);
    summaryRow.values = ['', '', 'TỔNG CỘNG', '', totalQty, '', totalRevenue, '', ''];
    summaryRow.font = { bold: true };
    summaryRow.getCell(7).numFmt = '#,##0';

    // Statistics
    const statsRow = worksheet.getRow(rowIndex + 3);
    statsRow.values = [`Tổng số đơn hàng: ${orders.length}`, '', '', '', '', '', '', `Ngày xuất: ${formatDateVN(new Date())}`];

    return worksheet;
}

// ====================
// 2. BÁO CÁO XUẤT NHẬP TỒN
// ====================
async function generateInventoryReport(workbook, start, end, dateRange) {
    const worksheet = workbook.addWorksheet('Xuất Nhập Tồn');

    // Get all products
    const products = await dbAll('SELECT * FROM products');

    // Get orders in date range for calculating sales
    const orders = await dbAll(`
        SELECT * FROM orders 
        WHERE timestamp >= ? AND timestamp <= ?
    `, [start.getTime(), end.getTime()]);

    // Get imports in date range
    const imports = await dbAll(`
        SELECT * FROM import_notes 
        WHERE timestamp >= ? AND timestamp <= ?
    `, [start.getTime(), end.getTime()]);

    // Calculate sold quantities
    const soldMap = {};
    for (const order of orders) {
        const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
        for (const item of items) {
            if (!soldMap[item.id]) soldMap[item.id] = { quantity: 0, value: 0 };
            soldMap[item.id].quantity += item.quantity;
            soldMap[item.id].value += (item.finalPrice || item.price) * item.quantity;
        }
    }

    // Calculate imported quantities
    const importedMap = {};
    for (const imp of imports) {
        const items = typeof imp.items === 'string' ? JSON.parse(imp.items) : imp.items;
        for (const item of items) {
            if (!importedMap[item.id]) importedMap[item.id] = { quantity: 0, value: 0 };
            importedMap[item.id].quantity += item.quantity;
            importedMap[item.id].value += (item.importPrice || item.price) * item.quantity;
        }
    }

    addReportHeader(worksheet, 'BÁO CÁO XUẤT NHẬP TỒN KHO (Mẫu S2-HKD)', dateRange);

    worksheet.columns = [
        { header: 'STT', key: 'stt', width: 6 },
        { header: 'Mã SP', key: 'id', width: 10 },
        { header: 'Tên sản phẩm', key: 'name', width: 35 },
        { header: 'ĐVT', key: 'unit', width: 8 },
        { header: 'Tồn đầu kỳ', key: 'begin', width: 12 },
        { header: 'Nhập trong kỳ', key: 'import', width: 12 },
        { header: 'Giá trị nhập', key: 'importValue', width: 15 },
        { header: 'Xuất trong kỳ', key: 'export', width: 12 },
        { header: 'Doanh thu xuất', key: 'exportValue', width: 15 },
        { header: 'Tồn cuối kỳ', key: 'end', width: 12 }
    ];

    const headerRow = worksheet.getRow(5);
    headerRow.values = ['STT', 'Mã SP', 'Tên sản phẩm', 'ĐVT', 'Tồn đầu kỳ', 'Nhập trong kỳ', 'Giá trị nhập', 'Xuất trong kỳ', 'Doanh thu xuất', 'Tồn cuối kỳ'];
    styleHeaderRow(headerRow, worksheet);

    let totalBegin = 0, totalImport = 0, totalImportValue = 0, totalExport = 0, totalExportValue = 0, totalEnd = 0;
    let rowIndex = 6;

    for (let i = 0; i < products.length; i++) {
        const p = products[i];
        const sold = soldMap[p.id] || { quantity: 0, value: 0 };
        const imported = importedMap[p.id] || { quantity: 0, value: 0 };

        // Beginning = Current stock + Sold - Imported
        const beginStock = p.stock + sold.quantity - imported.quantity;
        const endStock = p.stock;

        totalBegin += beginStock;
        totalImport += imported.quantity;
        totalImportValue += imported.value;
        totalExport += sold.quantity;
        totalExportValue += sold.value;
        totalEnd += endStock;

        const row = worksheet.getRow(rowIndex);
        row.values = [
            i + 1,
            p.id,
            p.name,
            'Cái',
            beginStock,
            imported.quantity,
            imported.value,
            sold.quantity,
            sold.value,
            endStock
        ];

        row.getCell(7).numFmt = '#,##0';
        row.getCell(9).numFmt = '#,##0';

        rowIndex++;
    }

    // Summary
    const summaryRow = worksheet.getRow(rowIndex + 1);
    summaryRow.values = ['', '', 'TỔNG CỘNG', '', totalBegin, totalImport, totalImportValue, totalExport, totalExportValue, totalEnd];
    summaryRow.font = { bold: true };
    summaryRow.getCell(7).numFmt = '#,##0';
    summaryRow.getCell(9).numFmt = '#,##0';

    return worksheet;
}

// ====================
// 3. TỔNG HỢP DOANH THU
// ====================
async function generateRevenueSummary(workbook, start, end, dateRange) {
    const worksheet = workbook.addWorksheet('Tổng Hợp Doanh Thu');

    const orders = await dbAll(`
        SELECT * FROM orders 
        WHERE timestamp >= ? AND timestamp <= ?
    `, [start.getTime(), end.getTime()]);

    const products = await dbAll('SELECT * FROM products');

    // Aggregate by product
    const productStats = {};
    for (const order of orders) {
        const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
        for (const item of items) {
            const key = item.id || item.name;
            if (!productStats[key]) {
                productStats[key] = {
                    name: item.displayName || item.name,
                    id: item.id,
                    quantity: 0,
                    revenue: 0
                };
            }
            productStats[key].quantity += item.quantity;
            productStats[key].revenue += (item.finalPrice || item.price) * item.quantity;
        }
    }

    // Sort by revenue
    const sortedStats = Object.values(productStats).sort((a, b) => b.revenue - a.revenue);
    const totalRevenue = sortedStats.reduce((s, p) => s + p.revenue, 0);

    addReportHeader(worksheet, 'BÁO CÁO TỔNG HỢP DOANH THU THEO SẢN PHẨM', dateRange);

    worksheet.columns = [
        { header: 'STT', key: 'stt', width: 6 },
        { header: 'Mã SP', key: 'id', width: 10 },
        { header: 'Tên sản phẩm', key: 'name', width: 35 },
        { header: 'Thương hiệu', key: 'brand', width: 15 },
        { header: 'Danh mục', key: 'category', width: 15 },
        { header: 'Số lượng bán', key: 'quantity', width: 12 },
        { header: 'Doanh thu (VNĐ)', key: 'revenue', width: 18 },
        { header: 'Tỷ lệ (%)', key: 'percentage', width: 10 }
    ];

    const headerRow = worksheet.getRow(5);
    headerRow.values = ['STT', 'Mã SP', 'Tên sản phẩm', 'Thương hiệu', 'Danh mục', 'Số lượng bán', 'Doanh thu (VNĐ)', 'Tỷ lệ (%)'];
    styleHeaderRow(headerRow, worksheet);

    let rowIndex = 6;
    let totalQty = 0;

    for (let i = 0; i < sortedStats.length; i++) {
        const stat = sortedStats[i];
        const product = products.find(p => p.id === stat.id) || {};
        const percentage = totalRevenue > 0 ? ((stat.revenue / totalRevenue) * 100).toFixed(2) : 0;

        totalQty += stat.quantity;

        const row = worksheet.getRow(rowIndex);
        row.values = [
            i + 1,
            stat.id || '',
            stat.name,
            product.brand || '',
            product.category || '',
            stat.quantity,
            stat.revenue,
            `${percentage}%`
        ];

        row.getCell(7).numFmt = '#,##0';

        rowIndex++;
    }

    // Summary
    const summaryRow = worksheet.getRow(rowIndex + 1);
    summaryRow.values = ['', '', 'TỔNG CỘNG', '', '', totalQty, totalRevenue, '100%'];
    summaryRow.font = { bold: true };
    summaryRow.getCell(7).numFmt = '#,##0';

    return worksheet;
}

// ====================
// 4. SỔ CHI TIẾT NHẬP HÀNG
// ====================
async function generateImportDetail(workbook, start, end, dateRange) {
    const worksheet = workbook.addWorksheet('Sổ Chi Tiết Nhập Hàng');

    const imports = await dbAll(`
        SELECT * FROM import_notes 
        WHERE timestamp >= ? AND timestamp <= ?
        ORDER BY timestamp DESC
    `, [start.getTime(), end.getTime()]);

    addReportHeader(worksheet, 'SỔ CHI TIẾT NHẬP HÀNG', dateRange);

    worksheet.columns = [
        { header: 'Ngày', key: 'date', width: 12 },
        { header: 'Mã phiếu', key: 'code', width: 20 },
        { header: 'Tên sản phẩm', key: 'product', width: 35 },
        { header: 'Số lượng nhập', key: 'quantity', width: 12 },
        { header: 'Giá nhập', key: 'price', width: 15 },
        { header: 'Thành tiền', key: 'total', width: 15 },
        { header: 'Ghi chú', key: 'note', width: 25 }
    ];

    const headerRow = worksheet.getRow(5);
    headerRow.values = ['Ngày', 'Mã phiếu', 'Tên sản phẩm', 'Số lượng nhập', 'Giá nhập', 'Thành tiền', 'Ghi chú'];
    styleHeaderRow(headerRow, worksheet);

    let totalValue = 0;
    let totalQty = 0;
    let rowIndex = 6;

    for (const imp of imports) {
        const items = typeof imp.items === 'string' ? JSON.parse(imp.items) : imp.items;
        const impDate = formatDateVN(imp.timestamp);

        for (const item of items) {
            const itemTotal = (item.importPrice || item.price) * item.quantity;
            totalValue += itemTotal;
            totalQty += item.quantity;

            const row = worksheet.getRow(rowIndex);
            row.values = [
                impDate,
                imp.id,
                item.name,
                item.quantity,
                item.importPrice || item.price,
                itemTotal,
                imp.note || ''
            ];

            row.getCell(5).numFmt = '#,##0';
            row.getCell(6).numFmt = '#,##0';

            rowIndex++;
        }
    }

    // Summary
    const summaryRow = worksheet.getRow(rowIndex + 1);
    summaryRow.values = ['', '', 'TỔNG CỘNG', totalQty, '', totalValue, ''];
    summaryRow.font = { bold: true };
    summaryRow.getCell(6).numFmt = '#,##0';

    // Stats
    const statsRow = worksheet.getRow(rowIndex + 3);
    statsRow.values = [`Tổng số phiếu nhập: ${imports.length}`, '', '', '', '', '', `Ngày xuất: ${formatDateVN(new Date())}`];

    return worksheet;
}

module.exports = { router, initDB };
