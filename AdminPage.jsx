import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
    ChevronLeft, Package, Receipt, TrendingUp, ShoppingBag,
    Plus, Edit3, Trash2, Save, X, Upload, Image as ImageIcon,
    QrCode, Sparkles, ArrowUpRight, ScanLine, Search, Grid,
    List as ListIcon, MoreHorizontal, Camera, Calendar, FileText, CheckCircle, XCircle, Clock, Truck, BarChart3, RefreshCw
} from 'lucide-react';
import { Html5Qrcode } from "html5-qrcode";
import OrderModal from './OrderModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const IMAGE_BASE_URL = API_URL.replace('/api', '');

// Helper to get image URL
const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http') || imagePath.startsWith('data:')) return imagePath;
    return `${IMAGE_BASE_URL}${imagePath}`;
};

// --- NEW OPTIMIZED QR Scanner Component ---
const QRScanner = ({ onResult, onClose }) => {
    const scannerRef = useRef(null);
    const scannerId = "reader-element-id";

    useEffect(() => {
        const html5QrCode = new Html5Qrcode(scannerId);
        scannerRef.current = html5QrCode;

        const startScanner = async () => {
            try {
                // 1. Lấy danh sách camera để tìm camera sau
                const devices = await Html5Qrcode.getCameras();

                if (devices && devices.length) {
                    // Tìm camera có tên chứa 'back', 'sau', 'environment'
                    const backCamera = devices.find(device => {
                        const label = device.label.toLowerCase();
                        return label.includes('back') || label.includes('sau') || label.includes('environment');
                    });

                    // Lấy ID camera sau (nếu có) hoặc lấy cái đầu tiên
                    const cameraId = backCamera ? backCamera.id : devices[0].id;

                    const config = {
                        fps: 25, // Tăng FPS lên cao để bắt nét nhanh
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0,
                        disableFlip: false,
                    };

                    await html5QrCode.start(
                        cameraId,
                        config,
                        (decodedText) => {
                            // Play beep sound
                            const beep = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQMCI6bO2NSVJxQVkM7Q0qswFBKPx8TAqiMh');
                            beep.play().catch(() => { });

                            html5QrCode.stop().then(() => {
                                onResult(decodedText);
                                onClose(); // Đóng scanner sau khi scan
                                scannerRef.current = null;
                            }).catch(err => console.error("Stop failed", err));
                        },
                        (errorMessage) => { /* ignore */ }
                    );
                } else {
                    console.error("Không tìm thấy camera.");
                }
            } catch (err) {
                console.error("Lỗi khởi động camera:", err);
            }
        };

        startScanner();

        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(err => console.log("Cleanup stop error", err));
                scannerRef.current = null;
            }
        };
    }, [onClose, onResult]);

    return (
        <div className="fixed inset-0 bg-black/95 z-[200] flex flex-col items-center justify-center p-4 text-white animate-in fade-in duration-200">
            <div className="w-full max-w-sm relative flex flex-col items-center">
                <button
                    onClick={onClose}
                    className="absolute -top-16 right-0 p-3 bg-white/10 hover:bg-white/20 active:scale-95 transition-all rounded-full backdrop-blur-sm z-50"
                >
                    <X size={28} />
                </button>

                <div className="relative w-full aspect-square overflow-hidden rounded-[2.5rem] border-4 border-indigo-500/50 shadow-2xl shadow-indigo-500/20 bg-black">
                    <div id={scannerId} className="w-full h-full" />
                    <div className="absolute inset-0 pointer-events-none border-[30px] border-black/30 rounded-[2rem]"></div>
                    <div className="absolute top-0 left-0 w-full h-1 bg-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.8)] animate-[scan_2s_infinite_linear] opacity-80 z-10"></div>
                </div>

                <div className="mt-8 text-center space-y-2">
                    <h3 className="text-xl font-bold uppercase tracking-widest text-indigo-400">Đang quét mã</h3>
                    <p className="text-slate-400 text-sm font-medium">Di chuyển camera lại gần mã QR/Barcode</p>
                </div>
            </div>
            <style>{`
                @keyframes scan {
                    0% { transform: translateY(0); opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { transform: translateY(300px); opacity: 0; }
                }
            `}</style>
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
    const [importSearch, setImportSearch] = useState('');
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
                <div className="bg-white p-5 rounded-[2rem] border border-[#F5F5F7] shadow-sm">
                    <p className="text-[11px] text-[#86868B] font-bold uppercase">Kho hàng</p>
                    <p className="text-[20px] font-black text-[#1D1D1F] mt-1">{products.length} <span className="text-[14px] font-bold text-[#86868B]">sản phẩm</span></p>
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

    const ProductsTab = () => {
        // Helper: Normalize text for search (remove accents)
        const normalizeText = (text) => {
            if (!text) return '';
            return text.toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/đ/g, 'd')
                .replace(/Đ/g, 'D');
        };

        // Group products by brand
        const trendingProducts = useMemo(() =>
            [...products].sort((a, b) => (b.total_sold || 0) - (a.total_sold || 0)).slice(0, 10),
            [products]
        );

        const productsByBrand = useMemo(() => {
            const grouped = {};
            const searchNorm = normalizeText(searchTerm);

            products.filter(p => {
                if (!searchTerm.trim()) return true;

                // Search in multiple fields
                const nameNorm = normalizeText(p.name);
                const brandNorm = normalizeText(p.brand);
                const codeNorm = normalizeText(p.code);
                const categoryNorm = normalizeText(p.category);

                // Split search into words and check if all match
                const searchWords = searchNorm.split(/\s+/).filter(w => w.length > 0);
                return searchWords.every(word =>
                    nameNorm.includes(word) ||
                    brandNorm.includes(word) ||
                    codeNorm.includes(word) ||
                    categoryNorm.includes(word)
                );
            }).forEach(p => {
                const brand = p.brand || 'Khác';
                if (!grouped[brand]) grouped[brand] = [];
                grouped[brand].push(p);
            });
            return grouped;
        }, [products, searchTerm]);

        const ProductCard = ({ p, size = 'normal' }) => (
            <div
                onClick={() => setEditingProduct(p)}
                className={`bg-white rounded-2xl overflow-hidden shadow-sm border border-[#F5F5F7] active:scale-[0.97] transition-all cursor-pointer flex-shrink-0 ${size === 'small' ? 'w-32' : 'w-40'}`}
            >
                <div className={`${size === 'small' ? 'h-28' : 'h-36'} bg-[#F9F9FA] flex items-center justify-center relative overflow-hidden`}>
                    {p.image ? <img src={getImageUrl(p.image)} loading="lazy" className="w-full h-full object-cover" /> : <ImageIcon size={28} className="text-[#D2D2D7]" />}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white/90 shadow-sm">
                        {p.stock}
                    </div>
                </div>
                <div className="p-2.5">
                    <h4 className="font-bold text-[#1D1D1F] text-[12px] line-clamp-2 h-[2.4em] mb-1">{p.name}</h4>
                    <p className="text-[#0071E3] font-black text-[14px]">{p.price?.toLocaleString()}đ</p>
                    {p.case_price > 0 && (
                        <p className="text-[10px] text-[#FF9500] font-bold">Thùng: {p.case_price?.toLocaleString()}đ</p>
                    )}
                </div>
            </div>
        );

        return (
            <div className="space-y-5 pb-20">
                {/* Thịnh hành - Horizontal scroll */}
                {searchTerm === '' && (
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles size={18} className="text-[#FF9500]" />
                            <h3 className="font-bold text-[16px] text-[#1D1D1F]">Thịnh hành</h3>
                            <span className="text-[12px] text-[#86868B]">({trendingProducts.length})</span>
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                            {trendingProducts.map(p => (
                                <ProductCard key={p.id} p={p} size="small" />
                            ))}
                        </div>
                    </div>
                )}

                {/* Theo Brand - Horizontal scroll sections */}
                {Object.entries(productsByBrand).map(([brand, items]) => (
                    <div key={brand}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Package size={18} className="text-[#0071E3]" />
                                <h3 className="font-bold text-[16px] text-[#1D1D1F]">{brand}</h3>
                                <span className="text-[12px] text-[#86868B]">({items.length})</span>
                            </div>
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                            {items.map(p => (
                                <ProductCard key={p.id} p={p} />
                            ))}
                        </div>
                    </div>
                ))}

                {/* Empty state */}
                {Object.keys(productsByBrand).length === 0 && (
                    <div className="text-center py-10 text-[#86868B]">
                        <Package size={48} className="mx-auto mb-3 opacity-50" />
                        <p className="font-medium">Không tìm thấy sản phẩm</p>
                    </div>
                )}
            </div>
        );
    };

    // Import Tab helper functions (outside component to prevent re-render)
    const importProducts = useMemo(() => {
        const normalizeText = (text) => {
            if (!text) return '';
            return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
        };
        const searchNorm = normalizeText(importSearch);
        if (!searchNorm.trim()) return products;
        return products.filter(p =>
            normalizeText(p.name).includes(searchNorm) ||
            normalizeText(p.brand).includes(searchNorm) ||
            (p.code && p.code.includes(importSearch))
        );
    }, [products, importSearch]);

    const importProductsByBrand = useMemo(() => {
        const grouped = {};
        importProducts.forEach(p => {
            const brand = p.brand || 'Khác';
            if (!grouped[brand]) grouped[brand] = [];
            grouped[brand].push(p);
        });
        return grouped;
    }, [importProducts]);

    const addToImport = (p) => {
        setImportCart(prev => {
            const ex = prev.find(i => i.id === p.id);
            if (ex) return prev.map(i => i.id === p.id ? { ...i, quantity: i.quantity + 1 } : i);
            return [...prev, { ...p, quantity: 1, importPrice: p.price * 0.7 }];
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

    const ImportTab = () => {
        const ImportProductCard = ({ p }) => (
            <div
                onClick={() => addToImport(p)}
                className={`bg-white rounded-2xl overflow-hidden border-2 transition-all cursor-pointer active:scale-[0.97] flex-shrink-0 w-36 ${importCart.some(i => i.id === p.id) ? 'border-[#0071E3] shadow-lg' : 'border-transparent shadow-sm'}`}
            >
                <div className="h-28 bg-[#F9F9FA] flex items-center justify-center overflow-hidden relative">
                    {p.image ? <img src={getImageUrl(p.image)} loading="lazy" className="w-full h-full object-cover" /> : <ImageIcon size={28} className="text-[#D2D2D7]" />}
                    {importCart.some(i => i.id === p.id) && (
                        <div className="absolute top-2 right-2 bg-[#0071E3] text-white text-[11px] px-2 py-0.5 rounded-full font-bold">
                            +{importCart.find(i => i.id === p.id)?.quantity}
                        </div>
                    )}
                </div>
                <div className="p-2">
                    <p className="font-bold text-[11px] text-[#1D1D1F] line-clamp-2 h-[2.4em]">{p.name}</p>
                    <span className="text-[10px] text-[#86868B]">Tồn: {p.stock}</span>
                </div>
            </div>
        );

        return (
            <div className="space-y-4 pb-20">
                {/* Cart */}
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
                                        {i.image ? <img src={getImageUrl(i.image)} loading="lazy" className="w-full h-full object-cover" /> : <Package className="w-full h-full p-2 text-white/50" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-[13px] truncate">{i.name}</p>
                                        <p className="text-[11px] text-white/60">Tồn: {i.stock}</p>
                                    </div>
                                    <div className="flex flex-col gap-1 items-end">
                                        <div className="flex items-center gap-2 bg-white/20 rounded-lg px-2 py-1">
                                            <button onClick={() => setImportCart(prev => prev.map((pi, pii) => pii === idx ? { ...pi, quantity: Math.max(1, pi.quantity - 1) } : pi))} className="text-white/70 hover:text-white px-1">-</button>
                                            <span className="w-8 text-center text-[13px] font-bold">{i.quantity}</span>
                                            <button onClick={() => setImportCart(prev => prev.map((pi, pii) => pii === idx ? { ...pi, quantity: pi.quantity + 1 } : pi))} className="text-white/70 hover:text-white px-1">+</button>
                                        </div>
                                        <button onClick={() => setImportCart(prev => prev.filter((_, pii) => pii !== idx))} className="text-red-400 text-[11px] hover:text-red-300">Xóa</button>
                                    </div>
                                </div>
                            ))}
                            <div className="pt-4 border-t border-white/20">
                                <button onClick={submitImport} className="w-full bg-[#0071E3] text-white py-4 rounded-2xl font-bold text-[15px] shadow-lg active:scale-[0.98] transition-all">
                                    Xác nhận Nhập Kho
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Products by brand - horizontal scroll */}
                {Object.entries(importProductsByBrand).map(([brand, items]) => (
                    <div key={brand}>
                        <div className="flex items-center gap-2 mb-3">
                            <Package size={18} className="text-[#0071E3]" />
                            <h3 className="font-bold text-[15px] text-[#1D1D1F]">{brand}</h3>
                            <span className="text-[12px] text-[#86868B]">({items.length})</span>
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                            {items.map(p => (
                                <ImportProductCard key={p.id} p={p} />
                            ))}
                        </div>
                    </div>
                ))}

                {Object.keys(importProductsByBrand).length === 0 && (
                    <div className="text-center py-10 text-[#86868B]">
                        <Package size={48} className="mx-auto mb-3 opacity-50" />
                        <p className="font-medium">Không tìm thấy sản phẩm</p>
                    </div>
                )}
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

                {/* Search Bar - Products tab */}
                {activeTab === 'products' && (
                    <div className="flex gap-2 mt-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868B]" size={18} />
                            <input
                                type="text"
                                placeholder="Tìm sản phẩm, mã vạch, thương hiệu..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoComplete="off"
                                className="w-full bg-[#F5F5F7] pl-10 pr-10 py-3 rounded-2xl text-[14px] font-medium outline-none border border-transparent focus:border-[#0071E3] focus:bg-white transition-all"
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-[#86868B] rounded-full hover:bg-[#6e6e73]">
                                    <X size={12} className="text-white" />
                                </button>
                            )}
                        </div>
                        <button onClick={() => setShowAddProduct(true)} className="bg-[#1D1D1F] text-white w-12 rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-all">
                            <Plus size={22} />
                        </button>
                    </div>
                )}

                {/* Search Bar - Import tab */}
                {activeTab === 'import' && (
                    <div className="flex gap-2 mt-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868B]" size={18} />
                            <input
                                type="text"
                                placeholder="Tìm sản phẩm để nhập kho..."
                                value={importSearch}
                                onChange={(e) => setImportSearch(e.target.value)}
                                autoComplete="off"
                                className="w-full bg-[#F5F5F7] pl-10 pr-10 py-3 rounded-2xl text-[14px] font-medium outline-none border border-transparent focus:border-[#0071E3] focus:bg-white transition-all"
                            />
                            {importSearch && (
                                <button onClick={() => setImportSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-[#86868B] rounded-full hover:bg-[#6e6e73]">
                                    <X size={12} className="text-white" />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
            <main className="flex-1 overflow-y-auto p-4 scroll-smooth" onScroll={handleScroll}>
                <div className="max-w-4xl mx-auto">
                    {/* Tabs - conditional render with lazy loading images */}
                    {activeTab === 'dashboard' && <DashboardTab />}
                    {activeTab === 'products' && <ProductsTab />}
                    {activeTab === 'import' && <ImportTab />}

                    {/* Orders tab */}
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
            {isScanning && <QRScanner onResult={handleScanResult} onClose={() => setIsScanning(false)} />}
            <div className="bg-white w-full sm:max-w-lg h-[90vh] sm:h-auto rounded-t-[2rem] sm:rounded-[2rem] flex flex-col shadow-2xl animate-in slide-in-from-bottom-20 overflow-hidden">
                <div className="p-4 border-b border-[#F5F5F7] flex justify-between items-center"><h3 className="font-bold text-[16px]">{isEdit ? 'Sửa' : 'Thêm'} sản phẩm</h3><button onClick={onClose} className="p-2 bg-[#F5F5F7] rounded-full hover:bg-[#E8E8ED]"><X size={20} /></button></div>
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    <div className="flex flex-col items-center gap-3"><div className="w-28 h-28 bg-[#F5F5F7] rounded-2xl overflow-hidden border border-[#E8E8ED] flex items-center justify-center relative">{formData.image ? <img src={getImageUrl(formData.image)} className="w-full h-full object-cover" /> : <ImageIcon className="text-[#D2D2D7]" />}<input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageChange} accept="image/*" /></div><p className="text[12px] text-[#0071E3] font-bold">Chạm để đổi ảnh</p></div>
                    <div className="space-y-4">
                        <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Tên sản phẩm" className="w-full bg-[#F9F9FA] p-4 rounded-xl font-bold outline-none ring-1 ring-transparent focus:ring-[#0071E3]" />
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-[11px] font-bold uppercase text-[#86868B] ml-1">Giá lẻ (VND)</label><input type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })} className="w-full bg-[#F9F9FA] p-3 rounded-xl font-bold text-[#0071E3] outline-none" /></div>
                            <div><label className="text-[11px] font-bold uppercase text-[#86868B] ml-1">Giá thùng (VND)</label><input type="number" value={formData.case_price || 0} onChange={e => setFormData({ ...formData, case_price: parseInt(e.target.value) || 0 })} className="w-full bg-[#F9F9FA] p-3 rounded-xl font-bold text-[#FF9500] outline-none" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-[11px] font-bold uppercase text-[#86868B] ml-1">SL/Thùng</label><input type="number" value={formData.units_per_case || 1} onChange={e => setFormData({ ...formData, units_per_case: parseInt(e.target.value) || 1 })} className="w-full bg-[#F9F9FA] p-3 rounded-xl font-medium outline-none" /></div>
                            <div><label className="text-[11px] font-bold uppercase text-[#86868B] ml-1">Tồn kho</label><input type="number" value={formData.stock} onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })} className="w-full bg-[#F9F9FA] p-3 rounded-xl font-medium outline-none" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-[11px] font-bold uppercase text-[#86868B] ml-1">Thương hiệu</label><input value={formData.brand || ''} onChange={e => setFormData({ ...formData, brand: e.target.value })} placeholder="VD: Castrol..." className="w-full bg-[#F9F9FA] p-3 rounded-xl font-medium outline-none" /></div>
                            <div><label className="text-[11px] font-bold uppercase text-[#86868B] ml-1">Danh mục</label><input value={formData.category || ''} onChange={e => setFormData({ ...formData, category: e.target.value })} placeholder="VD: Nhớt..." className="w-full bg-[#F9F9FA] p-3 rounded-xl font-medium outline-none" /></div>
                        </div>
                        <div>
                            <label className="text-[11px] font-bold uppercase text-[#86868B] ml-1">Mã vạch (Barcode)</label>
                            <div className="relative mt-1">
                                <input value={formData.code || ''} onChange={e => setFormData({ ...formData, code: e.target.value })} placeholder="Quét hoặc nhập mã..." className="w-full bg-[#F9F9FA] pl-4 pr-12 py-3.5 rounded-xl font-mono text-[14px] outline-none" />
                                <button onClick={() => setIsScanning(true)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white rounded-lg shadow-sm border border-[#E8E8ED] hover:scale-105 transition-transform">
                                    <ScanLine size={18} className="text-[#1D1D1F]" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-[#F5F5F7]"><button onClick={handleSubmit} className="w-full bg-[#0071E3] text-white py-4 rounded-2xl font-bold text-[16px] shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-transform">Lưu sản phẩm</button></div>
            </div>
        </div>
    );
};

export default AdminPage;
