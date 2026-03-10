import React, { useState, useEffect, useCallback } from 'react';
import {
    BarChart3, Package, Truck, Receipt, FileText, LogOut,
    ShieldCheck, Menu, X, ChevronLeft, Users, Settings,
    Home, ChevronRight, Bell, Search
} from 'lucide-react';
import DashboardView from './DashboardView';
import ProductsView from './ProductsView';
import ImportView from './ImportView';
import OrdersView from './OrdersView';
import SuppliersView from './SuppliersView';
import LogsView from './LogsView';
import SettingsView from './SettingsView';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const MENU_ITEMS = [
    { id: 'dashboard', label: 'Tổng quan', icon: Home, group: 'main' },
    { id: 'products', label: 'Sản phẩm', icon: Package, group: 'main' },
    { id: 'orders', label: 'Đơn hàng', icon: Receipt, group: 'main' },
    { id: 'import', label: 'Nhập hàng', icon: Truck, group: 'inventory' },
    { id: 'suppliers', label: 'Nhà cung cấp', icon: Users, group: 'inventory' },
    { id: 'logs', label: 'Nhật ký', icon: FileText, group: 'system' },
    { id: 'settings', label: 'Cài đặt', icon: Settings, group: 'system' },
];

const GROUP_LABELS = {
    main: 'Chính',
    inventory: 'Kho hàng',
    system: 'Hệ thống',
};

