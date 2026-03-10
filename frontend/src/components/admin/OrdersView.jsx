import React, { useState } from 'react';
import {
    Receipt, Calendar, Search, ChevronRight, X, Package
} from 'lucide-react';
import OrderModal from '../OrderModal';

const OrdersView = ({ orders, dateFilter, setDateFilter, fetchOrders, authToken }) => {
    const [editingOrder, setEditingOrder] = useState(null);

    const filteredOrders = orders.filter(o => {
        if (!dateFilter.start && !dateFilter.end) return true;
        const orderDate = new Date(o.timestamp);
        if (dateFilter.start) {
            const startDate = new Date(dateFilter.start);
            startDate.setHours(0, 0, 0, 0);
            if (orderDate < startDate) return false;
        }
        if (dateFilter.end) {
            const endDate = new Date(dateFilter.end);
            endDate.setHours(23, 59, 59, 999);
            if (orderDate > endDate) return false;
        }
        return true;
    });

    const totalFiltered = filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    return (
        <div className="space-y-5 animate-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-[20px] font-bold text-gray-900">Đơn hàng</h2>
                    <p className="text-[13px] text-gray-400">{filteredOrders.length} đơn hàng</p>
                </div>
            </div>

            {/* Date Filter */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {[
                        { label: '📅 Hôm nay', action: () => { const d = new Date(); setDateFilter({ start: d.toISOString().split('T')[0], end: '' }); } },
                        { label: '7 ngày', action: () => { const d = new Date(); d.setDate(d.getDate() - 7); setDateFilter({ start: d.toISOString().split('T')[0], end: '' }); } },
                        { label: 'Tháng này', action: () => { const d = new Date(); d.setDate(1); setDateFilter({ start: d.toISOString().split('T')[0], end: '' }); } },
                        { label: 'Tất cả', action: () => setDateFilter({ start: '', end: '' }) },
                    ].map((btn, idx) => (
                        <button
                            key={idx}
                            onClick={btn.action}
                            className="px-4 py-2 rounded-xl text-[12px] font-bold flex-shrink-0 bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all border border-gray-100"
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>
                <div className="flex gap-3 mt-3">
                    <div className="flex-1">
                        <label className="text-[10px] text-gray-400 font-bold uppercase">Từ ngày</label>
                        <input type="date" value={dateFilter.start} onChange={e => setDateFilter({ ...dateFilter, start: e.target.value })} className="w-full bg-gray-50 px-3 py-2 rounded-xl text-[12px] font-medium outline-none border border-gray-200 focus:border-blue-400" />
                    </div>
                    <div className="flex-1">
                        <label className="text-[10px] text-gray-400 font-bold uppercase">Đến ngày</label>
                        <input type="date" value={dateFilter.end} onChange={e => setDateFilter({ ...dateFilter, end: e.target.value })} className="w-full bg-gray-50 px-3 py-2 rounded-xl text-[12px] font-medium outline-none border border-gray-200 focus:border-blue-400" />
                    </div>
                </div>
            </div>

            {/* Summary */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-2xl flex justify-between items-center text-white shadow-lg shadow-blue-500/20">
                <span className="text-[13px] font-bold opacity-90">{filteredOrders.length} đơn hàng</span>
                <span className="text-[18px] font-black">Tổng: {totalFiltered.toLocaleString()}đ</span>
            </div>

            {/* Orders List */}
            {filteredOrders.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                    <Package size={48} className="mx-auto mb-3 text-gray-200" />
                    <p className="font-bold text-gray-400">Không có đơn hàng trong khoảng thời gian này</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredOrders.map(o => {
                        const items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
                        return (
                            <div
                                key={o.id}
                                onClick={() => setEditingOrder(o)}
                                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 active:scale-[0.99] transition-all cursor-pointer hover:shadow-lg hover:border-gray-200 group"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="font-bold text-[14px] text-gray-900 flex items-center gap-2 flex-wrap">
                                            {o.order_code || `#${o.id}`}
                                            <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold ${o.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : o.status === 'cancelled' ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-600'}`}>
                                                {o.status === 'completed' ? '✓ Hoàn thành' : o.status === 'cancelled' ? '✗ Đã hủy' : o.status || 'completed'}
                                            </span>
                                            <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-lg text-gray-500">
                                                {o.payment_method === 'transfer' ? '💳 CK' : '💵 TM'}
                                            </span>
                                        </p>
                                        <p className="text-[12px] text-gray-400 mt-0.5">{new Date(o.timestamp).toLocaleString('vi-VN')}</p>
                                        {o.customer_name && o.customer_name !== 'Khách lẻ' && (
                                            <p className="text-[12px] text-gray-600 font-medium mt-1">👤 {o.customer_name}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-black text-blue-600 text-[16px]">{o.total?.toLocaleString()}đ</span>
                                        <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                                    </div>
                                </div>
                                <div className="text-[11px] text-gray-400 border-t border-gray-50 pt-2 mt-2">
                                    {items?.slice(0, 3).map((item, idx) => (
                                        <span key={idx} className="inline-block bg-gray-50 px-2 py-0.5 rounded-lg mr-1 mb-1 text-gray-600">
                                            {item.displayName || item.name} ×{item.quantity}
                                        </span>
                                    ))}
                                    {items?.length > 3 && <span className="text-blue-500 font-medium">+{items.length - 3} khác</span>}
                                </div>
                                {o.note && <p className="text-[11px] text-gray-400 mt-2 italic">📝 {o.note}</p>}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Order Modal */}
            {editingOrder && (
                <OrderModal
                    order={editingOrder}
                    authToken={authToken}
                    onClose={() => setEditingOrder(null)}
                    onSave={() => { fetchOrders(); setEditingOrder(null); }}
                />
            )}
        </div>
    );
};

export default OrdersView;
