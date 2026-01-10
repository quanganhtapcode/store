import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, TrendingUp, Package, DollarSign, Calendar, ShoppingBag, History, ChevronRight, ArrowLeft, Image as ImageIcon } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Helper to get image URL
const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http') || imagePath.startsWith('data:')) return imagePath;
    let baseUrl = API_URL.replace(/\/api\/?$/, '');
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
    const path = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    return `${baseUrl}${path}`;
};

// Skeleton component cho loading mượt hơn
const Skeleton = ({ className }) => (
    <div className={`animate-pulse bg-gradient-to-r from-[#E8E8ED] via-[#F5F5F7] to-[#E8E8ED] bg-[length:200%_100%] rounded-xl ${className}`}
        style={{ animation: 'shimmer 1.5s infinite' }}
    />
);

const StatsModal = ({ isOpen, onClose }) => {
    const [stats, setStats] = useState({
        todayRevenue: 0,
        todayOrders: 0,
        monthRevenue: 0,
        totalProducts: 0,
        lowStockCount: 0,
        topProducts: []
    });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('stats'); // 'stats' or 'history'
    const [orders, setOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        try {
            const [statsRes, productsRes] = await Promise.all([
                fetch(`${API_URL}/stats`),
                fetch(`${API_URL}/products`)
            ]);
            const statsData = await statsRes.json();
            const products = await productsRes.json();

            const lowStock = products.filter(p => p.stock < 10).length;

            setStats({
                ...statsData,
                totalProducts: products.length,
                lowStockCount: lowStock
            });
        } catch (err) {
            console.error('Error fetching stats:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchOrders = useCallback(async () => {
        setLoadingOrders(true);
        try {
            const res = await fetch(`${API_URL}/orders?limit=50`);
            const data = await res.json();
            setOrders(data.data || data);
        } catch (err) {
            console.error('Error fetching orders:', err);
        } finally {
            setLoadingOrders(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchStats();
            if (activeTab === 'history') {
                fetchOrders();
            }
        }
    }, [isOpen, fetchStats, activeTab, fetchOrders]);

    if (!isOpen) return null;

    // Format date nicely
    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return `Hôm nay, ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
        } else if (date.toDateString() === yesterday.toDateString()) {
            return `Hôm qua, ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
        }
        return date.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Order Detail View
    const OrderDetail = ({ order }) => {
        const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;

        return (
            <div className="animate-in slide-in-from-right-5">
                <button
                    onClick={() => setSelectedOrder(null)}
                    className="flex items-center gap-2 text-[#0071E3] font-bold text-sm mb-4"
                >
                    <ArrowLeft size={16} />
                    Quay lại
                </button>

                <div className="bg-[#1D1D1F] p-4 rounded-2xl mb-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-white/60 text-xs font-bold uppercase">Mã đơn</p>
                            <p className="text-white font-bold text-lg">{order.order_code || `#${order.id}`}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-white/60 text-xs font-bold uppercase">Tổng tiền</p>
                            <p className="text-white font-black text-xl">{order.total?.toLocaleString()}đ</p>
                        </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/10 flex gap-2 flex-wrap">
                        <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${order.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                            order.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                                'bg-white/20 text-white'
                            }`}>
                            {order.status === 'completed' ? '✓ Hoàn thành' : order.status === 'cancelled' ? '✕ Đã hủy' : order.status}
                        </span>
                        <span className="text-[10px] px-2 py-1 rounded-full bg-white/10 text-white/80 font-medium">
                            {order.payment_method === 'transfer' ? '📱 Chuyển khoản' : '💵 Tiền mặt'}
                        </span>
                        <span className="text-[10px] px-2 py-1 rounded-full bg-white/10 text-white/60 font-medium">
                            {formatDate(order.timestamp)}
                        </span>
                    </div>
                </div>

                <h4 className="font-bold text-[#1D1D1F] text-sm mb-3">Chi tiết sản phẩm ({items?.length || 0})</h4>
                <div className="space-y-2">
                    {items?.map((item, idx) => (
                        <div key={idx} className="bg-white p-3 rounded-xl flex items-center gap-3 border border-[#F5F5F7]">
                            {/* Ảnh sản phẩm */}
                            <div className="w-14 h-14 bg-[#F5F5F7] rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center">
                                {item.image ? (
                                    <img
                                        src={getImageUrl(item.image)}
                                        alt={item.displayName || item.name}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                ) : (
                                    <ImageIcon size={20} className="text-[#D2D2D7]" />
                                )}
                            </div>

                            {/* Thông tin */}
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-[#1D1D1F] text-[13px] line-clamp-1">{item.displayName || item.name}</p>
                                <p className="text-[#86868B] text-[11px]">
                                    {item.finalPrice?.toLocaleString() || item.price?.toLocaleString()}đ x {item.quantity}
                                </p>
                            </div>

                            {/* Tổng tiền item */}
                            <span className="font-bold text-[#0071E3] text-[14px] flex-shrink-0">
                                {((item.finalPrice || item.price) * item.quantity).toLocaleString()}đ
                            </span>
                        </div>
                    ))}
                </div>

                {order.note && (
                    <div className="mt-4 p-3 bg-amber-50 rounded-xl">
                        <p className="text-amber-800 text-[12px]">📝 {order.note}</p>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-[#1D1D1F]/60 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center animate-in fade-in">
            <div className="bg-white w-full sm:max-w-md h-[85vh] sm:h-auto sm:max-h-[85vh] rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-10">
                {/* Header */}
                <div className="p-5 border-b border-[#F5F5F7] flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-black text-[#1D1D1F]">
                                {selectedOrder ? 'Chi tiết đơn hàng' : activeTab === 'stats' ? 'Thống kê' : 'Lịch sử bán hàng'}
                            </h2>
                            <p className="text-[#86868B] text-xs mt-0.5 font-medium">
                                {selectedOrder ? `Đơn ${selectedOrder.order_code || '#' + selectedOrder.id}` :
                                    activeTab === 'stats' ? 'Tổng quan doanh thu & kho hàng' : 'Các đơn hàng gần đây'}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 bg-[#F5F5F7] hover:bg-[#E8E8ED] rounded-full flex items-center justify-center text-[#1D1D1F] transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Tab Buttons */}
                    {!selectedOrder && (
                        <div className="flex gap-2 mt-4 bg-[#F5F5F7] p-1 rounded-xl">
                            <button
                                onClick={() => setActiveTab('stats')}
                                className={`flex-1 py-2 px-3 rounded-lg font-bold text-[12px] transition-all ${activeTab === 'stats'
                                    ? 'bg-white shadow-sm text-[#1D1D1F]'
                                    : 'text-[#86868B] hover:text-[#1D1D1F]'
                                    }`}
                            >
                                📊 Thống kê
                            </button>
                            <button
                                onClick={() => { setActiveTab('history'); fetchOrders(); }}
                                className={`flex-1 py-2 px-3 rounded-lg font-bold text-[12px] transition-all ${activeTab === 'history'
                                    ? 'bg-white shadow-sm text-[#1D1D1F]'
                                    : 'text-[#86868B] hover:text-[#1D1D1F]'
                                    }`}
                            >
                                📋 Lịch sử
                            </button>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {selectedOrder ? (
                        <OrderDetail order={selectedOrder} />
                    ) : activeTab === 'stats' ? (
                        loading ? (
                            // Skeleton Loading cho Stats
                            <div className="space-y-4">
                                <div className="bg-[#1D1D1F] p-5 rounded-2xl">
                                    <Skeleton className="h-4 w-32 mb-3 !bg-white/10" />
                                    <Skeleton className="h-10 w-48 mb-2 !bg-white/20" />
                                    <Skeleton className="h-4 w-24 !bg-white/10" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-[#F5F5F7] p-4 rounded-2xl">
                                        <Skeleton className="h-4 w-20 mb-2" />
                                        <Skeleton className="h-7 w-24" />
                                    </div>
                                    <div className="bg-[#F5F5F7] p-4 rounded-2xl">
                                        <Skeleton className="h-4 w-16 mb-2" />
                                        <Skeleton className="h-7 w-20" />
                                    </div>
                                </div>
                                <div className="bg-[#F5F5F7] rounded-2xl p-4">
                                    <Skeleton className="h-4 w-28 mb-3" />
                                    <div className="space-y-2">
                                        {[1, 2, 3, 4, 5].map(i => (
                                            <div key={i} className="flex items-center justify-between py-2.5 bg-white rounded-xl px-3">
                                                <div className="flex items-center gap-3">
                                                    <Skeleton className="w-6 h-6" />
                                                    <Skeleton className="h-4 w-32" />
                                                </div>
                                                <Skeleton className="h-4 w-12" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Today Revenue - Main Card */}
                                <div className="bg-[#1D1D1F] p-5 rounded-2xl relative overflow-hidden">
                                    <div className="relative">
                                        <div className="flex items-center gap-2 text-white/60 text-xs font-bold uppercase tracking-wider">
                                            <DollarSign size={14} />
                                            Doanh thu hôm nay
                                        </div>
                                        <p className="text-3xl font-black text-white mt-2 tracking-tight">
                                            {stats.todayRevenue?.toLocaleString()}<span className="text-lg ml-1">đ</span>
                                        </p>
                                        <p className="text-white/50 text-sm mt-1 font-medium">
                                            {stats.todayOrders} đơn hàng
                                        </p>
                                    </div>
                                </div>

                                {/* Grid Stats */}
                                <div className="grid grid-cols-2 gap-3">
                                    {/* Month Revenue */}
                                    <div className="bg-[#F5F5F7] p-4 rounded-2xl">
                                        <div className="flex items-center gap-2 text-[#86868B] text-xs font-bold uppercase tracking-wider">
                                            <Calendar size={14} />
                                            Tháng này
                                        </div>
                                        <p className="text-xl font-black text-[#1D1D1F] mt-2">
                                            {(stats.monthRevenue / 1000000).toFixed(1)}<span className="text-sm font-bold text-[#86868B] ml-1">tr</span>
                                        </p>
                                    </div>

                                    {/* Products Count */}
                                    <div className="bg-[#F5F5F7] p-4 rounded-2xl">
                                        <div className="flex items-center gap-2 text-[#86868B] text-xs font-bold uppercase tracking-wider">
                                            <Package size={14} />
                                            Kho hàng
                                        </div>
                                        <p className="text-xl font-black text-[#1D1D1F] mt-2">
                                            {stats.totalProducts}<span className="text-sm font-bold text-[#86868B] ml-1">SP</span>
                                        </p>
                                        {stats.lowStockCount > 0 && (
                                            <p className="text-amber-600 text-xs mt-1 font-bold">
                                                ⚠️ {stats.lowStockCount} sắp hết
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Top Products */}
                                <div className="bg-[#F5F5F7] rounded-2xl p-4">
                                    <div className="flex items-center gap-2 text-[#1D1D1F] text-xs font-bold uppercase tracking-wider mb-3">
                                        <TrendingUp size={14} />
                                        Top bán chạy
                                    </div>
                                    <div className="space-y-2">
                                        {stats.topProducts?.slice(0, 5).map((p, i) => (
                                            <div key={i} className="flex items-center justify-between py-2.5 bg-white rounded-xl px-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-6 h-6 bg-[#1D1D1F] rounded-lg flex items-center justify-center text-xs font-bold text-white">
                                                        {i + 1}
                                                    </span>
                                                    <span className="text-[#1D1D1F] text-sm font-medium truncate max-w-[160px]">
                                                        {p.name}
                                                    </span>
                                                </div>
                                                <span className="text-[#0071E3] text-xs font-bold">
                                                    {p.total_sold} bán
                                                </span>
                                            </div>
                                        ))}
                                        {(!stats.topProducts || stats.topProducts.length === 0) && (
                                            <p className="text-center text-[#86868B] text-sm py-4">Chưa có dữ liệu</p>
                                        )}
                                    </div>
                                </div>
                            </>
                        )
                    ) : (
                        // History Tab
                        loadingOrders ? (
                            <div className="flex items-center justify-center py-16">
                                <div className="w-8 h-8 border-3 border-[#0071E3] border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : orders.length === 0 ? (
                            <div className="text-center py-16">
                                <History size={48} className="mx-auto text-[#D2D2D7] mb-3" />
                                <p className="text-[#86868B] font-medium">Chưa có đơn hàng nào</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {orders.map(order => {
                                    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
                                    return (
                                        <div
                                            key={order.id}
                                            onClick={() => setSelectedOrder(order)}
                                            className="bg-white p-4 rounded-2xl border border-[#F5F5F7] active:scale-[0.98] transition-all cursor-pointer hover:border-[#0071E3]/30"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-bold text-[#1D1D1F] text-[14px]">
                                                            {order.order_code || `#${order.id}`}
                                                        </span>
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${order.payment_method === 'transfer'
                                                            ? 'bg-blue-100 text-blue-700'
                                                            : 'bg-green-100 text-green-700'
                                                            }`}>
                                                            {order.payment_method === 'transfer' ? '📱 CK' : '💵 TM'}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-[#86868B] mt-1">
                                                        {formatDate(order.timestamp)}
                                                    </p>
                                                    <div className="flex gap-1.5 mt-2 flex-wrap">
                                                        {items?.slice(0, 2).map((item, idx) => (
                                                            <span key={idx} className="text-[10px] bg-[#F5F5F7] px-2 py-0.5 rounded-md text-[#1D1D1F] font-medium">
                                                                {(item.displayName || item.name).slice(0, 15)}{(item.displayName || item.name).length > 15 ? '...' : ''} x{item.quantity}
                                                            </span>
                                                        ))}
                                                        {items?.length > 2 && (
                                                            <span className="text-[10px] text-[#0071E3] font-bold">+{items.length - 2}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-[#0071E3] text-[16px]">
                                                        {order.total?.toLocaleString()}đ
                                                    </span>
                                                    <ChevronRight size={18} className="text-[#86868B]" />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-[#F5F5F7] flex-shrink-0">
                    <button
                        onClick={selectedOrder ? () => setSelectedOrder(null) : onClose}
                        className="w-full py-4 bg-[#F5F5F7] hover:bg-[#E8E8ED] text-[#1D1D1F] font-bold rounded-2xl transition-all active:scale-[0.98]"
                    >
                        {selectedOrder ? 'Quay lại danh sách' : 'Đóng'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StatsModal;
