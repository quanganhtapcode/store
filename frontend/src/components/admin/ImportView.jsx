import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    Card, Table, TableBody, TableCell,
    TableHead, TableHeaderCell, TableRow, BarChart, Badge
} from '@tremor/react';
import {
    Truck, Package, Search, X, Plus, Minus, Trash2,
    CheckCircle, Image as ImageIcon, ChevronDown, Clock,
    TrendingUp, AlertTriangle, ShoppingCart, DollarSign, Percent, ArrowRight,
    ChevronLeft, ChevronRight, FileText
} from 'lucide-react';
import {
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from '@tanstack/react-table';

// Modal component for viewing import details
const ImportDetailsModal = ({ isOpen, onClose, importData, suppliers, fmt, products }) => {
    if (!isOpen || !importData) return null;
    const supplier = suppliers.find(s => s.id === importData.supplier_id);
    const items = typeof importData.items === 'string' ? JSON.parse(importData.items) : (importData.items || []);

    return (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 opacity-100 transition-opacity">
            <div className="bg-tremor-background dark:bg-dark-tremor-background rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-5 py-4 border-b border-tremor-border dark:border-dark-tremor-border flex items-center justify-between bg-tremor-background-muted/30 dark:bg-dark-tremor-background-muted/30">
                    <div>
                        <h3 className="text-lg font-bold text-tremor-content-strong dark:text-dark-tremor-content-strong">Chi Tiết Phiếu Nhập</h3>
                        <p className="text-xs text-tremor-content mt-1 font-medium">Mã: {importData.id}</p>
                    </div>
                    <button onClick={onClose} className="p-2 -mr-2 text-tremor-content hover:bg-tremor-background-muted dark:hover:bg-dark-tremor-background-muted rounded-full transition-colors"><X size={20} /></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-5 scrollbar-hide">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-tremor-background-muted/50 dark:bg-dark-tremor-background-muted/50 p-3 rounded-lg">
                            <p className="text-[11px] font-bold text-tremor-content uppercase tracking-wider mb-1">Thời gian</p>
                            <p className="text-sm font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong">
                                {new Date(importData.timestamp).toLocaleString('vi-VN')}
                            </p>
                        </div>
                        <div className="bg-tremor-background-muted/50 dark:bg-dark-tremor-background-muted/50 p-3 rounded-lg">
                            <p className="text-[11px] font-bold text-tremor-content uppercase tracking-wider mb-1">Nhà cung cấp</p>
                            <p className="text-sm font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong">
                                {supplier ? supplier.name : '—'}
                            </p>
                        </div>
                    </div>

                    <h4 className="font-bold text-sm text-tremor-content-strong dark:text-dark-tremor-content-strong mb-3 border-b border-tremor-border dark:border-dark-tremor-border pb-2">Sản phẩm đã nhập</h4>
                    <div className="space-y-3">
                        {items.map((item, idx) => {
                            const product = products.find(p => p.id === item.id) || item;
                            return (
                                <div key={idx} className="flex items-center gap-3 p-3 bg-white dark:bg-dark-tremor-background border border-tremor-border dark:border-dark-tremor-border shadow-sm rounded-lg">
                                    <div className="w-12 h-12 bg-tremor-background-muted dark:bg-dark-tremor-background-subtle rounded-md flex items-center justify-center shrink-0">
                                        {product.image ? <img src={getImageUrl(product.image)} className="w-full h-full object-cover rounded-md" /> : <Package size={20} className="text-tremor-content-subtle" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-tremor-content-strong dark:text-dark-tremor-content-strong truncate">{item.name}</p>
                                        <p className="text-xs text-tremor-content mt-0.5">SL: <span className="font-bold text-tremor-content-strong dark:text-dark-tremor-content-strong">{item.quantity}</span> × {fmt(item.importPrice)}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="font-bold text-sm text-tremor-content-strong dark:text-dark-tremor-content-strong">{fmt(item.quantity * item.importPrice)}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {importData.note && (
                        <div className="mt-5 pt-4 border-t border-tremor-border dark:border-dark-tremor-border">
                            <p className="text-[11px] font-bold text-tremor-content uppercase tracking-wider mb-1">Ghi chú</p>
                            <p className="text-sm text-tremor-content-strong dark:text-dark-tremor-content-strong">{importData.note}</p>
                        </div>
                    )}
                </div>

                <div className="px-5 py-4 border-t border-tremor-border dark:border-dark-tremor-border bg-tremor-background-muted/30 dark:bg-dark-tremor-background-muted/30 flex justify-between items-center">
                    <span className="text-sm font-bold text-tremor-content dark:text-dark-tremor-content">Tổng tiền nhập:</span>
                    <span className="text-lg font-bold text-tremor-brand dark:text-dark-tremor-brand">{fmt(importData.total_cost)}</span>
                </div>
            </div>
        </div>
    );
};

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

// Pagination Components
const TextButton = ({ onClick, disabled, children, className }) => (
    <button type="button" className={classNames("rounded-tremor-small bg-tremor-background p-2 text-tremor-default shadow-tremor-input ring-1 ring-inset ring-tremor-ring hover:bg-tremor-background-muted disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-tremor-background dark:bg-dark-tremor-background dark:shadow-dark-tremor-input dark:ring-dark-tremor-ring hover:dark:bg-dark-tremor-background-muted disabled:hover:dark:bg-dark-tremor-background", className)} onClick={onClick} disabled={disabled}>{children}</button>
);
const NumberButton = ({ active, onClick, children, position }) => (
    <button type="button" className={classNames('min-w-[36px] flex items-center justify-center rounded-tremor-small p-2 text-tremor-default text-tremor-content-strong disabled:opacity-50 dark:text-dark-tremor-content-strong', active ? 'bg-tremor-brand font-semibold text-white dark:bg-dark-tremor-brand dark:text-dark-tremor-brand-inverted' : 'hover:bg-tremor-background-muted hover:dark:bg-dark-tremor-background', position === 'left' ? 'rounded-l-tremor-small' : position === 'right' ? 'rounded-r-tremor-small' : '')} onClick={onClick} aria-current={active ? 'page' : undefined}>{children}</button>
);
const MobileButton = ({ onClick, disabled, children, position }) => (
    <button type="button" className={classNames('group p-2 flex items-center justify-center text-tremor-default ring-1 ring-inset ring-tremor-ring hover:bg-tremor-background-muted disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-tremor-background dark:ring-dark-tremor-ring hover:dark:bg-dark-tremor-background disabled:hover:dark:bg-dark-tremor-background', position === 'left' ? 'rounded-l-tremor-small' : position === 'right' ? '-ml-px rounded-r-tremor-small' : '')} onClick={onClick} disabled={disabled}>{children}</button>
);

const HistoryTable = ({ loading, history, suppliers, fmt, onRowClick }) => {
    const columns = useMemo(() => [
        {
            header: 'Mã phiếu',
            accessorKey: 'id',
            cell: ({ getValue }) => <span className="font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong">{getValue()}</span>,
        },
        {
            header: 'Nhà cung cấp',
            accessorKey: 'supplier_id',
            cell: ({ getValue }) => {
                const s = suppliers.find(su => su.id === getValue());
                return s ? <span className="inline-flex items-center rounded-tremor-small px-2 py-0.5 text-[11px] font-medium bg-blue-100 text-blue-800 ring-1 ring-inset ring-blue-600/10 dark:bg-blue-500/20 dark:text-blue-400 dark:ring-blue-400/20">{s.name}</span> : <span className="text-tremor-content-subtle">—</span>;
            }
        },
        {
            header: 'Thời gian',
            accessorKey: 'timestamp',
            cell: ({ getValue }) => <span className="text-tremor-content dark:text-dark-tremor-content whitespace-nowrap"><Clock size={12} className="inline mr-1" />{new Date(getValue()).toLocaleString('vi-VN')}</span>,
        },
        {
            header: 'Sản phẩm',
            accessorKey: 'items',
            cell: ({ getValue }) => {
                const itemsStr = getValue();
                const items = typeof itemsStr === 'string' ? JSON.parse(itemsStr) : (itemsStr || []);
                return (
                    <div className="flex flex-wrap gap-1 max-w-[250px]">
                        {items.slice(0, 3).map((item, idx) => (
                            <span key={idx} className="inline-flex items-center rounded-tremor-small px-1.5 py-0.5 text-[10px] sm:text-[11px] font-medium bg-gray-100 text-gray-800 ring-1 ring-inset ring-gray-600/10 dark:bg-gray-500/20 dark:text-gray-300 dark:ring-gray-400/20">
                                {item.name} <span className="ml-1 opacity-70">×{item.quantity}</span>
                            </span>
                        ))}
                        {items.length > 3 && (
                            <span className="inline-flex items-center rounded-tremor-small px-1.5 py-0.5 text-[10px] sm:text-[11px] font-medium bg-blue-100 text-blue-800 ring-1 ring-inset ring-blue-600/10 dark:bg-blue-500/20 dark:text-blue-400 dark:ring-blue-400/20">
                                +{items.length - 3}
                            </span>
                        )}
                    </div>
                );
            }
        },
        {
            header: 'Tổng tiền',
            accessorKey: 'total_cost',
            meta: { align: 'text-right' },
            cell: ({ getValue }) => <span className="font-bold text-tremor-brand dark:text-dark-tremor-brand whitespace-nowrap">{fmt(getValue())}</span>
        }
    ], [suppliers, fmt]);

    const table = useReactTable({
        data: history,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize: 50 } }
    });

    const paginationCount = table.getPageCount();
    const actualPage = table.getState().pagination.pageIndex + 1;

    if (loading) return <div className="text-center py-12 text-tremor-content"><div className="w-8 h-8 border-2 border-tremor-brand border-t-transparent rounded-full animate-spin mx-auto mb-3" />Đang tải...</div>;
    if (history.length === 0) return <Card className="p-0"><div className="text-center py-12"><FileText size={48} className="mx-auto mb-3 text-tremor-content-subtle" /><p className="text-tremor-content font-medium">Chưa có lịch sử nhập kho</p></div></Card>;

    return (
        <Card className="p-0 sm:p-0 overflow-hidden">
            <div className="overflow-x-auto relative min-h-[400px]">
                <Table>
                    <TableHead className="bg-tremor-background-muted/50 dark:bg-dark-tremor-background-muted/50">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="border-b border-tremor-border dark:border-dark-tremor-border">
                                {headerGroup.headers.map((header) => (
                                    <TableHeaderCell key={header.id} className={classNames(header.column.columnDef.meta?.align || 'text-left', 'py-3')}>
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHeaderCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableHead>
                    <TableBody>
                        {table.getRowModel().rows.map((row) => (
                            <TableRow key={row.id} 
                                onClick={() => onRowClick(row.original)}
                                className="hover:bg-tremor-background-muted hover:dark:bg-dark-tremor-background-muted transition-colors cursor-pointer active:bg-blue-50 dark:active:bg-blue-900/20">
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell key={cell.id} className={classNames(cell.column.columnDef.meta?.align || 'text-left', 'align-middle')}>
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            {/* Pagination Controls */}
            <div className="p-4 border-t border-tremor-border dark:border-dark-tremor-border bg-tremor-background-muted/50 dark:bg-dark-tremor-background-muted/50 flex items-center justify-between sm:justify-center">
                <div className="hidden gap-0.5 sm:inline-flex">
                    <TextButton onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="group"><span className="sr-only">Previous</span><ChevronLeft className="size-5 text-tremor-content-emphasis group-hover:text-tremor-content-strong dark:text-dark-tremor-content-emphasis group-hover:dark:text-dark-tremor-content-strong" aria-hidden={true} /></TextButton>
                    <NumberButton onClick={() => table.setPageIndex(0)} active={actualPage === 1}>1</NumberButton>
                    {actualPage > 4 ? (
                        actualPage < paginationCount - 2 ? (
                            <>
                                <NumberButton onClick={() => table.setPageIndex(actualPage - 3)} active={false}>...</NumberButton>
                                <NumberButton onClick={() => table.setPageIndex(actualPage - 2)} active={actualPage === actualPage - 1}>{actualPage - 1}</NumberButton>
                                <NumberButton onClick={() => table.setPageIndex(actualPage - 1)} active={true}>{actualPage}</NumberButton>
                                <NumberButton onClick={() => table.setPageIndex(actualPage)} active={actualPage === actualPage + 1}>{actualPage + 1}</NumberButton>
                                <NumberButton onClick={() => table.setPageIndex(actualPage + 1)} active={false}>...</NumberButton>
                            </>
                        ) : (
                            <>
                                <NumberButton onClick={() => table.setPageIndex(1)} active={false}>2</NumberButton>
                                <NumberButton onClick={() => table.setPageIndex(paginationCount - 5)} active={false}>...</NumberButton>
                                <NumberButton onClick={() => table.setPageIndex(paginationCount - 4)} active={actualPage === paginationCount - 3}>{paginationCount - 3}</NumberButton>
                                <NumberButton onClick={() => table.setPageIndex(paginationCount - 3)} active={actualPage === paginationCount - 2}>{paginationCount - 2}</NumberButton>
                                <NumberButton onClick={() => table.setPageIndex(paginationCount - 2)} active={actualPage === paginationCount - 1}>{paginationCount - 1}</NumberButton>
                            </>
                        )
                    ) : (
                        <>
                            {paginationCount >= 2 && <NumberButton onClick={() => table.setPageIndex(1)} active={actualPage === 2}>2</NumberButton>}
                            {paginationCount >= 3 && <NumberButton onClick={() => table.setPageIndex(2)} active={actualPage === 3}>3</NumberButton>}
                            {paginationCount >= 4 && <NumberButton onClick={() => table.setPageIndex(3)} active={actualPage === 4}>4</NumberButton>}
                            {paginationCount > 5 && <NumberButton onClick={() => table.setPageIndex(4)} active={false}>...</NumberButton>}
                            {paginationCount > 5 && <NumberButton onClick={() => table.setPageIndex(paginationCount - 2)} active={false}>{paginationCount - 1}</NumberButton>}
                        </>
                    )}
                    {paginationCount > 1 && <NumberButton onClick={() => table.setPageIndex(paginationCount - 1)} active={actualPage === paginationCount}>{paginationCount}</NumberButton>}
                    <TextButton onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="group"><span className="sr-only">Next</span><ChevronRight className="size-5 text-tremor-content-emphasis group-hover:text-tremor-content-strong dark:text-dark-tremor-content-emphasis group-hover:dark:text-dark-tremor-content-strong" aria-hidden={true} /></TextButton>
                </div>
                <p className="text-tremor-default tabular-nums text-tremor-content dark:text-dark-tremor-content sm:hidden">Trang <span className="font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong">{actualPage}</span> / <span className="font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong">{paginationCount || 1}</span></p>
                <div className="inline-flex items-center rounded-tremor-small shadow-tremor-input dark:shadow-dark-tremor-input sm:hidden">
                    <MobileButton position="left" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}><span className="sr-only">Previous</span><ChevronLeft className="size-5 text-tremor-content-emphasis group-hover:text-tremor-content-strong dark:text-dark-tremor-content-emphasis group-hover:dark:text-dark-tremor-content-strong" aria-hidden={true} /></MobileButton>
                    <MobileButton position="right" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}><span className="sr-only">Next</span><ChevronRight className="size-5 text-tremor-content-emphasis group-hover:text-tremor-content-strong dark:text-dark-tremor-content-emphasis group-hover:dark:text-dark-tremor-content-strong" aria-hidden={true} /></MobileButton>
                </div>
            </div>
        </Card>
    );
};

/* ═══════════════════════════════════════════ */
/* ── Import View ─────────────────────────── */
/* ═══════════════════════════════════════════ */
const ImportView = ({ subView, setActiveTab, products, suppliers, refreshData, authToken, onLogout }) => {
    const [importCart, setImportCart] = useState([]);
    const [importSearch, setImportSearch] = useState('');
    const [selectedSupplier, setSelectedSupplier] = useState('');
    const [importNote, setImportNote] = useState('');
    const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
    const [editingQty, setEditingQty] = useState(null);
    const [editingPrice, setEditingPrice] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const viewMode = subView || 'import';
    const [importHistory, setImportHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [profitData, setProfitData] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [loadingAnalysis, setLoadingAnalysis] = useState(false);
    const [selectedImportData, setSelectedImportData] = useState(null);

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

    const fetchHistory = useCallback(async () => {
        setLoadingHistory(true);
        try {
            const res = await fetch(`${API_URL}/imports`);
            setImportHistory(await res.json());
        } catch (e) { console.error(e); }
        setLoadingHistory(false);
    }, []);

    const fetchProfitAnalysis = useCallback(async () => {
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
    }, []);

    useEffect(() => {
        if (viewMode === 'history') fetchHistory();
        if (viewMode === 'analysis' || viewMode === 'recommend') fetchProfitAnalysis();
    }, [viewMode, fetchHistory, fetchProfitAnalysis]);

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
        setActiveTab('import');
    };

    const viewTitles = {
        'import': { title: 'Tạo phiếu nhập', desc: 'Nhập hàng vào kho và cập nhật giá', icon: Truck },
        'history': { title: 'Lịch sử nhập kho', desc: 'Theo dõi các phiếu nhập hàng đã tạo', icon: Clock },
        'analysis': { title: 'Phân tích lợi nhuận', desc: 'Tình hình doanh thu, chi phí và tồn kho', icon: TrendingUp },
        'recommend': { title: 'Gợi ý nhập hàng', desc: 'Tính toán thông minh dựa trên AI', icon: ShoppingCart },
    };

    const currentTitle = viewTitles[viewMode] || viewTitles['import'];

    return (
        <div className="space-y-4 animate-in">
            {/* Header - hide on mobile to save space */}
            <div className="hidden sm:flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <currentTitle.icon size={20} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-tremor-content-strong dark:text-dark-tremor-content-strong">{currentTitle.title}</h2>
                    <p className="text-tremor-default text-tremor-content dark:text-dark-tremor-content">{currentTitle.desc}</p>
                </div>
            </div>

            {/* ═══ IMPORT FORM ═══ */}
            {viewMode === 'import' && (
                <div className="flex flex-col lg:grid lg:grid-cols-5 gap-5">
                    {/* Left/Bottom: Cart */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Supplier Selection */}
                        <div className="bg-white dark:bg-dark-tremor-background rounded-tremor-default border border-tremor-border dark:border-dark-tremor-border p-4 shadow-sm">
                            <label className="text-xs font-semibold text-tremor-content dark:text-dark-tremor-content mb-2 block uppercase tracking-wider">Nhà cung cấp</label>
                            <div className="relative">
                                <button onClick={() => setShowSupplierDropdown(!showSupplierDropdown)}
                                    className="w-full bg-tremor-background-muted dark:bg-dark-tremor-background-muted p-2.5 rounded-lg text-left font-medium text-sm border border-tremor-border dark:border-dark-tremor-border hover:border-tremor-brand-subtle transition-colors flex items-center justify-between">
                                    <span className={selectedSupplier ? 'text-tremor-content-strong dark:text-dark-tremor-content-strong' : 'text-tremor-content dark:text-dark-tremor-content'}>
                                        {selectedSupplier ? suppliers.find(s => s.id === selectedSupplier)?.name || 'Chọn NCC' : 'Chọn nhà cung cấp (tùy chọn)'}
                                    </span>
                                    <ChevronDown size={16} className="text-tremor-content" />
                                </button>
                                {showSupplierDropdown && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-tremor-background dark:bg-dark-tremor-background border border-tremor-border dark:border-dark-tremor-border rounded-tremor-default shadow-xl z-20 max-h-48 overflow-y-auto">
                                        <button onClick={() => { setSelectedSupplier(''); setShowSupplierDropdown(false); }}
                                            className="w-full px-4 py-2 text-left text-sm text-tremor-content hover:bg-tremor-background-muted font-medium dark:text-dark-tremor-content dark:hover:bg-dark-tremor-background-muted">
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
                        </div>

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
                                            <div className="mt-3 flex items-center gap-2">
                                                <span className="text-[12px] font-medium text-white/60 whitespace-nowrap">Giá nhập:</span>
                                                {editingPrice?.idx === idx ? (
                                                    <div className="flex items-stretch rounded-lg overflow-hidden bg-white shadow-lg shadow-blue-500/20 focus-within:ring-2 focus-within:ring-blue-500">
                                                        <input type="text" inputMode="numeric" value={editingPrice.value || ''}
                                                            onChange={e => setEditingPrice({ ...editingPrice, value: e.target.value.replace(/[^0-9]/g, '') })}
                                                            onBlur={() => { const p = parseInt(editingPrice.value, 10) || 0; const fP = editingPrice.mode === 'case' ? Math.round(p / item.units_per_case) : p; setImportCart(prev => prev.map((pi, i) => i === idx ? { ...pi, importPrice: fP } : pi)); setEditingPrice(null); }}
                                                            onKeyDown={e => { if (e.key === 'Enter') { e.target.blur(); } else if (e.key === 'Escape') setEditingPrice(null); }}
                                                            autoFocus className="w-24 sm:w-32 text-center text-sm font-bold bg-transparent text-gray-900 px-2 py-1.5 outline-none" />
                                                        {item.units_per_case > 1 && (
                                                            <button type="button" onMouseDown={(e) => { e.preventDefault(); setEditingPrice({ ...editingPrice, mode: editingPrice.mode === 'case' ? 'unit' : 'case' }); }}
                                                                className={classNames("px-3 text-xs font-bold border-l border-gray-300 outline-none select-none transition-colors", editingPrice.mode === 'case' ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')} >
                                                                {editingPrice.mode === 'case' ? 'Thùng' : 'Lẻ'}
                                                            </button>
                                                        )}
                                                        <button type="button" onMouseDown={(e) => { e.preventDefault(); document.activeElement?.blur(); }} className="px-3 flex items-center justify-center text-white bg-blue-600 hover:bg-blue-700 select-none transition-colors"><CheckCircle size={16}/></button>
                                                    </div>
                                                ) : (
                                                    <span onClick={() => setEditingPrice({ idx, value: String(item.importPrice), mode: 'unit' })}
                                                        className="text-sm font-bold text-blue-300 cursor-pointer hover:text-blue-200 bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg transition-colors" title="Nhấn để sửa giá nhập">
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

                        <div className="space-y-6 lg:max-h-[70vh] lg:overflow-y-auto scrollbar-hide">
                            {Object.entries(productsByBrand).map(([brand, items]) => (
                                <div key={brand}>
                                    <div className="flex items-center gap-2 mb-3 px-1">
                                        <Package size={16} className="text-tremor-brand" />
                                        <h3 className="font-bold text-sm text-tremor-content-strong dark:text-dark-tremor-content-strong uppercase tracking-wide">{brand}</h3>
                                        <span className="text-xs font-semibold bg-tremor-background-muted text-tremor-content px-2 py-0.5 rounded-full">{items.length}</span>
                                    </div>
                                    <div className="flex overflow-x-auto lg:grid lg:grid-cols-2 xl:grid-cols-4 gap-3 snap-x snap-mandatory pb-4 scrollbar-hide">
                                        {items.map(p => {
                                            const inCart = importCart.find(i => i.id === p.id);
                                            const margin = p.cost_price && p.price ? ((p.price - p.cost_price) / p.price * 100).toFixed(0) : null;
                                            return (
                                                <div key={p.id}
                                                    className={classNames('snap-start shrink-0 w-[140px] sm:w-[150px] lg:w-auto lg:shrink-1 bg-tremor-background dark:bg-dark-tremor-background rounded-xl p-3 border-2 transition-all cursor-pointer hover:shadow-md flex flex-col',
                                                        inCart ? 'border-tremor-brand shadow-lg shadow-blue-500/10' : 'border-tremor-border dark:border-dark-tremor-border')}>
                                                    <div className="h-24 bg-tremor-background-muted dark:bg-dark-tremor-background-muted rounded-lg flex items-center justify-center overflow-hidden mb-3 relative" onClick={() => addToImport(p)}>
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
                                                    <div className="mt-auto flex gap-1.5 pt-2">
                                                        <button onClick={() => addToImport(p)}
                                                            className="flex-1 bg-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white text-[11px] py-1.5 rounded-lg font-bold active:scale-95 transition-all">+1</button>
                                                        {p.units_per_case > 1 && (
                                                            <button onClick={() => addToImport(p, p.units_per_case)}
                                                                className="flex-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white text-[11px] py-1.5 rounded-lg font-bold active:scale-95 transition-all">+{p.units_per_case}</button>
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
                <div className="space-y-3 mt-4">
                    <HistoryTable loading={loadingHistory} history={importHistory} suppliers={suppliers} fmt={fmt} onRowClick={setSelectedImportData} />
                    <ImportDetailsModal isOpen={!!selectedImportData} onClose={() => setSelectedImportData(null)} importData={selectedImportData} suppliers={suppliers} fmt={fmt} products={products} />
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
                                                                    setActiveTab('import');
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
