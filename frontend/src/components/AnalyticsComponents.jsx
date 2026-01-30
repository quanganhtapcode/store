import React, { useState, useEffect, useCallback } from 'react';
import {
    DonutChart,
    BarChart,
    AreaChart,
    Card,
    Divider,
    Switch,
    BadgeDelta,
    Flex,
    Text,
    Metric,
    Grid,
    BarList,
    ProgressBar,
    CategoryBar,
    LineChart,
    TabGroup,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
    List,
    ListItem
} from '@tremor/react';
import {
    CreditCard, Banknote, Calendar, Clock, TrendingUp,
    Sun, Sunrise, Sunset, Moon, BarChart3, PieChart,
    ChevronRight, ArrowUpRight, Filter, Package, AlertCircle
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
}

// Format number with m, k suffix
const formatWithSuffix = (num) => {
    if (Math.abs(num) >= 1000000) return (num / 1000000).toFixed(1).replace(',', '.') + 'm';
    if (Math.abs(num) >= 1000) return (num / 1000).toFixed(1).replace(',', '.') + 'k';
    return num.toString();
};

const formatWithK = (num) => {
    if (Math.abs(num) >= 1000) {
        return (num / 1000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + 'k';
    }
    return num.toString();
};

const valueFormatter = (number) => `${formatWithSuffix(number)}đ`;
const tooltipFormatter = (number) => `${formatWithK(number)}đ`;

// Custom Tooltip following Tremor's latest refined style
const CustomTooltip = ({ payload, active, label }) => {
    if (!active || !payload) return null;
    return (
        <div className="w-56 rounded-tremor-default border border-tremor-border bg-tremor-background text-tremor-default shadow-tremor-dropdown dark:border-dark-tremor-border dark:bg-dark-tremor-background dark:shadow-dark-tremor-dropdown">
            <p className="flex items-center justify-between border-b border-tremor-border px-3 py-2 text-tremor-content dark:border-dark-tremor-border dark:text-dark-tremor-content">
                <span className="text-tremor-content-strong dark:text-dark-tremor-content-strong font-bold">
                    {label}
                </span>
                <span className="text-[10px] opacity-70 tracking-widest">REALTIME</span>
            </p>
            <div className="space-y-2 px-3 py-2">
                {payload.map((category, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                        <span
                            className={classNames(
                                "h-1 w-3 rounded-full shrink-0",
                                category.color === 'blue' || category.color === 'indigo' ? 'bg-blue-500' :
                                    category.color === 'emerald' ? 'bg-emerald-500' : 'bg-slate-400'
                            )}
                            aria-hidden={true}
                        />
                        <p className="flex w-full items-center justify-between">
                            <span className="font-bold text-tremor-content-strong dark:text-dark-tremor-content-strong">
                                {tooltipFormatter(category.value)}
                            </span>
                            <span className="text-xs text-tremor-content dark:text-dark-tremor-content">
                                {category.dataKey}
                            </span>
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};

const calculateChange = (current, previous) => {
    if (!previous || previous === 0) return current > 0 ? '+100%' : '0%';
    const change = ((current - previous) / previous) * 100;
    return (change >= 0 ? '+' : '') + change.toFixed(1) + '%';
};

const AnalyticsComponents = ({ authToken }) => {
    const [data, setData] = useState({
        paymentMethods: [],
        dayOfWeek: [],
        timeOfDay: [],
        topProducts: [],
        categories: [],
        dailyTrend: { current: [], previous: [] },
        medianDayOfWeek: [],
        kpis: {}
    });
    const [loading, setLoading] = useState(true);

    const fetchDetailedStats = useCallback(async () => {
        setLoading(true);
        try {
            let url = `${API_URL}/stats/detailed`;
            const res = await fetch(url, {
                headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
            });
            const result = await res.json();
            setData(result);
        } catch (err) {
            console.error('Error fetching detailed stats:', err);
        } finally {
            setLoading(false);
        }
    }, [authToken]);

    useEffect(() => {
        fetchDetailedStats();
    }, [fetchDetailedStats]);

    if (loading && !data.paymentMethods.length) {
        return (
            <div className="p-4 space-y-6 animate-pulse bg-[#F9FAFB] min-h-screen">
                <Card className="h-96 bg-white rounded-xl"></Card>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="h-64 bg-white rounded-xl"></Card>
                    <Card className="h-64 bg-white rounded-xl"></Card>
                </div>
            </div>
        );
    }

    const kpis = data.kpis || {};
    const now = new Date();
    const currentDay = now.getDate();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthStr = monthNames[now.getMonth()];

    // --- DAILY TREND DATA ---
    const daysInMonth = 31;
    const fullDailyData = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const currentMonthDayVal = (data.dailyTrend.current || []).find(d => d.day === day)?.total || 0;
        const previousMonthDayVal = (data.dailyTrend.previous || []).find(d => d.day === day)?.total || 0;
        const res = { date: `${monthStr} ${day < 10 ? '0' + day : day}`, 'Tháng trước': previousMonthDayVal };
        if (day <= currentDay) res['Tháng này'] = currentMonthDayVal;
        return res;
    });

    const tabs = [
        { dataRange: fullDailyData.slice(Math.max(0, currentDay - 7), currentDay + 1), name: 'Last 7d' },
        { dataRange: fullDailyData.slice(0, currentDay + 1), name: 'Last 30d' },
        { dataRange: fullDailyData, name: 'Max.' },
    ];

    // --- HOURLY TREND DATA ---
    const hourlyData = Array.from({ length: 24 }, (_, i) => {
        const found = (data.timeOfDay || []).find(d => d.hour === i);
        return {
            hour: `${i}h:00`,
            'Doanh thu': found ? found.total : 0,
        };
    });

    const peakHour = [...(data.timeOfDay || [])].sort((a, b) => b.total - a.total)[0]?.hour || 0;

    const summary = [
        { name: 'Trung bình ngày', value: formatWithSuffix(Math.round(kpis.monthRevenue / (currentDay || 1))) + 'đ' },
        { name: 'Cùng kỳ tháng trước', value: formatWithSuffix(kpis.lastMonthRevenue || 0) + 'đ' },
        { name: 'Đơn hàng tháng', value: (data.topProducts?.reduce((a, b) => a + b.sold, 0) || 0) + ' đơn' },
        { name: 'Tỷ lệ tăng trưởng', value: calculateChange(kpis.monthRevenue || 0, kpis.lastMonthRevenue || 0), changeType: (kpis.monthRevenue >= kpis.lastMonthRevenue ? 'positive' : 'negative') },
        { name: 'Chênh lệch doanh thu', value: `${kpis.monthRevenue >= kpis.lastMonthRevenue ? '+' : '-'}${formatWithSuffix(Math.abs(kpis.monthRevenue - kpis.lastMonthRevenue))}đ`, changeType: (kpis.monthRevenue >= kpis.lastMonthRevenue ? 'positive' : 'negative') },
        { name: 'Dự báo doanh số', value: formatWithSuffix(Math.round((kpis.monthRevenue / (currentDay || 1)) * 30)) + 'đ', changeType: 'positive' },
    ];

    const totalRevenueAllTime = data.paymentMethods.reduce((a, b) => a + b.total, 0) || 1;

    // MEDIAN SALES BY DAY OF WEEK mapping
    const dayNames = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
    const medianChartData = (data.medianDayOfWeek || []).sort((a, b) => {
        const valA = a.day === 0 ? 7 : a.day;
        const valB = b.day === 0 ? 7 : b.day;
        return valA - valB;
    }).map(item => ({
        name: dayNames[item.day],
        'Doanh thu (Trung vị)': item.median,
        'Số ngày dữ liệu': item.count
    }));

    return (
        <div className="bg-[#F9FAFB] min-h-screen p-3 sm:p-6 lg:p-8 space-y-8 rounded-[2rem]">
            {/* KPI Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {[
                    { n: 'Today', v: kpis.todayRevenue, p: kpis.yesterdayRevenue, u: 'đ' },
                    { n: 'Month to Date', v: kpis.monthRevenue, p: kpis.lastMonthRevenue, u: 'đ' },
                    { n: 'Daily Orders', v: kpis.todayOrders, p: kpis.yesterdayOrders, u: 'đơn' }
                ].map((item, i) => (
                    <Card key={i} className="bg-white p-6 ring-1 ring-gray-200 shadow-sm rounded-xl">
                        <dt className="text-tremor-default font-medium text-gray-500 uppercase tracking-widest">{item.n}</dt>
                        <dd className="mt-2 flex items-baseline space-x-2.5">
                            <span className="text-2xl sm:text-tremor-metric font-bold text-gray-900 tracking-tight">
                                {item.u === 'đ' ? formatWithSuffix(item.v || 0) + 'đ' : (item.v || 0) + ' ' + item.u}
                            </span>
                            <span className={classNames(item.v >= item.p ? 'text-emerald-700' : 'text-rose-700', 'text-sm font-semibold')}>
                                {calculateChange(item.v || 0, item.p || 0)}
                            </span>
                        </dd>
                    </Card>
                ))}
            </div>

            {/* Main Daily Performance Card */}
            <Card className="p-0 bg-white border-none ring-1 ring-gray-200 shadow-sm rounded-2xl overflow-hidden">
                <div className="p-6 sm:p-8">
                    <Flex alignItems="start" justifyContent="between" className="flex-col sm:flex-row gap-4">
                        <div>
                            <Text className="text-gray-500 font-medium uppercase tracking-wider text-xs sm:text-sm">Performance Analytics</Text>
                            <Metric className="mt-1 text-3xl sm:text-4xl font-bold text-gray-900 tracking-tighter">
                                {formatWithSuffix(kpis.monthRevenue || 0)}đ
                            </Metric>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-blue-500 shadow-sm"></span>
                                <span className="text-xs font-bold text-gray-700">This Month</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-slate-200 border border-slate-300"></span>
                                <span className="text-xs font-bold text-gray-700">Last Month</span>
                            </div>
                        </div>
                    </Flex>
                </div>
                <TabGroup defaultIndex={1}>
                    <TabList className="px-8 border-b border-gray-100">
                        {tabs.map((tab) => <Tab key={tab.name} className="px-5 py-3 font-semibold text-gray-500 text-xs tracking-widest">{tab.name}</Tab>)}
                    </TabList>
                    <TabPanels>
                        {tabs.map((tab) => (
                            <TabPanel key={tab.name} className="p-6 sm:p-10">
                                <LineChart
                                    data={tab.dataRange}
                                    index="date"
                                    categories={['Tháng này', 'Tháng trước']}
                                    colors={['blue', 'slate']}
                                    valueFormatter={valueFormatter}
                                    yAxisWidth={60}
                                    className="hidden sm:block h-80 lg:h-96"
                                    showLegend={false}
                                    tickGap={5}
                                    customTooltip={CustomTooltip}
                                />
                                <LineChart
                                    data={tab.dataRange}
                                    index="date"
                                    categories={['Tháng này', 'Tháng trước']}
                                    colors={['blue', 'slate']}
                                    valueFormatter={valueFormatter}
                                    className="block sm:hidden h-64"
                                    showYAxis={false}
                                    showLegend={false}
                                    startEndOnly={true}
                                    customTooltip={CustomTooltip}
                                />
                            </TabPanel>
                        ))}
                    </TabPanels>
                </TabGroup>
                <div className="px-8 pb-8 border-t border-gray-100 pt-8 sm:flex sm:items-center sm:gap-x-16">
                    <List className="w-full">
                        {summary.slice(0, 3).map((item) => (
                            <ListItem key={item.name} className="py-2 sm:py-3">
                                <span className="text-gray-500 font-medium text-sm">{item.name}</span>
                                <span className="font-bold text-gray-900">{item.value}</span>
                            </ListItem>
                        ))}
                    </List>
                    <List className="mt-4 sm:mt-0 w-full">
                        {summary.slice(3, 6).map((item) => (
                            <ListItem key={item.name} className="py-2 sm:py-3">
                                <span className="text-gray-500 font-medium text-sm">{item.name}</span>
                                <span className={classNames(item.changeType === 'positive' ? 'text-emerald-700' : 'text-rose-700', 'font-bold')}>
                                    {item.value}
                                </span>
                            </ListItem>
                        ))}
                    </List>
                </div>
            </Card>

            {/* HOURLY & WEEKLY ANALYTICS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* HOURLY PERFORMANCE */}
                <Card className="bg-white border-none ring-1 ring-gray-200 shadow-sm rounded-2xl overflow-hidden p-6 sm:p-10">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Clock size={20} className="text-blue-500" /> Hoạt động theo giờ
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">Phân bố doanh thu chi tiết trong ngày</p>
                        </div>
                    </div>
                    <BarChart
                        data={hourlyData}
                        index="hour"
                        categories={['Doanh thu']}
                        colors={['blue']}
                        valueFormatter={valueFormatter}
                        yAxisWidth={60}
                        className="h-72 mt-6"
                        showLegend={false}
                        customTooltip={CustomTooltip}
                    />
                    <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                        <p className="text-sm text-blue-800 font-medium flex items-center gap-2">
                            <AlertCircle size={16} />
                            Giờ vàng kinh doanh khung: <span className="font-bold underline text-blue-900">{peakHour}h:00</span>
                        </p>
                    </div>
                </Card>

                {/* MEDIAN SALES BY DAY OF WEEK */}
                <Card className="bg-white border-none ring-1 ring-gray-200 shadow-sm rounded-2xl overflow-hidden p-6 sm:p-10">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Calendar size={20} className="text-emerald-500" /> Phân tích theo thứ (Median)
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">Doanh thu trung vị của từng thứ hàng tuần</p>
                        </div>
                    </div>
                    <BarChart
                        data={medianChartData}
                        index="name"
                        categories={['Doanh thu (Trung vị)']}
                        colors={['emerald']}
                        valueFormatter={valueFormatter}
                        yAxisWidth={60}
                        className="h-72 mt-6"
                        showLegend={false}
                        customTooltip={CustomTooltip}
                    />
                    <div className="mt-8 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                        <p className="text-sm text-emerald-800 font-medium flex items-center gap-2">
                            <TrendingUp size={16} />
                            Ngày bán chạy ổn định nhất: <span className="font-bold underline text-emerald-900">{[...medianChartData].sort((a, b) => b['Doanh thu (Trung vị)'] - a['Doanh thu (Trung vị)'])[0]?.name || '...'}</span>
                        </p>
                    </div>
                </Card>
            </div>

            {/* Bottom Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-10">
                <Card className="bg-white p-6 rounded-2xl ring-1 ring-gray-200 border-none shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Package size={20} className="text-indigo-500" /> Sản phẩm bán chạy nhất
                    </h3>
                    <BarList
                        data={(data.topProducts || []).map(p => ({
                            name: p.name,
                            value: p.revenue
                        }))}
                        valueFormatter={valueFormatter}
                    />
                </Card>

                <Card className="bg-white p-6 rounded-2xl ring-1 ring-gray-200 border-none shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <PieChart size={20} className="text-emerald-500" /> Phương thức thanh toán
                    </h3>
                    <DonutChart
                        data={data.paymentMethods.map(p => ({
                            name: p.payment_method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản',
                            total: p.total
                        }))}
                        category="total"
                        index="name"
                        valueFormatter={valueFormatter}
                        colors={['emerald', 'blue']}
                        className="h-44 sm:h-48"
                        customTooltip={CustomTooltip}
                    />
                    <div className="mt-8 grid grid-cols-2 gap-4">
                        {data.paymentMethods.map((p, i) => (
                            <div key={i} className="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                                <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{p.payment_method === 'cash' ? 'CASH' : 'TRANSFER'}</Text>
                                <Metric className="text-xl font-bold text-gray-900 mt-1">
                                    {((p.total / totalRevenueAllTime) * 100).toFixed(1)}%
                                </Metric>
                                <Text className="text-xs text-gray-400 mt-1">{formatWithSuffix(p.total)}đ</Text>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default AnalyticsComponents;
