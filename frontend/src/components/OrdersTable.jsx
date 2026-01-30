import { useMemo } from 'react';
import { RiArrowLeftSLine, RiArrowRightSLine } from '@remixicon/react';
import {
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeaderCell,
    TableRow,
    Badge,
} from '@tremor/react';

function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
}

// Custom button components for pagination
const TextButton = ({ onClick, disabled, children, className }) => {
    return (
        <button
            type="button"
            className={classNames(
                "group rounded-tremor-small bg-tremor-background p-2 text-tremor-default shadow-tremor-input ring-1 ring-inset ring-tremor-ring hover:bg-tremor-background-muted disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-tremor-background dark:bg-dark-tremor-background dark:shadow-dark-tremor-input dark:ring-dark-tremor-ring hover:dark:bg-dark-tremor-background-muted disabled:hover:dark:bg-dark-tremor-background",
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
                'min-w-[36px] rounded-tremor-small p-2 text-tremor-default text-tremor-content-strong disabled:opacity-50 dark:text-dark-tremor-content-strong',
                active
                    ? 'bg-blue-500 text-white font-bold'
                    : 'hover:bg-tremor-background-muted hover:dark:bg-dark-tremor-background',
                position === 'left'
                    ? 'rounded-l-tremor-small'
                    : position === 'right'
                        ? 'rounded-r-tremor-small'
                        : '',
            )}
            onClick={onClick}
            aria-current={classNames(active ? 'Page' : '')}
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
                'group p-2 text-tremor-default ring-1 ring-inset ring-tremor-ring hover:bg-tremor-background-muted disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-tremor-background dark:ring-dark-tremor-ring hover:dark:bg-dark-tremor-background disabled:hover:dark:bg-dark-tremor-background',
                position === 'left'
                    ? 'rounded-l-tremor-small'
                    : position === 'right'
                        ? '-ml-px rounded-r-tremor-small'
                        : '',
            )}
            onClick={onClick}
            disabled={disabled}
        >
            {children}
        </button>
    );
};

