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
    const paginationCount = Math.ceil(totalOrders / pageSize);
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
            pages.push(<span key="dots-1" className="px-2 self-center text-gray-400">...</span>);
        }

        // Dynamic pages around current
        let start = Math.max(1, pageIndex - 1);
        let end = Math.min(paginationCount - 2, pageIndex + 1);

        // Adjust if near start or end
        if (pageIndex <= 2) end = Math.min(paginationCount - 2, 4);
        if (pageIndex >= paginationCount - 3) start = Math.max(1, paginationCount - 5);

        for (let i = start; i <= end; i++) {
            if (i > 0 && i < paginationCount - 1) {
                pages.push(
                    <NumberButton key={i} onClick={() => onPageChange(i)} active={pageIndex === i}>
                        {i + 1}
                    </NumberButton>
                );
            }
        }

        if (actualPage < paginationCount - 3) {
            pages.push(<span key="dots-2" className="px-2 self-center text-gray-400">...</span>);
        }

        // Always show last page
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
        <div className="space-y-3">
            {/* Order Cards List */}
            <div className="space-y-3">
                {data.map((o) => {
                    const items = Array.isArray(o.items) ? o.items : JSON.parse(o.items || '[]');
                    return (
                        <div
                            key={o.id}
                            onClick={() => onOrderClick(o)}
                            className="bg-white p-4 rounded-2xl shadow-sm border border-[#F5F5F7] active:scale-[0.98] transition-all cursor-pointer"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <p className="font-bold text-[14px] text-[#1D1D1F] flex items-center gap-2 flex-wrap">
                                        {o.order_code || `#${o.id}`}
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${o.status === 'completed' ? 'bg-green-100 text-green-700' : o.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-[#E8E8ED] text-[#1D1D1F]'}`}>
                                            {o.status || 'completed'}
                                        </span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${o.payment_method === 'transfer' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                                            {o.payment_method === 'transfer' ? 'transfer' : 'cash'}
                                        </span>
                                    </p>
                                    <p className="text-[12px] text-[#86868B] mt-0.5">{new Date(o.timestamp).toLocaleString()}</p>
                                    {o.customer_name && o.customer_name !== 'Khách lẻ' && (
                                        <p className="text-[12px] text-[#1D1D1F] font-medium mt-1">👤 {o.customer_name}</p>
                                    )}
                                </div>
                                <span className="font-black text-[#0071E3] text-[18px]">{o.total?.toLocaleString()}đ</span>
                            </div>
                            <div className="text-[11px] text-[#86868B] border-t border-[#F5F5F7] pt-2 mt-2">
                                {items?.slice(0, 4).map((item, idx) => (
                                    <span key={idx} className="inline-block bg-[#F5F5F7] px-2 py-0.5 rounded mr-1 mb-1">
                                        {item.displayName || item.name} x{item.quantity}
                                    </span>
                                ))}
                                {items?.length > 4 && <span className="text-[#0071E3] font-bold">+{items.length - 4} khác</span>}
                            </div>
                            {o.note && <p className="text-[11px] text-[#86868B] mt-2 italic">📝 {o.note}</p>}
                        </div>
                    );
                })}

                {data.length === 0 && (
                    <div className="bg-white py-12 rounded-2xl border border-[#F5F5F7] text-center text-[#86868B]">
                        <p className="text-4xl mb-2">📦</p>
                        <p className="font-medium">Không có đơn hàng</p>
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {paginationCount > 1 && (
                <div className="mt-6 flex items-center justify-between sm:justify-center">
                    {/* Desktop Pagination */}
                    <div className="hidden gap-1 sm:inline-flex bg-white p-1.5 rounded-xl shadow-sm border border-[#F5F5F7]">
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
                    <div className="flex sm:hidden items-center justify-between w-full bg-white p-3 rounded-xl shadow-sm border border-[#F5F5F7]">
                        <p className="text-[13px] font-medium text-[#1D1D1F]">
                            Trang {actualPage} / {paginationCount}
                        </p>
                        <div className="inline-flex items-center rounded-lg shadow-sm border border-[#F5F5F7]">
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
            )}
        </div>
    );
}
