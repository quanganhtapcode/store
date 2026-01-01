import React, { useState, useEffect, useCallback } from 'react';
import { X, TrendingUp, Package, ShoppingBag, DollarSign, BarChart3, Calendar } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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

    useEffect(() => {
        if (isOpen) fetchStats();
    }, [isOpen, fetchStats]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden border border-white/10">
                {/* Header */}
                <div className="relative p-6 pb-4">
                    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-3xl"></div>
                    <div className="relative flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-black text-white">Thống kê</h2>
                            <p className="text-white/50 text-sm mt-1">Tổng quan doanh thu & kho hàng</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 pt-2 space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <>
                            {/* Main Stats Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                {/* Today Revenue */}
                                <div className="col-span-2 bg-gradient-to-br from-emerald-500 to-teal-600 p-5 rounded-2xl relative overflow-hidden">
                                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                                    <div className="relative">
                                        <div className="flex items-center gap-2 text-white/80 text-xs font-bold uppercase tracking-wider">
                                            <DollarSign size={14} />
                                            Doanh thu hôm nay
                                        </div>
                                        <p className="text-3xl font-black text-white mt-2">
                                            {stats.todayRevenue?.toLocaleString()}đ
                                        </p>
                                        <p className="text-white/70 text-sm mt-1">
                                            {stats.todayOrders} đơn hàng
                                        </p>
                                    </div>
                                </div>

                                {/* Month Revenue */}
                                <div className="bg-white/5 backdrop-blur p-4 rounded-2xl border border-white/10">
                                    <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider">
                                        <Calendar size={14} />
                                        Tháng này
                                    </div>
                                    <p className="text-xl font-black text-white mt-2">
                                        {stats.monthRevenue?.toLocaleString()}đ
                                    </p>
                                </div>

                                {/* Products Count */}
                                <div className="bg-white/5 backdrop-blur p-4 rounded-2xl border border-white/10">
                                    <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider">
                                        <Package size={14} />
                                        Kho hàng
                                    </div>
                                    <p className="text-xl font-black text-white mt-2">
                                        {stats.totalProducts} <span className="text-sm font-normal text-white/50">sản phẩm</span>
                                    </p>
                                    {stats.lowStockCount > 0 && (
                                        <p className="text-amber-400 text-xs mt-1">
                                            ⚠️ {stats.lowStockCount} sắp hết
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Top Products */}
                            <div className="bg-white/5 backdrop-blur rounded-2xl p-4 border border-white/10">
                                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-3">
                                    <TrendingUp size={14} />
                                    Top bán chạy
                                </div>
                                <div className="space-y-2">
                                    {stats.topProducts?.slice(0, 5).map((p, i) => (
                                        <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                            <div className="flex items-center gap-3">
                                                <span className="w-6 h-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center text-xs font-bold text-white">
                                                    {i + 1}
                                                </span>
                                                <span className="text-white/90 text-sm font-medium truncate max-w-[180px]">
                                                    {p.name}
                                                </span>
                                            </div>
                                            <span className="text-emerald-400 text-xs font-bold">
                                                {p.total_sold} đã bán
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 pb-6">
                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-white/10 hover:bg-white/15 text-white font-bold rounded-2xl transition-all active:scale-[0.98]"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StatsModal;
