import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
    ChevronLeft, Package, Receipt, TrendingUp, ShoppingBag,
    Plus, Edit3, Trash2, Save, X, Upload, Image as ImageIcon,
    QrCode, Sparkles, ArrowUpRight, ScanLine, Search, Grid,
    List as ListIcon, MoreHorizontal, Camera
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// --- Scanner Component (Simplified - Like QRScanner.jsx) ---
const BarcodeScanner = ({ onResult, onClose }) => {
    const scannerRef = useRef(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const scannerId = "reader";

        // Logic "Simple is Best" - Kế thừa từ QRScanner.jsx
        const startScanner = async () => {
            // Cleanup nếu còn sót lại
            if (scannerRef.current) {
                try {
                    await scannerRef.current.stop();
                    scannerRef.current.clear();
                } catch (e) { }
            }

            const html5QrCode = new Html5Qrcode(scannerId);
            scannerRef.current = html5QrCode;

            try {
                await html5QrCode.start(
                    { facingMode: "environment" }, // Tự động chọn Cam sau
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0,
                        disableFlip: false
                    },
                    (decodedText) => {
                        html5QrCode.stop().then(() => {
                            onResult(decodedText);
                            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                            audio.play().catch(e => { });
                        });
                    },
                    (errorMessage) => { /* ignore */ }
                );
            } catch (err) {
                console.error(err);
                setError("Lỗi Camera. Hãy đảm bảo bạn cho phép quyền truy cập.");
            }
        };

        // Delay nhẹ để UI render xong div#reader
        const timer = setTimeout(startScanner, 100);
        return () => clearTimeout(timer);

    }, [onResult]);

    // Cleanup khi đóng modal
    useEffect(() => {
        return () => {
            if (scannerRef.current?.isScanning) {
                scannerRef.current.stop().catch(console.error);
            }
        };
    }, []);

    return (
        <div className="fixed inset-0 bg-black z-[120] flex flex-col items-center justify-center">
            <button onClick={onClose} className="absolute top-6 right-6 text-white p-3 bg-white/20 rounded-full z-50 backdrop-blur-md active:scale-90 transition-all">
                <X size={28} />
            </button>
            <div className="w-full h-full relative flex flex-col items-center justify-center bg-black">
                <div id="reader" className="w-full max-w-lg aspect-square bg-black overflow-hidden rounded-lg"></div>

                {/* Overlay Basic */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-[260px] h-[260px] border-2 border-white/50 rounded-lg relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                        <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-red-500 animate-[ping_2s_infinite]"></div>
                    </div>
                </div>

                <div className="absolute bottom-20 flex flex-col items-center gap-2">
                    {error && <p className="text-red-300 bg-red-900/80 px-4 py-2 rounded-lg font-bold">{error}</p>}
                    {!error && <p className="text-white/80 animate-pulse bg-black/40 px-3 py-1 rounded-full backdrop-blur-md">Đưa mã vạch vào khung</p>}
                </div>
            </div>
        </div>
    );
};

const ProductGridItem = ({ p, onEdit, onDelete }) => (
    <div onClick={() => onEdit(p)} className="bg-white rounded-[1.5rem] overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-[#F5F5F7] active:scale-[0.98] transition-all relative group">
        <div className={`absolute top-2 left-2 px-2 py-1 rounded-lg text-[10px] font-bold z-10 backdrop-blur-md ${p.stock <= 5 ? 'bg-red-500/90 text-white' : 'bg-white/90 text-[#1D1D1F] shadow-sm'}`}>Kho: {p.stock}</div>
        <button onClick={(e) => { e.stopPropagation(); onDelete(p.id); }} className="absolute top-2 right-2 p-1.5 bg-white/80 rounded-full opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-50 z-10"><Trash2 size={16} /></button>
        <div className="aspect-square bg-[#F9F9FA] flex items-center justify-center relative overflow-hidden">
            {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <ImageIcon size={32} className="text-[#D2D2D7]" />}
        </div>
        <div className="p-3">
            <h4 className="font-bold text-[#1D1D1F] text-[13px] leading-snug line-clamp-2 h-[2.5em] mb-1">{p.name}</h4>
            <div className="flex flex-col gap-0.5">
                <span className="text-[#0071E3] font-black text-[15px]">{p.price.toLocaleString()}đ</span>
                {p.case_price > 0 && <span className="text-[10px] text-[#86868B]">Thùng: <span className="text-emerald-600 font-bold">{p.case_price.toLocaleString()}đ</span></span>}
            </div>
        </div>
    </div>
);