const AdminLayout = ({ products, history, refreshData, onBackToPos, authToken, authUser, onLogout }) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Data states
    const [orders, setOrders] = useState([]);
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState({ todayRevenue: 0, todayOrders: 0, monthRevenue: 0, topProducts: [], productsMonthly: [] });
    const [analyticsData, setAnalyticsData] = useState(null);
    const [suppliers, setSuppliers] = useState([]);
    const [dateFilter, setDateFilter] = useState({ start: '', end: '' });

    // Fetchers
    const fetchOrders = useCallback(async () => {
        let url = `${API_URL}/orders?limit=100`;
        if (dateFilter.start && dateFilter.end) url += `&startDate=${dateFilter.start}&endDate=${dateFilter.end}`;
        const res = await fetch(url);
        const data = await res.json();
        setOrders(data.data || data);
    }, [dateFilter]);

    const fetchLogs = useCallback(async () => {
        const res = await fetch(`${API_URL}/logs`);
        setLogs(await res.json());
    }, []);

    const fetchStats = useCallback(async () => {
        try {
            const [res, prodRes] = await Promise.all([
                fetch(`${API_URL}/stats`),
                fetch(`${API_URL}/stats/monthly-products`)
            ]);
            const data = await res.json();
            const prodData = await prodRes.json();
            setStats({ ...data, productsMonthly: prodData });
        } catch (e) { console.error(e); }
    }, []);

    const fetchAnalytics = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/stats/detailed`);
            const data = await res.json();
            setAnalyticsData(data);
        } catch (e) { console.error('Analytics fetch error:', e); }
    }, []);

    const fetchSuppliers = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/suppliers`);
            setSuppliers(await res.json());
        } catch (e) { console.error(e); }
    }, []);

    useEffect(() => {
        if (activeTab === 'orders') fetchOrders();
        if (activeTab === 'logs') fetchLogs();
        if (activeTab === 'dashboard') { fetchStats(); fetchAnalytics(); }
        if (activeTab === 'suppliers') fetchSuppliers();
        if (activeTab === 'import') fetchSuppliers();
    }, [activeTab, fetchOrders, fetchLogs, fetchStats, fetchAnalytics, fetchSuppliers]);

    const handleSetup2FA = async () => {
        try {
            const res = await fetch(`${API_URL}/auth/2fa/setup`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const data = await res.json();
            if (data.qrCode) {
                alert('2FA QR Code ready');
            } else {
                if (data.error && data.error.includes('phiên')) onLogout();
                else alert("Lỗi: " + (data.error || 'Server error'));
            }
        } catch (e) { console.error(e); alert("Lỗi kết nối"); }
    };

    // Group menu items
    const groupedMenu = {};
    MENU_ITEMS.forEach(item => {
        if (!groupedMenu[item.group]) groupedMenu[item.group] = [];
        groupedMenu[item.group].push(item);
    });

    const currentPage = MENU_ITEMS.find(m => m.id === activeTab);

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <DashboardView stats={stats} products={products} analyticsData={analyticsData} setActiveTab={setActiveTab} orders={orders} />;
            case 'products':
                return <ProductsView products={products} refreshData={refreshData} authToken={authToken} onLogout={onLogout} />;
            case 'import':
                return <ImportView products={products} suppliers={suppliers} refreshData={refreshData} authToken={authToken} onLogout={onLogout} />;
            case 'orders':
                return <OrdersView orders={orders} dateFilter={dateFilter} setDateFilter={setDateFilter} fetchOrders={fetchOrders} authToken={authToken} />;
            case 'suppliers':
                return <SuppliersView suppliers={suppliers} refreshSuppliers={fetchSuppliers} authToken={authToken} onLogout={onLogout} />;
            case 'logs':
                return <LogsView logs={logs} />;
            case 'settings':
                return <SettingsView authUser={authUser} authToken={authToken} onLogout={onLogout} handleSetup2FA={handleSetup2FA} />;
            default:
                return <DashboardView stats={stats} products={products} analyticsData={analyticsData} setActiveTab={setActiveTab} orders={orders} />;
        }
    };

    return (
        <div className="flex h-screen bg-[#f0f2f5] font-['Inter'] overflow-hidden">
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed lg:static inset-y-0 left-0 z-50
                bg-[#0f172a] text-white
                flex flex-col
                transform transition-all duration-300 ease-in-out
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                ${sidebarCollapsed ? 'w-[72px]' : 'w-[260px]'}
                shadow-2xl lg:shadow-none
            `}>
                {/* Logo Area */}
                <div className={`h-16 flex items-center border-b border-white/10 flex-shrink-0 ${sidebarCollapsed ? 'justify-center px-2' : 'px-5'}`}>
                    {!sidebarCollapsed ? (
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
                                    <BarChart3 size={18} className="text-white" />
                                </div>
                                <div>
                                    <h1 className="font-black text-[15px] tracking-tight">Admin Panel</h1>
                                    <p className="text-[10px] text-blue-300/70 font-medium">Quản trị hệ thống</p>
                                </div>
                            </div>
                            <button onClick={() => setSidebarOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg lg:hidden">
                                <X size={18} />
                            </button>
                        </div>
                    ) : (
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center">
                            <BarChart3 size={18} />
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4 scrollbar-hide">
                    {Object.entries(groupedMenu).map(([group, items]) => (
                        <div key={group} className="mb-2">
                            {!sidebarCollapsed && (
                                <p className="px-5 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">
                                    {GROUP_LABELS[group]}
                                </p>
                            )}
                            <div className="space-y-0.5 px-3">
                                {items.map(item => {
                                    const isActive = activeTab === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                                            className={`
                                                w-full flex items-center gap-3 rounded-xl transition-all duration-200
                                                ${sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'}
                                                ${isActive
                                                    ? 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-400 shadow-inner'
                                                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                                }
                                            `}
                                            title={sidebarCollapsed ? item.label : ''}
                                        >
                                            <item.icon size={19} className={isActive ? 'text-blue-400' : 'text-slate-500'} />
                                            {!sidebarCollapsed && (
                                                <span className={`text-[13px] font-semibold ${isActive ? 'text-blue-300' : ''}`}>
                                                    {item.label}
                                                </span>
                                            )}
                                            {isActive && !sidebarCollapsed && (
                                                <div className="ml-auto w-1.5 h-1.5 bg-blue-400 rounded-full" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Sidebar Footer */}
                <div className={`border-t border-white/10 p-3 flex-shrink-0 ${sidebarCollapsed ? 'flex flex-col items-center gap-2' : ''}`}>
                    {!sidebarCollapsed && (
                        <div className="flex items-center gap-3 px-2 py-2 mb-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-[12px] font-bold">
                                {(authUser || 'A').charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-bold text-slate-200 truncate">{authUser || 'Admin'}</p>
                                <p className="text-[10px] text-slate-500">Quản trị viên</p>
                            </div>
                        </div>
                    )}
                    <div className={`flex ${sidebarCollapsed ? 'flex-col' : ''} gap-1`}>
                        <button
                            onClick={onBackToPos}
                            className={`flex items-center gap-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all ${sidebarCollapsed ? 'p-2.5' : 'flex-1 px-3 py-2 text-[12px] font-medium'}`}
                            title="POS"
                        >
                            <ChevronLeft size={16} />
                            {!sidebarCollapsed && 'POS'}
                        </button>
                        <button
                            onClick={onLogout}
                            className={`flex items-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all ${sidebarCollapsed ? 'p-2.5' : 'flex-1 px-3 py-2 text-[12px] font-medium'}`}
                            title="Đăng xuất"
                        >
                            <LogOut size={16} />
                            {!sidebarCollapsed && 'Đăng xuất'}
                        </button>
                    </div>
                </div>

                {/* Collapse toggle (desktop only) */}
                <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-[#0f172a] border border-slate-700 rounded-full items-center justify-center text-slate-400 hover:text-white shadow-lg z-10"
                >
                    <ChevronRight size={12} className={`transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`} />
                </button>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Top Header */}
                <header className="h-16 bg-white border-b border-gray-200/80 flex items-center justify-between px-4 lg:px-6 flex-shrink-0 z-10">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-2 hover:bg-gray-100 rounded-xl text-gray-600"
                        >
                            <Menu size={20} />
                        </button>
                        <div>
                            <h2 className="text-[16px] font-bold text-gray-900">{currentPage?.label || 'Tổng quan'}</h2>
                            <p className="text-[11px] text-gray-400 font-medium hidden sm:block">
                                {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 relative">
                            <Bell size={18} />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                        </button>
                        <div className="hidden sm:flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-1.5 border border-gray-200/50">
                            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                                {(authUser || 'A').charAt(0).toUpperCase()}
                            </div>
                            <span className="text-[12px] font-semibold text-gray-700">{authUser || 'Admin'}</span>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto">
                    <div className="p-4 lg:p-6 max-w-[1400px] mx-auto w-full">
                        {renderContent()}
                    </div>
                </main>
            </div>

            {/* Global Styles */}
            <style dangerouslySetInnerHTML={{
                __html: `
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
                    .scrollbar-hide::-webkit-scrollbar { display: none; }
                    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                    .animate-in { animation: fadeIn 0.3s ease-out; }
                    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                `}} />
        </div>
    );
};

export default AdminLayout;
