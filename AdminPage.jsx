import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
    ChevronLeft, Package, Receipt, TrendingUp, ShoppingBag,
    Plus, Edit3, Trash2, Save, X, Upload, Image as ImageIcon,
    QrCode, Sparkles, ArrowUpRight, ScanLine, Search, Grid,
    List as ListIcon, MoreHorizontal, Camera, Calendar, FileText, CheckCircle, XCircle, Clock, Truck, BarChart3, RefreshCw
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import OrderModal from './OrderModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const IMAGE_BASE_URL = API_URL.replace('/api', ''); // Remove /api for images

// Helper to get image URL
const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http') || imagePath.startsWith('data:')) return imagePath;
    return `${IMAGE_BASE_URL}${imagePath}`;
};

// --- OPTIMIZED Scanner Component (Fast scanning from distance) ---
const BarcodeScanner = ({ onResult, onClose }) => {
    const scannerRef = useRef(null);

    useEffect(() => {
        const startScanner = async () => {
            if (scannerRef.current) {
                try { await scannerRef.current.stop(); scannerRef.current.clear(); } catch (e) { }
            }

            const html5QrCode = new Html5Qrcode("reader", {
                // Enable more barcode formats for better detection
                formatsToSupport: [
                    Html5QrcodeSupportedFormats.QR_CODE,
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.EAN_8,
                    Html5QrcodeSupportedFormats.UPC_A,
                    Html5QrcodeSupportedFormats.UPC_E,
                    Html5QrcodeSupportedFormats.CODE_128,
                    Html5QrcodeSupportedFormats.CODE_39,
                    Html5QrcodeSupportedFormats.CODE_93,
                    Html5QrcodeSupportedFormats.ITF,
                    Html5QrcodeSupportedFormats.CODABAR
                ],
                verbose: false
            });
            scannerRef.current = html5QrCode;

            try {
                // Get available cameras
                const cameras = await Html5Qrcode.getCameras();
                const cameraId = cameras.find(c => c.label.toLowerCase().includes('back'))?.id || cameras[0]?.id;

                await html5QrCode.start(
                    cameraId || { facingMode: "environment" },
                    {
                        fps: 30,                    // Higher FPS = faster scanning
                        qrbox: { width: 350, height: 200 },  // Wider box for barcodes
                        aspectRatio: 16 / 9,          // Better for barcodes (horizontal)
                        disableFlip: false,
                        // IMPORTANT: Higher resolution for scanning from distance
                        videoConstraints: {
                            width: { ideal: 1920 },
                            height: { ideal: 1080 },
                            focusMode: "continuous",  // Auto-focus
                            zoom: 1.5                 // Slight zoom for distance
                        }
                    },
                    (decodedText) => {
                        // Success callback
                        html5QrCode.stop().then(() => {
                            onResult(decodedText);
                            // Play beep sound
                            const beep = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQMCI6bO2NSVJxQVkM7Q0qswFBKPx8TAqiMh');
                            beep.play().catch(() => { });
                        });
                    },
                    () => { } // Error callback (ignore)
                );
            } catch (err) {
                console.error("Scanner error:", err);
            }
        };

        setTimeout(startScanner, 100);

        return () => {
            if (scannerRef.current?.isScanning) {
                scannerRef.current.stop().catch(console.error);
            }
        };
    }, [onResult]);

    return (
        <div className="fixed inset-0 bg-black z-[120] flex flex-col items-center justify-center">
            <button onClick={onClose} className="absolute top-6 right-6 text-white p-3 bg-white/20 rounded-full z-50 backdrop-blur-md active:scale-90 transition-all">
                <X size={28} />
            </button>

            <div className="absolute top-6 left-6 text-white z-50 bg-black/50 px-4 py-2 rounded-lg backdrop-blur-md">
                <p className="text-[14px] font-bold">📷 Quét mã vạch</p>
                <p className="text-[11px] text-white/70">Hướng camera vào mã - giữ cách ~20cm</p>
            </div>

            <div className="w-full h-full relative flex flex-col items-center justify-center bg-black">
                <div id="reader" className="w-full max-w-2xl aspect-video bg-black overflow-hidden"></div>

                {/* Scanning overlay - horizontal for barcodes */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-[360px] h-[150px] border-2 border-green-400 rounded-lg relative shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]">
                        {/* Corner markers */}
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-400 rounded-tl-lg"></div>
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-400 rounded-tr-lg"></div>
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-400 rounded-bl-lg"></div>
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-400 rounded-br-lg"></div>

                        {/* Scanning line animation */}
                        <div className="absolute top-0 left-4 right-4 h-full overflow-hidden">
                            <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-bounce" style={{ animationDuration: '1.5s' }}></div>
                        </div>
                    </div>
                </div>

                {/* Bottom hint */}
                <div className="absolute bottom-10 left-0 right-0 text-center text-white/80 text-[13px]">
                    <p>Đặt mã vạch trong khung xanh</p>
                    <p className="text-[11px] text-white/50 mt-1">Hỗ trợ: EAN-13, EAN-8, UPC, Code-128, QR Code</p>
                </div>
            </div>
        </div>
    );
};