const AdminPage = ({ products, history, refreshData, onBackToPos }) => {
    const [activeTab, setActiveTab] = useState('products');
    const [editingProduct, setEditingProduct] = useState(null);
    const [showAddProduct, setShowAddProduct] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [displayLimit, setDisplayLimit] = useState(20);
    const [searchTerm, setSearchTerm] = useState('');

    const today = new Date().toLocaleDateString();
    const todayOrders = useMemo(() => history.filter(o => new Date(o.timestamp).toLocaleDateString() === today), [history, today]);
    const revenue = useMemo(() => todayOrders.reduce((s, o) => s + o.total, 0), [todayOrders]);

    // Filter & Virtualization Logic
    const filteredProducts = useMemo(() => products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.code && p.code.includes(searchTerm))), [products, searchTerm]);
    const displayedProducts = useMemo(() => filteredProducts.slice(0, displayLimit), [filteredProducts, displayLimit]);
    const handleScroll = (e) => { if (e.target.scrollHeight - e.target.scrollTop <= e.target.clientHeight + 200 && displayLimit < filteredProducts.length) setDisplayLimit(prev => prev + 20); };
    const handleDeleteProduct = async (id) => { if (!confirm('Xóa sản phẩm này?')) return; try { await fetch(`${API_URL}/products/${id}`, { method: 'DELETE' }); refreshData(); } catch (e) { } };

    // Tabs
    const ProductsTab = () => (
        <div className="space-y-4">
            <div className="sticky top-0 bg-[#F5F5F7] z-10 pb-2 pt-1">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868B]" size={18} />
                        <input type="text" placeholder="Tìm kiếm..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white pl-10 pr-4 py-3.5 rounded-2xl text-[14px] font-medium outline-none shadow-sm focus:ring-2 focus:ring-[#0071E3]/20" />
                    </div>
                    <button onClick={() => setShowAddProduct(true)} className="bg-[#1D1D1F] text-white w-12 rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-all"><Plus size={24} /></button>
                </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pb-20">
                {displayedProducts.map(p => <ProductGridItem key={p.id} p={p} onEdit={setEditingProduct} onDelete={handleDeleteProduct} />)}
            </div>
            {displayedProducts.length === 0 && <div className="text-center py-10 text-[#86868B]">Không có sản phẩm</div>}
        </div>
    );

    const OrdersTab = () => (
        <div className="space-y-3 pb-20">
            {selectedOrder ? (
                <div className="bg-white rounded-[2rem] p-6 shadow-lg animate-in slide-in-from-right-10">
                    <div className="flex justify-between items-center mb-6">
                        <button onClick={() => setSelectedOrder(null)} className="flex items-center gap-1 text-[#0071E3] font-bold text-[14px]"><ChevronLeft size={18} /> Quay lại</button>
                        <span className="font-bold text-[#1D1D1F]">#{selectedOrder.id.toString().slice(-5)}</span>
                    </div>
                    <div className="space-y-3">{selectedOrder.items.map((item, idx) => (<div key={idx} className="flex justify-between py-2 border-b border-[#F5F5F7] last:border-0"><div><p className="font-bold text-[14px]">{item.displayName}</p><p className="text-[12px] text-[#86868B]">{item.quantity} x {item.finalPrice?.toLocaleString()}đ</p></div><span className="font-bold">{((item.finalPrice || item.price) * item.quantity).toLocaleString()}đ</span></div>))}</div>
                </div>
            ) : (
                history.map(o => (<div key={o.id} onClick={() => setSelectedOrder(o)} className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm border border-[#F5F5F7] active:scale-[0.98] transition-all"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-[#E8E8ED] rounded-xl flex items-center justify-center text-[#1D1D1F] font-bold text-[12px]">#{o.id.toString().slice(-4)}</div><div><p className="font-bold text-[#1D1D1F] text-[15px]">{o.total.toLocaleString()}đ</p><p className="text-[11px] text-[#86868B]">{new Date(o.timestamp).toLocaleString()}</p></div></div><ChevronLeft size={18} className="rotate-180 text-[#D2D2D7]" /></div>))
            )}
        </div>
    );

    const DashboardTab = () => (
        <div className="space-y-4 pb-20">
            <div className="bg-[#1D1D1F] text-white p-6 rounded-[2rem] shadow-xl">
                <p className="text-[13px] text-white/60 mb-1 font-bold uppercase tracking-wider">Doanh thu hôm nay</p>
                <h2 className="text-[36px] font-black tracking-tight">{revenue.toLocaleString()}đ</h2>
                <div className="mt-4 flex gap-3"><div className="bg-white/10 px-3 py-1.5 rounded-lg text-[12px] font-medium backdrop-blur-md">{todayOrders.length} đơn hàng</div></div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-screen bg-[#F5F5F7] font-['Inter']">
            <div className="bg-white/90 backdrop-blur-md px-4 py-3 border-b border-[#D2D2D7]/30 sticky top-0 z-20">
                <div className="flex items-center justify-between mb-3">
                    <button onClick={onBackToPos} className="w-9 h-9 bg-[#F5F5F7] rounded-full flex items-center justify-center text-[#1D1D1F]"><ChevronLeft size={20} /></button>
                    <span className="font-black text-[16px]">Quản trị</span>
                    <div className="w-9"></div>
                </div>
                <div className="flex bg-[#F5F5F7] p-1 rounded-2xl">
                    {[{ id: 'dashboard', l: 'Tổng quan' }, { id: 'products', l: 'Sản phẩm' }, { id: 'orders', l: 'Đơn hàng' }].map(t => (
                        <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex-1 py-2 rounded-xl text-[12px] font-bold transition-all ${activeTab === t.id ? 'bg-white shadow-sm text-[#1D1D1F]' : 'text-[#86868B]'}`}>{t.l}</button>
                    ))}
                </div>
            </div>
            <main className="flex-1 overflow-y-auto p-4 scroll-smooth" onScroll={handleScroll}>
                <div className="max-w-4xl mx-auto">{activeTab === 'dashboard' && <DashboardTab />}{activeTab === 'products' && <ProductsTab />}{activeTab === 'orders' && <OrdersTab />}</div>
            </main>
            {(editingProduct || showAddProduct) && <ProductModal product={editingProduct} onClose={() => { setEditingProduct(null); setShowAddProduct(false) }} onSave={() => { refreshData(); setEditingProduct(null); setShowAddProduct(false) }} />}
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
                    <div className="flex flex-col items-center gap-3"><div className="w-28 h-28 bg-[#F5F5F7] rounded-2xl overflow-hidden border border-[#E8E8ED] flex items-center justify-center relative">{formData.image ? <img src={formData.image} className="w-full h-full object-cover" /> : <ImageIcon className="text-[#D2D2D7]" />}<input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageChange} accept="image/*" /></div><p className="text[12px] text-[#0071E3] font-bold">Chạm để đổi ảnh</p></div>
                    <div className="space-y-4">
                        <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Tên sản phẩm" className="w-full bg-[#F9F9FA] p-4 rounded-xl font-bold outline-none ring-1 ring-transparent focus:ring-[#0071E3]" />
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-[11px] font-bold uppercase text-[#86868B] ml-1">Giá lẻ</label><input type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })} className="w-full bg-[#F9F9FA] p-3 rounded-xl font-bold text-[#0071E3] outline-none" /></div>
                            <div><label className="text-[11px] font-bold uppercase text-[#86868B] ml-1">Tồn kho</label><input type="number" value={formData.stock} onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })} className="w-full bg-[#F9F9FA] p-3 rounded-xl font-medium outline-none" /></div>
                        </div>
                        <div className="bg-[#F9F9FA] p-4 rounded-2xl border border-[#F5F5F7]"><label className="text-[11px] font-bold uppercase text-[#86868B] mb-2 block">Giá thùng & Quy cách</label><div className="flex gap-3"><input type="number" value={formData.case_price} onChange={e => setFormData({ ...formData, case_price: parseInt(e.target.value) || 0 })} placeholder="Giá thùng" className="flex-1 bg-white p-3 rounded-xl font-bold text-emerald-600 outline-none" /><input type="number" value={formData.units_per_case} onChange={e => setFormData({ ...formData, units_per_case: parseInt(e.target.value) || 1 })} placeholder="SL/Thùng" className="w-24 bg-white p-3 rounded-xl font-medium outline-none text-center" /></div></div>
                        <div><label className="text-[11px] font-bold uppercase text-[#86868B] ml-1">Mã vạch</label><div className="relative mt-1"><input value={formData.code || ''} onChange={e => setFormData({ ...formData, code: e.target.value })} placeholder="Quét hoặc nhập mã..." className="w-full bg-[#F9F9FA] pl-4 pr-12 py-3.5 rounded-xl font-mono text-[14px] outline-none" /><button onClick={() => setIsScanning(true)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white rounded-lg shadow-sm border border-[#E8E8ED] hover:scale-105 transition-transform"><ScanLine size={18} className="text-[#1D1D1F]" /></button></div></div>
                        <div className="grid grid-cols-2 gap-3"><input value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} placeholder="Danh mục" className="bg-[#F9F9FA] p-3 rounded-xl text-[13px] outline-none" /><input value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })} placeholder="Thương hiệu" className="bg-[#F9F9FA] p-3 rounded-xl text-[13px] outline-none" /></div>
                    </div>
                </div>
                <div className="p-4 border-t border-[#F5F5F7]"><button onClick={handleSubmit} className="w-full bg-[#0071E3] text-white py-4 rounded-2xl font-bold text-[16px] shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-transform">Lưu sản phẩm</button></div>
            </div>
        </div>
    );
};

export default AdminPage;