export default function OrdersTable({ data, totalOrders, pageIndex, pageSize, onPageChange, onOrderClick }) {

    const columns = useMemo(() => [
        {
            header: 'Mã đơn',
            accessorKey: 'order_code',
            cell: ({ row }) => (
                <span className="font-bold text-[#1D1D1F]">
                    {row.original.order_code || `#${row.original.id}`}
                </span>
            ),
        },
        {
            header: 'Ngày giờ',
            accessorKey: 'timestamp',
            cell: ({ getValue }) => (
                <span className="text-[12px] text-[#86868B]">
                    {new Date(getValue()).toLocaleString('vi-VN')}
                </span>
            ),
        },
        {
            header: 'Khách hàng',
            accessorKey: 'customer_name',
            cell: ({ getValue }) => (
                <span className="text-[13px] font-medium">
                    {getValue() || 'Khách lẻ'}
                </span>
            ),
        },
        {
            header: 'Thanh toán',
            accessorKey: 'payment_method',
            cell: ({ getValue }) => (
                <Badge color={getValue() === 'transfer' ? 'blue' : 'slate'} size="xs" className="uppercase font-bold">
                    {getValue() === 'transfer' ? 'CK' : 'TM'}
                </Badge>
            ),
        },
        {
            header: 'Sản phẩm',
            accessorKey: 'items',
            cell: ({ getValue }) => {
                const items = getValue();
                return (
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {items?.slice(0, 2).map((item, idx) => (
                            <span key={idx} className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 whitespace-nowrap">
                                {item.displayName || item.name} x{item.quantity}
                            </span>
                        ))}
                        {items?.length > 2 && <span className="text-[10px] text-blue-500">+{items.length - 2}</span>}
                    </div>
                );
            }
        },
        {
            header: 'Tổng tiền',
            accessorKey: 'total',
            meta: { align: 'text-right' },
            cell: ({ getValue }) => (
                <span className="font-black text-[#0071E3] text-right block">
                    {getValue()?.toLocaleString()}đ
                </span>
            ),
        },
    ], []);

    const table = useReactTable({
        data,
        columns,
        pageCount: Math.ceil(totalOrders / pageSize),
        state: {
            pagination: {
                pageIndex,
                pageSize,
            },
        },
        manualPagination: true,
        getCoreRowModel: getCoreRowModel(),
    });

    const paginationCount = table.getPageCount();
    const actualPage = pageIndex + 1;

    const renderPageNumbers = () => {
        const pages = [];

        // Always show first page
        pages.push(
            <NumberButton key={0} onClick={() => onPageChange(0)} active={pageIndex === 0}>
                1
            </NumberButton>
        );

        if (paginationCount <= 1) return pages;

        if (actualPage > 4) {
            pages.push(<span key="dots-1" className="px-2 self-center">...</span>);
        }

        // Dynamic pages around current
        const start = Math.max(1, pageIndex - 1);
        const end = Math.min(paginationCount - 2, pageIndex + 1);

        for (let i = start; i <= end; i++) {
            pages.push(
                <NumberButton key={i} onClick={() => onPageChange(i)} active={pageIndex === i}>
                    {i + 1}
                </NumberButton>
            );
        }

        if (actualPage < paginationCount - 3) {
            pages.push(<span key="dots-2" className="px-2 self-center">...</span>);
        }

        // Always show last page if it's not the first
        if (paginationCount > 1) {
            pages.push(
                <NumberButton key={paginationCount - 1} onClick={() => onPageChange(paginationCount - 1)} active={pageIndex === paginationCount - 1}>
                    {paginationCount}
                </NumberButton>
            );
        }

        return pages;
    };

    return (
        <div className="bg-white rounded-2xl border border-[#F5F5F7] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <Table>
                    <TableHead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow
                                key={headerGroup.id}
                                className="bg-[#F9F9FA]"
                            >
                                {headerGroup.headers.map((header) => (
                                    <TableHeaderCell
                                        key={header.id}
                                        className={classNames(header.column.columnDef.meta?.align, "py-3 text-[11px] font-bold text-[#86868B] uppercase tracking-wider")}
                                    >
                                        {flexRender(
                                            header.column.columnDef.header,
                                            header.getContext(),
                                        )}
                                    </TableHeaderCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableHead>
                    <TableBody>
                        {table.getRowModel().rows.map((row) => (
                            <TableRow key={row.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => onOrderClick(row.original)}>
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell
                                        key={cell.id}
                                        className={classNames(cell.column.columnDef.meta?.align, "py-4")}
                                    >
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-[#F5F5F7] flex items-center justify-between sm:justify-center">
                {/* Desktop Pagination */}
                <div className="hidden gap-1 sm:inline-flex">
                    <TextButton
                        onClick={() => onPageChange(pageIndex - 1)}
                        disabled={pageIndex === 0}
                    >
                        <RiArrowLeftSLine className="size-5" aria-hidden={true} />
                    </TextButton>

                    {renderPageNumbers()}

                    <TextButton
                        onClick={() => onPageChange(pageIndex + 1)}
                        disabled={pageIndex >= paginationCount - 1}
                    >
                        <RiArrowRightSLine className="size-5" aria-hidden={true} />
                    </TextButton>
                </div>

                {/* Mobile Pagination */}
                <p className="text-tremor-default tabular-nums text-tremor-content dark:text-dark-tremor-content sm:hidden">
                    Trang <span className="font-medium text-tremor-content-strong">{actualPage}</span> / {paginationCount}
                </p>
                <div className="inline-flex items-center rounded-tremor-small shadow-tremor-input dark:shadow-dark-tremor-input sm:hidden ml-4">
                    <MobileButton
                        position="left"
                        onClick={() => onPageChange(pageIndex - 1)}
                        disabled={pageIndex === 0}
                    >
                        <RiArrowLeftSLine className="size-5" aria-hidden={true} />
                    </MobileButton>
                    <MobileButton
                        position="right"
                        onClick={() => onPageChange(pageIndex + 1)}
                        disabled={pageIndex >= paginationCount - 1}
                    >
                        <RiArrowRightSLine className="size-5" aria-hidden={true} />
                    </MobileButton>
                </div>
            </div>
        </div>
    );
}
