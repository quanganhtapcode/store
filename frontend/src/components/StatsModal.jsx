import React, { useState, useEffect, useCallback } from 'react';
import { X, TrendingUp, Package, DollarSign, Calendar, ShoppingBag } from 'lucide-react';

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
        <div className="fixed inset-0 bg-[#1D1D1F]/60 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center animate-in fade-in">
            <div className="bg-white w-full sm:max-w-md h-[85vh] sm:h-auto rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-10">
                {/* Header */}
                <div className="p-5 border-b border-[#F5F5F7] flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-black text-[#1D1D1F]">Thống kê</h2>
                            <p className="text-[#86868B] text-xs mt-0.5 font-medium">Tổng quan doanh thu & kho hàng</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 bg-[#F5F5F7] hover:bg-[#E8E8ED] rounded-full flex items-center justify-center text-[#1D1D1F] transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="w-8 h-8 border-3 border-[#0071E3] border-t-transparent rounded-full animate-spin"></div>
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
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-[#F5F5F7] flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-[#F5F5F7] hover:bg-[#E8E8ED] text-[#1D1D1F] font-bold rounded-2xl transition-all active:scale-[0.98]"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StatsModal;
