import React, { useState, useEffect, useCallback } from 'react';
import {
    BarChart3, Package, Truck, Receipt, FileText, LogOut,
    Menu, X, ChevronLeft, Users, Settings, Home, Bell, Search,
    Sun, Moon
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
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

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

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

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
        <div className={`flex h-screen bg-gray-50 dark:bg-gray-950 font-['Inter'] overflow-hidden text-gray-900 dark:text-gray-50`}>
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Sidebar matches Tremor Template */}
            <nav className={`
                fixed lg:static inset-y-0 left-0 z-50
                flex flex-col w-72
                transform transition-transform duration-300 ease-in-out
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <aside className="flex grow flex-col gap-y-6 overflow-y-auto border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950 p-4">
                    
                    {/* Header / Logo */}
                    <div className="flex items-center justify-between pb-2">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 font-black bg-indigo-600 text-white rounded-lg flex items-center justify-center shadow-sm">
                                CH
                            </div>
                            <div>
                                <h1 className="font-semibold text-sm text-gray-900 dark:text-white">Cát Hải Store</h1>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Admin Panel</p>
                            </div>
                        </div>
                        <button onClick={() => setSidebarOpen(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md lg:hidden text-gray-500">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav aria-label="core navigation links" className="flex flex-1 flex-col space-y-8">
                        {Object.entries(groupedMenu).map(([group, items]) => (
                            <div key={group}>
                                <span className="text-xs font-medium leading-6 text-gray-500 dark:text-gray-400">
                                    {GROUP_LABELS[group]}
                                </span>
                                <ul role="list" className="space-y-0.5 mt-1">
                                    {items.map(item => {
                                        const isActive = activeTab === item.id;
                                        return (
                                            <li key={item.id}>
                                                <button
                                                    onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                                                    className={`
                                                        w-full flex items-center gap-x-2.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors
                                                        ${isActive
                                                            ? "text-indigo-600 dark:text-indigo-400 bg-gray-100 dark:bg-gray-900"
                                                            : "text-gray-700 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 hover:dark:text-gray-50 hover:dark:bg-gray-900"
                                                        }
                                                    `}
                                                >
                                                    <item.icon className="size-4 shrink-0" aria-hidden="true" />
                                                    {item.label}
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))}
                    </nav>

                    {/* Sidebar Footer */}
                    <div className="mt-auto flex flex-col gap-2 pt-4 border-t border-gray-200 dark:border-gray-800">
                        {/* Theme Toggle */}
                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="flex items-center gap-x-2.5 rounded-md px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-400 hover:dark:bg-gray-900 transition-colors"
                        >
                            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                            {theme === 'dark' ? 'Giao diện sáng' : 'Giao diện tối'}
                        </button>
                        
                        <button
                            onClick={onBackToPos}
                            className="flex items-center gap-x-2.5 rounded-md px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-400 hover:dark:bg-gray-900 transition-colors"
                        >
                            <ChevronLeft size={16} />
                            Về màn hình POS
                        </button>
                        
                        <div className="flex items-center justify-between mt-2">
                             <div className="flex items-center gap-2 px-2">
                                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-300">
                                    {(authUser || 'A').charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">{authUser || 'Admin'}</p>
                                    <p className="text-[10px] text-gray-500">Quản trị viên</p>
                                </div>
                            </div>
                            <button
                                onClick={onLogout}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors"
                                title="Đăng xuất"
                            >
                                <LogOut size={16} />
                            </button>
                        </div>
                    </div>
                </aside>
            </nav>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Top Header */}
                <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 lg:px-6 flex-shrink-0 z-10 shadow-sm">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-600 dark:text-gray-400"
                        >
                            <Menu size={20} />
                        </button>
                        <div>
                            <h2 className="text-[16px] font-bold text-gray-900 dark:text-gray-100">{currentPage?.label || 'Tổng quan'}</h2>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium hidden sm:block">
                                {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-500 dark:text-gray-400 relative">
                            <Bell size={18} />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-900" />
                        </button>
                        <div className="hidden sm:flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-1.5 border border-gray-200/50 dark:border-gray-700">
                            <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                                {(authUser || 'A').charAt(0).toUpperCase()}
                            </div>
                            <span className="text-[12px] font-semibold text-gray-700 dark:text-gray-300">{authUser || 'Admin'}</span>
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
