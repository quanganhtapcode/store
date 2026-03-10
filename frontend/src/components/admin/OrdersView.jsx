import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    Receipt, Calendar, Search, ChevronRight, X, Package
} from 'lucide-react';
import {
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
    getPaginationRowModel,
    getFilteredRowModel,
} from '@tanstack/react-table';
import {
    Table,
    TableBody,
    TableCell,
    TableFoot,
    TableHead,
    TableHeaderCell,
    TableRow,
    Card,
    Badge,
    TextInput
} from '@tremor/react';
import OrderModal from '../OrderModal';

const TextButton = ({ onClick, disabled, children, className }) => {
  return (
    <button
      type="button"
      className={classNames(
        "rounded-tremor-small bg-tremor-background p-2 text-tremor-default shadow-tremor-input ring-1 ring-inset ring-tremor-ring hover:bg-tremor-background-muted disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-tremor-background dark:bg-dark-tremor-background dark:shadow-dark-tremor-input dark:ring-dark-tremor-ring hover:dark:bg-dark-tremor-background-muted disabled:hover:dark:bg-dark-tremor-background",
        className
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

const NumberButton = ({ active, onClick, children, position }) => {
  return (
    <button
      type="button"
      className={classNames(
        'min-w-[36px] flex items-center justify-center rounded-tremor-small p-2 text-tremor-default text-tremor-content-strong disabled:opacity-50 dark:text-dark-tremor-content-strong',
        active
          ? 'bg-tremor-brand font-semibold text-white dark:bg-dark-tremor-brand dark:text-dark-tremor-brand-inverted'
          : 'hover:bg-tremor-background-muted hover:dark:bg-dark-tremor-background',
        position === 'left' ? 'rounded-l-tremor-small' : position === 'right' ? 'rounded-r-tremor-small' : '',
      )}
      onClick={onClick}
      aria-current={classNames(active ? 'page' : '')}
    >
      {children}
    </button>
  );
};

const MobileButton = ({ onClick, disabled, children, position }) => {
  return (
    <button
      type="button"
      className={classNames(
        'group p-2 flex items-center justify-center text-tremor-default ring-1 ring-inset ring-tremor-ring hover:bg-tremor-background-muted disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-tremor-background dark:ring-dark-tremor-ring hover:dark:bg-dark-tremor-background disabled:hover:dark:bg-dark-tremor-background',
        position === 'left' ? 'rounded-l-tremor-small' : position === 'right' ? '-ml-px rounded-r-tremor-small' : '',
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};


function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
}

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
                'size-4 rounded border-tremor-border text-tremor-brand shadow-tremor-input focus:ring-tremor-brand-muted dark:border-dark-tremor-border dark:bg-dark-tremor-background dark:text-dark-tremor-brand dark:shadow-dark-tremor-input dark:focus:ring-dark-tremor-brand-muted cursor-pointer',
                className,
            )}
            {...rest}
        />
    );
}

const OrdersView = ({ orders, dateFilter, setDateFilter, fetchOrders, authToken }) => {
    const [editingOrder, setEditingOrder] = useState(null);
    const [rowSelection, setRowSelection] = useState({});
    const [globalFilter, setGlobalFilter] = useState('');

    const filteredOrders = useMemo(() => {
        return orders.filter(o => {
            if (!dateFilter.start && !dateFilter.end) return true;
            const orderDate = new Date(o.timestamp);
            if (dateFilter.start) {
                const startDate = new Date(dateFilter.start);
                startDate.setHours(0, 0, 0, 0);
                if (orderDate < startDate) return false;
            }
            if (dateFilter.end) {
                const endDate = new Date(dateFilter.end);
                endDate.setHours(23, 59, 59, 999);
                if (orderDate > endDate) return false;
            }
            return true;
        });
    }, [orders, dateFilter]);

    const totalFiltered = useMemo(() => filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0), [filteredOrders]);

    const columns = useMemo(
        () => [
            {
                id: 'select',
                header: ({ table }) => (
                    <IndeterminateCheckbox
                        checked={table.getIsAllRowsSelected()}
                        indeterminate={table.getIsSomeRowsSelected()}
                        onChange={table.getToggleAllRowsSelectedHandler()}
                        className="translate-y-[2px]"
                    />
                ),
                cell: ({ row }) => (
                    <div onClick={e => e.stopPropagation()}>
                        <IndeterminateCheckbox
                            checked={row.getIsSelected()}
                            disabled={!row.getCanSelect()}
                            indeterminate={row.getIsSomeSelected()}
                            onChange={row.getToggleSelectedHandler()}
                            className="translate-y-[2px]"
                        />
                    </div>
                ),
                enableSorting: false,
                meta: { align: 'text-left' },
            },
            {
                header: 'Mã Đơn',
                accessorFn: row => row.order_code || `#${row.id}`,
                id: 'order_code',
                cell: ({ getValue }) => <span className="font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong">{getValue()}</span>,
                meta: { align: 'text-left' },
            },
            {
                header: 'Khách hàng',
                accessorKey: 'customer_name',
                cell: ({ getValue }) => getValue() === 'Khách lẻ' ? <span className="text-gray-400 font-normal">Khách lẻ</span> : getValue(),
                meta: { align: 'text-left' },
            },
            {
                header: 'Thời gian',
                accessorKey: 'timestamp',
                cell: ({ getValue }) => <span className="text-tremor-content whitespace-nowrap">{new Date(getValue()).toLocaleString('vi-VN')}</span>,
                meta: { align: 'text-left' },
            },
            {
                header: 'Sản phẩm',
                accessorKey: 'items',
                cell: ({ row }) => {
                    const items = typeof row.original.items === 'string' ? JSON.parse(row.original.items || '[]') : (row.original.items || []);
                    return (
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {items.slice(0, 2).map((item, idx) => (
                                <Badge key={idx} size="xs" color="gray">
                                    {item.displayName || item.name} ×{item.quantity}
                                </Badge>
                            ))}
                            {items.length > 2 && <Badge size="xs" color="blue">+{items.length - 2}</Badge>}
                        </div>
                    );
                },
                meta: { align: 'text-left' },
                enableGlobalFilter: false,
            },
            {
                header: 'Trạng thái',
                accessorKey: 'status',
                cell: ({ getValue }) => {
                    const status = getValue();
                    return (
                        <Badge color={status === 'completed' ? 'emerald' : status === 'cancelled' ? 'red' : 'gray'}>
                            {status === 'completed' ? 'Hoàn thành' : status === 'cancelled' ? 'Đã hủy' : status || 'completed'}
                        </Badge>
                    );
                },
                meta: { align: 'text-left' },
            },
            {
                header: 'Thanh toán',
                accessorKey: 'payment_method',
                cell: ({ getValue }) => (
                    <Badge color={getValue() === 'transfer' ? 'indigo' : 'amber'} icon={undefined}>
                        {getValue() === 'transfer' ? 'CK' : 'Tiền mặt'}
                    </Badge>
                ),
                meta: { align: 'text-left' },
            },
            {
                header: 'Tổng tiền',
                accessorKey: 'total',
                cell: ({ getValue }) => <span className="font-bold whitespace-nowrap text-tremor-brand dark:text-dark-tremor-brand">{getValue()?.toLocaleString('vi-VN')}đ</span>,
                meta: { align: 'text-right' },
            },
        ],
        []
    );

    const table = useReactTable({
        data: filteredOrders,
        columns,
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        globalFilterFn: 'includesString',
        state: {
            rowSelection,
            globalFilter,
        },
        onGlobalFilterChange: setGlobalFilter,
        initialState: {
            pagination: { pageSize: 50 }
        }
    });

    const isFiltered = dateFilter.start || dateFilter.end;
    const paginationCount = table.getPageCount();
    const actualPage = table.getState().pagination.pageIndex + 1;

    return (
        <div className="space-y-6 animate-in">
            {/* Header & Date Filter */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Đơn hàng</h2>
                    <p className="text-sm text-gray-500 mt-1">Danh sách tất cả giao dịch bán hàng</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-2 md:mt-0">
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                         <button onClick={() => { const d = new Date(); setDateFilter({ start: String(d.toISOString().split('T')[0]), end: '' }); }} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${isFiltered && !dateFilter.end && dateFilter.start === new Date().toISOString().split('T')[0] ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Hôm nay</button>
                         <button onClick={() => { const d = new Date(); d.setDate(1); setDateFilter({ start: String(d.toISOString().split('T')[0]), end: '' }); }} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${isFiltered && !dateFilter.end && dateFilter.start === new Date(new Date().setDate(1)).toISOString().split('T')[0] ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Tháng này</button>
                         <button onClick={() => setDateFilter({ start: '', end: '' })} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${!isFiltered ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Tất cả</button>
                    </div>
                </div>
            </div>

            {/* Custom Range Filter & Stats */}
            <Card className="p-4 sm:p-5 border-tremor-border">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-500 w-12 sm:w-auto">Từ</span>
                            <input type="date" value={dateFilter.start} onChange={e => setDateFilter({ ...dateFilter, start: e.target.value })} className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block px-3 py-1.5 outline-none" />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-500 w-12 sm:w-auto">Đến</span>
                            <input type="date" value={dateFilter.end} onChange={e => setDateFilter({ ...dateFilter, end: e.target.value })} className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block px-3 py-1.5 outline-none" />
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-6 pr-4">
                        <div>
                            <p className="text-xs font-medium text-gray-500">Số lượng đơn</p>
                            <p className="text-xl font-bold text-gray-900">{filteredOrders.length}</p>
                        </div>
                        <div className="w-px h-8 bg-gray-200" />
                        <div>
                            <p className="text-xs font-medium text-gray-500">Tổng doanh thu</p>
                            <p className="text-xl font-bold text-blue-600">{totalFiltered.toLocaleString('vi-VN')}đ</p>
                        </div>
                    </div>
                </div>
            </Card>

            <Card className="p-0 sm:p-0 overflow-hidden">
                <div className="p-4 border-b border-tremor-border dark:border-dark-tremor-border flex justify-between items-center bg-gray-50/50">
                    <div className="relative max-w-sm w-full">
                        <TextInput 
                            icon={Search}
                            placeholder="Tìm mã đơn, khách hàng..." 
                            value={globalFilter ?? ''}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto relative min-h-[400px]">
                    <Table>
                        <TableHead className="bg-gray-50/50">
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className="border-b border-tremor-border dark:border-dark-tremor-border">
                                    {headerGroup.headers.map((header) => (
                                        <TableHeaderCell key={header.id} className={classNames(header.column.columnDef.meta.align)}>
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                        </TableHeaderCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHead>
                        <TableBody>
                            {table.getRowModel().rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="text-center py-10 text-gray-500">
                                        Không tìm thấy đơn hàng nào
                                    </TableCell>
                                </TableRow>
                            ) : (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        onClick={() => setEditingOrder(row.original)}
                                        className="select-none cursor-pointer hover:bg-tremor-background-muted hover:dark:bg-dark-tremor-background-muted transition-colors"
                                    >
                                        {row.getVisibleCells().map((cell, index) => (
                                            <TableCell
                                                key={cell.id}
                                                className={classNames(
                                                    row.getIsSelected() ? 'bg-tremor-background-muted dark:bg-dark-tremor-background-muted' : '',
                                                    cell.column.columnDef.meta.align,
                                                    'relative'
                                                )}
                                            >
                                                {index === 0 && row.getIsSelected() && (
                                                    <div className="absolute inset-y-0 left-0 w-0.5 bg-tremor-brand dark:bg-dark-tremor-brand" />
                                                )}
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                        <TableFoot>
                            <TableRow>
                                <TableHeaderCell colSpan={1}>
                                    <IndeterminateCheckbox
                                        checked={table.getIsAllPageRowsSelected()}
                                        indeterminate={table.getIsSomePageRowsSelected()}
                                        onChange={table.getToggleAllPageRowsSelectedHandler()}
                                        className="translate-y-[2px]"
                                    />
                                </TableHeaderCell>
                                <TableHeaderCell colSpan={7} className="font-normal tabular-nums text-xs">
                                    Đã chọn {Object.keys(rowSelection).length} / {table.getFilteredRowModel().rows.length} đơn hàng
                                </TableHeaderCell>
                            </TableRow>
                        </TableFoot>
                    </Table>
                </div>
                {/* Pagination Controls */}
                <div className="p-4 border-t border-tremor-border dark:border-dark-tremor-border bg-gray-50/50 flex items-center justify-between sm:justify-center">
                    {/* long pagination button form only for desktop view */}
                    <div className="hidden gap-0.5 sm:inline-flex">
                        <TextButton onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="group">
                            <span className="sr-only">Previous</span>
                            <ChevronLeft className="size-5 text-tremor-content-emphasis group-hover:text-tremor-content-strong dark:text-dark-tremor-content-emphasis group-hover:dark:text-dark-tremor-content-strong" aria-hidden={true} />
                        </TextButton>
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
                        {paginationCount > 1 && (
                            <NumberButton onClick={() => table.setPageIndex(paginationCount - 1)} active={actualPage === paginationCount}>{paginationCount}</NumberButton>
                        )}
                        <TextButton onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="group">
                            <span className="sr-only">Next</span>
                            <ChevronRight className="size-5 text-tremor-content-emphasis group-hover:text-tremor-content-strong dark:text-dark-tremor-content-emphasis group-hover:dark:text-dark-tremor-content-strong" aria-hidden={true} />
                        </TextButton>
                    </div>
                    
                    <p className="text-tremor-defaulttabular-nums text-tremor-content dark:text-dark-tremor-content sm:hidden">
                        Trang <span className="font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong">{actualPage}</span> / <span className="font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong">{paginationCount || 1}</span>
                    </p>
                    
                    <div className="inline-flex items-center rounded-tremor-small shadow-tremor-input dark:shadow-dark-tremor-input sm:hidden">
                        <MobileButton position="left" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                            <span className="sr-only">Previous</span>
                            <ChevronLeft className="size-5 text-tremor-content-emphasis group-hover:text-tremor-content-strong dark:text-dark-tremor-content-emphasis group-hover:dark:text-dark-tremor-content-strong" aria-hidden={true} />
                        </MobileButton>
                        <MobileButton position="right" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                            <span className="sr-only">Next</span>
                            <ChevronRight className="size-5 text-tremor-content-emphasis group-hover:text-tremor-content-strong dark:text-dark-tremor-content-emphasis group-hover:dark:text-dark-tremor-content-strong" aria-hidden={true} />
                        </MobileButton>
                    </div>
                </div>
            </Card>

            {/* Floating Action Bar */}
            <div
                className={classNames(
                    'fixed bottom-6 left-1/2 -translate-x-1/2 max-w-sm w-full mx-auto flex items-center justify-between rounded-full border border-dark-tremor-border bg-gray-900 px-4 py-3 shadow-2xl z-50 transition-all duration-300',
                    Object.keys(rowSelection).length > 0 ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0 pointer-events-none'
                )}
            >
                <p className="select-none text-sm font-medium text-gray-300">
                    <span className="text-white font-bold">{Object.keys(rowSelection).length}</span> đơn hàng
                </p>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        className="text-sm font-medium text-red-400 hover:text-red-300 transition-colors"
                        onClick={() => alert('Chức năng xóa nhiều đơn hàng đang được phát triển')}
                    >
                        Xóa
                    </button>
                    <div className="w-px h-4 bg-gray-700" />
                    <button
                        type="button"
                        className="text-sm font-medium text-white hover:text-gray-200 transition-colors"
                        onClick={() => setRowSelection({})}
                    >
                        Bỏ chọn
                    </button>
                </div>
            </div>

            {/* Order Modal */}
            {editingOrder && (
                <OrderModal
                    order={editingOrder}
                    authToken={authToken}
                    onClose={() => setEditingOrder(null)}
                    onSave={() => { fetchOrders(); setEditingOrder(null); setRowSelection({}); }}
                />
            )}
        </div>
    );
};

export default OrdersView;
