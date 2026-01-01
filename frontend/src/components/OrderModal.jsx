import React, { useState } from 'react';
import { X, Trash2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// --- Order Modal Component (Full Edit) ---
const OrderModal = ({ order, authToken, onClose, onSave }) => {
    const initialItems = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);

    const [formData, setFormData] = useState({
        customer_name: order.customer_name || 'Khách lẻ',
        payment_method: order.payment_method || 'cash',
        status: order.status || 'completed',
        note: order.note || ''
    });
    const [editItems, setEditItems] = useState(initialItems);
    const [isEditing, setIsEditing] = useState(false);

    // Calculate total from items
    const calculatedTotal = editItems.reduce((sum, item) => sum + ((item.finalPrice || 0) * item.quantity), 0);

    // Update item quantity
    const updateItemQuantity = (idx, newQty) => {
        if (newQty < 1) return;
        setEditItems(prev => prev.map((item, i) => i === idx ? { ...item, quantity: newQty } : item));
    };

    // Update item price
    const updateItemPrice = (idx, newPrice) => {
        setEditItems(prev => prev.map((item, i) => i === idx ? { ...item, finalPrice: newPrice } : item));
    };

    // Remove item
    const removeItem = (idx) => {
        if (editItems.length <= 1) {
            alert('Đơn hàng phải có ít nhất 1 sản phẩm!');
            return;
        }
        setEditItems(prev => prev.filter((_, i) => i !== idx));
    };

    const handleDelete = async () => {
        if (!window.confirm('Bạn có chắc muốn xóa đơn này? Hành động này sẽ hoàn lại kho cho các sản phẩm.')) return;

        try {
            const res = await fetch(`${API_URL}/orders/${order.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            if (res.ok) {
                onSave();
            } else {
                const data = await res.json();
                alert(data.error || 'Không thể xóa đơn hàng');
            }
        } catch (e) { console.error(e); alert('Lỗi kết nối khi xóa đơn'); }
    };

    const handleSubmit = async () => {
        try {
            const payload = {
                ...formData,
                items: editItems,
                total: calculatedTotal
            };

            await fetch(`${API_URL}/orders/${order.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            onSave();
        } catch (e) { console.error(e); }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center animate-in fade-in">
            <div className="bg-white w-full sm:max-w-lg max-h-[90vh] rounded-t-[2rem] sm:rounded-[2rem] flex flex-col shadow-2xl animate-in slide-in-from-bottom-20 overflow-hidden">
                <div className="p-4 border-b border-[#F5F5F7] flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-[16px]">{order.order_code || `Đơn #${order.id}`}</h3>
                        <p className="text-[12px] text-[#86868B]">{new Date(order.timestamp).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${isEditing ? 'bg-[#FF9500] text-white' : 'bg-[#F5F5F7] text-[#1D1D1F]'}`}
                        >
                            {isEditing ? '🔓 Đang sửa' : '✏️ Sửa SP'}
                        </button>
                        <button onClick={onClose} className="p-2 bg-[#F5F5F7] rounded-full hover:bg-[#E8E8ED]"><X size={20} /></button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {/* Order Items - Editable */}
                    <div className="bg-[#F9F9FA] p-4 rounded-2xl">
                        <h4 className="font-bold text-[13px] text-[#86868B] uppercase mb-3 flex justify-between">
                            <span>Sản phẩm ({editItems.length})</span>
                            {isEditing && <span className="text-[#FF9500]">Chỉnh sửa</span>}
                        </h4>
                        <div className="space-y-3">
                            {editItems.map((item, idx) => (
                                <div key={idx} className={`p-3 rounded-xl border ${isEditing ? 'bg-white border-[#FF9500]/30' : 'bg-transparent border-[#E8E8ED]'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <p className="font-medium text-[13px] text-[#1D1D1F] flex-1 pr-2">{item.displayName || item.name}</p>
                                        {isEditing && (
                                            <button onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700 text-[11px] font-bold">
                                                ✕ Xóa
                                            </button>
                                        )}
                                    </div>

                                    {isEditing ? (
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1">
                                                <label className="text-[10px] text-[#86868B]">Đơn giá</label>
                                                <input
                                                    type="number"
                                                    value={item.finalPrice || 0}
                                                    onChange={(e) => updateItemPrice(idx, parseInt(e.target.value) || 0)}
                                                    className="w-full bg-[#F5F5F7] p-2 rounded-lg text-[13px] font-bold text-[#0071E3]"
                                                />
                                            </div>
                                            <div className="w-24">
                                                <label className="text-[10px] text-[#86868B]">SL</label>
                                                <div className="flex items-center bg-[#F5F5F7] rounded-lg">
                                                    <button onClick={() => updateItemQuantity(idx, item.quantity - 1)} className="px-2 py-2 text-[#86868B]">-</button>
                                                    <input
                                                        type="number"
                                                        value={item.quantity}
                                                        onChange={(e) => updateItemQuantity(idx, parseInt(e.target.value) || 1)}
                                                        className="w-10 bg-transparent text-center text-[13px] font-bold"
                                                    />
                                                    <button onClick={() => updateItemQuantity(idx, item.quantity + 1)} className="px-2 py-2 text-[#86868B]">+</button>
                                                </div>
                                            </div>
                                            <div className="text-right w-20">
                                                <label className="text-[10px] text-[#86868B]">Thành tiền</label>
                                                <p className="font-bold text-[#0071E3] text-[13px]">{((item.finalPrice || 0) * item.quantity).toLocaleString()}đ</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex justify-between items-center">
                                            <p className="text-[11px] text-[#86868B]">{item.finalPrice?.toLocaleString()}đ x {item.quantity}</p>
                                            <span className="font-bold text-[#0071E3]">{((item.finalPrice || 0) * item.quantity).toLocaleString()}đ</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between items-center pt-3 mt-3 border-t-2 border-[#1D1D1F]">
                            <span className="font-bold text-[#1D1D1F]">Tổng cộng</span>
                            <span className={`font-black text-[20px] ${calculatedTotal !== order.total ? 'text-[#FF9500]' : 'text-[#0071E3]'}`}>
                                {calculatedTotal.toLocaleString()}đ
                                {calculatedTotal !== order.total && (
                                    <span className="text-[11px] text-[#86868B] font-normal ml-2">(cũ: {order.total?.toLocaleString()}đ)</span>
                                )}
                            </span>
                        </div>
                    </div>

                    {/* Customer Info */}
                    <div className="space-y-4">
                        <div>
                            <label className="text-[11px] font-bold uppercase text-[#86868B] ml-1">Tên khách hàng</label>
                            <input
                                value={formData.customer_name}
                                onChange={e => setFormData({ ...formData, customer_name: e.target.value })}
                                className="w-full bg-[#F9F9FA] p-3 rounded-xl font-medium outline-none mt-1"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[11px] font-bold uppercase text-[#86868B] ml-1">Thanh toán</label>
                                <select
                                    value={formData.payment_method}
                                    onChange={e => setFormData({ ...formData, payment_method: e.target.value })}
                                    className="w-full bg-[#F9F9FA] p-3 rounded-xl font-medium outline-none mt-1"
                                >
                                    <option value="cash">Tiền mặt</option>
                                    <option value="transfer">Chuyển khoản</option>
                                    <option value="momo">MoMo</option>
                                    <option value="card">Thẻ</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[11px] font-bold uppercase text-[#86868B] ml-1">Trạng thái</label>
                                <select
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full bg-[#F9F9FA] p-3 rounded-xl font-medium outline-none mt-1"
                                >
                                    <option value="completed">Hoàn thành</option>
                                    <option value="pending">Đang xử lý</option>
                                    <option value="cancelled">Đã huỷ</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-[11px] font-bold uppercase text-[#86868B] ml-1">Ghi chú</label>
                            <textarea
                                value={formData.note}
                                onChange={e => setFormData({ ...formData, note: e.target.value })}
                                placeholder="Thêm ghi chú..."
                                className="w-full bg-[#F9F9FA] p-3 rounded-xl font-medium outline-none mt-1 min-h-[60px] resize-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-[#F5F5F7] flex gap-3">
                    <button onClick={handleDelete} className="bg-red-50 text-red-500 w-16 h-14 rounded-2xl flex items-center justify-center font-bold active:scale-95 transition-all hover:bg-red-100">
                        <Trash2 size={22} />
                    </button>
                    <button onClick={handleSubmit} className="flex-1 bg-[#0071E3] text-white py-4 rounded-2xl font-bold text-[16px] shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-transform">
                        💾 Lưu thay đổi
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderModal;
