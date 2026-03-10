import React, { useState, useMemo } from 'react';
import { BarChart, Card } from '@tremor/react';
import {
    TrendingUp, TrendingDown, AlertCircle, ArrowRight
} from 'lucide-react';

function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
}

/* ── Formatters ── */
const fmtVND = (v) => {
    if (v == null || v === 0) return '0đ';
    if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(1)} tỷ`;
    if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}m đ`;
    if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(0)}k đ`;
    return new Intl.NumberFormat('vi-VN').format(v) + 'đ';
};
const fmtCompact = (v) => {
    if (!v && v !== 0) return '0';
    if (v >= 1e9) return `${(v / 1e9).toFixed(1)} tỷ`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}m`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(0)}k`;
    return v.toLocaleString('vi-VN');
};
const pct = (cur, prev) => {
    if (!prev) return null;
    return ((cur - prev) / prev * 100).toFixed(1);
};

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/* ── KPI Tab Cards ── */
const KPITabs = ({ items, selected, onSelect }) => (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => {
            const isActive = selected === item.id;
            const change = item.change;
            const isUp = change !== null && parseFloat(change) >= 0;
            return (
                <button
                    key={item.id}
                    onClick={() => onSelect(item.id)}
                    className={classNames(
                        'relative text-left rounded-tremor-default border px-5 py-4 transition-all duration-200 bg-tremor-background dark:bg-dark-tremor-background',
                        isActive
                            ? 'border-tremor-brand-subtle ring-2 ring-tremor-brand-muted dark:border-dark-tremor-brand-subtle dark:ring-dark-tremor-brand-muted'
                            : 'border-tremor-border dark:border-dark-tremor-border hover:border-tremor-brand-subtle'
                    )}
                >
                    <p className="text-tremor-label text-tremor-content dark:text-dark-tremor-content">
                        {item.label}
                    </p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <p className="text-tremor-title font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong">
                            {item.value}
                        </p>
                        {change !== null && (
                            <span className={classNames(
                                'inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md',
                                isUp ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                            )}>
                                {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                {Math.abs(change)}%
                            </span>
                        )}
                    </div>
                    <p className="text-tremor-label text-tremor-content dark:text-dark-tremor-content mt-1 truncate">
                        {item.sub}
                    </p>
                    {isActive && (
                        <span className={classNames(
                            'pointer-events-none absolute -inset-px rounded-tremor-default border-2',
                            'border-tremor-brand dark:border-dark-tremor-brand'
                        )} />
                    )}
                </button>
            );
        })}
    </div>
);

/* ── Low Stock Alert ── */
const LowStockAlert = ({ products }) => {
    if (!products || products.length === 0) return null;
    return (
        <div className="rounded-tremor-default border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
                <p className="text-sm font-semibold text-amber-800">{products.length} sản phẩm sắp hết hàng</p>
                <div className="flex gap-1.5 flex-wrap mt-1.5">
                    {products.slice(0, 6).map(p => (
                        <span key={p.id} className="text-xs bg-white border border-amber-200 text-amber-700 px-2 py-0.5 rounded-md font-medium">
                            {p.name} <span className="font-bold">({p.stock})</span>
                        </span>
                    ))}
                    {products.length > 6 && <span className="text-xs text-amber-600 self-center">+{products.length - 6}</span>}
                </div>
            </div>
        </div>
    );
};

/* ── Main Dashboard ── */
const DashboardView = ({ stats, products, analyticsData, setActiveTab }) => {
    const [selectedKPI, setSelectedKPI] = useState('today');

    const data = analyticsData || {};
    const kpis = data.kpis || {};
    const lowStockProducts = useMemo(() => (products || []).filter(p => p.stock <= 5), [products]);

    // Compute totals for summary
    const currentMonthTotal = useMemo(() => {
        return (data.dailyTrend?.current || []).reduce((s, d) => s + (d.total || 0), 0);
    }, [data.dailyTrend]);
    const prevMonthTotal = useMemo(() => {
        return (data.dailyTrend?.previous || []).reduce((s, d) => s + (d.total || 0), 0);
    }, [data.dailyTrend]);

    // KPI tab items
    const kpiItems = [
        {
            id: 'today',
            label: 'Hôm nay',
            value: fmtCompact(kpis.todayRevenue) + 'đ',
            sub: `${kpis.todayOrders || 0} đơn hàng`,
            change: pct(kpis.todayRevenue, kpis.yesterdayRevenue),
        },
        {
            id: 'month',
            label: 'Tháng này',
            value: fmtCompact(kpis.monthRevenue) + 'đ',
            sub: 'so với tháng trước',
            change: pct(kpis.monthRevenue, kpis.lastMonthRevenue),
        },
        {
            id: 'avg',
            label: 'Trung bình / đơn',
            value: kpis.todayOrders > 0 ? fmtCompact(Math.round(kpis.monthRevenue / Math.max(kpis.todayOrders, 1))) + 'đ' : '0đ',
            sub: 'giá trị TB đơn hàng',
            change: null,
        },
        {
            id: 'stock',
            label: 'Tổng sản phẩm',
            value: (products?.length || 0).toLocaleString(),
            sub: `Tồn kho: ${(products || []).reduce((s, p) => s + (p.stock || 0), 0).toLocaleString()}`,
            change: null,
        },
    ];

    // ── Daily Revenue Chart data (current month) ──
    const dailyChartData = useMemo(() => {
        const current = data.dailyTrend?.current || [];
        const previous = data.dailyTrend?.previous || [];
        const prevMap = {};
        previous.forEach(d => { prevMap[d.day] = d.total; });

        const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
        const result = [];
        for (let day = 1; day <= daysInMonth; day++) {
            const curEntry = current.find(d => d.day === day);
            result.push({
                'Ngày': `${day}`,
                'Tháng này': curEntry?.total || 0,
                'Tháng trước': prevMap[day] || 0,
            });
        }
        return result;
    }, [data.dailyTrend]);

    // ── Hourly Pattern Chart data ──
    const hourlyChartData = useMemo(() => {
        const hourData = data.medianTimeOfDay || [];
        const hourMap = {};
        hourData.forEach(h => { hourMap[h.hour] = h; });
        const result = [];
        for (let h = 6; h <= 22; h++) {
            const entry = hourMap[h];
            result.push({
                'Giờ': `${h}h`,
                'Doanh thu (Median)': entry?.median || 0,
                'Số đơn (Median)': entry?.medianCount || 0,
            });
        }
        return result;
    }, [data.medianTimeOfDay]);

    // Hourly totals for summary
    const hourlyTotal = useMemo(() => {
        const vals = hourlyChartData.map(d => d['Doanh thu (Median)']).filter(v => v > 0);
        if (vals.length === 0) return 0;
        return Math.round(vals.reduce((s, v) => s + v, 0));
    }, [hourlyChartData]);
    const hourlyOrders = useMemo(() => {
        const vals = hourlyChartData.map(d => d['Số đơn (Median)']).filter(v => v > 0);
        if (vals.length === 0) return 0;
        return Math.round(vals.reduce((s, v) => s + v, 0));
    }, [hourlyChartData]);

    // ── Median by Day of Week ──
    const medianDayData = useMemo(() => {
        const medianData = data.medianDayOfWeek || [];
        return DAY_LABELS.map((label, i) => {
            const entry = medianData.find(d => d.day === i);
            return {
                'Thứ': label,
                'Doanh thu trung vị': entry?.median || 0,
                'Số ngày mẫu': entry?.count || 0,
            };
        });
    }, [data.medianDayOfWeek]);

    // Median total for summary
    const medianAvg = useMemo(() => {
        const vals = medianDayData.map(d => d['Doanh thu trung vị']).filter(v => v > 0);
        if (vals.length === 0) return 0;
        return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
    }, [medianDayData]);
    const medianSampleDays = useMemo(() => {
        return medianDayData.reduce((s, d) => s + (d['Số ngày mẫu'] || 0), 0);
    }, [medianDayData]);

    // ── Top Products ──
    const topProductsData = useMemo(() => {
        return (data.topProducts || []).map(p => ({
            'Sản phẩm': p.name?.length > 20 ? p.name.slice(0, 20) + '…' : p.name,
            'Doanh thu': p.revenue || 0,
            'SL bán': p.sold || 0,
        }));
    }, [data.topProducts]);

    // ── Category Breakdown ──
    const categoryData = useMemo(() => {
        return (data.categories || []).slice(0, 8).map(c => ({
            'Danh mục': c.category || 'Khác',
            'Doanh thu': c.revenue || 0,
        }));
    }, [data.categories]);

    // ── Payment Methods ──
    const paymentData = useMemo(() => {
        return (data.paymentMethods || []).map(p => ({
            'Phương thức': p.payment_method === 'transfer' ? 'Chuyển khoản' : p.payment_method === 'cash' ? 'Tiền mặt' : (p.payment_method || 'Khác'),
            'Doanh thu': p.total || 0,
            'Số đơn': p.count || 0,
        }));
    }, [data.paymentMethods]);

    const valueFormatter = (v) => fmtVND(v);

    // Chart config by KPI selection
    const getSelectedChartConfig = () => {
        switch (selectedKPI) {
            case 'today': return {
                data: dailyChartData, index: 'Ngày',
                categories: ['Tháng này', 'Tháng trước'],
                colors: ['blue', 'cyan'],
                stack: true,
                title: 'Doanh thu theo ngày',
                subtitle: 'So sánh doanh thu hàng ngày giữa tháng này và tháng trước. Dữ liệu được cộng dồn (stacked) để thấy tổng quan.',
                summary: [
                    { name: 'Tháng này', total: currentMonthTotal, color: 'bg-blue-500' },
                    { name: 'Tháng trước', total: prevMonthTotal, color: 'bg-cyan-500' },
                ],
            };
            case 'month': return {
                data: topProductsData, index: 'Sản phẩm',
                categories: ['Doanh thu'],
                colors: ['blue'],
                stack: false,
                title: 'Top sản phẩm bán chạy',
                subtitle: 'Xếp hạng 5 sản phẩm có doanh thu cao nhất trong tháng.',
                summary: [
                    { name: 'Sản phẩm', total: topProductsData.length, color: 'bg-blue-500', isCurrency: false },
                ],
            };
            case 'avg': return {
                data: paymentData, index: 'Phương thức',
                categories: ['Doanh thu'],
                colors: ['blue'],
                stack: false,
                title: 'Phương thức thanh toán',
                subtitle: 'Phân bổ doanh thu theo từng hình thức thanh toán.',
                summary: paymentData.map((p, i) => ({
                    name: p['Phương thức'], total: p['Doanh thu'],
                    color: i === 0 ? 'bg-blue-500' : 'bg-blue-300',
                })),
            };
            case 'stock': return {
                data: categoryData, index: 'Danh mục',
                categories: ['Doanh thu'],
                colors: ['blue'],
                stack: false,
                title: 'Danh mục sản phẩm',
                subtitle: 'Doanh thu theo từng danh mục sản phẩm.',
                summary: categoryData.slice(0, 3).map((c, i) => ({
                    name: c['Danh mục'], total: c['Doanh thu'],
                    color: i === 0 ? 'bg-blue-500' : i === 1 ? 'bg-blue-400' : 'bg-blue-300',
                })),
            };
            default: return null;
        }
    };

    const chartConfig = getSelectedChartConfig();

    return (
        <div className="space-y-6 animate-in">
            {/* Low Stock Warning */}
            <LowStockAlert products={lowStockProducts} />

            {/* KPI Tabs */}
            <KPITabs items={kpiItems} selected={selectedKPI} onSelect={setSelectedKPI} />

            {/* ═══ Main Chart Card (Tremor Card style) ═══ */}
            {chartConfig && (
                <Card className="p-0">
                    {/* Header */}
                    <div className="px-6 py-5">
                        <h3 className="font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong">
                            {chartConfig.title}
                        </h3>
                    </div>
                    {/* Chart area */}
                    <div className="border-t border-tremor-border p-6 dark:border-dark-tremor-border">
                        {/* Summary legend */}
                        <ul role="list" className="flex flex-wrap gap-x-16 gap-y-6">
                            {chartConfig.summary.map((item) => (
                                <li key={item.name}>
                                    <div className="flex items-center space-x-2">
                                        <span
                                            className={classNames(item.color, 'size-3 shrink-0 rounded-sm')}
                                            aria-hidden={true}
                                        />
                                        <p className="font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong">
                                            {item.isCurrency === false
                                                ? item.total.toLocaleString('vi-VN')
                                                : fmtVND(item.total)
                                            }
                                        </p>
                                    </div>
                                    <p className="whitespace-nowrap text-tremor-default text-tremor-content dark:text-dark-tremor-content">
                                        {item.name}
                                    </p>
                                </li>
                            ))}
                        </ul>
                        {/* Desktop chart */}
                        {chartConfig.data.length > 0 ? (
                            <>
                                <BarChart
                                    data={chartConfig.data}
                                    index={chartConfig.index}
                                    categories={chartConfig.categories}
                                    colors={chartConfig.colors}
                                    stack={chartConfig.stack}
                                    showLegend={false}
                                    showAnimation={true}
                                    animationDuration={300}
                                    valueFormatter={valueFormatter}
                                    yAxisWidth={55}
                                    className="mt-10 hidden h-72 md:block"
                                />
                                <BarChart
                                    data={chartConfig.data}
                                    index={chartConfig.index}
                                    categories={chartConfig.categories}
                                    colors={chartConfig.colors}
                                    stack={chartConfig.stack}
                                    showLegend={false}
                                    showAnimation={true}
                                    animationDuration={300}
                                    valueFormatter={valueFormatter}
                                    showYAxis={false}
                                    className="mt-6 h-72 md:hidden"
                                />
                            </>
                        ) : (
                            <div className="mt-10 h-72 flex items-center justify-center text-tremor-content">
                                Chưa có dữ liệu
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {/* ═══ Hourly & Day‑of‑Week Charts ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Hourly Pattern */}
                <Card className="p-0">
                    <div className="px-6 py-5">
                        <h3 className="font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong">
                            Bán hàng theo giờ (Trung vị)
                        </h3>
                    </div>
                    <div className="border-t border-tremor-border p-6 dark:border-dark-tremor-border">
                        <ul role="list" className="flex flex-wrap gap-x-16 gap-y-6">
                            <li>
                                <div className="flex items-center space-x-2">
                                    <span className="bg-blue-500 size-3 shrink-0 rounded-sm" aria-hidden={true} />
                                    <p className="font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong">
                                        {fmtVND(hourlyTotal)}
                                    </p>
                                </div>
                                <p className="whitespace-nowrap text-tremor-default text-tremor-content dark:text-dark-tremor-content">
                                    Tổng doanh thu
                                </p>
                            </li>
                            <li>
                                <div className="flex items-center space-x-2">
                                    <span className="bg-cyan-500 size-3 shrink-0 rounded-sm" aria-hidden={true} />
                                    <p className="font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong">
                                        {hourlyOrders.toLocaleString('vi-VN')}
                                    </p>
                                </div>
                                <p className="whitespace-nowrap text-tremor-default text-tremor-content dark:text-dark-tremor-content">
                                    Tổng đơn hàng
                                </p>
                            </li>
                        </ul>
                        {hourlyChartData.some(d => d['Doanh thu (Median)'] > 0) ? (
                            <BarChart
                                data={hourlyChartData}
                                index="Giờ"
                                categories={['Doanh thu (Median)']}
                                colors={['blue']}
                                showLegend={false}
                                showAnimation={true}
                                animationDuration={300}
                                valueFormatter={valueFormatter}
                                yAxisWidth={55}
                                className="mt-10 h-56"
                            />
                        ) : (
                            <div className="mt-10 h-56 flex items-center justify-center text-tremor-content">
                                Chưa có dữ liệu
                            </div>
                        )}
                    </div>
                </Card>

                {/* Median by Day of Week */}
                <Card className="p-0">
                    <div className="px-6 py-5">
                        <h3 className="font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong">
                            Doanh thu theo ngày (Trung vị)
                        </h3>
                    </div>
                    <div className="border-t border-tremor-border p-6 dark:border-dark-tremor-border">
                        <ul role="list" className="flex flex-wrap gap-x-16 gap-y-6">
                            <li>
                                <div className="flex items-center space-x-2">
                                    <span className="bg-blue-500 size-3 shrink-0 rounded-sm" aria-hidden={true} />
                                    <p className="font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong">
                                        {fmtVND(medianAvg)}
                                    </p>
                                </div>
                                <p className="whitespace-nowrap text-tremor-default text-tremor-content dark:text-dark-tremor-content">
                                    Doanh thu TB / ngày
                                </p>
                            </li>
                            <li>
                                <div className="flex items-center space-x-2">
                                    <span className="bg-cyan-500 size-3 shrink-0 rounded-sm" aria-hidden={true} />
                                    <p className="font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong">
                                        {medianSampleDays}
                                    </p>
                                </div>
                                <p className="whitespace-nowrap text-tremor-default text-tremor-content dark:text-dark-tremor-content">
                                    Tổng số ngày
                                </p>
                            </li>
                        </ul>
                        {medianDayData.some(d => d['Doanh thu trung vị'] > 0) ? (
                            <BarChart
                                data={medianDayData}
                                index="Thứ"
                                categories={['Doanh thu trung vị']}
                                colors={['blue']}
                                showLegend={false}
                                showAnimation={true}
                                animationDuration={300}
                                valueFormatter={valueFormatter}
                                yAxisWidth={55}
                                className="mt-10 h-56"
                            />
                        ) : (
                            <div className="mt-10 h-56 flex items-center justify-center text-tremor-content">
                                Chưa có dữ liệu
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { id: 'orders', label: 'Đơn hàng', desc: 'Xem giao dịch' },
                    { id: 'import', label: 'Nhập hàng', desc: 'Nhập kho mới' },
                    { id: 'suppliers', label: 'Nhà cung cấp', desc: 'Quản lý NCC' },
                    { id: 'products', label: 'Sản phẩm', desc: 'Quản lý SP' },
                ].map(action => (
                    <button
                        key={action.id}
                        onClick={() => setActiveTab(action.id)}
                        className="rounded-tremor-default border border-tremor-border bg-tremor-background px-4 py-3.5 text-left hover:border-tremor-brand-subtle hover:shadow-sm transition-all group dark:border-dark-tremor-border dark:bg-dark-tremor-background"
                    >
                        <p className="font-semibold text-sm text-tremor-content-strong group-hover:text-tremor-brand transition-colors flex items-center gap-1 dark:text-dark-tremor-content-strong">
                            {action.label}
                            <ArrowRight size={14} className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-tremor-brand" />
                        </p>
                        <p className="text-tremor-label text-tremor-content mt-0.5 dark:text-dark-tremor-content">{action.desc}</p>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default DashboardView;
