import React, { useMemo, useState } from 'react';
import {
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from '@tanstack/react-table';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeaderCell,
    TableRow,
    Card,
    Badge
} from '@tremor/react';
import { FileText, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
}

// Reusing Pagination Components from OrdersView
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

const LogsView = ({ logs, orders, onOrderClick }) => {
    const [actionFilter, setActionFilter] = useState('');

    const filteredLogs = useMemo(() => {
        if (!actionFilter) return logs;
        return logs.filter(log => log.action?.includes(actionFilter));
    }, [logs, actionFilter]);

    const getActionClasses = (action) => {
        if (action?.includes('ADD')) return 'bg-emerald-100 text-emerald-800 ring-emerald-600/10 dark:bg-emerald-500/20 dark:text-emerald-500 dark:ring-emerald-400/20';
        if (action?.includes('DELETE')) return 'bg-red-100 text-red-800 ring-red-600/10 dark:bg-red-500/20 dark:text-red-500 dark:ring-red-400/20';
        if (action?.includes('UPDATE') || action?.includes('CREATE_ORDER')) return 'bg-blue-100 text-blue-800 ring-blue-600/10 dark:bg-blue-500/20 dark:text-blue-500 dark:ring-blue-400/20';
        if (action?.includes('IMPORT')) return 'bg-purple-100 text-purple-800 ring-purple-600/10 dark:bg-purple-500/20 dark:text-purple-500 dark:ring-purple-400/20';
        if (action?.includes('LOGIN')) return 'bg-indigo-100 text-indigo-800 ring-indigo-600/10 dark:bg-indigo-500/20 dark:text-indigo-500 dark:ring-indigo-400/20';
        return 'bg-gray-100 text-gray-800 ring-gray-600/10 dark:bg-gray-500/20 dark:text-gray-400 dark:ring-gray-400/20';
    };

    const columns = useMemo(
        () => [
            {
                header: 'Hành động',
                accessorKey: 'action',
                cell: ({ getValue }) => {
                    const action = getValue();
                    return (
                        <span
                            className={classNames(
                                getActionClasses(action),
                                'inline-flex items-center rounded-tremor-small px-2 py-0.5 text-tremor-label font-medium ring-1 ring-inset whitespace-nowrap'
                            )}
                        >
                            {action}
                        </span>
                    );
                },
                meta: { align: 'text-left' },
            },
            {
                header: 'Chi tiết',
                accessorKey: 'details',
                cell: ({ getValue }) => {
                    const details = getValue();
                    // Match ORD followed by digits
                    const match = details.match(/(ORD\d+)/);
                    if (match && onOrderClick) {
                        const orderCode = match[1];
                        const parts = details.split(orderCode);
                        return (
                            <span className="text-tremor-content-strong dark:text-dark-tremor-content-strong max-w-xl">
                                {parts[0]}
                                <button
                                    onClick={() => {
                                        const found = orders.find(o => o.order_code === orderCode);
                                        if (found) onOrderClick(found);
                                        else alert('Không tìm thấy dữ liệu đơn hàng này');
                                    }}
                                    className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline mx-1 cursor-pointer"
                                >
                                    {orderCode}
                                </button>
                                {parts[1]}
                            </span>
                        );
                    }
                    return <span className="text-tremor-content-strong dark:text-dark-tremor-content-strong max-w-xl truncate line-clamp-2">{details}</span>;
                },
                meta: { align: 'text-left' },
            },
            {
                header: 'Người dùng',
                accessorKey: 'user',
                cell: ({ row }) => <span className="text-tremor-content dark:text-dark-tremor-content whitespace-nowrap">{row.original.user || 'Admin'}</span>,
                meta: { align: 'text-left' },
            },
            {
                header: 'Thời gian',
                accessorKey: 'timestamp',
                cell: ({ getValue }) => (
                    <span className="text-tremor-content dark:text-dark-tremor-content whitespace-nowrap flex items-center justify-end gap-1.5">
                        <Clock size={14} />
                        {new Date(getValue()).toLocaleString('vi-VN')}
                    </span>
                ),
                meta: { align: 'text-right' },
            }
        ],
        []
    );

    const table = useReactTable({
        data: filteredLogs,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: {
            pagination: { pageSize: 50 }
        }
    });

    const paginationCount = table.getPageCount();
    const actualPage = table.getState().pagination.pageIndex + 1;

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-tremor-content-strong dark:text-dark-tremor-content-strong">Nhật ký hoạt động</h2>
                    <p className="text-sm text-tremor-content dark:text-dark-tremor-content mt-1">Lịch sử mọi thao tác trong hệ thống</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 items-center mt-2 md:mt-0">
                    <select
                        value={actionFilter}
                        onChange={(e) => setActionFilter(e.target.value)}
                        className="bg-tremor-background dark:bg-dark-tremor-background border border-tremor-border dark:border-dark-tremor-border text-tremor-content-strong dark:text-dark-tremor-content-strong text-sm rounded-lg focus:ring-tremor-brand focus:border-tremor-brand block w-full sm:w-auto px-3 py-1.5 outline-none cursor-pointer"
                    >
                        <option value="">Tất cả thao tác</option>
                        <option value="CREATE_ORDER">Tạo đơn hàng (CREATE)</option>
                        <option value="UPDATE_ORDER">Sửa đơn hàng (UPDATE)</option>
                        <option value="DELETE_ORDER">Xóa đơn hàng (DELETE)</option>
                        <option value="IMPORT">Nhập hàng (IMPORT)</option>
                        <option value="ADD">Thêm mới SP (ADD)</option>
                        <option value="UPDATE">Cập nhật SP (UPDATE)</option>
                        <option value="DELETE">Xóa SP (DELETE)</option>
                        <option value="LOGIN">Đăng nhập (LOGIN)</option>
                    </select>

                    <div className="flex bg-tremor-background-muted dark:bg-dark-tremor-background-muted p-[3px] rounded-lg border border-tremor-border dark:border-dark-tremor-border">
                        <span className="text-sm px-3 py-1.5 text-tremor-content-strong dark:text-dark-tremor-content-strong font-medium">Lọc được <span className="font-bold">{filteredLogs.length}</span> / {logs.length}</span>
                    </div>
                </div>
            </div>

            <Card className="p-0 sm:p-0 overflow-hidden">
                <div className="overflow-x-auto relative min-h-[400px]">
                    <Table>
                        <TableHead className="bg-tremor-background-muted/50 dark:bg-dark-tremor-background-muted/50">
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
                                    <TableCell colSpan={columns.length} className="text-center py-10 text-tremor-content">
                                        Không có nhật ký nào
                                    </TableCell>
                                </TableRow>
                            ) : (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        className="hover:bg-tremor-background-muted hover:dark:bg-dark-tremor-background-muted transition-colors"
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell
                                                key={cell.id}
                                                className={classNames(cell.column.columnDef.meta.align, 'align-middle')}
                                            >
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
                {/* Pagination Controls */}
                <div className="p-4 border-t border-tremor-border dark:border-dark-tremor-border bg-tremor-background-muted/50 dark:bg-dark-tremor-background-muted/50 flex items-center justify-between sm:justify-center">
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
                    
                    <p className="text-tremor-default tabular-nums text-tremor-content dark:text-dark-tremor-content sm:hidden">
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
        </div>
    );
};

export default LogsView;