// --- Main Admin Component ---
const AdminPage = ({ products, history, refreshData, onBackToPos }) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [editingProduct, setEditingProduct] = useState(null);
    const [showAddProduct, setShowAddProduct] = useState(false);

    // Data States
    const [orders, setOrders] = useState([]);
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState({ todayRevenue: 0, todayOrders: 0, monthRevenue: 0, topProducts: [] });
    const [dateFilter, setDateFilter] = useState({ start: '', end: '' });

    // Import State
    const [importCart, setImportCart] = useState([]);
    const [showImportModal, setShowImportModal] = useState(false);

    // Order State
    const [editingOrder, setEditingOrder] = useState(null);

    // Fetchers
    const fetchOrders = useCallback(async () => {
        let url = `${API_URL}/orders`;
        if (dateFilter.start && dateFilter.end) url += `?startDate=${dateFilter.start}&endDate=${dateFilter.end}`;
        const res = await fetch(url);
        setOrders(await res.json());
    }, [dateFilter]);

    const fetchLogs = useCallback(async () => {
        const res = await fetch(`${API_URL}/logs`);
        setLogs(await res.json());
    }, []);

    const fetchStats = useCallback(async () => {
        const res = await fetch(`${API_URL}/stats`);
        setStats(await res.json());
    }, []);

    const syncImages = async () => {
        if (confirm('Tải toàn bộ lung ảnh về server máy chủ? (Mất vài phút)')) {
            try {
                await fetch(`${API_URL}/products/sync-images`, { method: 'POST' });
                alert('Đã đồng bộ xong! Ảnh sẽ tải nhanh hơn.');
                refreshData();
            } catch (e) { alert('Lỗi đồng bộ'); }
        }
    };

    useEffect(() => {
        if (activeTab === 'orders') fetchOrders();
        if (activeTab === 'logs') fetchLogs();
        if (activeTab === 'dashboard') fetchStats();
    }, [activeTab, fetchOrders, fetchLogs, fetchStats]);

    // Product Logic
    const [searchTerm, setSearchTerm] = useState('');
    const [displayLimit, setDisplayLimit] = useState(20);
    const filteredProducts = useMemo(() => products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.code && p.code.includes(searchTerm))), [products, searchTerm]);
    const displayedProducts = useMemo(() => filteredProducts.slice(0, displayLimit), [filteredProducts, displayLimit]);
    const handleScroll = (e) => { if (e.target.scrollHeight - e.target.scrollTop <= e.target.clientHeight + 200 && displayLimit < filteredProducts.length) setDisplayLimit(prev => prev + 20); };
    const handleDeleteProduct = async (id) => { if (!confirm('Xóa sản phẩm này?')) return; try { await fetch(`${API_URL}/products/${id}`, { method: 'DELETE' }); refreshData(); } catch (e) { } };

    // --- TABS ---

    const DashboardTab = () => (
        <div className="space-y-4 pb-20">
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#1D1D1F] text-white p-5 rounded-[2rem] shadow-lg col-span-2">
                    <p className="text-[12px] opacity-60 font-bold uppercase tracking-wider mb-1">Doanh thu hôm nay</p>
                    <h2 className="text-[32px] font-black">{stats.todayRevenue?.toLocaleString()}đ</h2>
                    <div className="mt-2 flex gap-2">
                        <span className="bg-white/20 px-2 py-1 rounded-lg text-[11px] font-bold">{stats.todayOrders} đơn</span>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-[2rem] border border-[#F5F5F7] shadow-sm">
                    <p className="text-[11px] text-[#86868B] font-bold uppercase">Tháng này</p>
                    <p className="text-[20px] font-black text-[#0071E3] mt-1">{stats.monthRevenue?.toLocaleString()}đ</p>
                </div>
                <div className="bg-white p-5 rounded-[2rem] border border-[#F5F5F7] shadow-sm" onClick={syncImages}>
                    <p className="text-[11px] text-[#86868B] font-bold uppercase">Hệ thống</p>
                    <div className="flex items-center gap-2 mt-2 text-[#1D1D1F] font-bold text-[13px]">
                        <RefreshCw size={16} /> Đồng bộ ảnh
                    </div>
                </div>
            </div>

            <div className="bg-white p-5 rounded-[2rem] border border-[#F5F5F7] shadow-sm">
                <h3 className="font-bold text-[#1D1D1F] mb-4 flex items-center gap-2"><TrendingUp size={18} /> Top Bán Chạy</h3>
                <div className="space-y-3">
                    {stats.topProducts?.map((p, i) => (
                        <div key={i} className="flex justify-between items-center py-2 border-b border-[#F5F5F7] last:border-0">
                            <span className="text-[13px] font-medium text-[#1D1D1F] truncate max-w-[70%]">{i + 1}. {p.name}</span>
                            <span className="text-[12px] font-bold text-[#0071E3]">{p.total_sold} đã bán</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const ProductsTab = () => (
        <div className="space-y-4">
            <div className="sticky top-0 bg-[#F5F5F7] z-10 pb-2 pt-1 flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868B]" size={18} />
                    <input type="text" placeholder="Tìm..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white pl-10 pr-4 py-3.5 rounded-2xl text-[14px] font-medium outline-none shadow-sm" />
                </div>
                <button onClick={() => setShowAddProduct(true)} className="bg-[#1D1D1F] text-white w-12 rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-all"><Plus size={24} /></button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pb-20">
                {displayedProducts.map(p => (
                    <div key={p.id} onClick={() => setEditingProduct(p)} className="bg-white rounded-[1.5rem] overflow-hidden shadow-sm border border-[#F5F5F7] active:scale-[0.98] transition-all relative group">
                        <div className="absolute top-2 left-2 px-2 py-1 rounded-lg text-[10px] font-bold z-10 bg-white/90 shadow-sm">Kho: {p.stock}</div>
                        <div className="aspect-square bg-[#F9F9FA] flex items-center justify-center relative overflow-hidden">
                            {p.image ? <img src={getImageUrl(p.image)} className="w-full h-full object-cover" /> : <ImageIcon size={32} className="text-[#D2D2D7]" />}
                        </div>
                        <div className="p-3">
                            <h4 className="font-bold text-[#1D1D1F] text-[13px] line-clamp-2 h-[2.5em] mb-1">{p.name}</h4>
                            <p className="text-[#0071E3] font-black text-[15px]">{p.price.toLocaleString()}đ</p>
                            <p className="text-[10px] text-[#86868B] mt-1 truncate">ID: {p.id}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const ImportTab = () => {
        const [importSearch, setImportSearch] = useState('');
        const importProducts = useMemo(() =>
            products.filter(p => p.name.toLowerCase().includes(importSearch.toLowerCase()) || p.id.includes(importSearch)),
            [products, importSearch]
        );

        const addToImport = (p) => {
            setImportCart(prev => {
                const ex = prev.find(i => i.id === p.id);
                if (ex) return prev.map(i => i.id === p.id ? { ...i, quantity: i.quantity + 1 } : i);
                return [...prev, { ...p, quantity: 1, importPrice: p.price * 0.7 }]; // Default import price heuristic
            });
        };
        const submitImport = async () => {
            if (importCart.length === 0) return;
            const total_cost = importCart.reduce((s, i) => s + (i.importPrice * i.quantity), 0);
            try {
                await fetch(`${API_URL}/imports`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items: importCart, total_cost, note: 'Nhập hàng nhanh' })
                });
                alert('Đã nhập kho thành công!'); setImportCart([]); refreshData();
            } catch (e) { alert('Lỗi nhập kho'); }
        };

        return (
            <div className="space-y-4 pb-20">
                {/* Phiếu nhập hiện tại */}
                <div className="bg-gradient-to-br from-[#1D1D1F] to-[#2D2D2F] p-5 rounded-3xl shadow-xl text-white">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-[16px] flex items-center gap-2">
                            <Truck size={20} /> Phiếu nhập kho
                        </h3>
                        <span className="text-[12px] bg-white/20 px-3 py-1 rounded-full">
                            {importCart.length} sản phẩm
                        </span>
                    </div>

                    {importCart.length === 0 ? (
                        <p className="text-center text-white/60 text-[13px] py-6">Chọn sản phẩm bên dưới để thêm vào phiếu nhập</p>
                    ) : (
                        <div className="space-y-3">
                            {importCart.map((i, idx) => (
                                <div key={idx} className="bg-white/10 backdrop-blur rounded-xl p-3 flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white/20 rounded-lg overflow-hidden flex-shrink-0">
                                        {i.image ? <img src={getImageUrl(i.image)} className="w-full h-full object-cover" /> : <Package className="w-full h-full p-2 text-white/50" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-[13px] truncate">{i.name}</p>
                                        <p className="text-[11px] text-white/60">Tồn hiện tại: {i.stock}</p>
                                    </div>
                                    <div className="flex flex-col gap-1 items-end">
                                        <div className="flex items-center gap-1 bg-white/20 rounded-lg px-2 py-1">
                                            <button onClick={() => setImportCart(prev => prev.map((pi, pii) => pii === idx ? { ...pi, quantity: Math.max(1, pi.quantity - 1) } : pi))} className="text-white/70 hover:text-white">-</button>
                                            <input type="number" className="w-10 bg-transparent text-center text-[13px] font-bold" value={i.quantity} onChange={(e) => setImportCart(prev => prev.map((pi, pii) => pii === idx ? { ...pi, quantity: parseInt(e.target.value) || 1 } : pi))} />
                                            <button onClick={() => setImportCart(prev => prev.map((pi, pii) => pii === idx ? { ...pi, quantity: pi.quantity + 1 } : pi))} className="text-white/70 hover:text-white">+</button>
                                        </div>
                                        <button onClick={() => setImportCart(prev => prev.filter((_, pii) => pii !== idx))} className="text-red-400 text-[11px] hover:text-red-300">
                                            Xóa
                                        </button>
                                    </div>
                                </div>
                            ))}

                            <div className="pt-4 border-t border-white/20">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-white/70">Tổng số lượng</span>
                                    <span className="font-bold text-[18px]">{importCart.reduce((s, i) => s + i.quantity, 0)} sản phẩm</span>
                                </div>
                                <button onClick={submitImport} className="w-full bg-[#0071E3] text-white py-4 rounded-2xl font-bold text-[15px] shadow-lg active:scale-[0.98] transition-all">
                                    Xác nhận Nhập Kho
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Tìm kiếm sản phẩm */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868B]" size={18} />
                    <input
                        type="text"
                        placeholder="Tìm sản phẩm để nhập kho..."
                        value={importSearch}
                        onChange={(e) => setImportSearch(e.target.value)}
                        className="w-full bg-white pl-11 pr-4 py-3.5 rounded-2xl text-[14px] font-medium outline-none shadow-sm border border-[#F5F5F7]"
                    />
                </div>

                {/* Danh sách sản phẩm */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {importProducts.slice(0, 30).map(p => (
                        <div
                            key={p.id}
                            onClick={() => addToImport(p)}
                            className={`bg-white rounded-2xl overflow-hidden border-2 transition-all cursor-pointer active:scale-[0.97] ${importCart.some(i => i.id === p.id) ? 'border-[#0071E3] shadow-lg' : 'border-transparent shadow-sm'}`}
                        >
                            <div className="aspect-square bg-[#F9F9FA] flex items-center justify-center overflow-hidden">
                                {p.image ? <img src={getImageUrl(p.image)} className="w-full h-full object-cover" /> : <ImageIcon size={28} className="text-[#D2D2D7]" />}
                            </div>
                            <div className="p-2.5">
                                <p className="font-bold text-[12px] text-[#1D1D1F] line-clamp-2 h-[2.4em]">{p.name}</p>
                                <div className="flex justify-between items-center mt-1">
                                    <span className="text-[11px] text-[#86868B]">Tồn: {p.stock}</span>
                                    {importCart.some(i => i.id === p.id) && (
                                        <span className="text-[10px] bg-[#0071E3] text-white px-1.5 py-0.5 rounded-full font-bold">
                                            +{importCart.find(i => i.id === p.id)?.quantity}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-screen bg-[#F5F5F7] font-['Inter']">
            <div className="bg-white/90 backdrop-blur-md px-4 py-3 border-b border-[#D2D2D7]/30 sticky top-0 z-20">
                <div className="flex items-center justify-between mb-3">
                    <button onClick={onBackToPos} className="w-9 h-9 bg-[#F5F5F7] rounded-full flex items-center justify-center text-[#1D1D1F]"><ChevronLeft size={20} /></button>
                    <span className="font-black text-[16px]">Quản trị Hệ thống</span>
                    <div className="w-9"></div>
                </div>
                <div className="flex bg-[#F5F5F7] p-1 rounded-2xl overflow-x-auto scrollbar-hide">
                    {[
                        { id: 'dashboard', l: 'Tổng quan', i: BarChart3 },
                        { id: 'products', l: 'Sản phẩm', i: Package },
                        { id: 'import', l: 'Nhập hàng', i: Truck },
                        { id: 'orders', l: 'Đơn hàng', i: Receipt },
                        { id: 'logs', l: 'Nhật ký', i: FileText }
                    ].map(t => (
                        <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-[12px] font-bold whitespace-nowrap transition-all ${activeTab === t.id ? 'bg-white shadow-sm text-[#1D1D1F]' : 'text-[#86868B]'}`}>
                            <t.i size={14} /> {t.l}
                        </button>
                    ))}
                </div>
            </div>
            <main className="flex-1 overflow-y-auto p-4 scroll-smooth" onScroll={handleScroll}>
                <div className="max-w-4xl mx-auto">
                    {activeTab === 'dashboard' && <DashboardTab />}
                    {activeTab === 'products' && <ProductsTab />}
                    {activeTab === 'import' && <ImportTab />}
                    {/* Orders & Logs Tab similar to prev ver but with new fields */}
                    {activeTab === 'orders' && (
                        <div className="space-y-3 pb-20">
                            {orders.map(o => {
                                const items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
                                return (
                                    <div key={o.id} onClick={() => setEditingOrder(o)} className="bg-white p-4 rounded-2xl shadow-sm border border-[#F5F5F7] active:scale-[0.98] transition-all cursor-pointer">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="font-bold text-[14px] text-[#1D1D1F] flex items-center gap-2 flex-wrap">
                                                    {o.order_code || `#${o.id}`}
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${o.status === 'completed' ? 'bg-green-100 text-green-700' : o.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-[#E8E8ED] text-[#1D1D1F]'}`}>
                                                        {o.status || 'completed'}
                                                    </span>
                                                    <span className="text-[10px] bg-[#E8E8ED] px-1.5 py-0.5 rounded">{o.payment_method || 'cash'}</span>
                                                </p>
                                                <p className="text-[12px] text-[#86868B] mt-0.5">{new Date(o.timestamp).toLocaleString()}</p>
                                                {o.customer_name && o.customer_name !== 'Khách lẻ' && (
                                                    <p className="text-[12px] text-[#1D1D1F] font-medium mt-1">👤 {o.customer_name}</p>
                                                )}
                                            </div>
                                            <span className="font-black text-[#0071E3] text-[16px]">{o.total?.toLocaleString()}đ</span>
                                        </div>
                                        <div className="text-[11px] text-[#86868B] border-t border-[#F5F5F7] pt-2 mt-2">
                                            {items?.slice(0, 3).map((item, idx) => (
                                                <span key={idx} className="inline-block bg-[#F5F5F7] px-2 py-0.5 rounded mr-1 mb-1">
                                                    {item.displayName || item.name} x{item.quantity}
                                                </span>
                                            ))}
                                            {items?.length > 3 && <span className="text-[#0071E3]">+{items.length - 3} khác</span>}
                                        </div>
                                        {o.note && <p className="text-[11px] text-[#86868B] mt-2 italic">📝 {o.note}</p>}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {activeTab === 'logs' && (
                        <div className="space-y-2 pb-20">
                            {logs.map((l, i) => <div key={i} className="text-[12px] p-3 bg-white rounded-xl border border-[#F5F5F7]"><span className="font-bold text-[#1D1D1F]">{l.action}</span>: {l.details} <div className="text-[10px] text-[#86868B] mt-1">{new Date(l.timestamp).toLocaleString()}</div></div>)}
                        </div>
                    )}
                </div>
            </main>
            {(editingProduct || showAddProduct) && <ProductModal product={editingProduct} onClose={() => { setEditingProduct(null); setShowAddProduct(false) }} onSave={() => { refreshData(); setEditingProduct(null); setShowAddProduct(false) }} />}
            {editingOrder && <OrderModal order={editingOrder} onClose={() => setEditingOrder(null)} onSave={() => { fetchOrders(); setEditingOrder(null); }} />}
            {showImportModal && <div className="fixed inset-0 bg-black/50 z-50"></div>}
        </div>
    );
};

const ProductModal = ({ product, onClose, onSave }) => {
    const isEdit = !!product;
    const [formData, setFormData] = useState(product || { name: '', brand: '', category: '', price: 0, case_price: 0, units_per_case: 1, stock: 0, code: '', image: '' });
    const [isScanning, setIsScanning] = useState(false);
    const handleImageChange = (e) => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => setFormData({ ...formData, image: reader.result }); reader.readAsDataURL(file); } };
    const handleScanResult = (code) => { setFormData({ ...formData, code }); setIsScanning(false); };
    const handleSubmit = async () => { try { const url = isEdit ? `${API_URL}/products/${formData.id}` : `${API_URL}/products`; const method = isEdit ? 'PUT' : 'POST'; await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) }); onSave(); } catch (e) { console.error(e); } };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center animate-in fade-in">
            {isScanning && <BarcodeScanner onResult={handleScanResult} onClose={() => setIsScanning(false)} />}
            <div className="bg-white w-full sm:max-w-lg h-[90vh] sm:h-auto rounded-t-[2rem] sm:rounded-[2rem] flex flex-col shadow-2xl animate-in slide-in-from-bottom-20 overflow-hidden">
                <div className="p-4 border-b border-[#F5F5F7] flex justify-between items-center"><h3 className="font-bold text-[16px]">{isEdit ? 'Sửa' : 'Thêm'} sản phẩm</h3><button onClick={onClose} className="p-2 bg-[#F5F5F7] rounded-full hover:bg-[#E8E8ED]"><X size={20} /></button></div>
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    <div className="flex flex-col items-center gap-3"><div className="w-28 h-28 bg-[#F5F5F7] rounded-2xl overflow-hidden border border-[#E8E8ED] flex items-center justify-center relative">{formData.image ? <img src={getImageUrl(formData.image)} className="w-full h-full object-cover" /> : <ImageIcon className="text-[#D2D2D7]" />}<input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageChange} accept="image/*" /></div><p className="text[12px] text-[#0071E3] font-bold">Chạm để đổi ảnh</p></div>
                    <div className="space-y-4">
                        <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Tên sản phẩm" className="w-full bg-[#F9F9FA] p-4 rounded-xl font-bold outline-none ring-1 ring-transparent focus:ring-[#0071E3]" />
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-[11px] font-bold uppercase text-[#86868B] ml-1">Giá lẻ (VND)</label><input type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })} className="w-full bg-[#F9F9FA] p-3 rounded-xl font-bold text-[#0071E3] outline-none" /></div>
                            <div><label className="text-[11px] font-bold uppercase text-[#86868B] ml-1">Tồn kho</label><input type="number" value={formData.stock} onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })} className="w-full bg-[#F9F9FA] p-3 rounded-xl font-medium outline-none" /></div>
                        </div>
                        <div><label className="text-[11px] font-bold uppercase text-[#86868B] ml-1">Mã vạch</label><div className="relative mt-1"><input value={formData.code || ''} onChange={e => setFormData({ ...formData, code: e.target.value })} placeholder="Quét hoặc nhập mã..." className="w-full bg-[#F9F9FA] pl-4 pr-12 py-3.5 rounded-xl font-mono text-[14px] outline-none" /><button onClick={() => setIsScanning(true)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white rounded-lg shadow-sm border border-[#E8E8ED] hover:scale-105 transition-transform"><ScanLine size={18} className="text-[#1D1D1F]" /></button></div></div>
                    </div>
                </div>
                <div className="p-4 border-t border-[#F5F5F7]"><button onClick={handleSubmit} className="w-full bg-[#0071E3] text-white py-4 rounded-2xl font-bold text-[16px] shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-transform">Lưu sản phẩm</button></div>
            </div>
        </div>
    );
};

export default AdminPage;
