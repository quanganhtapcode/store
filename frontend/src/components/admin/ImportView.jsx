import React, { useState, useMemo, useEffect } from 'react';
import {
    Card, Table, TableBody, TableCell,
    TableHead, TableHeaderCell, TableRow, BarChart,
} from '@tremor/react';
import {
    Truck, Package, Search, X, Plus, Minus, Trash2,
    CheckCircle, Image as ImageIcon, ChevronDown, Clock,
    TrendingUp, AlertTriangle, ShoppingCart, DollarSign, Percent, ArrowRight
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
}

const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http') || imagePath.startsWith('data:')) return imagePath;
    let baseUrl = API_URL.replace(/\/api\/?$/, '');
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
    const path = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    return `${baseUrl}${path}`;
};

const fmt = (v) => {
    if (!v && v !== 0) return '0đ';
    if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(1)} tỷ`;
    if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}m đ`;
    if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(0)}k đ`;
    return `${v.toLocaleString('vi-VN')}đ`;
};

const fmtNum = (v) => {
    if (!v && v !== 0) return '0';
    return v.toLocaleString('vi-VN');
};

const normalizeText = (text) => {
    if (!text) return '';
    return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
};

const URGENCY_MAP = {
    critical: { label: 'Cần gấp', color: 'bg-red-100 text-red-700', dotColor: 'bg-red-500' },
    high: { label: 'Ưu tiên cao', color: 'bg-orange-100 text-orange-700', dotColor: 'bg-orange-500' },
    medium: { label: 'Nên nhập', color: 'bg-yellow-100 text-yellow-700', dotColor: 'bg-yellow-500' },
    low: { label: 'Bình thường', color: 'bg-green-100 text-green-700', dotColor: 'bg-green-500' },
};

/* ═══════════════════════════════════════════ */
/* ── Import View ─────────────────────────── */
/* ═══════════════════════════════════════════ */
const ImportView = ({ products, suppliers, refreshData, authToken, onLogout }) => {
    const [importCart, setImportCart] = useState([]);
    const [importSearch, setImportSearch] = useState('');
    const [selectedSupplier, setSelectedSupplier] = useState('');
    const [importNote, setImportNote] = useState('');
    const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
    const [editingQty, setEditingQty] = useState(null);
    const [editingPrice, setEditingPrice] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [viewMode, setViewMode] = useState('import'); // 'import' | 'history' | 'analysis' | 'recommend'
    const [importHistory, setImportHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [profitData, setProfitData] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [loadingAnalysis, setLoadingAnalysis] = useState(false);

    // Filter products
    const filteredProducts = useMemo(() => {
        const searchNorm = normalizeText(importSearch);
        if (!searchNorm.trim()) return products;
        return products.filter(p =>
            normalizeText(p.name).includes(searchNorm) ||
            normalizeText(p.brand).includes(searchNorm) ||
            (p.code && p.code.includes(importSearch))
        );
    }, [products, importSearch]);

    // Group by brand
    const productsByBrand = useMemo(() => {
        const grouped = {};
        filteredProducts.forEach(p => {
            const brand = p.brand || 'Khác';
            if (!grouped[brand]) grouped[brand] = [];
            grouped[brand].push(p);
        });
        return grouped;
    }, [filteredProducts]);

    const addToImport = (p, qty = 1) => {
        setImportCart(prev => {
            const ex = prev.find(i => i.id === p.id);
            if (ex) return prev.map(i => i.id === p.id ? { ...i, quantity: i.quantity + qty } : i);
            return [...prev, { ...p, quantity: qty, importPrice: p.cost_price || Math.round(p.price * 0.7) }];
        });
    };

    const totalCost = importCart.reduce((s, i) => s + (i.importPrice * i.quantity), 0);
    const totalItems = importCart.reduce((s, i) => s + i.quantity, 0);
    const totalRetailValue = importCart.reduce((s, i) => s + (i.price * i.quantity), 0);
    const expectedProfit = totalRetailValue - totalCost;
    const avgMargin = totalRetailValue > 0 ? ((expectedProfit / totalRetailValue) * 100).toFixed(1) : 0;

    const submitImport = async () => {
        if (importCart.length === 0) return;
        setSubmitting(true);
        try {
            const res = await fetch(`${API_URL}/imports`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                body: JSON.stringify({
                    items: importCart,
                    total_cost: totalCost,
                    note: importNote || 'Nhập hàng',
                    supplier_id: selectedSupplier || null
                })
            });
            if (res.status === 401) { alert('Phiên hết hạn.'); onLogout(); return; }
            if (res.ok) {
                alert('✅ Nhập kho thành công!');
                setImportCart([]); setImportNote(''); setSelectedSupplier('');
                refreshData();
            }
        } catch (e) { alert('Lỗi nhập kho'); }
        finally { setSubmitting(false); }
    };

    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const res = await fetch(`${API_URL}/imports`);
            setImportHistory(await res.json());
        } catch (e) { console.error(e); }
        setLoadingHistory(false);
    };

    const fetchProfitAnalysis = async () => {
        setLoadingAnalysis(true);
        try {
            const [profitRes, recsRes] = await Promise.all([
                fetch(`${API_URL}/stats/profit-analysis`),
                fetch(`${API_URL}/stats/purchase-recommendations`),
            ]);
            setProfitData(await profitRes.json());
            setRecommendations(await recsRes.json());
        } catch (e) { console.error(e); }
        setLoadingAnalysis(false);
    };

    // Auto-add recommendations to cart
    const addRecommendationsToCart = (recs) => {
        recs.forEach(r => {
            if (r.suggestedQty > 0) {
                const product = products.find(p => p.id === r.id);
                if (product) {
                    setImportCart(prev => {
                        const ex = prev.find(i => i.id === r.id);
                        if (ex) return prev;
                        return [...prev, { ...product, quantity: r.suggestedQty, importPrice: r.costPrice || Math.round(product.price * 0.7) }];
                    });
                }
            }
        });
        setViewMode('import');
    };

    const tabs = [
        { id: 'import', label: 'Nhập kho', icon: Truck },
        { id: 'history', label: 'Lịch sử', icon: Clock, onSelect: fetchHistory },
        { id: 'analysis', label: 'Lợi nhuận', icon: TrendingUp, onSelect: fetchProfitAnalysis },
        { id: 'recommend', label: 'Gợi ý nhập', icon: ShoppingCart, onSelect: fetchProfitAnalysis },
    ];

    return (
        <div className="space-y-5 animate-in">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-xl font-bold text-tremor-content-strong dark:text-dark-tremor-content-strong">Nhập hàng</h2>
                    <p className="text-tremor-default text-tremor-content dark:text-dark-tremor-content">Tạo phiếu nhập kho, phân tích lợi nhuận & gợi ý mua hàng</p>
                </div>
                <div className="flex bg-tremor-background-muted dark:bg-dark-tremor-background-muted p-1 rounded-tremor-default border border-tremor-border dark:border-dark-tremor-border">
                    {tabs.map(t => (
                        <button key={t.id}
                            onClick={() => { setViewMode(t.id); t.onSelect?.(); }}
                            className={classNames(
                                'px-3 py-2 rounded-tremor-small text-xs font-semibold transition-all flex items-center gap-1.5',
                                viewMode === t.id
                                    ? 'bg-tremor-background text-tremor-content-strong shadow-sm dark:bg-dark-tremor-background dark:text-dark-tremor-content-strong'
                                    : 'text-tremor-content dark:text-dark-tremor-content'
                            )}
                        >
                            <t.icon size={14} />{t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ═══ IMPORT FORM ═══ */}
            {viewMode === 'import' && (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                    {/* Left: Cart */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Supplier Selection */}
                        <Card className="p-4">
                            <label className="text-tremor-label font-semibold text-tremor-content dark:text-dark-tremor-content mb-2 block uppercase tracking-wider">Nhà cung cấp</label>
                            <div className="relative">
                                <button onClick={() => setShowSupplierDropdown(!showSupplierDropdown)}
                                    className="w-full bg-tremor-background-muted dark:bg-dark-tremor-background-muted p-3 rounded-tremor-default text-left font-medium text-sm border border-tremor-border dark:border-dark-tremor-border hover:border-tremor-brand-subtle transition-colors flex items-center justify-between">
                                    <span className={selectedSupplier ? 'text-tremor-content-strong dark:text-dark-tremor-content-strong' : 'text-tremor-content dark:text-dark-tremor-content'}>
                                        {selectedSupplier ? suppliers.find(s => s.id === selectedSupplier)?.name || 'Chọn NCC' : 'Chọn nhà cung cấp (tùy chọn)'}
                                    </span>
                                    <ChevronDown size={16} className="text-tremor-content" />
                                </button>
                                {showSupplierDropdown && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-tremor-background dark:bg-dark-tremor-background border border-tremor-border dark:border-dark-tremor-border rounded-tremor-default shadow-xl z-20 max-h-48 overflow-y-auto">
                                        <button onClick={() => { setSelectedSupplier(''); setShowSupplierDropdown(false); }}
                                            className="w-full px-4 py-2.5 text-left text-sm text-tremor-content hover:bg-tremor-background-muted font-medium dark:text-dark-tremor-content dark:hover:bg-dark-tremor-background-muted">
                                            — Không chọn —
                                        </button>
                                        {suppliers.map(s => (
                                            <button key={s.id} onClick={() => { setSelectedSupplier(s.id); setShowSupplierDropdown(false); }}
                                                className={classNames('w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 font-medium transition-colors dark:hover:bg-dark-tremor-background-muted',
                                                    selectedSupplier === s.id ? 'bg-blue-50 text-tremor-brand dark:bg-dark-tremor-background-muted' : 'text-tremor-content-strong dark:text-dark-tremor-content-strong')}>
                                                <span className="flex items-center gap-2">
                                                    <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-[10px] font-bold">{s.name.charAt(0)}</span>
                                                    {s.name}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Cart */}
                        <div className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] rounded-tremor-default p-5 shadow-xl text-white">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-base flex items-center gap-2">
                                    <Truck size={20} /> Phiếu nhập kho
                                </h3>
                                <span className="text-xs bg-white/15 px-3 py-1 rounded-full font-medium">
                                    {importCart.length} mặt hàng · {totalItems} SP
                                </span>
                            </div>

                            {importCart.length === 0 ? (
                                <div className="text-center text-white/40 text-sm py-8">
                                    <Package size={36} className="mx-auto mb-2 opacity-40" />
                                    <p>Chọn sản phẩm bên phải để thêm</p>
                                </div>
                            ) : (
                                <div className="space-y-2.5 max-h-[40vh] overflow-y-auto scrollbar-hide">
                                    {importCart.map((item, idx) => (
                                        <div key={idx} className="bg-white/10 backdrop-blur rounded-xl p-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-white/15 rounded-lg overflow-hidden flex-shrink-0">
                                                    {item.image ? <img src={getImageUrl(item.image)} className="w-full h-full object-cover" /> : <Package className="w-full h-full p-2 text-white/40" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-xs truncate">{item.name}</p>
                                                    <p className="text-[10px] text-white/50">Tồn: {item.stock} · Giá bán: {fmt(item.price)}</p>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <button onClick={() => setImportCart(prev => prev.map((pi, i) => i === idx ? { ...pi, quantity: Math.max(1, pi.quantity - 1) } : pi))}
                                                        className="w-7 h-7 bg-white/15 rounded-lg flex items-center justify-center hover:bg-white/25"><Minus size={12} /></button>
                                                    {editingQty?.idx === idx ? (
                                                        <input type="text" inputMode="numeric" value={editingQty.value}
                                                            onChange={e => setEditingQty({ idx, value: e.target.value.replace(/[^0-9]/g, '') })}
                                                            onBlur={() => { const q = parseInt(editingQty.value, 10) || 1; setImportCart(prev => prev.map((pi, i) => i === idx ? { ...pi, quantity: Math.max(1, q) } : pi)); setEditingQty(null); }}
                                                            onKeyDown={e => { if (e.key === 'Enter') { const q = parseInt(editingQty.value, 10) || 1; setImportCart(prev => prev.map((pi, i) => i === idx ? { ...pi, quantity: Math.max(1, q) } : pi)); setEditingQty(null); } }}
                                                            autoFocus className="w-12 text-center text-sm font-bold bg-white text-gray-900 rounded px-1 py-0.5 outline-none" />
                                                    ) : (
                                                        <span onClick={() => setEditingQty({ idx, value: '' })}
                                                            className="w-10 text-center text-sm font-bold cursor-pointer hover:bg-white/15 rounded px-1 py-0.5">{item.quantity}</span>
                                                    )}
                                                    <button onClick={() => setImportCart(prev => prev.map((pi, i) => i === idx ? { ...pi, quantity: pi.quantity + 1 } : pi))}
                                                        className="w-7 h-7 bg-white/15 rounded-lg flex items-center justify-center hover:bg-white/25"><Plus size={12} /></button>
                                                    <button onClick={() => setImportCart(prev => prev.filter((_, i) => i !== idx))}
                                                        className="w-7 h-7 bg-red-500/20 text-red-400 rounded-lg flex items-center justify-center hover:bg-red-500/30 ml-1"><X size={12} /></button>
                                                </div>
                                            </div>
                                            {/* Cost price input */}
                                            <div className="mt-2 flex items-center gap-2">
                                                <span className="text-[10px] text-white/50 whitespace-nowrap">Giá nhập:</span>
                                                {editingPrice?.idx === idx ? (
                                                    <input type="text" inputMode="numeric" value={editingPrice.value}
                                                        onChange={e => setEditingPrice({ idx, value: e.target.value.replace(/[^0-9]/g, '') })}
                                                        onBlur={() => { const p = parseInt(editingPrice.value, 10) || 0; setImportCart(prev => prev.map((pi, i) => i === idx ? { ...pi, importPrice: p } : pi)); setEditingPrice(null); }}
                                                        onKeyDown={e => { if (e.key === 'Enter') { const p = parseInt(editingPrice.value, 10) || 0; setImportCart(prev => prev.map((pi, i) => i === idx ? { ...pi, importPrice: p } : pi)); setEditingPrice(null); } }}
                                                        autoFocus className="w-24 text-center text-xs font-bold bg-white text-gray-900 rounded px-2 py-1 outline-none" />
                                                ) : (
                                                    <span onClick={() => setEditingPrice({ idx, value: String(item.importPrice) })}
                                                        className="text-xs font-semibold text-blue-300 cursor-pointer hover:text-blue-200 bg-white/10 px-2 py-0.5 rounded">
                                                        {fmt(item.importPrice)}
                                                    </span>
                                                )}
                                                {item.importPrice > 0 && item.price > 0 && (
                                                    <span className={classNames('text-[10px] font-bold px-1.5 py-0.5 rounded',
                                                        ((item.price - item.importPrice) / item.price * 100) >= 20 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-yellow-500/20 text-yellow-300')}>
                                                        {((item.price - item.importPrice) / item.price * 100).toFixed(0)}% margin
                                                    </span>
                                                )}
                                                <span className="text-[10px] text-white/40 ml-auto">= {fmt(item.importPrice * item.quantity)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {importCart.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-white/15 space-y-3">
                                    <input type="text" placeholder="Ghi chú phiếu nhập..."
                                        value={importNote} onChange={e => setImportNote(e.target.value)}
                                        className="w-full bg-white/10 px-3 py-2.5 rounded-xl text-sm placeholder-white/30 outline-none font-medium" />

                                    {/* Profit preview */}
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="bg-white/10 rounded-lg p-2">
                                            <p className="text-[9px] text-white/50 uppercase">Giá nhập</p>
                                            <p className="text-sm font-bold">{fmt(totalCost)}</p>
                                        </div>
                                        <div className="bg-emerald-500/20 rounded-lg p-2">
                                            <p className="text-[9px] text-emerald-300 uppercase">Lợi nhuận dự kiến</p>
                                            <p className="text-sm font-bold text-emerald-300">{fmt(expectedProfit)}</p>
                                        </div>
                                        <div className="bg-blue-500/20 rounded-lg p-2">
                                            <p className="text-[9px] text-blue-300 uppercase">Margin TB</p>
                                            <p className="text-sm font-bold text-blue-300">{avgMargin}%</p>
                                        </div>
                                    </div>

                                    <button onClick={submitImport} disabled={submitting}
                                        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                                        {submitting ? (
                                            <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Đang xử lý...</>
                                        ) : (
                                            <><CheckCircle size={18} />Xác nhận Nhập Kho</>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Product Selection */}
                    <div className="lg:col-span-3 space-y-4">
                        <div className="relative">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-tremor-content" />
                            <input type="text" placeholder="Tìm sản phẩm để nhập kho..." value={importSearch}
                                onChange={e => setImportSearch(e.target.value)}
                                className="w-full bg-tremor-background dark:bg-dark-tremor-background pl-12 pr-10 py-3 rounded-tremor-default text-sm font-medium outline-none border border-tremor-border focus:border-tremor-brand focus:ring-2 focus:ring-tremor-brand-muted transition-all dark:border-dark-tremor-border dark:text-dark-tremor-content-strong" />
                            {importSearch && (
                                <button onClick={() => setImportSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-tremor-background-muted rounded-full hover:bg-gray-300">
                                    <X size={12} />
                                </button>
                            )}
                        </div>

                        <div className="space-y-4 max-h-[70vh] overflow-y-auto scrollbar-hide">
                            {Object.entries(productsByBrand).map(([brand, items]) => (
                                <div key={brand}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Package size={14} className="text-tremor-brand" />
                                        <h3 className="font-bold text-sm text-tremor-content-strong dark:text-dark-tremor-content-strong">{brand}</h3>
                                        <span className="text-xs text-tremor-content">({items.length})</span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
                                        {items.map(p => {
                                            const inCart = importCart.find(i => i.id === p.id);
                                            const margin = p.cost_price && p.price ? ((p.price - p.cost_price) / p.price * 100).toFixed(0) : null;
                                            return (
                                                <div key={p.id}
                                                    className={classNames('bg-tremor-background dark:bg-dark-tremor-background rounded-xl p-3 border-2 transition-all cursor-pointer hover:shadow-md',
                                                        inCart ? 'border-tremor-brand shadow-lg shadow-blue-500/10' : 'border-tremor-border dark:border-dark-tremor-border')}>
                                                    <div className="h-20 bg-tremor-background-muted dark:bg-dark-tremor-background-muted rounded-lg flex items-center justify-center overflow-hidden mb-2 relative" onClick={() => addToImport(p)}>
                                                        {p.image ? <img src={getImageUrl(p.image)} loading="lazy" className="w-full h-full object-cover" /> : <ImageIcon size={24} className="text-tremor-content-subtle" />}
                                                        {inCart && (
                                                            <div className="absolute top-1 right-1 bg-tremor-brand text-white text-[10px] w-6 h-6 rounded-full font-bold flex items-center justify-center shadow-lg">
                                                                {inCart.quantity}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className="font-bold text-[11px] text-tremor-content-strong dark:text-dark-tremor-content-strong line-clamp-1 mb-0.5">{p.name}</p>
                                                    <div className="flex items-center gap-1 text-[10px] text-tremor-content mb-1.5">
                                                        <span>Tồn: {p.stock}</span>
                                                        {margin && <span className="text-emerald-600 font-semibold">· {margin}%</span>}
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button onClick={() => addToImport(p)}
                                                            className="flex-1 bg-tremor-brand text-white text-[10px] py-1.5 rounded-lg font-bold active:scale-95 hover:bg-blue-600 transition-all">+1</button>
                                                        {p.units_per_case > 1 && (
                                                            <button onClick={() => addToImport(p, p.units_per_case)}
                                                                className="flex-1 bg-emerald-500 text-white text-[10px] py-1.5 rounded-lg font-bold active:scale-95 hover:bg-emerald-600 transition-all">+{p.units_per_case}</button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                            {Object.keys(productsByBrand).length === 0 && (
                                <div className="text-center py-12 text-tremor-content">
                                    <Package size={48} className="mx-auto mb-3 opacity-30" />
                                    <p className="font-medium">Không tìm thấy sản phẩm</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ HISTORY ═══ */}
            {viewMode === 'history' && (
                <div className="space-y-3">
                    {loadingHistory ? (
                        <div className="text-center py-12 text-tremor-content">
                            <div className="w-8 h-8 border-2 border-tremor-brand border-t-transparent rounded-full animate-spin mx-auto mb-3" />Đang tải...
                        </div>
                    ) : importHistory.length === 0 ? (
                        <Card className="p-0"><div className="text-center py-12"><Package size={48} className="mx-auto mb-3 text-tremor-content-subtle" /><p className="text-tremor-content font-medium">Chưa có lịch sử</p></div></Card>
                    ) : (
                        importHistory.map(imp => {
                            const items = typeof imp.items === 'string' ? JSON.parse(imp.items) : imp.items;
                            const supplier = suppliers.find(s => s.id === imp.supplier_id);
                            return (
                                <Card key={imp.id} className="p-5">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <p className="font-bold text-sm text-tremor-content-strong dark:text-dark-tremor-content-strong flex items-center gap-2">
                                                {imp.id}
                                                {supplier && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg font-medium">{supplier.name}</span>}
                                            </p>
                                            <p className="text-xs text-tremor-content mt-0.5">{new Date(imp.timestamp).toLocaleString('vi-VN')}</p>
                                        </div>
                                        <span className="font-black text-tremor-brand text-base">{fmt(imp.total_cost)}</span>
                                    </div>
                                    <div className="flex gap-1.5 flex-wrap">
                                        {items.slice(0, 4).map((item, idx) => (
                                            <span key={idx} className="text-xs bg-tremor-background-muted dark:bg-dark-tremor-background-muted text-tremor-content px-2 py-1 rounded-lg">{item.name} ×{item.quantity}</span>
                                        ))}
                                        {items.length > 4 && <span className="text-xs text-tremor-brand self-center">+{items.length - 4}</span>}
                                    </div>
                                    {imp.note && <p className="text-xs text-tremor-content mt-2 italic">📝 {imp.note}</p>}
                                </Card>
                            );
                        })
                    )}
                </div>
            )}

            {/* ═══ PROFIT ANALYSIS ═══ */}
            {viewMode === 'analysis' && (
                <div className="space-y-5">
                    {loadingAnalysis ? (
                        <div className="text-center py-12 text-tremor-content">
                            <div className="w-8 h-8 border-2 border-tremor-brand border-t-transparent rounded-full animate-spin mx-auto mb-3" />Đang phân tích...
                        </div>
                    ) : profitData ? (
                        <>
                            {/* Summary KPIs */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                {[
                                    { label: 'Doanh thu 30 ngày', value: fmt(profitData.summary?.totalRevenue30d), icon: DollarSign, color: 'text-blue-600' },
                                    { label: 'Chi phí nhập', value: fmt(profitData.summary?.totalCost30d), icon: Truck, color: 'text-orange-600' },
                                    { label: 'Lợi nhuận gộp', value: fmt(profitData.summary?.totalProfit30d), icon: TrendingUp, color: 'text-emerald-600' },
                                    { label: 'Margin TB', value: `${profitData.summary?.avgMargin || 0}%`, icon: Percent, color: 'text-purple-600' },
                                ].map(k => (
                                    <Card key={k.label} className="p-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <k.icon size={14} className={k.color} />
                                            <p className="text-tremor-label text-tremor-content dark:text-dark-tremor-content">{k.label}</p>
                                        </div>
                                        <p className="text-xl font-bold text-tremor-content-strong dark:text-dark-tremor-content-strong">{k.value}</p>
                                    </Card>
                                ))}
                            </div>

                            {/* Profit Table */}
                            <Card className="p-0 overflow-hidden">
                                <div className="p-6">
                                    <h3 className="font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong">Phân tích lợi nhuận theo sản phẩm</h3>
                                    <p className="mt-1 text-tremor-default text-tremor-content dark:text-dark-tremor-content">Dữ liệu 30 ngày gần nhất. Sắp xếp theo lợi nhuận giảm dần.</p>
                                </div>
                                <div className="border-t border-tremor-border dark:border-dark-tremor-border overflow-x-auto">
                                    <Table>
                                        <TableHead>
                                            <TableRow className="border-b border-tremor-border dark:border-dark-tremor-border">
                                                <TableHeaderCell>Sản phẩm</TableHeaderCell>
                                                <TableHeaderCell className="text-right">Giá bán</TableHeaderCell>
                                                <TableHeaderCell className="text-right">Giá nhập</TableHeaderCell>
                                                <TableHeaderCell className="text-right">Margin</TableHeaderCell>
                                                <TableHeaderCell className="text-right">Đã bán (30d)</TableHeaderCell>
                                                <TableHeaderCell className="text-right">Lợi nhuận</TableHeaderCell>
                                                <TableHeaderCell className="text-right">Tồn kho (ngày)</TableHeaderCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {(profitData.products || []).slice(0, 20).map(p => (
                                                <TableRow key={p.id} className="hover:bg-tremor-background-muted dark:hover:bg-dark-tremor-background-muted">
                                                    <TableCell>
                                                        <div>
                                                            <p className="font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong text-sm">{p.name}</p>
                                                            <p className="text-xs text-tremor-content">{p.brand}</p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right tabular-nums">{fmt(p.sellPrice)}</TableCell>
                                                    <TableCell className="text-right tabular-nums">{p.costPrice > 0 ? fmt(p.costPrice) : <span className="text-tremor-content-subtle">—</span>}</TableCell>
                                                    <TableCell className="text-right">
                                                        {p.margin > 0 ? (
                                                            <span className={classNames('text-xs font-semibold px-2 py-0.5 rounded',
                                                                p.margin >= 30 ? 'bg-emerald-100 text-emerald-700' : p.margin >= 15 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700')}>
                                                                {p.margin}%
                                                            </span>
                                                        ) : <span className="text-tremor-content-subtle">—</span>}
                                                    </TableCell>
                                                    <TableCell className="text-right tabular-nums font-medium">{fmtNum(p.sold30d)}</TableCell>
                                                    <TableCell className="text-right">
                                                        <span className={classNames('font-semibold tabular-nums', p.profit30d > 0 ? 'text-emerald-600' : 'text-tremor-content')}>
                                                            {fmt(p.profit30d)}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <span className={classNames('text-xs font-semibold px-2 py-0.5 rounded tabular-nums',
                                                            p.daysOfStock <= 3 ? 'bg-red-100 text-red-700' : p.daysOfStock <= 7 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700')}>
                                                            {p.daysOfStock >= 999 ? '∞' : `${p.daysOfStock}d`}
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </Card>
                        </>
                    ) : (
                        <Card className="p-0"><div className="text-center py-12"><p className="text-tremor-content">Chưa có dữ liệu phân tích</p></div></Card>
                    )}
                </div>
            )}

            {/* ═══ PURCHASE RECOMMENDATIONS ═══ */}
            {viewMode === 'recommend' && (
                <div className="space-y-5">
                    {loadingAnalysis ? (
                        <div className="text-center py-12 text-tremor-content">
                            <div className="w-8 h-8 border-2 border-tremor-brand border-t-transparent rounded-full animate-spin mx-auto mb-3" />Đang phân tích...
                        </div>
                    ) : recommendations.length > 0 ? (
                        <>
                            {/* Quick Add All button */}
                            <Card className="p-4 flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong">
                                        {recommendations.length} sản phẩm cần nhập
                                    </h3>
                                    <p className="text-tremor-default text-tremor-content dark:text-dark-tremor-content">
                                        Tổng chi phí dự kiến: {fmt(recommendations.reduce((s, r) => s + r.estimatedCost, 0))}
                                        {' · '}Dựa trên dữ liệu bán hàng 30 ngày, dự trữ cho 14 ngày tiếp theo.
                                    </p>
                                </div>
                                <button onClick={() => addRecommendationsToCart(recommendations)}
                                    className="shrink-0 flex items-center gap-2 bg-tremor-brand text-white px-4 py-2.5 rounded-tremor-default font-semibold text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all">
                                    <ShoppingCart size={16} />Thêm tất cả vào phiếu
                                </button>
                            </Card>

                            {/* Recommendations Table */}
                            <Card className="p-0 overflow-hidden">
                                <div className="p-6">
                                    <h3 className="font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong">Gợi ý nhập hàng thông minh</h3>
                                    <p className="mt-1 text-tremor-default text-tremor-content dark:text-dark-tremor-content">Dựa vào tốc độ bán 30 ngày, tồn kho hiện tại và margin lợi nhuận.</p>
                                </div>
                                <div className="border-t border-tremor-border dark:border-dark-tremor-border overflow-x-auto">
                                    <Table>
                                        <TableHead>
                                            <TableRow className="border-b border-tremor-border dark:border-dark-tremor-border">
                                                <TableHeaderCell>Sản phẩm</TableHeaderCell>
                                                <TableHeaderCell className="text-center">Mức độ</TableHeaderCell>
                                                <TableHeaderCell className="text-right">Tồn kho</TableHeaderCell>
                                                <TableHeaderCell className="text-right">Bán / ngày</TableHeaderCell>
                                                <TableHeaderCell className="text-right">Nên nhập</TableHeaderCell>
                                                <TableHeaderCell className="text-right">Margin</TableHeaderCell>
                                                <TableHeaderCell className="text-right">Chi phí</TableHeaderCell>
                                                <TableHeaderCell className="text-center"></TableHeaderCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {recommendations.map(r => {
                                                const u = URGENCY_MAP[r.urgency] || URGENCY_MAP.low;
                                                return (
                                                    <TableRow key={r.id} className="hover:bg-tremor-background-muted dark:hover:bg-dark-tremor-background-muted">
                                                        <TableCell>
                                                            <div>
                                                                <p className="font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong text-sm">{r.name}</p>
                                                                <p className="text-xs text-tremor-content">{r.brand}</p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <span className={classNames('text-[10px] font-bold px-2 py-1 rounded-full', u.color)}>{u.label}</span>
                                                        </TableCell>
                                                        <TableCell className="text-right tabular-nums">
                                                            <span className={r.stock <= 0 ? 'text-red-600 font-bold' : ''}>{r.stock}</span>
                                                        </TableCell>
                                                        <TableCell className="text-right tabular-nums">{r.dailyAvg}</TableCell>
                                                        <TableCell className="text-right">
                                                            <span className="font-bold text-tremor-brand tabular-nums">{r.suggestedQty}</span>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {r.margin > 0 ? (
                                                                <span className={classNames('text-xs font-semibold px-2 py-0.5 rounded',
                                                                    r.margin >= 30 ? 'bg-emerald-100 text-emerald-700' : r.margin >= 15 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700')}>
                                                                    {r.margin}%
                                                                </span>
                                                            ) : <span className="text-tremor-content-subtle">—</span>}
                                                        </TableCell>
                                                        <TableCell className="text-right tabular-nums font-medium">{fmt(r.estimatedCost)}</TableCell>
                                                        <TableCell className="text-center">
                                                            <button onClick={() => {
                                                                const product = products.find(p => p.id === r.id);
                                                                if (product) {
                                                                    setImportCart(prev => {
                                                                        if (prev.find(i => i.id === r.id)) return prev;
                                                                        return [...prev, { ...product, quantity: r.suggestedQty, importPrice: r.costPrice || Math.round(product.price * 0.7) }];
                                                                    });
                                                                    setViewMode('import');
                                                                }
                                                            }}
                                                                className="text-tremor-brand hover:text-blue-700 transition-colors" title="Thêm vào phiếu">
                                                                <ArrowRight size={16} />
                                                            </button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </Card>
                        </>
                    ) : (
                        <Card className="p-0">
                            <div className="text-center py-12">
                                <CheckCircle size={48} className="mx-auto mb-3 text-emerald-300" />
                                <p className="font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong">Tồn kho đủ!</p>
                                <p className="text-tremor-content text-sm mt-1">Không có sản phẩm nào cần nhập thêm trong 14 ngày tới.</p>
                            </div>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
};

export default ImportView;
