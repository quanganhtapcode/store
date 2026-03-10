import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    useReactTable,
} from '@tanstack/react-table';
import {
    Table, TableBody, TableCell, TableFoot,
    TableHead, TableHeaderCell, TableRow, Card,
} from '@tremor/react';
import {
    Plus, Edit3, Trash2, X, Search, Phone, Mail,
    MapPin, Package, User, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
}

/* ── Checkbox ── */
function IndeterminateCheckbox({ indeterminate, className, ...rest }) {
    const ref = useRef(null);
    useEffect(() => {
        if (typeof indeterminate === 'boolean') {
            ref.current.indeterminate = !rest.checked && indeterminate;
        }
    }, [ref, indeterminate]);
    return (
        <input
            type="checkbox"
            ref={ref}
            className={classNames(
                'size-4 rounded border-tremor-border text-tremor-brand shadow-tremor-input focus:ring-tremor-brand-muted dark:border-dark-tremor-border dark:bg-dark-tremor-background dark:text-dark-tremor-brand dark:shadow-dark-tremor-input dark:focus:ring-dark-tremor-brand-muted',
                className,
            )}
            {...rest}
        />
    );
}

/* ── Supplier Add/Edit Modal (unchanged) ── */
const SupplierModal = ({ supplier, onClose, onSave, authToken }) => {
    const isEdit = !!supplier;
    const [form, setForm] = useState(supplier || {
        name: '', contact_person: '', phone: '', email: '', address: '', note: ''
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async () => {
        if (!form.name.trim()) return alert('Vui lòng nhập tên nhà cung cấp');
        setSaving(true);
        try {
            const url = isEdit ? `${API_URL}/suppliers/${supplier.id}` : `${API_URL}/suppliers`;
            const method = isEdit ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                body: JSON.stringify(form)
            });
            if (res.ok) { onSave(); }
            else {
                const data = await res.json();
                alert(data.error || 'Có lỗi xảy ra');
            }
        } catch (e) { alert('Lỗi kết nối'); }
        finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl animate-in dark:bg-dark-tremor-background">
                {/* Header */}
                <div className="p-5 border-b border-tremor-border dark:border-dark-tremor-border flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-lg text-tremor-content-strong dark:text-dark-tremor-content-strong">
                            {isEdit ? 'Chỉnh sửa NCC' : 'Thêm NCC mới'}
                        </h3>
                        <p className="text-tremor-default text-tremor-content dark:text-dark-tremor-content mt-0.5">Nhà cung cấp hàng hóa</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-tremor-background-muted rounded-xl hover:bg-gray-200 dark:bg-dark-tremor-background-muted transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Form */}
                <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
                    <div>
                        <label className="text-tremor-label font-semibold text-tremor-content dark:text-dark-tremor-content mb-1.5 block uppercase tracking-wider">Tên nhà cung cấp *</label>
                        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="VD: Công ty TNHH ABC..."
                            className="w-full bg-tremor-background-muted p-3.5 rounded-xl font-semibold outline-none border border-tremor-border focus:border-tremor-brand focus:bg-tremor-background transition-all text-sm dark:bg-dark-tremor-background-muted dark:border-dark-tremor-border dark:text-dark-tremor-content-strong" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-tremor-label font-semibold text-tremor-content dark:text-dark-tremor-content mb-1.5 block uppercase tracking-wider">Người liên hệ</label>
                            <div className="relative">
                                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tremor-content dark:text-dark-tremor-content" />
                                <input value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} placeholder="Tên người đại diện"
                                    className="w-full bg-tremor-background-muted pl-10 pr-3 py-3.5 rounded-xl font-medium outline-none border border-tremor-border focus:border-tremor-brand focus:bg-tremor-background transition-all text-sm dark:bg-dark-tremor-background-muted dark:border-dark-tremor-border dark:text-dark-tremor-content-strong" />
                            </div>
                        </div>
                        <div>
                            <label className="text-tremor-label font-semibold text-tremor-content dark:text-dark-tremor-content mb-1.5 block uppercase tracking-wider">Số điện thoại</label>
                            <div className="relative">
                                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tremor-content dark:text-dark-tremor-content" />
                                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="0xxx xxx xxx"
                                    className="w-full bg-tremor-background-muted pl-10 pr-3 py-3.5 rounded-xl font-medium outline-none border border-tremor-border focus:border-tremor-brand focus:bg-tremor-background transition-all text-sm dark:bg-dark-tremor-background-muted dark:border-dark-tremor-border dark:text-dark-tremor-content-strong" />
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="text-tremor-label font-semibold text-tremor-content dark:text-dark-tremor-content mb-1.5 block uppercase tracking-wider">Email</label>
                        <div className="relative">
                            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tremor-content dark:text-dark-tremor-content" />
                            <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@company.com"
                                className="w-full bg-tremor-background-muted pl-10 pr-3 py-3.5 rounded-xl font-medium outline-none border border-tremor-border focus:border-tremor-brand focus:bg-tremor-background transition-all text-sm dark:bg-dark-tremor-background-muted dark:border-dark-tremor-border dark:text-dark-tremor-content-strong" />
                        </div>
                    </div>
                    <div>
                        <label className="text-tremor-label font-semibold text-tremor-content dark:text-dark-tremor-content mb-1.5 block uppercase tracking-wider">Địa chỉ</label>
                        <div className="relative">
                            <MapPin size={16} className="absolute left-3 top-3.5 text-tremor-content dark:text-dark-tremor-content" />
                            <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Địa chỉ nhà kho / công ty..." rows={2}
                                className="w-full bg-tremor-background-muted pl-10 pr-3 py-3 rounded-xl font-medium outline-none border border-tremor-border focus:border-tremor-brand focus:bg-tremor-background transition-all text-sm resize-none dark:bg-dark-tremor-background-muted dark:border-dark-tremor-border dark:text-dark-tremor-content-strong" />
                        </div>
                    </div>
                    <div>
                        <label className="text-tremor-label font-semibold text-tremor-content dark:text-dark-tremor-content mb-1.5 block uppercase tracking-wider">Ghi chú</label>
                        <textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="Ghi chú thêm..." rows={2}
                            className="w-full bg-tremor-background-muted p-3.5 rounded-xl font-medium outline-none border border-tremor-border focus:border-tremor-brand focus:bg-tremor-background transition-all text-sm resize-none dark:bg-dark-tremor-background-muted dark:border-dark-tremor-border dark:text-dark-tremor-content-strong" />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-tremor-border dark:border-dark-tremor-border flex gap-3">
                    <button onClick={onClose} className="flex-1 px-4 py-3 bg-tremor-background-muted text-tremor-content-strong rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors dark:bg-dark-tremor-background-muted dark:text-dark-tremor-content-strong">
                        Hủy
                    </button>
                    <button onClick={handleSubmit} disabled={saving}
                        className="flex-[2] px-4 py-3 bg-tremor-brand text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all active:scale-[0.98] disabled:opacity-60">
                        {saving ? 'Đang lưu...' : (isEdit ? 'Cập nhật' : 'Thêm mới')}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ── Main SuppliersView ── */
