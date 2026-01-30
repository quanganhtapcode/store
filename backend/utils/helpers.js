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

const getVietnamTime = (date = new Date()) => {
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    return new Date(utc + (3600000 * 7));
};

const getDayRangeVI = (dateStr) => {
    if (!dateStr) return null;
    return {
        start: new Date(`${dateStr}T00:00:00+07:00`).getTime(),
        end: new Date(`${dateStr}T23:59:59.999+07:00`).getTime()
    };
};

const generateOrderCode = (index) => {
    const vnDate = getVietnamTime();
    const dateStr = vnDate.toISOString().slice(0, 10).replace(/-/g, '');
    const seq = String(index).padStart(4, '0');
    return `ORD-${dateStr}-${seq}`;
};

module.exports = {
    validateProduct,
    validateOrder,
    validateImport,
    generateId,
    generateOrderCode,
    getVietnamTime,
    getDayRangeVI
};
