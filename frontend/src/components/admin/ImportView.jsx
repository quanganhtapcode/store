import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    Card, Table, TableBody, TableCell,
    TableHead, TableHeaderCell, TableRow, BarChart, Badge
} from '@tremor/react';
import {
    Truck, Package, Search, X, Plus, Minus, Trash2,
    CheckCircle, Image as ImageIcon, ChevronDown, Clock,
    TrendingUp, AlertTriangle, ShoppingCart, DollarSign, Percent, ArrowRight,
    ChevronLeft, ChevronRight, FileText, Bot, Sparkles, ScanLine
} from 'lucide-react';
import {
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from '@tanstack/react-table';

const API_URL_MODAL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const getImageUrlModal = (p) => { if (!p) return null; if (p.startsWith('http') || p.startsWith('data:')) return p; let b = API_URL_MODAL.replace(/\/api\/?$/, ''); return b + (p.startsWith('/') ? p : '/' + p); };
const fmtNum = v => { if (v === '' || v == null) return ''; return Number(v).toLocaleString('vi-VN'); };

/* ── Inline Product Edit Modal (reused from ProductsView) ── */
const ProductEditModal = ({ product, onClose, onSave, authToken, onLogout }) => {
    const [form, setForm] = useState({ ...product });
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [display, setDisplay] = useState({
        price: fmtNum(product.price), case_price: fmtNum(product.case_price),
        cost_price: fmtNum(product.cost_price), units_per_case: String(product.units_per_case || 1), stock: fmtNum(product.stock)
    });
    const num = (field, val) => { const n = val.replace(/[^0-9]/g, ''); setDisplay(d => ({ ...d, [field]: n })); setForm(f => ({ ...f, [field]: parseInt(n, 10) || (field === 'units_per_case' ? 1 : 0) })); };
    const blur = (field) => setDisplay(d => ({ ...d, [field]: field === 'units_per_case' ? String(form[field] || 1) : fmtNum(form[field] || 0) }));
    const focus = (field) => setDisplay(d => ({ ...d, [field]: form[field] ? String(form[field]) : '' }));
    const compress = (file) => new Promise(resolve => { const r = new FileReader(); r.onload = e => { const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); let w = img.width, h = img.height; if (w > 800) { h = Math.round(h * 800 / w); w = 800; } c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h); resolve(c.toDataURL('image/jpeg', 0.7)); }; img.src = e.target.result; }; r.readAsDataURL(file); });
    const save = async () => { setSaving(true); try { const res = await fetch(`${API_URL_MODAL}/products/${form.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` }, body: JSON.stringify(form) }); if (res.status === 401) { alert('Phiên hết hạn'); onLogout(); return; } onSave(); } catch {} finally { setSaving(false); } };
    const del = async () => { if (!confirm('Xóa sản phẩm này?')) return; setDeleting(true); try { const res = await fetch(`${API_URL_MODAL}/products/${form.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${authToken}` } }); if (res.ok) onSave(); } catch {} finally { setDeleting(false); } };
    const inp = 'w-full bg-gray-50 p-3 rounded-xl font-bold outline-none border border-gray-200 focus:border-blue-400 transition-colors text-sm';
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in">
            <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center shrink-0">
                    <h3 className="font-bold text-lg text-gray-900">Sửa sản phẩm</h3>
                    <button onClick={onClose} className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200"><X size={18} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    <div className="flex flex-col items-center gap-2">
                        <label className="w-24 h-24 bg-gray-50 rounded-2xl overflow-hidden border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-blue-400 transition-colors relative">
                            {form.image ? <img src={getImageUrlModal(form.image)} className="w-full h-full object-cover" /> : <ImageIcon className="text-gray-300" />}
                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={async e => { if (e.target.files[0]) { const c = await compress(e.target.files[0]); setForm(f => ({ ...f, image: c })); } }} />
                        </label>
                        <p className="text-xs text-blue-500 font-bold">Chạm để đổi ảnh</p>
                    </div>
                    <input value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Tên sản phẩm" className={inp + ' font-bold'} />
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-xs font-bold uppercase text-gray-400 mb-1 block tracking-wider">Giá lẻ</label><input type="text" inputMode="numeric" value={display.price} onChange={e => num('price', e.target.value)} onFocus={() => focus('price')} onBlur={() => blur('price')} className={inp + ' text-blue-500'} /></div>
                        <div><label className="text-xs font-bold uppercase text-gray-400 mb-1 block tracking-wider">Giá thùng</label><input type="text" inputMode="numeric" value={display.case_price} onChange={e => num('case_price', e.target.value)} onFocus={() => focus('case_price')} onBlur={() => blur('case_price')} className={inp + ' text-orange-500'} /></div>
                    </div>
                    <div><label className="text-xs font-bold uppercase text-gray-400 mb-1 block tracking-wider">Giá nhập</label>
                        <div className="relative"><input type="text" inputMode="numeric" value={display.cost_price} onChange={e => num('cost_price', e.target.value)} onFocus={() => focus('cost_price')} onBlur={() => blur('cost_price')} className={inp + ' text-emerald-500'} />
                            {form.cost_price > 0 && form.price > 0 && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-lg">Margin: {((form.price - form.cost_price) / form.price * 100).toFixed(1)}%</span>}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-xs font-bold uppercase text-gray-400 mb-1 block tracking-wider">SL/Thùng</label><input type="text" inputMode="numeric" value={display.units_per_case} onChange={e => num('units_per_case', e.target.value)} onFocus={() => focus('units_per_case')} onBlur={() => blur('units_per_case')} className={inp} /></div>
                        <div><label className="text-xs font-bold uppercase text-gray-400 mb-1 block tracking-wider">Tồn kho</label><input type="text" inputMode="numeric" value={display.stock} onChange={e => num('stock', e.target.value)} onFocus={() => focus('stock')} onBlur={() => blur('stock')} className={inp} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-xs font-bold uppercase text-gray-400 mb-1 block tracking-wider">Thương hiệu</label><input value={form.brand || ''} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} className={inp} /></div>
                        <div><label className="text-xs font-bold uppercase text-gray-400 mb-1 block tracking-wider">Danh mục</label><input value={form.category || ''} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inp} /></div>
                    </div>
                    <div><label className="text-xs font-bold uppercase text-gray-400 mb-1 block tracking-wider">Mã vạch</label><input value={form.code || ''} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className={inp + ' font-mono'} /></div>
                </div>
                <div className="p-4 border-t border-gray-100 flex gap-3 shrink-0">
                    <button onClick={del} disabled={deleting} className="bg-red-50 text-red-500 p-3.5 rounded-xl hover:bg-red-100 disabled:opacity-50">
                        {deleting ? <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /> : <Trash2 size={20} />}
                    </button>
                    <button onClick={save} disabled={saving} className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2">
                        {saving ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Đang lưu...</> : 'Lưu thay đổi'}
                    </button>
                </div>
            </div>
        </div>
    );
};

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
const AI_ASSISTANT_URL = import.meta.env.VITE_AI_ASSISTANT_URL || `${API_URL}/ai/ops-assistant`;

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
    const [supplierPriceMap, setSupplierPriceMap] = useState({}); // productId -> import_price
    const [supplierProductsList, setSupplierProductsList] = useState([]); // full product rows for selected supplier
    const [showAddToSupplier, setShowAddToSupplier] = useState(false);
    const [addToSupplierSearch, setAddToSupplierSearch] = useState('');
    const [addToSupplierSelected, setAddToSupplierSelected] = useState(null);
    const [addToSupplierPrice, setAddToSupplierPrice] = useState('');
    const [addToSupplierPriceMode, setAddToSupplierPriceMode] = useState('unit'); // 'unit' | 'case'
    const [addToSupplierSaving, setAddToSupplierSaving] = useState(false);
    const [selectedProfitProduct, setSelectedProfitProduct] = useState(null);
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
    const [analysisPage, setAnalysisPage] = useState(1);
    const [analysisSearch, setAnalysisSearch] = useState('');
    const [analysisOnlyLowStock, setAnalysisOnlyLowStock] = useState(false);
    const [analysisOnlyLowMargin, setAnalysisOnlyLowMargin] = useState(false);
    const [watchlistIds, setWatchlistIds] = useState(() => {
        if (typeof window === 'undefined') return [];
        try {
            const raw = localStorage.getItem('ops_watchlist_product_ids');
            const parsed = JSON.parse(raw || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    });
    const [aiActionCards, setAiActionCards] = useState([]);
    const [aiActionLoading, setAiActionLoading] = useState(false);

    const ANALYSIS_PAGE_SIZE = 20;
    const profitProductsRaw = useMemo(() => profitData?.products || [], [profitData]);
    const profitProducts = useMemo(() => {
        const searchNorm = normalizeText(analysisSearch.trim());
        const searchWords = searchNorm.split(/\s+/).filter(Boolean);

        return profitProductsRaw.filter((item) => {
            const baseProduct = products.find((p) => p.id === item.id) || {};
            const searchable = normalizeText([
                item.id,
                item.name,
                item.brand,
                baseProduct.code,
                baseProduct.category,
            ].filter(Boolean).join(' '));

            const isSearchMatch = searchWords.length === 0 || searchWords.every((word) => searchable.includes(word));
            const isLowStockMatch = !analysisOnlyLowStock || Number(item.daysOfStock || 0) <= 7;
            const isLowMarginMatch = !analysisOnlyLowMargin || (Number(item.margin || 0) > 0 && Number(item.margin || 0) < 15);

            return isSearchMatch && isLowStockMatch && isLowMarginMatch;
        });
    }, [analysisOnlyLowMargin, analysisOnlyLowStock, analysisSearch, products, profitProductsRaw]);
    const analysisPageCount = Math.max(1, Math.ceil(profitProducts.length / ANALYSIS_PAGE_SIZE));
    const analysisRows = useMemo(() => {
        const start = (analysisPage - 1) * ANALYSIS_PAGE_SIZE;
        return profitProducts.slice(start, start + ANALYSIS_PAGE_SIZE);
    }, [analysisPage, profitProducts]);
    const analysisStartIndex = profitProducts.length === 0 ? 0 : ((analysisPage - 1) * ANALYSIS_PAGE_SIZE) + 1;
    const analysisEndIndex = Math.min(analysisPage * ANALYSIS_PAGE_SIZE, profitProducts.length);

    const profitById = useMemo(() => {
        const map = new Map();
        for (const item of profitProductsRaw) {
            map.set(item.id, item);
        }
        return map;
    }, [profitProductsRaw]);

    const stockRiskProducts = useMemo(
        () => profitProducts.filter((p) => Number(p.daysOfStock || 0) <= 7),
        [profitProducts]
    );

    const lowMarginProducts = useMemo(
        () => profitProducts.filter((p) => Number(p.margin || 0) > 0 && Number(p.margin || 0) < 15),
        [profitProducts]
    );

    const highProfitProducts = useMemo(
        () => [...profitProducts].sort((a, b) => Number(b.profit30d || 0) - Number(a.profit30d || 0)).slice(0, 8),
        [profitProducts]
    );

    const watchlistProducts = useMemo(() => {
        return watchlistIds.map((id) => {
            const p = products.find((item) => item.id === id) || {};
            const analysis = profitById.get(id) || null;
            if (!p.id && !analysis) return null;
            return {
                id,
                name: p.name || analysis?.name || id,
                brand: p.brand || analysis?.brand || '',
                margin: analysis?.margin,
                daysOfStock: analysis?.daysOfStock,
                profit30d: analysis?.profit30d,
            };
        }).filter(Boolean);
    }, [watchlistIds, products, profitById]);

    const analysisPageTokens = useMemo(() => {
        if (analysisPageCount <= 7) {
            return Array.from({ length: analysisPageCount }, (_, i) => i + 1);
        }

        const pages = new Set([1, analysisPageCount, analysisPage - 1, analysisPage, analysisPage + 1]);
        const sortedPages = [...pages].filter((p) => p >= 1 && p <= analysisPageCount).sort((a, b) => a - b);

        const tokens = [];
        for (let i = 0; i < sortedPages.length; i++) {
            if (i > 0 && sortedPages[i] - sortedPages[i - 1] > 1) {
                tokens.push('ellipsis');
            }
            tokens.push(sortedPages[i]);
        }

        return tokens;
    }, [analysisPage, analysisPageCount]);

    const openProfitProductDetail = (profitItem) => {
        const baseProduct = products.find((p) => p.id === profitItem.id) || {};
        const mergedProduct = {
            ...baseProduct,
            ...profitItem,
            id: profitItem.id,
            name: profitItem.name,
            brand: profitItem.brand,
            price: baseProduct.price ?? profitItem.sellPrice,
            cost_price: baseProduct.cost_price ?? profitItem.costPrice,
            stock: baseProduct.stock ?? profitItem.stock,
        };

        setSelectedProfitProduct({
            product: mergedProduct,
            analysis: profitItem,
        });
    };

    const openProductDetailById = (productId) => {
        const analysis = profitById.get(productId);
        if (analysis) {
            openProfitProductDetail(analysis);
            return;
        }

        const baseProduct = products.find((p) => p.id === productId);
        if (!baseProduct) return;
        setSelectedProfitProduct({ product: baseProduct, analysis: null });
    };

    const getSuggestedQty = (profitItem) => {
        const dailyAvg = Number(profitItem?.sold30d || 0) / 30;
        const suggested = Math.ceil((dailyAvg * 14) - Number(profitItem?.stock || 0));
        return Math.max(1, suggested);
    };

    const addSingleProfitItemToImport = (profitItem) => {
        const baseProduct = products.find((p) => p.id === profitItem.id);
        if (!baseProduct) return;

        const qty = getSuggestedQty(profitItem);
        setImportCart((prev) => {
            const ex = prev.find((i) => i.id === baseProduct.id);
            if (ex) {
                return prev.map((i) => i.id === baseProduct.id ? { ...i, quantity: i.quantity + qty } : i);
            }
            return [
                ...prev,
                {
                    ...baseProduct,
                    quantity: qty,
                    importPrice: profitItem.costPrice || baseProduct.cost_price || Math.round(baseProduct.price * 0.7),
                },
            ];
        });
    };

    const addBatchProfitItemsToImport = (items) => {
        if (!items || items.length === 0) return;

        setImportCart((prev) => {
            let next = [...prev];
            for (const item of items) {
                const baseProduct = products.find((p) => p.id === item.id);
                if (!baseProduct) continue;

                const qty = getSuggestedQty(item);
                const exIndex = next.findIndex((i) => i.id === baseProduct.id);
                if (exIndex >= 0) {
                    next[exIndex] = { ...next[exIndex], quantity: next[exIndex].quantity + qty };
                } else {
                    next.push({
                        ...baseProduct,
                        quantity: qty,
                        importPrice: item.costPrice || baseProduct.cost_price || Math.round(baseProduct.price * 0.7),
                    });
                }
            }
            return next;
        });

        setActiveTab('import');
    };

    const toggleWatchlist = (productId) => {
        setWatchlistIds((prev) => (
            prev.includes(productId)
                ? prev.filter((id) => id !== productId)
                : [...prev, productId]
        ));
    };

    const runAiOpsAssistant = async () => {
        if (aiActionLoading) return;
        setAiActionLoading(true);

        try {
            // If external AI endpoint is configured, use it. Otherwise fallback to built-in heuristic copilot.
            if (AI_ASSISTANT_URL) {
                const response = await fetch(AI_ASSISTANT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        objective: 'Tối ưu tồn kho và lợi nhuận theo ngày',
                        summary: profitData?.summary || {},
                        products: profitProducts.slice(0, 120).map((p) => ({
                            id: p.id,
                            name: p.name,
                            brand: p.brand,
                            margin: p.margin,
                            daysOfStock: p.daysOfStock,
                            profit30d: p.profit30d,
                            sold30d: p.sold30d,
                        })),
                    }),
                });

                if (response.ok) {
                    const data = await response.json();
                    const actions = Array.isArray(data?.actions)
                        ? data.actions.slice(0, 6).map((a, idx) => ({
                            id: `ai-${idx}`,
                            title: a.title || 'AI Action',
                            detail: a.detail || a.description || '',
                            actionType: a.actionType || 'none',
                        }))
                        : [];

                    if (actions.length > 0) {
                        setAiActionCards(actions);
                        setAiActionLoading(false);
                        return;
                    }
                }
            }

            const localActions = [];

            if (stockRiskProducts.length > 0) {
                localActions.push({
                    id: 'risk-restock',
                    title: `Nhập ngay ${Math.min(stockRiskProducts.length, 10)} sản phẩm rủi ro tồn kho`,
                    detail: 'Tập trung nhóm có tồn kho <= 7 ngày để tránh đứt hàng.',
                    actionType: 'import-risk',
                });
            }

            if (lowMarginProducts.length > 0) {
                localActions.push({
                    id: 'margin-review',
                    title: `Rà soát ${Math.min(lowMarginProducts.length, 10)} sản phẩm margin thấp`,
                    detail: 'Ưu tiên điều chỉnh giá nhập/giá bán cho nhóm dưới 15%.',
                    actionType: 'open-low-margin',
                });
            }

            if (highProfitProducts.length > 0) {
                localActions.push({
                    id: 'watch-high-profit',
                    title: `Ghim ${Math.min(highProfitProducts.length, 8)} sản phẩm lợi nhuận cao`,
                    detail: 'Theo dõi liên tục nhóm sản phẩm tạo dòng tiền tốt nhất.',
                    actionType: 'watch-high-profit',
                });
            }

            if (localActions.length === 0) {
                localActions.push({
                    id: 'stable-state',
                    title: 'Không có cảnh báo nghiêm trọng',
                    detail: 'Tồn kho và margin đang ở ngưỡng an toàn. Tiếp tục theo dõi định kỳ.',
                    actionType: 'none',
                });
            }

            setAiActionCards(localActions);
        } catch (error) {
            console.error(error);
            alert('Không thể khởi tạo AI Assistant. Vui lòng thử lại.');
        } finally {
            setAiActionLoading(false);
        }
    };

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
        const supplierPrice = supplierPriceMap[p.id];
        setImportCart(prev => {
            const ex = prev.find(i => i.id === p.id);
            if (ex) return prev.map(i => i.id === p.id ? { ...i, quantity: i.quantity + qty } : i);
            const importPrice = supplierPrice ?? p.cost_price ?? Math.round(p.price * 0.7);
            return [...prev, { ...p, quantity: qty, importPrice }];
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

    useEffect(() => {
        setAnalysisPage(1);
    }, [viewMode, analysisSearch, analysisOnlyLowStock, analysisOnlyLowMargin, profitProducts.length]);

    useEffect(() => {
        if (analysisPage > analysisPageCount) {
            setAnalysisPage(analysisPageCount);
        }
    }, [analysisPage, analysisPageCount]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        localStorage.setItem('ops_watchlist_product_ids', JSON.stringify(watchlistIds));
    }, [watchlistIds]);

    // Load supplier products when supplier is selected
    const loadSupplierProducts = useCallback(() => {
        if (!selectedSupplier) { setSupplierPriceMap({}); setSupplierProductsList([]); return; }
        fetch(`${API_URL}/suppliers/${selectedSupplier}/products`, {
            headers: { Authorization: `Bearer ${authToken}` }
        })
            .then(r => r.json())
            .then(rows => {
                const map = {};
                rows.forEach(r => { map[r.product_id] = r.import_price; });
                setSupplierPriceMap(map);
                setSupplierProductsList(rows);
            })
            .catch(() => {});
    }, [selectedSupplier, authToken]);

    useEffect(() => { loadSupplierProducts(); }, [loadSupplierProducts]);

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
                <>
                {/* ── Step 1: Supplier picker overlay ── */}
                {!selectedSupplier && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-dark-tremor-background rounded-2xl shadow-2xl w-full max-w-md">
                            <div className="p-6 border-b border-tremor-border dark:border-dark-tremor-border">
                                <h3 className="font-bold text-lg text-tremor-content-strong dark:text-dark-tremor-content-strong">Chọn nhà cung cấp</h3>
                                <p className="text-sm text-tremor-content mt-0.5">Chọn NCC để xem sản phẩm và giá nhập của họ</p>
                            </div>
                            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
                                {suppliers.length === 0 ? (
                                    <div className="text-center py-8 text-tremor-content">
                                        <Package size={40} className="mx-auto mb-3 opacity-30" />
                                        <p className="font-medium">Chưa có nhà cung cấp</p>
                                        <p className="text-sm mt-1">Vào tab Nhà cung cấp để thêm</p>
                                    </div>
                                ) : (
                                    suppliers.map(s => (
                                        <button key={s.id} onClick={() => setSelectedSupplier(s.id)}
                                            className="w-full flex items-center gap-3 p-4 rounded-xl border border-tremor-border dark:border-dark-tremor-border hover:border-tremor-brand hover:bg-blue-50 dark:hover:bg-dark-tremor-background-muted transition-all text-left">
                                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0">
                                                {s.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-tremor-content-strong dark:text-dark-tremor-content-strong">{s.name}</p>
                                                {s.phone && <p className="text-xs text-tremor-content">{s.phone}</p>}
                                            </div>
                                            <ChevronRight size={16} className="text-tremor-content shrink-0" />
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Step 2: Import form with supplier's products ── */}
                {selectedSupplier && (
                <div className="flex flex-col lg:grid lg:grid-cols-5 gap-5">
                    {/* Left: Cart */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Supplier header + change */}
                        <div className="bg-white dark:bg-dark-tremor-background rounded-tremor-default border border-tremor-border dark:border-dark-tremor-border p-4 shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0">
                                    {suppliers.find(s => s.id === selectedSupplier)?.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-xs text-tremor-content uppercase tracking-wider font-semibold">Nhà cung cấp</p>
                                    <p className="font-bold text-tremor-content-strong dark:text-dark-tremor-content-strong text-sm">{suppliers.find(s => s.id === selectedSupplier)?.name}</p>
                                </div>
                            </div>
                            <button onClick={() => { setSelectedSupplier(''); setImportCart([]); }}
                                className="text-xs text-tremor-content hover:text-red-500 font-semibold px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                                Đổi NCC
                            </button>
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
                                                                className={classNames("px-3 text-xs font-bold border-l border-gray-300 outline-none select-none transition-colors", editingPrice.mode === 'case' ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')}>
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

                    {/* Right: Supplier's products only */}
                    <div className="lg:col-span-3 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="relative flex-1 mr-3">
                                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-tremor-content" />
                                <input type="text" placeholder="Tìm trong sản phẩm của NCC..." value={importSearch}
                                    onChange={e => setImportSearch(e.target.value)}
                                    className="w-full bg-tremor-background dark:bg-dark-tremor-background pl-12 pr-10 py-3 rounded-tremor-default text-sm font-medium outline-none border border-tremor-border focus:border-tremor-brand transition-all dark:border-dark-tremor-border dark:text-dark-tremor-content-strong" />
                                {importSearch && (
                                    <button onClick={() => setImportSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-tremor-background-muted rounded-full hover:bg-gray-300">
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                            <button onClick={() => { setShowAddToSupplier(true); setAddToSupplierSearch(''); setAddToSupplierSelected(null); setAddToSupplierPrice(''); }}
                                className="flex items-center gap-2 bg-tremor-brand text-white px-4 py-3 rounded-tremor-default font-bold text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all active:scale-[0.97] shrink-0">
                                <Plus size={16} /> Thêm SP
                            </button>
                        </div>

                        {supplierProductsList.length === 0 ? (
                            <div className="text-center py-16 bg-tremor-background-muted dark:bg-dark-tremor-background-muted rounded-2xl">
                                <Package size={48} className="mx-auto mb-3 opacity-30" />
                                <p className="font-semibold text-tremor-content">Chưa có sản phẩm nào</p>
                                <p className="text-sm text-tremor-content mt-1">Nhấn "Thêm SP" để thêm sản phẩm vào NCC này</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 lg:max-h-[70vh] lg:overflow-y-auto scrollbar-hide">
                                {supplierProductsList
                                    .filter(p => !importSearch || p.name?.toLowerCase().includes(importSearch.toLowerCase()) || p.brand?.toLowerCase().includes(importSearch.toLowerCase()))
                                    .map(p => {
                                        const fullProduct = products.find(fp => fp.id === p.product_id) || p;
                                        const inCart = importCart.find(i => i.id === p.product_id);
                                        const margin = p.sell_price > 0 && p.import_price > 0 ? ((p.sell_price - p.import_price) / p.sell_price * 100).toFixed(0) : null;
                                        return (
                                            <div key={p.product_id}
                                                className={classNames('bg-tremor-background dark:bg-dark-tremor-background rounded-xl p-3 border-2 transition-all hover:shadow-md flex flex-col',
                                                    inCart ? 'border-tremor-brand shadow-lg shadow-blue-500/10' : 'border-tremor-border dark:border-dark-tremor-border')}>
                                                <div className="h-24 bg-tremor-background-muted dark:bg-dark-tremor-background-muted rounded-lg flex items-center justify-center overflow-hidden mb-3 relative cursor-pointer" onClick={() => addToImport({ ...fullProduct, id: p.product_id, price: p.sell_price, cost_price: p.import_price })}>
                                                    {p.image ? <img src={getImageUrl(p.image)} loading="lazy" className="w-full h-full object-cover" /> : <ImageIcon size={24} className="text-tremor-content-subtle" />}
                                                    {inCart && (
                                                        <div className="absolute top-1 right-1 bg-tremor-brand text-white text-[10px] w-6 h-6 rounded-full font-bold flex items-center justify-center shadow-lg">
                                                            {inCart.quantity}
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="font-bold text-[11px] text-tremor-content-strong dark:text-dark-tremor-content-strong line-clamp-1 mb-0.5">{p.name}</p>
                                                <div className="flex items-center gap-1 text-[10px] text-tremor-content mb-1">
                                                    <span>Tồn: {p.stock ?? fullProduct.stock}</span>
                                                    {margin && <span className={parseFloat(margin) >= 20 ? 'text-emerald-600 font-bold' : 'text-yellow-600 font-bold'}>· {margin}%</span>}
                                                </div>
                                                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold mb-2">Nhập: {fmt(p.import_price)}</p>
                                                <div className="mt-auto flex gap-1.5">
                                                    <button onClick={() => addToImport({ ...fullProduct, id: p.product_id, price: p.sell_price, cost_price: p.import_price })}
                                                        className="flex-1 bg-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white text-[11px] py-1.5 rounded-lg font-bold active:scale-95 transition-all">+1</button>
                                                    {(fullProduct.units_per_case > 1) && (
                                                        <button onClick={() => addToImport({ ...fullProduct, id: p.product_id, price: p.sell_price, cost_price: p.import_price }, fullProduct.units_per_case)}
                                                            className="flex-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white text-[11px] py-1.5 rounded-lg font-bold active:scale-95 transition-all">+{fullProduct.units_per_case}</button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        )}
                    </div>
                </div>
                )}

                {/* ── Add product to supplier modal ── */}
                {showAddToSupplier && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-dark-tremor-background rounded-2xl shadow-2xl w-full max-w-md">
                            <div className="p-5 border-b border-tremor-border dark:border-dark-tremor-border flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-base text-tremor-content-strong dark:text-dark-tremor-content-strong">Thêm sản phẩm vào NCC</h3>
                                    <p className="text-xs text-tremor-content mt-0.5">{suppliers.find(s => s.id === selectedSupplier)?.name}</p>
                                </div>
                                <button onClick={() => setShowAddToSupplier(false)} className="p-2 rounded-xl hover:bg-tremor-background-muted"><X size={16} /></button>
                            </div>
                            <div className="p-5 space-y-4">
                                {/* Product search */}
                                <div>
                                    <label className="text-xs font-bold text-tremor-content uppercase tracking-wider mb-2 block">Sản phẩm *</label>
                                    <div className="relative">
                                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-tremor-content" />
                                        <input autoFocus value={addToSupplierSearch} onChange={e => { setAddToSupplierSearch(e.target.value); setAddToSupplierSelected(null); }}
                                            placeholder="Tìm sản phẩm..."
                                            className="w-full pl-9 pr-4 py-2.5 bg-tremor-background-muted dark:bg-dark-tremor-background-muted rounded-xl text-sm font-medium outline-none border border-tremor-border focus:border-tremor-brand dark:border-dark-tremor-border dark:text-dark-tremor-content-strong transition-all" />
                                    </div>
                                    {addToSupplierSelected ? (
                                        <div className="mt-2 flex items-center gap-2 p-3 bg-blue-50 dark:bg-dark-tremor-background-muted rounded-xl border border-tremor-brand">
                                            <div className="w-8 h-8 bg-blue-100 rounded-lg overflow-hidden shrink-0">
                                                {addToSupplierSelected.image ? <img src={getImageUrl(addToSupplierSelected.image)} className="w-full h-full object-cover" /> : <Package size={16} className="m-1 text-blue-400" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-tremor-content-strong dark:text-dark-tremor-content-strong truncate">{addToSupplierSelected.name}</p>
                                                <p className="text-xs text-tremor-content">{addToSupplierSelected.brand} · Giá bán: {fmt(addToSupplierSelected.price)}</p>
                                            </div>
                                            <button onClick={() => { setAddToSupplierSelected(null); setAddToSupplierSearch(''); }} className="p-1 hover:text-red-500"><X size={14} /></button>
                                        </div>
                                    ) : addToSupplierSearch.trim() ? (
                                        <div className="mt-1 bg-white dark:bg-dark-tremor-background border border-tremor-border dark:border-dark-tremor-border rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                            {products
                                                .filter(p => !supplierPriceMap[p.id] && (p.name?.toLowerCase().includes(addToSupplierSearch.toLowerCase()) || p.brand?.toLowerCase().includes(addToSupplierSearch.toLowerCase())))
                                                .slice(0, 6)
                                                .map(p => (
                                                    <button key={p.id} onClick={() => { setAddToSupplierSelected(p); setAddToSupplierSearch(p.name); }}
                                                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-dark-tremor-background-muted text-left transition-colors">
                                                        <span className="text-sm font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong truncate">{p.name}</span>
                                                        <span className="text-xs text-tremor-content ml-auto shrink-0">{p.brand}</span>
                                                    </button>
                                                ))}
                                            {products.filter(p => !supplierPriceMap[p.id] && (p.name?.toLowerCase().includes(addToSupplierSearch.toLowerCase()) || p.brand?.toLowerCase().includes(addToSupplierSearch.toLowerCase()))).length === 0 && (
                                                <p className="text-center py-4 text-sm text-tremor-content">Không tìm thấy hoặc đã có trong NCC</p>
                                            )}
                                        </div>
                                    ) : null}
                                </div>

                                {/* Import price - REQUIRED */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-bold text-tremor-content uppercase tracking-wider">
                                            Giá nhập từ NCC này <span className="text-red-500">*</span>
                                        </label>
                                        {addToSupplierSelected?.units_per_case > 1 && (
                                            <div className="flex rounded-lg overflow-hidden border border-tremor-border text-xs font-bold">
                                                <button onClick={() => setAddToSupplierPriceMode('unit')}
                                                    className={classNames('px-3 py-1 transition-colors', addToSupplierPriceMode === 'unit' ? 'bg-tremor-brand text-white' : 'bg-tremor-background-muted text-tremor-content')}>
                                                    Giá lẻ
                                                </button>
                                                <button onClick={() => setAddToSupplierPriceMode('case')}
                                                    className={classNames('px-3 py-1 transition-colors', addToSupplierPriceMode === 'case' ? 'bg-tremor-brand text-white' : 'bg-tremor-background-muted text-tremor-content')}>
                                                    Giá thùng
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <input type="text" inputMode="numeric" value={addToSupplierPrice}
                                        onChange={e => setAddToSupplierPrice(e.target.value.replace(/[^0-9]/g, ''))}
                                        placeholder={addToSupplierPriceMode === 'case' ? `Giá 1 thùng (${addToSupplierSelected?.units_per_case || '?'} cái)` : 'VD: 45000'}
                                        className={classNames('w-full px-4 py-3 rounded-xl text-sm font-bold outline-none border transition-all dark:bg-dark-tremor-background-muted dark:text-dark-tremor-content-strong',
                                            !addToSupplierPrice && addToSupplierSelected ? 'border-red-400 bg-red-50' : 'border-tremor-border focus:border-tremor-brand bg-tremor-background-muted')} />
                                    {!addToSupplierPrice && addToSupplierSelected && (
                                        <p className="text-red-500 text-xs mt-1 font-medium">Bắt buộc nhập giá nhập</p>
                                    )}
                                    {addToSupplierSelected && addToSupplierPrice && (() => {
                                        const unitPrice = addToSupplierPriceMode === 'case'
                                            ? Math.round(parseInt(addToSupplierPrice) / (addToSupplierSelected.units_per_case || 1))
                                            : parseInt(addToSupplierPrice);
                                        const margin = ((addToSupplierSelected.price - unitPrice) / addToSupplierSelected.price * 100).toFixed(1);
                                        return (
                                            <div className="mt-1 space-y-0.5">
                                                {addToSupplierPriceMode === 'case' && (
                                                    <p className="text-xs text-blue-600 font-semibold">= {fmt(unitPrice)}/cái</p>
                                                )}
                                                <p className="text-xs text-emerald-600 font-semibold">Margin: {margin}%</p>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                            <div className="p-5 pt-0 flex gap-3">
                                <button onClick={() => setShowAddToSupplier(false)}
                                    className="flex-1 py-3 bg-tremor-background-muted text-tremor-content-strong rounded-xl font-bold text-sm hover:bg-gray-200 dark:bg-dark-tremor-background-muted transition-colors">
                                    Hủy
                                </button>
                                <button
                                    disabled={!addToSupplierSelected || !addToSupplierPrice || addToSupplierSaving}
                                    onClick={async () => {
                                        if (!addToSupplierSelected || !addToSupplierPrice) return;
                                        const rawPrice = parseInt(addToSupplierPrice);
                                        const unitPrice = addToSupplierPriceMode === 'case'
                                            ? Math.round(rawPrice / (addToSupplierSelected.units_per_case || 1))
                                            : rawPrice;
                                        setAddToSupplierSaving(true);
                                        await fetch(`${API_URL}/suppliers/${selectedSupplier}/products`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
                                            body: JSON.stringify({ product_id: addToSupplierSelected.id, import_price: unitPrice })
                                        });
                                        await loadSupplierProducts();
                                        addToImport({ ...addToSupplierSelected, cost_price: unitPrice });
                                        setAddToSupplierSaving(false);
                                        setShowAddToSupplier(false);
                                    }}
                                    className="flex-[2] py-3 bg-tremor-brand text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                                    {addToSupplierSaving ? 'Đang lưu...' : 'Thêm vào NCC & Giỏ hàng'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                </>
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
                                    <p className="mt-1 text-tremor-default text-tremor-content dark:text-dark-tremor-content">Dữ liệu 30 ngày gần nhất. Sắp xếp theo lợi nhuận giảm dần. Nhấn vào từng dòng để xem chi tiết sản phẩm.</p>

                                    <div className="mt-4 space-y-3">
                                        <div className="relative">
                                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tremor-content" />
                                            <input
                                                type="text"
                                                value={analysisSearch}
                                                onChange={(e) => setAnalysisSearch(e.target.value)}
                                                placeholder="Tìm theo tên, thương hiệu, mã sản phẩm, barcode..."
                                                className="w-full bg-tremor-background dark:bg-dark-tremor-background pl-10 pr-9 py-2.5 rounded-tremor-default text-sm font-medium outline-none border border-tremor-border focus:border-tremor-brand focus:ring-2 focus:ring-tremor-brand-muted transition-all dark:border-dark-tremor-border dark:text-dark-tremor-content-strong"
                                            />
                                            {analysisSearch && (
                                                <button
                                                    onClick={() => setAnalysisSearch('')}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-tremor-background-muted hover:bg-gray-300"
                                                    title="Xóa tìm kiếm"
                                                >
                                                    <X size={12} />
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2">
                                            <button
                                                onClick={() => setAnalysisOnlyLowStock((v) => !v)}
                                                className={classNames(
                                                    'px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                                                    analysisOnlyLowStock
                                                        ? 'bg-red-100 text-red-700 border-red-200'
                                                        : 'bg-white text-tremor-content border-tremor-border hover:bg-tremor-background-muted'
                                                )}
                                            >
                                                Tồn kho {'<='} 7 ngày
                                            </button>

                                            <button
                                                onClick={() => setAnalysisOnlyLowMargin((v) => !v)}
                                                className={classNames(
                                                    'px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                                                    analysisOnlyLowMargin
                                                        ? 'bg-amber-100 text-amber-700 border-amber-200'
                                                        : 'bg-white text-tremor-content border-tremor-border hover:bg-tremor-background-muted'
                                                )}
                                            >
                                                Margin thấp {'<'} 15%
                                            </button>

                                            {(analysisOnlyLowStock || analysisOnlyLowMargin || analysisSearch) && (
                                                <button
                                                    onClick={() => {
                                                        setAnalysisSearch('');
                                                        setAnalysisOnlyLowStock(false);
                                                        setAnalysisOnlyLowMargin(false);
                                                    }}
                                                    className="px-3 py-1.5 rounded-full text-xs font-semibold border bg-white text-tremor-content border-tremor-border hover:bg-tremor-background-muted"
                                                >
                                                    Xóa bộ lọc
                                                </button>
                                            )}

                                            <span className="ml-auto text-xs text-tremor-content dark:text-dark-tremor-content">
                                                {profitProducts.length} kết quả
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Center */}
                                    <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
                                        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                                            <p className="text-[11px] uppercase tracking-wider font-bold text-red-700">Stock Risk</p>
                                            <p className="mt-1 text-sm font-semibold text-red-800">{stockRiskProducts.length} sản phẩm cần xử lý</p>
                                            <button
                                                onClick={() => addBatchProfitItemsToImport(stockRiskProducts.slice(0, 20))}
                                                disabled={stockRiskProducts.length === 0}
                                                className="mt-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 text-white disabled:opacity-40"
                                            >
                                                Nhập ngay nhóm rủi ro
                                            </button>
                                        </div>

                                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                                            <p className="text-[11px] uppercase tracking-wider font-bold text-amber-700">Margin Risk</p>
                                            <p className="mt-1 text-sm font-semibold text-amber-800">{lowMarginProducts.length} sản phẩm margin thấp</p>
                                            <button
                                                onClick={() => {
                                                    if (lowMarginProducts.length > 0) openProfitProductDetail(lowMarginProducts[0]);
                                                }}
                                                disabled={lowMarginProducts.length === 0}
                                                className="mt-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 text-white disabled:opacity-40"
                                            >
                                                Mở sản phẩm cần xử lý
                                            </button>
                                        </div>

                                        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                                            <p className="text-[11px] uppercase tracking-wider font-bold text-blue-700">AI Ops Assistant</p>
                                            <p className="mt-1 text-sm font-semibold text-blue-800">Đề xuất hành động từ dữ liệu sống</p>
                                            <button
                                                onClick={runAiOpsAssistant}
                                                disabled={aiActionLoading}
                                                className="mt-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white disabled:opacity-40 inline-flex items-center gap-1"
                                            >
                                                {aiActionLoading ? <Bot size={12} className="animate-pulse" /> : <Sparkles size={12} />}
                                                {aiActionLoading ? 'Đang phân tích...' : 'AI đề xuất hành động'}
                                            </button>
                                        </div>
                                    </div>

                                    {aiActionCards.length > 0 && (
                                        <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-2">
                                            {aiActionCards.map((card) => (
                                                <div key={card.id} className="rounded-xl border border-tremor-border dark:border-dark-tremor-border bg-white dark:bg-dark-tremor-background p-3">
                                                    <p className="text-sm font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong">{card.title}</p>
                                                    <p className="text-xs text-tremor-content mt-1">{card.detail}</p>
                                                    <div className="mt-2 flex gap-2">
                                                        {card.actionType === 'import-risk' && (
                                                            <button
                                                                onClick={() => addBatchProfitItemsToImport(stockRiskProducts.slice(0, 20))}
                                                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-600 text-white"
                                                            >
                                                                Thực thi
                                                            </button>
                                                        )}
                                                        {card.actionType === 'open-low-margin' && (
                                                            <button
                                                                onClick={() => lowMarginProducts[0] && openProfitProductDetail(lowMarginProducts[0])}
                                                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-600 text-white"
                                                            >
                                                                Xem ngay
                                                            </button>
                                                        )}
                                                        {card.actionType === 'watch-high-profit' && (
                                                            <button
                                                                onClick={() => {
                                                                    const ids = highProfitProducts.map((p) => p.id);
                                                                    setWatchlistIds((prev) => [...new Set([...prev, ...ids])]);
                                                                }}
                                                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-600 text-white"
                                                            >
                                                                Ghim theo dõi
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {watchlistProducts.length > 0 && (
                                        <div className="mt-3 rounded-xl border border-tremor-border dark:border-dark-tremor-border bg-tremor-background dark:bg-dark-tremor-background p-3">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-xs font-bold uppercase tracking-wider text-tremor-content">Watchlist vận hành</p>
                                                <button
                                                    onClick={() => setWatchlistIds([])}
                                                    className="text-xs font-semibold text-tremor-content hover:text-red-600"
                                                >
                                                    Xóa tất cả
                                                </button>
                                            </div>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {watchlistProducts.slice(0, 12).map((item) => (
                                                    <button
                                                        key={item.id}
                                                        onClick={() => openProductDetailById(item.id)}
                                                        className="px-2.5 py-1 rounded-full border border-tremor-border text-xs font-semibold text-tremor-content-strong hover:bg-tremor-background-muted"
                                                        title="Mở chi tiết sản phẩm"
                                                    >
                                                        {item.name}
                                                        {item.daysOfStock !== undefined && ` · ${item.daysOfStock >= 999 ? '∞' : `${item.daysOfStock}d`}`}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {/* Top pagination */}
                                <div className="px-4 py-2 border-t border-tremor-border dark:border-dark-tremor-border flex items-center justify-between bg-tremor-background-muted/30 dark:bg-dark-tremor-background-muted/30">
                                        <p className="text-xs text-tremor-content dark:text-dark-tremor-content">
                                            Trang <span className="font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong">{analysisPage}</span> / {analysisPageCount} · {profitProducts.length} sản phẩm
                                        </p>
                                        <div className="flex items-center gap-1">
                                            <TextButton onClick={() => setAnalysisPage((p) => Math.max(1, p - 1))} disabled={analysisPage <= 1} className="group">
                                                <ChevronLeft className="size-4 text-tremor-content-emphasis" aria-hidden={true} />
                                            </TextButton>
                                            {analysisPageTokens.map((token, idx) => (
                                                token === 'ellipsis' ? (
                                                    <span key={`t-${idx}`} className="px-1.5 text-xs text-tremor-content">…</span>
                                                ) : (
                                                    <NumberButton key={token} onClick={() => setAnalysisPage(token)} active={analysisPage === token}>{token}</NumberButton>
                                                )
                                            ))}
                                            <TextButton onClick={() => setAnalysisPage((p) => Math.min(analysisPageCount, p + 1))} disabled={analysisPage >= analysisPageCount} className="group">
                                                <ChevronRight className="size-4 text-tremor-content-emphasis" aria-hidden={true} />
                                            </TextButton>
                                        </div>
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
                                            {analysisRows.map(p => (
                                                <TableRow
                                                    key={p.id}
                                                    onClick={() => openProfitProductDetail(p)}
                                                    className="hover:bg-tremor-background-muted dark:hover:bg-dark-tremor-background-muted cursor-pointer"
                                                >
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
                                <div className="p-4 border-t border-tremor-border dark:border-dark-tremor-border bg-tremor-background-muted/30 dark:bg-dark-tremor-background-muted/30 flex items-center justify-between gap-3">
                                    <p className="text-xs text-tremor-content dark:text-dark-tremor-content">
                                        Hiển thị {analysisStartIndex}-{analysisEndIndex} / {profitProducts.length} sản phẩm
                                    </p>

                                    <div className="hidden sm:inline-flex items-center gap-1">
                                        <TextButton onClick={() => setAnalysisPage((p) => Math.max(1, p - 1))} disabled={analysisPage <= 1} className="group">
                                            <ChevronLeft className="size-5 text-tremor-content-emphasis group-hover:text-tremor-content-strong dark:text-dark-tremor-content-emphasis group-hover:dark:text-dark-tremor-content-strong" aria-hidden={true} />
                                        </TextButton>

                                        {analysisPageTokens.map((token, idx) => (
                                            token === 'ellipsis' ? (
                                                <span key={`ellipsis-${idx}`} className="px-2 text-tremor-content">...</span>
                                            ) : (
                                                <NumberButton key={token} onClick={() => setAnalysisPage(token)} active={analysisPage === token}>
                                                    {token}
                                                </NumberButton>
                                            )
                                        ))}

                                        <TextButton onClick={() => setAnalysisPage((p) => Math.min(analysisPageCount, p + 1))} disabled={analysisPage >= analysisPageCount} className="group">
                                            <ChevronRight className="size-5 text-tremor-content-emphasis group-hover:text-tremor-content-strong dark:text-dark-tremor-content-emphasis group-hover:dark:text-dark-tremor-content-strong" aria-hidden={true} />
                                        </TextButton>
                                    </div>

                                    <div className="inline-flex sm:hidden items-center gap-1">
                                        <MobileButton position="left" onClick={() => setAnalysisPage((p) => Math.max(1, p - 1))} disabled={analysisPage <= 1}>
                                            <ChevronLeft className="size-5 text-tremor-content-emphasis group-hover:text-tremor-content-strong dark:text-dark-tremor-content-emphasis group-hover:dark:text-dark-tremor-content-strong" aria-hidden={true} />
                                        </MobileButton>
                                        <p className="text-xs px-2 text-tremor-content dark:text-dark-tremor-content">{analysisPage}/{analysisPageCount}</p>
                                        <MobileButton position="right" onClick={() => setAnalysisPage((p) => Math.min(analysisPageCount, p + 1))} disabled={analysisPage >= analysisPageCount}>
                                            <ChevronRight className="size-5 text-tremor-content-emphasis group-hover:text-tremor-content-strong dark:text-dark-tremor-content-emphasis group-hover:dark:text-dark-tremor-content-strong" aria-hidden={true} />
                                        </MobileButton>
                                    </div>
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

            {/* Product edit modal from gross margin */}
            {selectedProfitProduct && (
                <ProductEditModal
                    product={selectedProfitProduct.product}
                    authToken={authToken}
                    onLogout={onLogout}
                    onClose={() => setSelectedProfitProduct(null)}
                    onSave={() => { setSelectedProfitProduct(null); refreshData(); fetchProfitAnalysis(); }}
                />
            )}
        </div>
    );
};

export default ImportView;