const SuppliersView = ({ suppliers, refreshSuppliers, authToken, onLogout }) => {
    const [showModal, setShowModal] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [rowSelection, setRowSelection] = useState({});
    const [sorting, setSorting] = useState([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [deleting, setDeleting] = useState(false);

    const handleSave = () => {
        setShowModal(false);
        setEditingSupplier(null);
        refreshSuppliers();
    };

    const handleDeleteSelected = async () => {
        const selectedIds = Object.keys(rowSelection).map(idx => suppliers[parseInt(idx)]?.id).filter(Boolean);
        if (selectedIds.length === 0) return;
        if (!confirm(`Bạn có chắc muốn xóa ${selectedIds.length} nhà cung cấp?`)) return;

        setDeleting(true);
        try {
            for (const id of selectedIds) {
                await fetch(`${API_URL}/suppliers/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
            }
            setRowSelection({});
            refreshSuppliers();
        } catch (e) { alert('Lỗi kết nối'); }
        finally { setDeleting(false); }
    };

    const columns = useMemo(() => [
        {
            id: 'select',
            header: ({ table }) => (
                <IndeterminateCheckbox
                    checked={table.getIsAllRowsSelected()}
                    indeterminate={table.getIsSomeRowsSelected()}
                    onChange={table.getToggleAllRowsSelectedHandler()}
                    className="-translate-y-[1px]"
                />
            ),
            cell: ({ row }) => (
                <IndeterminateCheckbox
                    checked={row.getIsSelected()}
                    disabled={!row.getCanSelect()}
                    indeterminate={row.getIsSomeSelected()}
                    onChange={row.getToggleSelectedHandler()}
                    className="-translate-y-[1px]"
                />
            ),
            enableSorting: false,
            meta: { align: 'text-left' },
        },
        {
            header: 'Nhà cung cấp',
            accessorKey: 'name',
            enableSorting: true,
            meta: { align: 'text-left' },
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0">
                        {row.original.name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong">
                        {row.original.name}
                    </span>
                </div>
            ),
        },
        {
            header: 'Người liên hệ',
            accessorKey: 'contact_person',
            enableSorting: true,
            meta: { align: 'text-left' },
            cell: ({ getValue }) => (
                <span className="text-tremor-content dark:text-dark-tremor-content">
                    {getValue() || '—'}
                </span>
            ),
        },
        {
            header: 'Điện thoại',
            accessorKey: 'phone',
            enableSorting: false,
            meta: { align: 'text-left' },
            cell: ({ getValue }) => (
                getValue() ? (
                    <span className="inline-flex items-center gap-1.5 text-sm">
                        <Phone size={12} className="text-tremor-content" />
                        {getValue()}
                    </span>
                ) : <span className="text-tremor-content">—</span>
            ),
        },
        {
            header: 'Email',
            accessorKey: 'email',
            enableSorting: false,
            meta: { align: 'text-left' },
            cell: ({ getValue }) => (
                getValue() ? (
                    <span className="inline-flex items-center gap-1.5 text-sm truncate max-w-[200px]">
                        <Mail size={12} className="text-tremor-content" />
                        {getValue()}
                    </span>
                ) : <span className="text-tremor-content">—</span>
            ),
        },
        {
            header: 'Ngày tạo',
            accessorKey: 'created_at',
            enableSorting: true,
            meta: { align: 'text-right' },
            cell: ({ getValue }) => (
                <span className="text-sm text-tremor-content tabular-nums">
                    {getValue() ? new Date(getValue()).toLocaleDateString('vi-VN') : '—'}
                </span>
            ),
        },
        {
            id: 'actions',
            header: '',
            enableSorting: false,
            meta: { align: 'text-right' },
            cell: ({ row }) => (
                <div className="flex gap-1.5 justify-end">
                    <button
                        onClick={(e) => { e.stopPropagation(); setEditingSupplier(row.original); setShowModal(true); }}
                        className="p-1.5 rounded-lg hover:bg-tremor-background-muted transition-colors text-tremor-content hover:text-tremor-brand dark:hover:bg-dark-tremor-background-muted"
                        title="Chỉnh sửa"
                    >
                        <Edit3 size={14} />
                    </button>
                    <button
                        onClick={async (e) => {
                            e.stopPropagation();
                            if (!confirm(`Xóa "${row.original.name}"?`)) return;
                            await fetch(`${API_URL}/suppliers/${row.original.id}`, {
                                method: 'DELETE', headers: { 'Authorization': `Bearer ${authToken}` }
                            });
                            refreshSuppliers();
                        }}
                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-tremor-content hover:text-red-500"
                        title="Xóa"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            ),
        },
    ], [authToken, refreshSuppliers]);

    const table = useReactTable({
        data: suppliers,
        columns,
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        state: { rowSelection, sorting, globalFilter },
    });

    const selectedCount = Object.keys(rowSelection).length;

    return (
        <div className="space-y-5 animate-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-tremor-content-strong dark:text-dark-tremor-content-strong">
                        Nhà cung cấp
                    </h2>
                    <p className="text-tremor-default text-tremor-content dark:text-dark-tremor-content">
                        {suppliers.length} nhà cung cấp
                    </p>
                </div>
                <div className="flex gap-2">
                    {selectedCount > 0 && (
                        <button onClick={handleDeleteSelected} disabled={deleting}
                            className="flex items-center gap-2 bg-red-500 text-white px-4 py-2.5 rounded-tremor-default font-semibold text-sm transition-all hover:bg-red-600 disabled:opacity-50">
                            <Trash2 size={16} />
                            Xóa ({selectedCount})
                        </button>
                    )}
                    <button onClick={() => { setEditingSupplier(null); setShowModal(true); }}
                        className="flex items-center gap-2 bg-tremor-brand text-white px-4 py-2.5 rounded-tremor-default font-semibold text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all active:scale-[0.97]">
                        <Plus size={18} />
                        Thêm NCC
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-tremor-content dark:text-dark-tremor-content" />
                <input
                    type="text"
                    placeholder="Tìm nhà cung cấp theo tên, SĐT, email..."
                    value={globalFilter ?? ''}
                    onChange={e => setGlobalFilter(e.target.value)}
                    className="w-full bg-tremor-background pl-12 pr-4 py-3 rounded-tremor-default text-sm font-medium outline-none border border-tremor-border focus:border-tremor-brand focus:ring-2 focus:ring-tremor-brand-muted transition-all dark:bg-dark-tremor-background dark:border-dark-tremor-border dark:text-dark-tremor-content-strong"
                />
            </div>

            {/* Table */}
            {suppliers.length === 0 ? (
                <Card className="p-0">
                    <div className="text-center py-16">
                        <Package size={48} className="mx-auto mb-3 text-tremor-content-subtle" />
                        <p className="font-semibold text-tremor-content dark:text-dark-tremor-content">
                            Chưa có nhà cung cấp nào
                        </p>
                        <p className="text-tremor-content text-sm mt-1">Nhấn "Thêm NCC" để bắt đầu</p>
                    </div>
                </Card>
            ) : (
                <Card className="p-0 overflow-hidden">
                    <Table>
                        <TableHead>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className="border-b border-tremor-border dark:border-dark-tremor-border">
                                    {headerGroup.headers.map((header) => (
                                        <TableHeaderCell
                                            key={header.id}
                                            className={classNames(
                                                header.column.columnDef.meta?.align,
                                                header.column.getCanSort() ? 'cursor-pointer select-none' : '',
                                            )}
                                            onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                                        >
                                            <span className="inline-flex items-center gap-1">
                                                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                                {header.column.getCanSort() && (
                                                    header.column.getIsSorted() === 'asc' ? <ArrowUp size={14} />
                                                    : header.column.getIsSorted() === 'desc' ? <ArrowDown size={14} />
                                                    : <ArrowUpDown size={14} className="opacity-30" />
                                                )}
                                            </span>
                                        </TableHeaderCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHead>
                        <TableBody>
                            {table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    onClick={() => row.toggleSelected(!row.getIsSelected())}
                                    className="select-none hover:bg-tremor-background-muted hover:dark:bg-dark-tremor-background-muted cursor-pointer"
                                >
                                    {row.getVisibleCells().map((cell, index) => (
                                        <TableCell
                                            key={cell.id}
                                            className={classNames(
                                                row.getIsSelected() ? 'bg-tremor-background-muted dark:bg-dark-tremor-background-muted' : '',
                                                cell.column.columnDef.meta?.align,
                                                'relative',
                                            )}
                                        >
                                            {index === 0 && row.getIsSelected() && (
                                                <div className="absolute inset-y-0 left-0 w-0.5 bg-tremor-brand dark:bg-dark-tremor-brand" />
                                            )}
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                        <TableFoot>
                            <TableRow>
                                <TableHeaderCell colSpan={1}>
                                    <IndeterminateCheckbox
                                        checked={table.getIsAllPageRowsSelected()}
                                        indeterminate={table.getIsSomePageRowsSelected()}
                                        onChange={table.getToggleAllPageRowsSelectedHandler()}
                                        className="-translate-y-[1px]"
                                    />
                                </TableHeaderCell>
                                <TableHeaderCell colSpan={6} className="font-normal tabular-nums text-tremor-content dark:text-dark-tremor-content">
                                    {selectedCount} / {table.getRowModel().rows.length} đã chọn
                                </TableHeaderCell>
                            </TableRow>
                        </TableFoot>
                    </Table>
                </Card>
            )}

            {/* Modal */}
            {showModal && (
                <SupplierModal
                    supplier={editingSupplier}
                    onClose={() => { setShowModal(false); setEditingSupplier(null); }}
                    onSave={handleSave}
                    authToken={authToken}
                />
            )}
        </div>
    );
};

export default SuppliersView;
