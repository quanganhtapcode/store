const validateProduct = (data) => {
    const errors = [];
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
        errors.push('Tên sản phẩm không được để trống');
    }
    if (data.price === undefined || isNaN(data.price) || data.price < 0) {
        errors.push('Giá bán không hợp lệ');
    }
    if (data.stock === undefined || isNaN(data.stock) || data.stock < 0) {
        errors.push('Tồn kho không hợp lệ');
    }
    return errors;
};

const validateOrder = (data) => {
    const errors = [];
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
        errors.push('Đơn hàng phải có ít nhất 1 sản phẩm');
    }
    if (!data.total || isNaN(data.total) || data.total < 0) {
        errors.push('Tổng tiền không hợp lệ');
    }
    return errors;
};

const validateImport = (data) => {
    const errors = [];
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
        errors.push('Phải nhập ít nhất 1 sản phẩm');
    }
    if (data.total_cost !== undefined && (isNaN(data.total_cost) || data.total_cost < 0)) {
        errors.push('Tổng chi phí không hợp lệ');
    }
    return errors;
};

const generateId = (prefix) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return `${prefix}-${result}`;
};

const getVNTodayStr = () => {
    return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
};

const getDayRangeVI = (dateStr) => {
    if (!dateStr) return null;
    // Input is YYYY-MM-DD
    // Create direct date object with explicit VN offset
    const start = new Date(`${dateStr}T00:00:00+07:00`).getTime();
    const end = new Date(`${dateStr}T23:59:59.999+07:00`).getTime();

    // Fallback if the above fails to parse correctly (returns NaN)
    if (isNaN(start)) {
        const parts = dateStr.split('-');
        const y = parseInt(parts[0]);
        const m = parseInt(parts[1]) - 1;
        const d = parseInt(parts[2]);

        // UTC Jan 30 00:00:00 is VN Jan 30 07:00:00
        const utcMidnight = Date.UTC(y, m, d, 0, 0, 0);

        // Start: VN 00:00:00 = UTC -7 hours
        const vnStart = utcMidnight - (7 * 3600000);
        // End: VN 23:59:59.999 = (VN Start + 24h - 1ms)
        const vnEnd = vnStart + 86400000 - 1;

        return { start: vnStart, end: vnEnd };
    }

    return { start, end };
};

const generateOrderCode = (index) => {
    const dateStr = getVNTodayStr().replace(/-/g, '');
    const seq = String(index).padStart(4, '0');
    return `ORD-${dateStr}-${seq}`;
};

module.exports = {
    validateProduct,
    validateOrder,
    validateImport,
    generateId,
    generateOrderCode,
    getVNTodayStr,
    getDayRangeVI
};
