import React, { useState } from 'react';
import {
    TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package,
    Clock, Calendar, BarChart3, Users, AlertCircle, Sparkles,
    ChevronDown, ChevronRight, Download, Activity
} from 'lucide-react';

// ─── Format helpers ───────────────────────────────────────────────────────────
const fmt = (v) => {
    if (!v && v !== 0) return '0đ';
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}mđ`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k đ`;
    return `${v.toLocaleString()}đ`;
};

const pct = (curr, prev) => {
    if (!prev || prev === 0) return null;
    return ((curr - prev) / prev * 100).toFixed(1);
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KPICard = ({ label, value, sub, change, icon: Icon, color }) => {
    const colors = {
        blue:   'bg-blue-50 text-blue-600',
        green:  'bg-green-50 text-green-600',
        orange: 'bg-orange-50 text-orange-600',
        purple: 'bg-purple-50 text-purple-600',
    };
    const isUp = change !== null && parseFloat(change) >= 0;
    return (
        <div className="bg-white p-4 rounded-2xl border border-[#F5F5F7] shadow-sm">
            <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 ${colors[color]} rounded-xl flex items-center justify-center`}>
                    <Icon size={18} />
                </div>
                {change !== null && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-0.5 ${isUp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {Math.abs(change)}%
                    </span>
                )}
            </div>
            <p className="text-[10px] text-[#86868B] font-bold uppercase tracking-wide mb-0.5">{label}</p>
            <p className="text-[22px] font-black text-[#1D1D1F] leading-tight">{value}</p>
            {sub && <p className="text-[11px] text-[#86868B] mt-0.5">{sub}</p>}
        </div>
    );
};

// ─── Hourly Bar Chart (Median) ────────────────────────────────────────────────
const HourlyBarChart = ({ hourlyPattern }) => {
    const data = hourlyPattern?.data || [];
    const peakHour = hourlyPattern?.peakHour;
    const activeData = data.filter(d => d.medianRevenue > 0);
    const maxVal = Math.max(...activeData.map(d => d.medianRevenue), 1);

    // Y-axis labels
    const yLabels = [maxVal, maxVal * 0.75, maxVal * 0.5, maxVal * 0.25, 0];

    return (
        <div className="bg-white p-5 rounded-2xl border border-[#F5F5F7] shadow-sm">
            <div className="flex items-center gap-2 mb-1">
                <Clock size={16} className="text-blue-500" />
                <h3 className="font-bold text-[14px] text-[#1D1D1F]">Hoạt động theo giờ</h3>
            </div>
            <p className="text-[11px] text-[#86868B] mb-4">Phân bố doanh thu trung vị trong ngày</p>

            {activeData.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-[#86868B] text-[13px]">Chưa có dữ liệu</div>
            ) : (
                <>
                    <div className="flex gap-1.5 items-end" style={{ height: 160 }}>
                        {/* Y-axis */}
                        <div className="flex flex-col justify-between h-full pr-1 text-right shrink-0" style={{ width: 44 }}>
                            {yLabels.map((v, i) => (
                                <span key={i} className="text-[9px] text-[#86868B] leading-none">{fmt(v)}</span>
                            ))}
                        </div>

                        {/* Bars */}
                        <div className="flex items-end gap-0.5 flex-1 h-full relative">
                            {/* Grid lines */}
                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                                {[0, 1, 2, 3, 4].map(i => (
                                    <div key={i} className="border-b border-[#F5F5F7] w-full" />
                                ))}
                            </div>

                            {data.map((d) => {
                                const heightPct = d.medianRevenue > 0 ? (d.medianRevenue / maxVal) * 100 : 0;
                                const isPeak = d.hour === peakHour;
                                return (
                                    <div
                                        key={d.hour}
                                        className="flex-1 flex flex-col justify-end items-center group relative"
                                        style={{ height: '100%' }}
                                    >
                                        {d.medianRevenue > 0 && (
                                            <div
                                                className={`w-full rounded-t-sm transition-all duration-300 ${isPeak ? 'bg-blue-500' : 'bg-blue-300'} hover:bg-blue-500 cursor-default`}
                                                style={{ height: `${heightPct}%` }}
                                            />
                                        )}
                                        {/* Tooltip */}
                                        {d.medianRevenue > 0 && (
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-[#1D1D1F] text-white text-[9px] rounded-lg px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                                                {d.label}: {fmt(d.medianRevenue)}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* X-axis labels */}
                    <div className="flex ml-[50px] mt-1">
                        {data.map((d, i) => (
                            <div key={d.hour} className="flex-1 text-center">
                                {(d.hour % 7 === 0 || d.hour === 23) ? (
                                    <span className="text-[9px] text-[#86868B]">{d.label}</span>
                                ) : null}
                            </div>
                        ))}
                    </div>

                    {/* Peak insight */}
                    {peakHour !== null && (
                        <div className="mt-3 bg-blue-50 py-2 px-3 rounded-xl text-[12px] text-blue-700 font-medium flex items-center gap-2">
                            <Clock size={13} />
                            Giờ vàng kinh doanh khung: <strong>{peakHour}h:00</strong>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

// ─── Day-of-Week Bar Chart (Median) ──────────────────────────────────────────
const DayOfWeekBarChart = ({ dayOfWeek }) => {
    const data = dayOfWeek?.data || [];
    const bestDay = dayOfWeek?.bestDay || '';
    const maxVal = Math.max(...data.map(d => d.medianRevenue), 1);
    const yLabels = [maxVal, maxVal * 0.75, maxVal * 0.5, maxVal * 0.25, 0];

    return (
        <div className="bg-white p-5 rounded-2xl border border-[#F5F5F7] shadow-sm">
            <div className="flex items-center gap-2 mb-1">
                <Calendar size={16} className="text-green-500" />
                <h3 className="font-bold text-[14px] text-[#1D1D1F]">Phân tích theo thứ (Median)</h3>
            </div>
            <p className="text-[11px] text-[#86868B] mb-4">Doanh thu trung vị của từng thứ hàng tuần</p>

            {data.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-[#86868B] text-[13px]">Chưa có dữ liệu</div>
            ) : (
                <>
                    <div className="flex gap-2 items-end" style={{ height: 160 }}>
                        {/* Y-axis */}
                        <div className="flex flex-col justify-between h-full pr-1 text-right shrink-0" style={{ width: 44 }}>
                            {yLabels.map((v, i) => (
                                <span key={i} className="text-[9px] text-[#86868B] leading-none">{fmt(v)}</span>
                            ))}
                        </div>

                        {/* Bars */}
                        <div className="flex items-end gap-1.5 flex-1 h-full relative">
                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                                {[0, 1, 2, 3, 4].map(i => (
                                    <div key={i} className="border-b border-[#F5F5F7] w-full" />
                                ))}
                            </div>

                            {data.map((d) => {
                                const heightPct = d.medianRevenue > 0 ? (d.medianRevenue / maxVal) * 100 : 2;
                                const isBest = d.label === bestDay;
                                return (
                                    <div
                                        key={d.day}
                                        className="flex-1 flex flex-col justify-end items-center group relative"
                                        style={{ height: '100%' }}
                                    >
                                        <div
                                            className={`w-full rounded-t-md transition-all duration-300 cursor-default ${isBest ? 'bg-emerald-500' : 'bg-emerald-400'} hover:brightness-110`}
                                            style={{ height: `${heightPct}%` }}
                                        />
                                        {/* Tooltip */}
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-[#1D1D1F] text-white text-[9px] rounded-lg px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                                            {d.label}: {fmt(d.medianRevenue)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* X-axis labels */}
                    <div className="flex ml-[50px] mt-1">
                        {data.map((d) => (
                            <div key={d.day} className="flex-1 text-center">
                                <span className="text-[9px] text-[#86868B]">{d.label.replace('Thứ ', 'T').replace('Chủ nhật', 'CN')}</span>
                            </div>
                        ))}
                    </div>

                    {/* Best day insight */}
                    {bestDay && (
                        <div className="mt-3 bg-green-50 py-2 px-3 rounded-xl text-[12px] text-green-700 font-medium flex items-center gap-2">
                            <TrendingUp size={13} />
                            Ngày bán chạy ổn định nhất: <strong>{bestDay}</strong>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

// ─── Revenue Line Chart ───────────────────────────────────────────────────────
const RevenueLineChart = ({ data = [], title }) => {
    if (data.length === 0) {
        return (
            <div className="bg-white p-5 rounded-2xl border border-[#F5F5F7] shadow-sm">
                <h3 className="font-bold text-[14px] text-[#1D1D1F] mb-2">{title}</h3>
                <div className="flex items-center justify-center h-40 text-[#86868B]">Chưa có dữ liệu</div>
            </div>
        );
    }

    const maxVal = Math.max(...data.map(d => d.value), 1);
    const H = 140;
    const W = 100; // percent

    const pts = data.map((d, i) => {
        const x = (i / Math.max(data.length - 1, 1)) * 100;
        const y = H - (d.value / maxVal) * H;
        return [x, y];
    });

    const polyline = pts.map(([x, y]) => `${x}%,${y}`).join(' ');
    const area = `M 0,${H} ${pts.map(([x, y]) => `L ${x}%,${y}`).join(' ')} L 100%,${H} Z`;

    return (
        <div className="bg-white p-5 rounded-2xl border border-[#F5F5F7] shadow-sm">
            <h3 className="font-bold text-[14px] text-[#1D1D1F] mb-1">{title}</h3>
            <p className="text-[11px] text-[#86868B] mb-4">30 ngày gần nhất</p>

            <div className="flex gap-2">
                {/* Y labels */}
                <div className="flex flex-col justify-between text-[9px] text-[#86868B] pr-1 shrink-0">
                    <span>{fmt(maxVal)}</span>
                    <span>{fmt(maxVal / 2)}</span>
                    <span>0đ</span>
                </div>

                <div className="flex-1 relative" style={{ height: H }}>
                    {/* Grid */}
                    <div className="absolute inset-0 flex flex-col justify-between">
                        {[0, 1, 2, 3, 4].map(i => (
                            <div key={i} className="border-b border-[#F5F5F7]" />
                        ))}
                    </div>

                    <svg className="absolute inset-0 w-full" height={H} preserveAspectRatio="none">
                        <defs>
                            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#0071E3" stopOpacity="0.25" />
                                <stop offset="100%" stopColor="#0071E3" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <path d={area} fill="url(#revGrad)" />
                        <polyline points={polyline} fill="none" stroke="#0071E3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        {pts.map(([x, y], i) => (
                            data.length <= 15 && (
                                <circle key={i} cx={`${x}%`} cy={y} r="3.5" fill="white" stroke="#0071E3" strokeWidth="2" />
                            )
                        ))}
                    </svg>
                </div>
            </div>

            {/* X labels */}
            <div className="flex mt-1 ml-8 text-[9px] text-[#86868B]">
                {data.map((d, i) => (
                    <div key={i} className="flex-1 text-center">
                        {(i === 0 || i === Math.floor(data.length / 2) || i === data.length - 1) ? d.label : null}
                    </div>
                ))}
            </div>
        </div>
    );
};

// ─── Horizontal Bar Chart ─────────────────────────────────────────────────────
const HBarChart = ({ data = [], title, valueKey = 'value', labelKey = 'label', color = 'blue', unit = 'đ' }) => {
    const maxVal = Math.max(...data.map(d => d[valueKey]), 1);
    const barColors = {
        blue: 'from-[#0071E3] to-[#00A8E8]',
        orange: 'from-[#FF9500] to-[#FF9F0A]',
        purple: 'from-[#AF52DE] to-[#BF5AF2]',
        green: 'from-[#34C759] to-[#30D158]',
    };

    return (
        <div className="bg-white p-5 rounded-2xl border border-[#F5F5F7] shadow-sm">
            <h3 className="font-bold text-[14px] text-[#1D1D1F] mb-4">{title}</h3>
            {data.length === 0 ? (
                <div className="text-center text-[#86868B] text-[13px] py-8">Chưa có dữ liệu</div>
            ) : (
                <div className="space-y-3">
                    {data.map((item, idx) => (
                        <div key={idx}>
                            <div className="flex justify-between text-[12px] mb-1">
                                <span className="font-medium text-[#1D1D1F] truncate max-w-[65%]">{item[labelKey]}</span>
                                <span className="font-bold text-[#0071E3]">
                                    {unit === 'đ' ? fmt(item[valueKey]) : item[valueKey].toLocaleString()}
                                </span>
                            </div>
                            <div className="h-2 bg-[#F5F5F7] rounded-full overflow-hidden">
                                <div
                                    className={`h-full bg-gradient-to-r ${barColors[color]} rounded-full transition-all duration-500`}
                                    style={{ width: `${(item[valueKey] / maxVal) * 100}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── Monthly Trend Mini Chart ─────────────────────────────────────────────────
const MonthlyTrendChart = ({ data = [] }) => {
    const maxVal = Math.max(...data.map(d => d.value), 1);
    const currentMonth = new Date().getMonth(); // 0-indexed

    return (
        <div className="bg-white p-5 rounded-2xl border border-[#F5F5F7] shadow-sm">
            <div className="flex items-center gap-2 mb-1">
                <BarChart3 size={16} className="text-purple-500" />
                <h3 className="font-bold text-[14px] text-[#1D1D1F]">Doanh thu theo tháng</h3>
            </div>
            <p className="text-[11px] text-[#86868B] mb-4">Năm {new Date().getFullYear()}</p>

            <div className="flex items-end gap-1" style={{ height: 80 }}>
                {data.map((d, i) => {
                    const h = d.value > 0 ? Math.max((d.value / maxVal) * 100, 3) : 3;
                    const isCurr = i === currentMonth;
                    return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative" style={{ height: '100%', justifyContent: 'flex-end' }}>
                            <div
                                className={`w-full rounded-t transition-all duration-300 ${isCurr ? 'bg-purple-500' : d.value > 0 ? 'bg-purple-200' : 'bg-[#F5F5F7]'}`}
                                style={{ height: `${h}%` }}
                            />
                            {d.value > 0 && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-[#1D1D1F] text-white text-[9px] rounded-lg px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                                    {d.label}: {fmt(d.value)}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="flex mt-1">
                {data.map((d, i) => (
                    <div key={i} className="flex-1 text-center">
                        <span className={`text-[8px] ${i === currentMonth ? 'text-purple-600 font-bold' : 'text-[#86868B]'}`}>{d.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ─── Peak Hours Card ──────────────────────────────────────────────────────────
const PeakHoursCard = ({ peakHours = [] }) => {
    const medals = ['🥇', '🥈', '🥉'];
    const medalColors = ['from-yellow-400 to-yellow-600', 'from-gray-300 to-gray-500', 'from-orange-500 to-orange-700'];

    if (peakHours.length === 0) return null;

    return (
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-5 rounded-2xl shadow-lg text-white">
            <h3 className="font-bold text-[15px] mb-4 flex items-center gap-2">
                <Clock size={16} /> Top giờ vàng (Median)
            </h3>
            <div className="space-y-2.5">
                {peakHours.map((h, i) => (
                    <div key={i} className="bg-white/20 backdrop-blur-sm p-3 rounded-xl flex items-center gap-3">
                        <div className={`w-9 h-9 bg-gradient-to-br ${medalColors[i]} rounded-full flex items-center justify-center text-lg shrink-0`}>
                            {medals[i]}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-[13px]">{h.label}</p>
                            <p className="text-[10px] opacity-80">{h.orderCount} đơn · {fmt(h.revenue)}</p>
                        </div>
                        <div className="text-right shrink-0">
                            <p className="text-[12px] font-bold">{fmt(h.avgOrderValue)}</p>
                            <p className="text-[10px] opacity-80">TB / đơn</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ─── Low Stock Alert ──────────────────────────────────────────────────────────
const LowStockAlert = ({ products = [], onClick }) => {
    if (products.length === 0) return null;
    return (
        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={16} className="text-red-500" />
                <span className="font-bold text-[13px] text-red-700">{products.length} sản phẩm sắp hết hàng</span>
            </div>
            <div className="flex gap-2 flex-wrap">
                {products.slice(0, 5).map(p => (
                    <button
                        key={p.id}
                        onClick={() => onClick?.(p)}
                        className="bg-red-100 text-red-700 text-[11px] font-medium px-2 py-1 rounded-lg hover:bg-red-200 transition-colors"
                    >
                        {p.name} ({p.stock})
                    </button>
                ))}
                {products.length > 5 && (
                    <span className="text-[11px] text-red-500 font-medium self-center">+{products.length - 5} khác</span>
                )}
            </div>
        </div>
    );
};

// ─── Spending Segments ────────────────────────────────────────────────────────
const SpendingSegmentsCard = ({ customerSpending }) => {
    const segments = customerSpending?.segments || [];
    const summary = customerSpending?.summary || {};
    const total = segments.reduce((s, d) => s + d.order_count, 0);
    const segColors = ['#FF3B30', '#FF9500', '#FFD60A', '#34C759', '#0071E3'];

    return (
        <div className="bg-white p-5 rounded-2xl border border-[#F5F5F7] shadow-sm">
            <h3 className="font-bold text-[14px] text-[#1D1D1F] mb-4">Phân khúc chi tiêu</h3>

            <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-blue-50 p-3 rounded-xl">
                    <p className="text-[10px] text-blue-600 font-bold uppercase">Chi tiêu TB</p>
                    <p className="text-[18px] font-black text-blue-700">{fmt(summary.avgSpending)}</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-xl">
                    <p className="text-[10px] text-purple-600 font-bold uppercase">Đơn VIP</p>
                    <p className="text-[18px] font-black text-purple-700">{summary.vipCustomers || 0}</p>
                </div>
            </div>

            {segments.length === 0 ? (
                <div className="text-center text-[#86868B] text-[12px] py-4">Chưa có dữ liệu</div>
            ) : (
                <div className="space-y-3">
                    {segments.map((seg, idx) => {
                        const pctVal = total > 0 ? ((seg.order_count / total) * 100).toFixed(1) : 0;
                        return (
                            <div key={idx}>
                                <div className="flex justify-between text-[11px] mb-1">
                                    <span className="font-medium text-[#1D1D1F]">{seg.segment}</span>
                                    <span className="font-bold text-[#0071E3]">{seg.order_count} đơn ({pctVal}%)</span>
                                </div>
                                <div className="h-2 bg-[#F5F5F7] rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{ width: `${pctVal}%`, backgroundColor: segColors[idx] }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// ─── Overview Tab ─────────────────────────────────────────────────────────────
const OverviewTab = ({ stats, analyticsData, lowStockProducts, setEditingProduct, setActiveTab, setShowExportModal }) => {
    const cmp = analyticsData.comparison || {};
    const metrics = analyticsData.metrics || {};
    const todayChange = pct(cmp.todayRevenue, cmp.yesterdayRevenue);
    const monthChange = pct(cmp.monthRevenue, cmp.lastMonthRevenue);

    return (
        <div className="space-y-4">
            {/* Low stock warning */}
            <LowStockAlert products={lowStockProducts} onClick={setEditingProduct} />

            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-3">
                <KPICard
                    label="Hôm nay"
                    value={fmt(cmp.todayRevenue)}
                    sub={`${cmp.todayOrders || 0} đơn`}
                    change={todayChange}
                    icon={DollarSign}
                    color="blue"
                />
                <KPICard
                    label="Tháng này"
                    value={fmt(cmp.monthRevenue)}
                    sub={`${cmp.monthOrders || 0} đơn`}
                    change={monthChange}
                    icon={TrendingUp}
                    color="green"
                />
                <KPICard
                    label="TB / đơn"
                    value={fmt(metrics.avgOrderValue)}
                    sub={`Cao nhất: ${fmt(metrics.maxOrderValue)}`}
                    change={null}
                    icon={ShoppingCart}
                    color="orange"
                />
                <KPICard
                    label="Tổng sản phẩm"
                    value={(metrics.totalProducts || 0).toLocaleString()}
                    sub={`Tồn kho: ${(metrics.totalStock || 0).toLocaleString()}`}
                    change={null}
                    icon={Package}
                    color="purple"
                />
            </div>

            {/* Daily revenue line chart */}
            <RevenueLineChart data={analyticsData.dailyRevenue} title="Doanh thu hàng ngày" />

            {/* Monthly trend */}
            <MonthlyTrendChart data={analyticsData.monthlyTrend || []} />

            {/* Top products */}
            <HBarChart
                data={(analyticsData.topProducts || []).map(p => ({ label: p.name, value: p.revenue }))}
                title="Top sản phẩm tháng này"
                color="blue"
            />

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={() => setActiveTab('orders')}
                    className="bg-white border border-[#F5F5F7] p-4 rounded-2xl text-left hover:shadow-md transition-all active:scale-[0.97]"
                >
                    <ShoppingCart size={20} className="text-[#0071E3] mb-2" />
                    <p className="font-bold text-[13px] text-[#1D1D1F]">Đơn hàng</p>
                    <p className="text-[11px] text-[#86868B]">Quản lý giao dịch</p>
                </button>
                <button
                    onClick={() => setShowExportModal(true)}
                    className="bg-white border border-[#F5F5F7] p-4 rounded-2xl text-left hover:shadow-md transition-all active:scale-[0.97]"
                >
                    <Download size={20} className="text-[#34C759] mb-2" />
                    <p className="font-bold text-[13px] text-[#1D1D1F]">Xuất báo cáo</p>
                    <p className="text-[11px] text-[#86868B]">CSV / Excel</p>
                </button>
            </div>
        </div>
    );
};

// ─── Detailed Tab ─────────────────────────────────────────────────────────────
const DetailedTab = ({ analyticsData }) => (
    <div className="space-y-4">
        {/* Hourly + Day of week - 2 col on wider screens, stacked on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <HourlyBarChart hourlyPattern={analyticsData.hourlyPattern} />
            <DayOfWeekBarChart dayOfWeek={analyticsData.dayOfWeek} />
        </div>

        {/* Peak hours */}
        <PeakHoursCard peakHours={analyticsData.peakHours || []} />

        {/* Categories + Brands */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <HBarChart
                data={analyticsData.categories || []}
                title="Danh mục sản phẩm"
                color="orange"
            />
            <HBarChart
                data={analyticsData.brands || []}
                title="Thương hiệu"
                color="purple"
            />
        </div>

        {/* Customer spending */}
        <SpendingSegmentsCard customerSpending={analyticsData.customerSpending} />
    </div>
);

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────
export const EnhancedDashboardView = ({
    analyticsView,
    setAnalyticsView,
    stats,
    products,
    analyticsData,
    lowStockProducts,
    setEditingProduct,
    setActiveTab,
    setShowExportModal,
    showExportModal,
    ExportModal
}) => {
    const tabs = [
        { id: 'overview', label: 'Tổng quan', icon: Activity },
        { id: 'detailed', label: 'Chi tiết', icon: BarChart3 },
    ];

    return (
        <div className="space-y-4 pb-20">
            {/* Tab switcher */}
            <div className="flex gap-2 bg-[#F5F5F7] p-1 rounded-2xl">
                {tabs.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setAnalyticsView(t.id)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[13px] font-bold transition-all ${
                            analyticsView === t.id
                                ? 'bg-white text-[#1D1D1F] shadow-sm'
                                : 'text-[#86868B]'
                        }`}
                    >
                        <t.icon size={14} />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            {analyticsView === 'overview' ? (
                <OverviewTab
                    stats={stats}
                    analyticsData={analyticsData}
                    lowStockProducts={lowStockProducts}
                    setEditingProduct={setEditingProduct}
                    setActiveTab={setActiveTab}
                    setShowExportModal={setShowExportModal}
                />
            ) : (
                <DetailedTab analyticsData={analyticsData} />
            )}

            {/* Export modal */}
            {showExportModal && ExportModal && <ExportModal />}
        </div>
    );
};

export default EnhancedDashboardView;
