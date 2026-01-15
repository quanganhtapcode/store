import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
    ChevronLeft, Package, Receipt, TrendingUp, ShoppingBag,
    Plus, Edit3, Trash2, Save, X, Upload, Image as ImageIcon,
    QrCode, Sparkles, ArrowUpRight, ScanLine, Search, Grid,
    List as ListIcon, MoreHorizontal, Camera, Calendar, FileText, CheckCircle, XCircle, Clock, Truck, BarChart3, RefreshCw, AlertCircle, ShieldCheck, Download
} from 'lucide-react';
import { Html5Qrcode } from "html5-qrcode";
import OrderModal from './OrderModal';
import { LogOut } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const IMAGE_BASE_URL = API_URL.replace('/api', '');

// Helper to get image URL
// Helper function to get image URL
const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http') || imagePath.startsWith('data:')) return imagePath;

    // Ensure API_URL is clean
    let baseUrl = API_URL.replace(/\/api\/?$/, '');
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

    const path = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    return `${baseUrl}${path}`;
};

// --- NEW OPTIMIZED QR Scanner Component ---
const QRScanner = ({ onResult, onClose }) => {
    const scannerRef = useRef(null);
    const scannerId = "reader-element-id";

    useEffect(() => {
        const html5QrCode = new Html5Qrcode(scannerId);
        scannerRef.current = html5QrCode;

        const startScanner = async () => {
            try {
                // 1. Lấy danh sách camera để tìm camera sau
                const devices = await Html5Qrcode.getCameras();

                if (devices && devices.length) {
                    // Tìm camera có tên chứa 'back', 'sau', 'environment'
                    const backCamera = devices.find(device => {
                        const label = device.label.toLowerCase();
                        return label.includes('back') || label.includes('sau') || label.includes('environment');
                    });

                    // Lấy ID camera sau (nếu có) hoặc lấy cái đầu tiên
                    const cameraId = backCamera ? backCamera.id : devices[0].id;

                    const config = {
                        fps: 25, // Tăng FPS lên cao để bắt nét nhanh
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0,
                        disableFlip: false,
                    };

                    await html5QrCode.start(
                        cameraId,
                        config,
                        (decodedText) => {
                            // Play beep sound
                            const beep = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQMCI6bO2NSVJxQVkM7Q0qswFBKPx8TAqiMh');
                            beep.play().catch(() => { });

                            html5QrCode.stop().then(() => {
                                onResult(decodedText);
                                onClose(); // Đóng scanner sau khi scan
                                scannerRef.current = null;
                            }).catch(err => console.error("Stop failed", err));
                        },
                        (errorMessage) => { /* ignore */ }
                    );
                } else {
                    console.error("Không tìm thấy camera.");
                }
            } catch (err) {
                console.error("Lỗi khởi động camera:", err);
            }
        };

        startScanner();

        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(err => console.log("Cleanup stop error", err));
                scannerRef.current = null;
            }
        };
    }, [onClose, onResult]);

    return (
        <div className="fixed inset-0 bg-black/95 z-[200] flex flex-col items-center justify-center p-4 text-white animate-in fade-in duration-200">
            <div className="w-full max-w-sm relative flex flex-col items-center">
                <button
                    onClick={onClose}
                    className="absolute -top-16 right-0 p-3 bg-white/10 hover:bg-white/20 active:scale-95 transition-all rounded-full backdrop-blur-sm z-50"
                >
                    <X size={28} />
                </button>

                <div className="relative w-full aspect-square overflow-hidden rounded-[2.5rem] border-4 border-indigo-500/50 shadow-2xl shadow-indigo-500/20 bg-black">
                    <div id={scannerId} className="w-full h-full" />
                    <div className="absolute inset-0 pointer-events-none border-[30px] border-black/30 rounded-[2rem]"></div>
                    <div className="absolute top-0 left-0 w-full h-1 bg-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.8)] animate-[scan_2s_infinite_linear] opacity-80 z-10"></div>
                </div>

                <div className="mt-8 text-center space-y-2">
                    <h3 className="text-xl font-bold uppercase tracking-widest text-indigo-400">Đang quét mã</h3>
                    <p className="text-slate-400 text-sm font-medium">Di chuyển camera lại gần mã QR/Barcode</p>
                </div>
            </div>
            <style>{`
                @keyframes scan {
                    0% { transform: translateY(0); opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { transform: translateY(300px); opacity: 0; }
                }
            `}</style>
        </div>
    );
};

// --- Main Admin Component ---
const AdminPage = ({ products, history, refreshData, onBackToPos, authToken, authUser, onLogout }) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [editingProduct, setEditingProduct] = useState(null);
    const [showAddProduct, setShowAddProduct] = useState(false);

    // Data States
    const [orders, setOrders] = useState([]);
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState({ todayRevenue: 0, todayOrders: 0, monthRevenue: 0, topProducts: [], productsMonthly: [] });
    const [dateFilter, setDateFilter] = useState({ start: '', end: '' });

    // Import State
    const [importCart, setImportCart] = useState([]);
    const [importSearch, setImportSearch] = useState('');
    const [showImportModal, setShowImportModal] = useState(false);
    const [editingImportQty, setEditingImportQty] = useState(null); // { idx: number, value: string }


    const [qrCodeData, setQrCodeData] = useState(null);
    const [showQRModal, setShowQRModal] = useState(false);

    const [editingOrder, setEditingOrder] = useState(null);



    const handleSetup2FA = async () => {
        try {
            const res = await fetch(`${API_URL}/auth/2fa/setup`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const data = await res.json();
            if (data.qrCode) {
                setQrCodeData(data.qrCode);
                setShowQRModal(true);
            } else {
                if (data.error && data.error.includes('phiên')) onLogout();
                else alert("Lỗi: " + (data.error || 'Server error'));
            }
        } catch (e) { console.error(e); alert("Lỗi kết nối"); }
    };

    // Fetchers
    const fetchOrders = useCallback(async () => {
        let url = `${API_URL}/orders?limit=100`; // Load more for admin
        if (dateFilter.start && dateFilter.end) url += `&startDate=${dateFilter.start}&endDate=${dateFilter.end}`;
        const res = await fetch(url);
        const data = await res.json();
        setOrders(data.data || data); // Handle both formats format
    }, [dateFilter]);

    const fetchLogs = useCallback(async () => {
        const res = await fetch(`${API_URL}/logs`);
        setLogs(await res.json());
    }, []);

    const fetchStats = useCallback(async () => {
        try {
            const [res, prodRes] = await Promise.all([
                fetch(`${API_URL}/stats`),
                fetch(`${API_URL}/stats/monthly-products`)
            ]);
            const data = await res.json();
            const prodData = await prodRes.json();
            setStats({ ...data, productsMonthly: prodData });
        } catch (e) { console.error(e); }
    }, []);

    const syncImages = async () => {
        if (confirm('Tải toàn bộ lung ảnh về server máy chủ? (Mất vài phút)')) {
            try {
                await fetch(`${API_URL}/products/sync-images`, { method: 'POST' });
                alert('Đã đồng bộ xong! Ảnh sẽ tải nhanh hơn.');
                refreshData();
            } catch (e) { alert('Lỗi đồng bộ'); }
        }
    };

    useEffect(() => {
        if (activeTab === 'orders') fetchOrders();
        if (activeTab === 'logs') fetchLogs();
        if (activeTab === 'dashboard') fetchStats();
    }, [activeTab, fetchOrders, fetchLogs, fetchStats]);

    // Product Logic
    const [searchTerm, setSearchTerm] = useState('');
    const [displayLimit, setDisplayLimit] = useState(20);
    const filteredProducts = useMemo(() => products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.code && p.code.includes(searchTerm))), [products, searchTerm]);
    const displayedProducts = useMemo(() => filteredProducts.slice(0, displayLimit), [filteredProducts, displayLimit]);
    const handleScroll = (e) => { if (e.target.scrollHeight - e.target.scrollTop <= e.target.clientHeight + 200 && displayLimit < filteredProducts.length) setDisplayLimit(prev => prev + 20); };

    // --- TABS ---
    const DashboardTab = () => {
        // State for export modal
        const [showExportModal, setShowExportModal] = React.useState(false);
        const [exportDateRange, setExportDateRange] = React.useState({
            start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
            end: new Date().toISOString().split('T')[0]
        });
        const [exporting, setExporting] = React.useState(false);

        // Server-side Excel export function
        const exportExcel = async (type) => {
            setExporting(true);
            try {
                const response = await fetch(`${API_URL}/reports/export`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type,
                        startDate: exportDateRange.start,
                        endDate: exportDateRange.end
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Export failed');
                }

                // Get filename from header
                const contentDisposition = response.headers.get('Content-Disposition');
                let filename = `report_${type}.xlsx`;
                if (contentDisposition) {
                    const match = contentDisposition.match(/filename="?([^"]+)"?/);
                    if (match) filename = decodeURIComponent(match[1]);
                }

                // Download
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                setShowExportModal(false);
            } catch (error) {
                console.error('Export error:', error);
                alert('Lỗi xuất báo cáo: ' + error.message);
            } finally {
                setExporting(false);
            }
        };

        // Helper: Format date for report
        const formatDateVN = (date) => {
            return new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        };

        // 1. SỔ CHI TIẾT BÁN HÀNG (Mẫu S1-HKD) - Chi tiết từng giao dịch theo ngày
        const exportSalesDetail = () => {
            const startDate = new Date(exportDateRange.start);
            const endDate = new Date(exportDateRange.end);
            endDate.setHours(23, 59, 59, 999);

            // Filter orders in date range
            const filteredOrders = orders.filter(o => {
                const orderDate = new Date(o.timestamp);
                return orderDate >= startDate && orderDate <= endDate;
            });

            if (filteredOrders.length === 0) {
                alert('Không có đơn hàng trong khoảng thời gian này!');
                return;
            }

            let csv = '\uFEFF'; // BOM for UTF-8
            csv += `SỔ CHI TIẾT BÁN HÀNG (Mẫu S1-HKD)\n`;
            csv += `Đơn vị: Cát Hải\n`;
            csv += `Kỳ báo cáo: Từ ${formatDateVN(exportDateRange.start)} đến ${formatDateVN(exportDateRange.end)}\n\n`;
            csv += `Ngày,Mã đơn,Tên sản phẩm,ĐVT,Số lượng,Đơn giá,Thành tiền,Phương thức TT,Ghi chú\n`;

            let totalRevenue = 0;
            filteredOrders.forEach(order => {
                const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
                const orderDate = formatDateVN(order.timestamp);
                const orderCode = order.order_code || `#${order.id}`;
                const paymentMethod = order.payment_method === 'transfer' ? 'Chuyển khoản' : order.payment_method === 'cash' ? 'Tiền mặt' : order.payment_method;

                items.forEach(item => {
                    const itemTotal = (item.finalPrice || item.price) * item.quantity;
                    totalRevenue += itemTotal;
                    const name = (item.displayName || item.name).replace(/,/g, ' ');
                    const unit = item.isCase ? 'Thùng' : 'Cái';
                    csv += `${orderDate},${orderCode},"${name}",${unit},${item.quantity},${item.finalPrice || item.price},${itemTotal},${paymentMethod},"${order.note || ''}"\n`;
                });
            });

            csv += `\n,,,TỔNG CỘNG,,,${totalRevenue},,\n`;
            csv += `\nTổng số đơn hàng: ${filteredOrders.length}\n`;
            csv += `Ngày xuất báo cáo: ${formatDateVN(new Date())}\n`;

            downloadCSV(csv, `SoChiTietBanHang_${exportDateRange.start}_${exportDateRange.end}.csv`);
            setShowExportModal(false);
        };

        // 2. BÁO CÁO XUẤT NHẬP TỒN KHO (Mẫu S2-HKD)
        const exportInventoryReport = () => {
            const startDate = new Date(exportDateRange.start);
            const endDate = new Date(exportDateRange.end);
            endDate.setHours(23, 59, 59, 999);

            // Lọc đơn hàng trong kỳ
            const ordersInPeriod = orders.filter(o => {
                const d = new Date(o.timestamp);
                return d >= startDate && d <= endDate;
            });

            // Tính toán xuất kho trong kỳ
            const soldMap = {};
            ordersInPeriod.forEach(order => {
                const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
                items.forEach(item => {
                    const key = item.id;
                    if (!soldMap[key]) soldMap[key] = { quantity: 0, value: 0 };
                    soldMap[key].quantity += item.quantity;
                    soldMap[key].value += (item.finalPrice || item.price) * item.quantity;
                });
            });

            let csv = '\uFEFF';
            csv += `BÁO CÁO XUẤT NHẬP TỒN KHO (Mẫu S2-HKD)\n`;
            csv += `Đơn vị: Cát Hải\n`;
            csv += `Kỳ báo cáo: Từ ${formatDateVN(exportDateRange.start)} đến ${formatDateVN(exportDateRange.end)}\n\n`;
            csv += `STT,Mã SP,Tên sản phẩm,ĐVT,Tồn đầu kỳ (SL),Giá vốn,Nhập trong kỳ (SL),Xuất trong kỳ (SL),Doanh thu xuất,Tồn cuối kỳ (SL)\n`;

            let totalBeginning = 0;
            let totalExport = 0;
            let totalExportValue = 0;
            let totalEnding = 0;

            products.forEach((p, idx) => {
                const sold = soldMap[p.id] || { quantity: 0, value: 0 };
                // Tồn đầu kỳ = Tồn hiện tại + Đã bán trong kỳ (giả định không có nhập trong kỳ từ DB)
                const beginningStock = p.stock + sold.quantity;
                const endingStock = p.stock;

                totalBeginning += beginningStock;
                totalExport += sold.quantity;
                totalExportValue += sold.value;
                totalEnding += endingStock;

                const name = p.name.replace(/,/g, ' ');
                csv += `${idx + 1},${p.id},"${name}",Cái,${beginningStock},${p.price},0,${sold.quantity},${sold.value},${endingStock}\n`;
            });

            csv += `\n,,TỔNG CỘNG,,${totalBeginning},,0,${totalExport},${totalExportValue},${totalEnding}\n`;
            csv += `\nGhi chú: Tồn đầu kỳ được tính từ tồn kho hiện tại + số lượng đã bán trong kỳ\n`;
            csv += `Ngày xuất báo cáo: ${formatDateVN(new Date())}\n`;

            downloadCSV(csv, `BaoCaoXuatNhapTon_${exportDateRange.start}_${exportDateRange.end}.csv`);
            setShowExportModal(false);
        };

        // 3. BÁO CÁO TỔNG HỢP DOANH THU THEO SẢN PHẨM
        const exportProductSummary = () => {
            if (!stats.productsMonthly || stats.productsMonthly.length === 0) {
                alert('Chưa có dữ liệu để xuất!');
                return;
            }

            const now = new Date();
            const monthYear = now.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

            let csv = '\uFEFF';
            csv += `BÁO CÁO TỔNG HỢP DOANH THU THEO SẢN PHẨM\n`;
            csv += `Đơn vị: Cát Hải\n`;
            csv += `Kỳ báo cáo: ${monthYear.toUpperCase()}\n\n`;
            csv += `STT,Mã sản phẩm,Tên sản phẩm,Thương hiệu,Danh mục,Số lượng bán,Doanh thu (VNĐ),Tỷ lệ (%)\n`;

            const totalRevenue = stats.productsMonthly.reduce((s, p) => s + p.revenue, 0);

            stats.productsMonthly.forEach((p, i) => {
                const product = products.find(pr => pr.name === p.name) || {};
                const name = p.name.replace(/,/g, ' ');
                const percentage = totalRevenue > 0 ? ((p.revenue / totalRevenue) * 100).toFixed(2) : 0;
                csv += `${i + 1},${product.id || ''},"${name}",${product.brand || ''},${product.category || ''},${p.total_sold},${p.revenue},${percentage}%\n`;
            });

            const totalQty = stats.productsMonthly.reduce((s, p) => s + p.total_sold, 0);
            csv += `\n,,TỔNG CỘNG,,,,${totalQty},${totalRevenue},100%\n`;
            csv += `\nTổng số mặt hàng: ${stats.productsMonthly.length}\n`;
            csv += `Ngày xuất báo cáo: ${formatDateVN(now)}\n`;

            downloadCSV(csv, `BaoCaoDoanhThu_Thang${now.getMonth() + 1}_${now.getFullYear()}.csv`);
            setShowExportModal(false);
        };

        // 4. BÁO CÁO NHẬP HÀNG (Phiếu nhập kho)
        const [imports, setImports] = React.useState([]);
        const [loadingImports, setLoadingImports] = React.useState(false);

        const fetchImports = async () => {
            setLoadingImports(true);
            try {
                const res = await fetch(`${API_URL}/imports`);
                const data = await res.json();
                setImports(data);
            } catch (e) {
                console.error('Error fetching imports:', e);
            }
            setLoadingImports(false);
        };

        // Fetch imports when modal opens
        React.useEffect(() => {
            if (showExportModal) {
                fetchImports();
            }
        }, [showExportModal]);

        const exportImportReport = () => {
            const startDate = new Date(exportDateRange.start);
            const endDate = new Date(exportDateRange.end);
            endDate.setHours(23, 59, 59, 999);

            // Filter imports in date range
            const filteredImports = imports.filter(imp => {
                const impDate = new Date(imp.timestamp);
                return impDate >= startDate && impDate <= endDate;
            });

            if (filteredImports.length === 0) {
                alert('Không có phiếu nhập trong khoảng thời gian này!');
                return;
            }

            let csv = '\uFEFF';
            csv += `SỔ CHI TIẾT NHẬP HÀNG\n`;
            csv += `Đơn vị: Cát Hải\n`;
            csv += `Kỳ báo cáo: Từ ${formatDateVN(exportDateRange.start)} đến ${formatDateVN(exportDateRange.end)}\n\n`;
            csv += `Ngày,Mã phiếu,Tên sản phẩm,Số lượng nhập,Giá nhập,Thành tiền,Ghi chú\n`;

            let totalValue = 0;
            let totalQty = 0;

            filteredImports.forEach(imp => {
                const items = typeof imp.items === 'string' ? JSON.parse(imp.items) : imp.items;
                const impDate = formatDateVN(imp.timestamp);
                const impCode = imp.id;

                items.forEach(item => {
                    const itemTotal = (item.importPrice || item.price) * item.quantity;
                    totalValue += itemTotal;
                    totalQty += item.quantity;
                    const name = (item.name || '').replace(/,/g, ' ');
                    csv += `${impDate},${impCode},"${name}",${item.quantity},${item.importPrice || item.price},${itemTotal},"${imp.note || ''}"\n`;
                });
            });

            csv += `\n,,TỔNG CỘNG,${totalQty},,${totalValue},\n`;
            csv += `\nTổng số phiếu nhập: ${filteredImports.length}\n`;
            csv += `Ngày xuất báo cáo: ${formatDateVN(new Date())}\n`;

            downloadCSV(csv, `SoChiTietNhapHang_${exportDateRange.start}_${exportDateRange.end}.csv`);
            setShowExportModal(false);
        };

        // Helper: Download CSV
        const downloadCSV = (content, filename) => {
            const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            link.click();
            URL.revokeObjectURL(link.href);
        };

        // Export Modal Component
        const ExportModal = () => (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
                <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl animate-in slide-in-from-bottom-10">
                    <div className="p-5 border-b border-[#F5F5F7]">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-[18px] text-[#1D1D1F]">📊 Xuất Báo Cáo</h3>
                            <button onClick={() => setShowExportModal(false)} className="p-2 bg-[#F5F5F7] rounded-full hover:bg-[#E8E8ED]">
                                <X size={18} />
                            </button>
                        </div>
                        <p className="text-[12px] text-[#86868B] mt-1">Theo chuẩn Thông tư 152/2025/TT-BTC</p>
                    </div>

                    <div className="p-5 space-y-4">
                        {/* Date Range */}
                        <div className="bg-[#F5F5F7] p-4 rounded-xl">
                            <label className="text-[11px] font-bold text-[#86868B] uppercase">Khoảng thời gian</label>
                            <div className="flex gap-3 mt-2">
                                <div className="flex-1">
                                    <label className="text-[10px] text-[#86868B]">Từ ngày</label>
                                    <input
                                        type="date"
                                        value={exportDateRange.start}
                                        onChange={e => setExportDateRange({ ...exportDateRange, start: e.target.value })}
                                        className="w-full bg-white p-2 rounded-lg text-[13px] font-medium outline-none border border-[#E8E8ED]"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] text-[#86868B]">Đến ngày</label>
                                    <input
                                        type="date"
                                        value={exportDateRange.end}
                                        onChange={e => setExportDateRange({ ...exportDateRange, end: e.target.value })}
                                        className="w-full bg-white p-2 rounded-lg text-[13px] font-medium outline-none border border-[#E8E8ED]"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Report Types */}
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-[#86868B] uppercase">Chọn loại báo cáo</label>

                            <button
                                onClick={exportSalesDetail}
                                className="w-full p-4 bg-gradient-to-r from-[#0071E3] to-[#0077ED] text-white rounded-xl text-left hover:shadow-lg transition-all active:scale-[0.98]"
                            >
                                <div className="font-bold text-[14px]">📋 Sổ Chi Tiết Bán Hàng</div>
                                <div className="text-[11px] opacity-80 mt-0.5">Mẫu S1-HKD: Chi tiết từng giao dịch theo ngày</div>
                            </button>

                            <button
                                onClick={exportInventoryReport}
                                className="w-full p-4 bg-gradient-to-r from-[#34C759] to-[#30D158] text-white rounded-xl text-left hover:shadow-lg transition-all active:scale-[0.98]"
                            >
                                <div className="font-bold text-[14px]">📦 Báo Cáo Xuất Nhập Tồn</div>
                                <div className="text-[11px] opacity-80 mt-0.5">Mẫu S2-HKD: Tồn đầu kỳ, nhập, xuất, tồn cuối kỳ</div>
                            </button>

                            <button
                                onClick={exportProductSummary}
                                className="w-full p-4 bg-gradient-to-r from-[#FF9500] to-[#FF9F0A] text-white rounded-xl text-left hover:shadow-lg transition-all active:scale-[0.98]"
                            >
                                <div className="font-bold text-[14px]">💰 Tổng Hợp Doanh Thu</div>
                                <div className="text-[11px] opacity-80 mt-0.5">Doanh thu theo sản phẩm, tỷ lệ % đóng góp</div>
                            </button>

                            <button
                                onClick={exportImportReport}
                                disabled={loadingImports}
                                className="w-full p-4 bg-gradient-to-r from-[#AF52DE] to-[#BF5AF2] text-white rounded-xl text-left hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                <div className="font-bold text-[14px]">📥 Sổ Chi Tiết Nhập Hàng</div>
                                <div className="text-[11px] opacity-80 mt-0.5">
                                    {loadingImports ? 'Đang tải dữ liệu...' : 'Phiếu nhập kho theo ngày, giá nhập'}
                                </div>
                            </button>

                            {/* Divider and Excel Export */}
                            <div className="border-t border-[#E8E8ED] pt-3 mt-3">
                                <label className="text-[11px] font-bold text-[#86868B] uppercase mb-2 block">📁 Xuất file Excel (.xlsx)</label>
                                <button
                                    onClick={() => exportExcel('full_report')}
                                    disabled={exporting}
                                    className="w-full p-4 bg-gradient-to-r from-[#1D1D1F] to-[#3D3D3F] text-white rounded-xl text-left hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
                                >
                                    <div className="font-bold text-[14px]">📑 Báo Cáo Tổng Hợp (Excel)</div>
                                    <div className="text-[11px] opacity-80 mt-0.5">
                                        {exporting ? 'Đang tạo báo cáo...' : 'Bán hàng + Xuất nhập tồn + Nhập hàng (nhiều sheet)'}
                                    </div>
                                </button>
                            </div>
                        </div>

                        {exporting && (
                            <div className="flex items-center justify-center gap-2 py-3 bg-[#F5F5F7] rounded-xl">
                                <div className="w-5 h-5 border-2 border-[#0071E3] border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-[13px] text-[#0071E3] font-medium">Đang tạo file Excel...</span>
                            </div>
                        )}
                    </div>

                    <div className="p-5 border-t border-[#F5F5F7] text-center">
                        <p className="text-[11px] text-[#86868B]">CSV: mở nhanh bằng Excel | XLSX: file Excel chuẩn với format đẹp</p>
                    </div>
                </div>
            </div>
        );

        // Compute low stock products
        const lowStockProducts = products.filter(p => p.stock <= 5);

        return (
            <div className="space-y-4 pb-20">
                {/* Export Modal */}
                {showExportModal && <ExportModal />}
                {lowStockProducts.length > 0 && (
                    <div className="bg-red-50 p-5 rounded-[2rem] border border-red-100 shadow-sm animate-in fade-in slide-in-from-top-4">
                        <h3 className="font-bold text-red-600 mb-3 flex items-center gap-2">
                            <AlertCircle size={20} /> Sắp hết hàng ({lowStockProducts.length})
                        </h3>
                        <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
                            {lowStockProducts.map(p => (
                                <div key={p.id} className="bg-white/80 backdrop-blur p-2.5 rounded-xl border border-red-100 w-32 flex-shrink-0" onClick={() => { setEditingProduct(p); setActiveTab('products') }}>
                                    <p className="text-[11px] font-bold text-[#1D1D1F] line-clamp-1 mb-1">{p.name}</p>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-red-500 font-black bg-red-100 px-1.5 py-0.5 rounded">Còn {p.stock}</span>
                                        <span className="text-[10px] text-[#86868B]">Chạm sửa</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#1D1D1F] text-white p-5 rounded-[2rem] shadow-lg col-span-2">
                        <p className="text-[12px] opacity-60 font-bold uppercase tracking-wider mb-1">Doanh thu hôm nay</p>
                        <h2 className="text-[32px] font-black">{stats.todayRevenue?.toLocaleString()}đ</h2>
                        <div className="mt-2 flex gap-2">
                            <span className="bg-white/20 px-2 py-1 rounded-lg text-[11px] font-bold">{stats.todayOrders} đơn</span>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-[2rem] border border-[#F5F5F7] shadow-sm">
                        <p className="text-[11px] text-[#86868B] font-bold uppercase">Tháng này</p>
                        <p className="text-[20px] font-black text-[#0071E3] mt-1">{stats.monthRevenue?.toLocaleString()}đ</p>
                    </div>
                    <div className="bg-white p-5 rounded-[2rem] border border-[#F5F5F7] shadow-sm">
                        <p className="text-[11px] text-[#86868B] font-bold uppercase">Kho hàng</p>
                        <p className="text-[20px] font-black text-[#1D1D1F] mt-1">{products.length} <span className="text-[14px] font-bold text-[#86868B]">sản phẩm</span></p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-[2rem] border border-[#F5F5F7] shadow-sm">
                    <h3 className="font-bold text-[#1D1D1F] mb-4 flex items-center gap-2"><TrendingUp size={18} /> Top Bán Chạy (Tổng thể)</h3>
                    <div className="space-y-3">
                        {stats.topProducts?.map((p, i) => (
                            <div key={i} className="flex justify-between items-center py-2 border-b border-[#F5F5F7] last:border-0">
                                <span className="text-[13px] font-medium text-[#1D1D1F] truncate max-w-[70%]">{i + 1}. {p.name}</span>
                                <span className="text-[12px] font-bold text-[#0071E3]">{p.total_sold} đã bán</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Monthly Detailed Stats */}
                <div className="bg-white p-5 rounded-[2rem] border border-[#F5F5F7] shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-[#1D1D1F] flex items-center gap-2">📊 Chi tiết doanh thu tháng này</h3>
                        <button
                            onClick={() => setShowExportModal(true)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-[#34C759] text-white text-[12px] font-bold rounded-xl active:scale-95 transition-all shadow-sm hover:bg-[#2DB84D]"
                        >
                            <Download size={14} />
                            Xuất Báo Cáo
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[13px]">
                            <thead>
                                <tr className="border-b border-[#F5F5F7]">
                                    <th className="pb-2 font-bold text-[#86868B] pl-2">Sản phẩm</th>
                                    <th className="pb-2 font-bold text-[#86868B] text-right">SL</th>
                                    <th className="pb-2 font-bold text-[#86868B] text-right pr-2">Doanh thu</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.productsMonthly?.slice(0, 10).map((p, i) => (
                                    <tr key={i} className="border-b border-[#F5F5F7] last:border-0 hover:bg-gray-50 transition-colors">
                                        <td className="py-3 font-medium text-[#1D1D1F] pl-2 truncate max-w-[150px]">{i + 1}. {p.name}</td>
                                        <td className="py-3 text-right font-bold text-[#1D1D1F]">{p.total_sold}</td>
                                        <td className="py-3 text-right font-bold text-[#0071E3] pr-2">{p.revenue?.toLocaleString()}</td>
                                    </tr>
                                ))}
                                {(!stats.productsMonthly || stats.productsMonthly.length === 0) && (
                                    <tr><td colSpan="3" className="py-4 text-center text-[#86868B]">Chưa có dữ liệu tháng này</td></tr>
                                )}
                            </tbody>
                        </table>
                        {stats.productsMonthly?.length > 10 && (
                            <p className="text-center text-[#86868B] text-[11px] mt-3 font-medium">...và {stats.productsMonthly.length - 10} sản phẩm khác</p>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const ProductsTab = () => {
        // Helper: Normalize text for search (remove accents)
        const normalizeText = (text) => {
            if (!text) return '';
            return text.toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/đ/g, 'd')
                .replace(/Đ/g, 'D');
        };

        // Group products by brand
        const trendingProducts = useMemo(() =>
            [...products].sort((a, b) => (b.total_sold || 0) - (a.total_sold || 0)).slice(0, 10),
            [products]
        );

        const productsByBrand = useMemo(() => {
            const grouped = {};
            const searchNorm = normalizeText(searchTerm);

            products.filter(p => {
                if (!searchTerm.trim()) return true;

                // Search in multiple fields
                const nameNorm = normalizeText(p.name);
                const brandNorm = normalizeText(p.brand);
                const codeNorm = normalizeText(p.code);
                const categoryNorm = normalizeText(p.category);

                // Split search into words and check if all match
                const searchWords = searchNorm.split(/\s+/).filter(w => w.length > 0);
                return searchWords.every(word =>
                    nameNorm.includes(word) ||
                    brandNorm.includes(word) ||
                    codeNorm.includes(word) ||
                    categoryNorm.includes(word)
                );
            }).forEach(p => {
                const brand = p.brand || 'Khác';
                if (!grouped[brand]) grouped[brand] = [];
                grouped[brand].push(p);
            });
            return grouped;
        }, [products, searchTerm]);

        const ProductCard = ({ p, size = 'normal' }) => (
            <div
                onClick={() => setEditingProduct(p)}
                className={`bg-white rounded-2xl overflow-hidden shadow-sm border border-[#F5F5F7] active:scale-[0.97] transition-all cursor-pointer flex-shrink-0 ${size === 'small' ? 'w-32' : 'w-40'}`}
            >
                <div className={`${size === 'small' ? 'h-28' : 'h-36'} bg-[#F9F9FA] flex items-center justify-center relative overflow-hidden`}>
                    {p.image ? <img src={getImageUrl(p.image)} loading="lazy" className="w-full h-full object-cover" /> : <ImageIcon size={28} className="text-[#D2D2D7]" />}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white/90 shadow-sm">
                        {p.stock}
                    </div>
                </div>
                <div className="p-2.5">
                    <h4 className="font-bold text-[#1D1D1F] text-[12px] line-clamp-2 h-[2.4em] mb-1">{p.name}</h4>
                    <p className="text-[#0071E3] font-black text-[14px]">{p.price?.toLocaleString()}đ</p>
                    {p.case_price > 0 && (
                        <p className="text-[10px] text-[#FF9500] font-bold">Thùng: {p.case_price?.toLocaleString()}đ</p>
                    )}
                </div>
            </div>
        );

        return (
            <div className="space-y-5 pb-20">
                {/* Thịnh hành - Horizontal scroll */}
                {searchTerm === '' && (
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles size={18} className="text-[#FF9500]" />
                            <h3 className="font-bold text-[16px] text-[#1D1D1F]">Thịnh hành</h3>
                            <span className="text-[12px] text-[#86868B]">({trendingProducts.length})</span>
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                            {trendingProducts.map(p => (
                                <ProductCard key={p.id} p={p} size="small" />
                            ))}
                        </div>
                    </div>
                )}

                {/* Theo Brand - Horizontal scroll sections */}
                {Object.entries(productsByBrand).map(([brand, items]) => (
                    <div key={brand}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Package size={18} className="text-[#0071E3]" />
                                <h3 className="font-bold text-[16px] text-[#1D1D1F]">{brand}</h3>
                                <span className="text-[12px] text-[#86868B]">({items.length})</span>
                            </div>
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                            {items.map(p => (
                                <ProductCard key={p.id} p={p} />
                            ))}
                        </div>
                    </div>
                ))}

                {/* Empty state */}
                {Object.keys(productsByBrand).length === 0 && (
                    <div className="text-center py-10 text-[#86868B]">
                        <Package size={48} className="mx-auto mb-3 opacity-50" />
                        <p className="font-medium">Không tìm thấy sản phẩm</p>
                    </div>
                )}
            </div>
        );
    };

    // Import Tab helper functions (outside component to prevent re-render)
    const importProducts = useMemo(() => {
        const normalizeText = (text) => {
            if (!text) return '';
            return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
        };
        const searchNorm = normalizeText(importSearch);
        if (!searchNorm.trim()) return products;
        return products.filter(p =>
            normalizeText(p.name).includes(searchNorm) ||
            normalizeText(p.brand).includes(searchNorm) ||
            (p.code && p.code.includes(importSearch))
        );
    }, [products, importSearch]);

    const importProductsByBrand = useMemo(() => {
        const grouped = {};
        importProducts.forEach(p => {
            const brand = p.brand || 'Khác';
            if (!grouped[brand]) grouped[brand] = [];
            grouped[brand].push(p);
        });
        return grouped;
    }, [importProducts]);

    const addToImport = (p, isCase = false) => {
        const qty = isCase ? (p.units_per_case || 1) : 1;
        setImportCart(prev => {
            const ex = prev.find(i => i.id === p.id);
            if (ex) return prev.map(i => i.id === p.id ? { ...i, quantity: i.quantity + qty } : i);
            return [...prev, { ...p, quantity: qty, importPrice: p.price * 0.7 }];
        });
    };

    const submitImport = async () => {
        if (importCart.length === 0) return;
        const total_cost = importCart.reduce((s, i) => s + (i.importPrice * i.quantity), 0);
        try {
            const res = await fetch(`${API_URL}/imports`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ items: importCart, total_cost, note: 'Nhập hàng nhanh' })
            });
            if (res.status === 401) {
                alert('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
                onLogout();
                return;
            }
            alert('Đã nhập kho thành công!'); setImportCart([]); refreshData();
        } catch (e) { alert('Lỗi nhập kho'); }
    };

    const ImportTab = () => {
        const ImportProductCard = ({ p }) => (
            <div className={`bg-white rounded-2xl overflow-hidden border-2 transition-all flex-shrink-0 w-36 ${importCart.some(i => i.id === p.id) ? 'border-[#0071E3] shadow-lg' : 'border-transparent shadow-sm'}`}>
                <div className="h-24 bg-[#F9F9FA] flex items-center justify-center overflow-hidden relative" onClick={() => addToImport(p)}>
                    {p.image ? <img src={getImageUrl(p.image)} loading="lazy" className="w-full h-full object-cover" /> : <ImageIcon size={28} className="text-[#D2D2D7]" />}
                    {importCart.some(i => i.id === p.id) && (
                        <div className="absolute top-1 right-1 bg-[#0071E3] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                            +{importCart.find(i => i.id === p.id)?.quantity}
                        </div>
                    )}
                </div>
                <div className="p-2">
                    <p className="font-bold text-[10px] text-[#1D1D1F] line-clamp-1">{p.name}</p>
                    <p className="text-[9px] text-[#86868B]">Tồn: {p.stock} {p.units_per_case > 1 && `• Thùng ${p.units_per_case}`}</p>
                    <div className="flex gap-1 mt-1.5">
                        <button onClick={() => addToImport(p)} className="flex-1 bg-[#0071E3] text-white text-[9px] py-1 rounded-lg font-bold active:scale-95">+1</button>
                        {p.units_per_case > 1 && (
                            <button onClick={() => addToImport(p, true)} className="flex-1 bg-[#34C759] text-white text-[9px] py-1 rounded-lg font-bold active:scale-95">+{p.units_per_case}</button>
                        )}
                    </div>
                </div>
            </div>
        );

        return (
            <div className="space-y-4 pb-20">
                {/* Cart */}
                <div className="bg-gradient-to-br from-[#1D1D1F] to-[#2D2D2F] p-5 rounded-3xl shadow-xl text-white">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-[16px] flex items-center gap-2">
                            <Truck size={20} /> Phiếu nhập kho
                        </h3>
                        <span className="text-[12px] bg-white/20 px-3 py-1 rounded-full">
                            {importCart.length} sản phẩm
                        </span>
                    </div>

                    {importCart.length === 0 ? (
                        <p className="text-center text-white/60 text-[13px] py-6">Chọn sản phẩm bên dưới để thêm vào phiếu nhập</p>
                    ) : (
                        <div className="space-y-3">
                            {importCart.map((i, idx) => (
                                <div key={idx} className="bg-white/10 backdrop-blur rounded-xl p-3 flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white/20 rounded-lg overflow-hidden flex-shrink-0">
                                        {i.image ? <img src={getImageUrl(i.image)} loading="lazy" className="w-full h-full object-cover" /> : <Package className="w-full h-full p-2 text-white/50" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-[13px] truncate">{i.name}</p>
                                        <p className="text-[11px] text-white/60">Tồn: {i.stock}</p>
                                    </div>
                                    <div className="flex flex-col gap-1 items-end">
                                        <div className="flex items-center gap-2 bg-white/20 rounded-lg px-2 py-1">
                                            <button onClick={() => setImportCart(prev => prev.map((pi, pii) => pii === idx ? { ...pi, quantity: Math.max(1, pi.quantity - 1) } : pi))} className="text-white/70 hover:text-white px-1">-</button>
                                            {editingImportQty?.idx === idx ? (
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={editingImportQty.value}
                                                    onChange={e => setEditingImportQty({ idx, value: e.target.value.replace(/[^0-9]/g, '') })}
                                                    onBlur={() => {
                                                        const newQty = parseInt(editingImportQty.value, 10) || 1;
                                                        setImportCart(prev => prev.map((pi, pii) => pii === idx ? { ...pi, quantity: Math.max(1, newQty) } : pi));
                                                        setEditingImportQty(null);
                                                    }}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') {
                                                            const newQty = parseInt(editingImportQty.value, 10) || 1;
                                                            setImportCart(prev => prev.map((pi, pii) => pii === idx ? { ...pi, quantity: Math.max(1, newQty) } : pi));
                                                            setEditingImportQty(null);
                                                        }
                                                    }}
                                                    autoFocus
                                                    className="w-12 text-center text-[13px] font-bold bg-white text-[#1D1D1F] rounded px-1 py-0.5 outline-none"
                                                />
                                            ) : (
                                                <span
                                                    onClick={() => setEditingImportQty({ idx, value: '' })}
                                                    className="w-8 text-center text-[13px] font-bold cursor-pointer hover:bg-white/20 rounded px-1"
                                                >{i.quantity}</span>
                                            )}
                                            <button onClick={() => setImportCart(prev => prev.map((pi, pii) => pii === idx ? { ...pi, quantity: pi.quantity + 1 } : pi))} className="text-white/70 hover:text-white px-1">+</button>
                                        </div>
                                        <button onClick={() => setImportCart(prev => prev.filter((_, pii) => pii !== idx))} className="text-red-400 text-[11px] hover:text-red-300">Xóa</button>
                                    </div>
                                </div>
                            ))}
                            <div className="pt-4 border-t border-white/20">
                                <button onClick={submitImport} className="w-full bg-[#0071E3] text-white py-4 rounded-2xl font-bold text-[15px] shadow-lg active:scale-[0.98] transition-all">
                                    Xác nhận Nhập Kho
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Products by brand - horizontal scroll */}
                {Object.entries(importProductsByBrand).map(([brand, items]) => (
                    <div key={brand}>
                        <div className="flex items-center gap-2 mb-3">
                            <Package size={18} className="text-[#0071E3]" />
                            <h3 className="font-bold text-[15px] text-[#1D1D1F]">{brand}</h3>
                            <span className="text-[12px] text-[#86868B]">({items.length})</span>
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                            {items.map(p => (
                                <ImportProductCard key={p.id} p={p} />
                            ))}
                        </div>
                    </div>
                ))}

                {Object.keys(importProductsByBrand).length === 0 && (
                    <div className="text-center py-10 text-[#86868B]">
                        <Package size={48} className="mx-auto mb-3 opacity-50" />
                        <p className="font-medium">Không tìm thấy sản phẩm</p>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-screen bg-[#F5F5F7] font-['Inter']">
            {/* 2FA Setup Modal */}
            {showQRModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm text-center animate-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-[#0071E3]">
                            <ShieldCheck size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-[#1D1D1F] mb-2">Cài đặt 2FA</h3>
                        <p className="text-[#86868B] text-sm mb-6">Sử dụng Google Authenticator hoặc Authy để quét mã QR bên dưới.</p>

                        <div className="bg-[#F5F5F7] p-4 rounded-2xl mb-6 inline-block">
                            {qrCodeData && <img src={qrCodeData} alt="QR Code" className="w-48 h-48 mix-blend-multiply" />}
                        </div>

                        <button
                            onClick={() => setShowQRModal(false)}
                            className="w-full bg-[#1D1D1F] text-white py-3 rounded-xl font-bold active:scale-[0.98] transition-transform"
                        >
                            Đã quét xong
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white/90 backdrop-blur-md px-4 py-3 border-b border-[#D2D2D7]/30 sticky top-0 z-20">
                <div className="flex items-center justify-between mb-3">
                    <button onClick={onBackToPos} className="w-9 h-9 bg-[#F5F5F7] rounded-full flex items-center justify-center text-[#1D1D1F]"><ChevronLeft size={20} /></button>
                    <span className="font-black text-[16px]">Quản trị Hệ thống</span>
                    <div className="flex gap-2">
                        <button onClick={handleSetup2FA} className="w-9 h-9 bg-blue-500/10 hover:bg-blue-500/20 rounded-full flex items-center justify-center text-blue-500 transition-colors" title="Cài đặt 2FA">
                            <ShieldCheck size={18} />
                        </button>
                        <button onClick={onLogout} className="w-9 h-9 bg-red-500/10 hover:bg-red-500/20 rounded-full flex items-center justify-center text-red-500 transition-colors" title="Đăng xuất">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
                <div className="flex bg-[#F5F5F7] p-1 rounded-2xl overflow-x-auto scrollbar-hide">
                    {[
                        { id: 'dashboard', l: 'Tổng quan', i: BarChart3 },
                        { id: 'products', l: 'Sản phẩm', i: Package },
                        { id: 'import', l: 'Nhập hàng', i: Truck },
                        { id: 'orders', l: 'Đơn hàng', i: Receipt },
                        { id: 'logs', l: 'Nhật ký', i: FileText }
                    ].map(t => (
                        <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-[12px] font-bold whitespace-nowrap transition-all ${activeTab === t.id ? 'bg-white shadow-sm text-[#1D1D1F]' : 'text-[#86868B]'}`}>
                            <t.i size={14} /> {t.l}
                        </button>
                    ))}
                </div>

                {/* Search Bar - Products tab */}
                {activeTab === 'products' && (
                    <div className="flex gap-2 mt-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868B]" size={18} />
                            <input
                                type="text"
                                placeholder="Tìm sản phẩm, mã vạch, thương hiệu..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoComplete="off"
                                className="w-full bg-[#F5F5F7] pl-10 pr-10 py-3 rounded-2xl text-[14px] font-medium outline-none border border-transparent focus:border-[#0071E3] focus:bg-white transition-all"
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-[#86868B] rounded-full hover:bg-[#6e6e73]">
                                    <X size={12} className="text-white" />
                                </button>
                            )}
                        </div>
                        <button onClick={() => setShowAddProduct(true)} className="bg-[#1D1D1F] text-white w-12 rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-all">
                            <Plus size={22} />
                        </button>
                    </div>
                )}

                {/* Search Bar - Import tab */}
                {activeTab === 'import' && (
                    <div className="flex gap-2 mt-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868B]" size={18} />
                            <input
                                type="text"
                                placeholder="Tìm sản phẩm để nhập kho..."
                                value={importSearch}
                                onChange={(e) => setImportSearch(e.target.value)}
                                autoComplete="off"
                                className="w-full bg-[#F5F5F7] pl-10 pr-10 py-3 rounded-2xl text-[14px] font-medium outline-none border border-transparent focus:border-[#0071E3] focus:bg-white transition-all"
                            />
                            {importSearch && (
                                <button onClick={() => setImportSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-[#86868B] rounded-full hover:bg-[#6e6e73]">
                                    <X size={12} className="text-white" />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
            <main className="flex-1 overflow-y-auto p-4 scroll-smooth" onScroll={handleScroll}>
                <div className="max-w-4xl mx-auto">
                    {/* Tabs - conditional render with lazy loading images */}
                    {activeTab === 'dashboard' && <DashboardTab />}
                    {activeTab === 'products' && <ProductsTab />}
                    {activeTab === 'import' && <ImportTab />}

                    {/* Orders tab with Date Filter */}
                    {activeTab === 'orders' && (
                        <div className="space-y-3 pb-20">
                            {/* Date Filter Controls */}
                            <div className="bg-white p-4 rounded-2xl border border-[#F5F5F7] shadow-sm sticky top-0 z-10">
                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                    <button
                                        onClick={() => {
                                            const today = new Date();
                                            today.setHours(0, 0, 0, 0);
                                            setDateFilter({ start: today.toISOString().split('T')[0], end: '' });
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-[12px] font-bold flex-shrink-0 transition-all ${dateFilter.start === new Date().toISOString().split('T')[0] && !dateFilter.end
                                            ? 'bg-[#0071E3] text-white'
                                            : 'bg-[#F5F5F7] text-[#1D1D1F] hover:bg-[#E8E8ED]'
                                            }`}
                                    >
                                        📅 Hôm nay
                                    </button>
                                    <button
                                        onClick={() => {
                                            const d = new Date();
                                            d.setDate(d.getDate() - 7);
                                            setDateFilter({ start: d.toISOString().split('T')[0], end: '' });
                                        }}
                                        className="px-3 py-1.5 rounded-lg text-[12px] font-bold flex-shrink-0 bg-[#F5F5F7] text-[#1D1D1F] hover:bg-[#E8E8ED] transition-all"
                                    >
                                        7 ngày
                                    </button>
                                    <button
                                        onClick={() => {
                                            const d = new Date();
                                            d.setDate(1);
                                            setDateFilter({ start: d.toISOString().split('T')[0], end: '' });
                                        }}
                                        className="px-3 py-1.5 rounded-lg text-[12px] font-bold flex-shrink-0 bg-[#F5F5F7] text-[#1D1D1F] hover:bg-[#E8E8ED] transition-all"
                                    >
                                        Tháng này
                                    </button>
                                    <button
                                        onClick={() => setDateFilter({ start: '', end: '' })}
                                        className={`px-3 py-1.5 rounded-lg text-[12px] font-bold flex-shrink-0 transition-all ${!dateFilter.start && !dateFilter.end
                                            ? 'bg-[#1D1D1F] text-white'
                                            : 'bg-[#F5F5F7] text-[#1D1D1F] hover:bg-[#E8E8ED]'
                                            }`}
                                    >
                                        Tất cả
                                    </button>
                                </div>

                                {/* Custom Date Range */}
                                <div className="flex gap-2 mt-2">
                                    <div className="flex-1">
                                        <label className="text-[10px] text-[#86868B] font-bold">Từ ngày</label>
                                        <input
                                            type="date"
                                            value={dateFilter.start}
                                            onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })}
                                            className="w-full bg-[#F5F5F7] px-3 py-2 rounded-lg text-[12px] font-medium outline-none"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[10px] text-[#86868B] font-bold">Đến ngày</label>
                                        <input
                                            type="date"
                                            value={dateFilter.end}
                                            onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })}
                                            className="w-full bg-[#F5F5F7] px-3 py-2 rounded-lg text-[12px] font-medium outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Filtered Orders List */}
                            {(() => {
                                const filteredOrders = orders.filter(o => {
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

                                const totalFiltered = filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0);

                                return (
                                    <>
                                        {/* Summary */}
                                        <div className="bg-[#0071E3]/10 p-3 rounded-xl flex justify-between items-center">
                                            <span className="text-[12px] text-[#0071E3] font-bold">
                                                {filteredOrders.length} đơn hàng
                                            </span>
                                            <span className="text-[14px] text-[#0071E3] font-black">
                                                Tổng: {totalFiltered.toLocaleString()}đ
                                            </span>
                                        </div>

                                        {/* Orders */}
                                        {filteredOrders.map(o => {
                                            const items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
                                            return (
                                                <div key={o.id} onClick={() => setEditingOrder(o)} className="bg-white p-4 rounded-2xl shadow-sm border border-[#F5F5F7] active:scale-[0.98] transition-all cursor-pointer">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <p className="font-bold text-[14px] text-[#1D1D1F] flex items-center gap-2 flex-wrap">
                                                                {o.order_code || `#${o.id}`}
                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${o.status === 'completed' ? 'bg-green-100 text-green-700' : o.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-[#E8E8ED] text-[#1D1D1F]'}`}>
                                                                    {o.status || 'completed'}
                                                                </span>
                                                                <span className="text-[10px] bg-[#E8E8ED] px-1.5 py-0.5 rounded">{o.payment_method || 'cash'}</span>
                                                            </p>
                                                            <p className="text-[12px] text-[#86868B] mt-0.5">{new Date(o.timestamp).toLocaleString()}</p>
                                                            {o.customer_name && o.customer_name !== 'Khách lẻ' && (
                                                                <p className="text-[12px] text-[#1D1D1F] font-medium mt-1">👤 {o.customer_name}</p>
                                                            )}
                                                        </div>
                                                        <span className="font-black text-[#0071E3] text-[16px]">{o.total?.toLocaleString()}đ</span>
                                                    </div>
                                                    <div className="text-[11px] text-[#86868B] border-t border-[#F5F5F7] pt-2 mt-2">
                                                        {items?.slice(0, 3).map((item, idx) => (
                                                            <span key={idx} className="inline-block bg-[#F5F5F7] px-2 py-0.5 rounded mr-1 mb-1">
                                                                {item.displayName || item.name} x{item.quantity}
                                                            </span>
                                                        ))}
                                                        {items?.length > 3 && <span className="text-[#0071E3]">+{items.length - 3} khác</span>}
                                                    </div>
                                                    {o.note && <p className="text-[11px] text-[#86868B] mt-2 italic">📝 {o.note}</p>}
                                                </div>
                                            );
                                        })}

                                        {filteredOrders.length === 0 && (
                                            <div className="text-center py-12 text-[#86868B]">
                                                <p className="text-4xl mb-2">📦</p>
                                                <p className="font-medium">Không có đơn hàng trong khoảng thời gian này</p>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    )}
                    {activeTab === 'logs' && (
                        <div className="space-y-2 pb-20">
                            {logs.map((l, i) => <div key={i} className="text-[12px] p-3 bg-white rounded-xl border border-[#F5F5F7]"><span className="font-bold text-[#1D1D1F]">{l.action}</span>: {l.details} <div className="text-[10px] text-[#86868B] mt-1">{new Date(l.timestamp).toLocaleString()}</div></div>)}
                        </div>
                    )}
                </div>
            </main>
            {(editingProduct || showAddProduct) && <ProductModal product={editingProduct} authToken={authToken} onLogout={onLogout} onClose={() => { setEditingProduct(null); setShowAddProduct(false) }} onSave={() => { refreshData(); setEditingProduct(null); setShowAddProduct(false) }} />}
            {editingOrder && <OrderModal order={editingOrder} authToken={authToken} onClose={() => setEditingOrder(null)} onSave={() => { fetchOrders(); setEditingOrder(null); }} />}
            {showImportModal && <div className="fixed inset-0 bg-black/50 z-50"></div>}
        </div>
    );
};

// Helper format số với dấu phân cách (1,000,000)
const formatNumber = (num) => {
    if (num === '' || num === null || num === undefined) return '';
    return Number(num).toLocaleString('vi-VN');
};

// Parse số từ chuỗi có dấu phân cách
const parseNumber = (str) => {
    if (!str) return 0;
    return parseInt(String(str).replace(/[.,\s]/g, ''), 10) || 0;
};

const ProductModal = ({ product, onClose, onSave, authToken, onLogout }) => {
    const isEdit = !!product;
    const [formData, setFormData] = useState(product || { name: '', brand: '', category: '', price: 0, case_price: 0, units_per_case: 1, stock: 0, code: '', image: '' });
    const [isScanning, setIsScanning] = useState(false);

    // State để lưu giá trị hiển thị (có format)
    const [displayValues, setDisplayValues] = useState({
        price: formatNumber(product?.price || 0),
        case_price: formatNumber(product?.case_price || 0),
        units_per_case: String(product?.units_per_case || 1),
        stock: formatNumber(product?.stock || 0)
    });

    // Handler cho input số có format
    const handleNumberInput = (field, value) => {
        // Chỉ cho phép số
        const numericValue = value.replace(/[^0-9]/g, '');
        setDisplayValues(prev => ({ ...prev, [field]: numericValue }));
        setFormData(prev => ({ ...prev, [field]: parseInt(numericValue, 10) || (field === 'units_per_case' ? 1 : 0) }));
    };

    // Khi blur, format lại số
    const handleNumberBlur = (field) => {
        const value = formData[field] || (field === 'units_per_case' ? 1 : 0);
        setDisplayValues(prev => ({
            ...prev,
            [field]: field === 'units_per_case' ? String(value) : formatNumber(value)
        }));
    };

    // Khi focus, hiện số thuần (không format)
    const handleNumberFocus = (field) => {
        const value = formData[field] || '';
        setDisplayValues(prev => ({ ...prev, [field]: value ? String(value) : '' }));
    };

    // Nén ảnh trước khi upload để tăng tốc
    const compressImage = (file, maxWidth = 800, quality = 0.7) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Resize nếu quá lớn
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Compress và trả về base64
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    };

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            // Nén ảnh trước khi lưu vào state
            const compressedImage = await compressImage(file);
            setFormData({ ...formData, image: compressedImage });
        }
    };
    const handleScanResult = (code) => { setFormData({ ...formData, code }); setIsScanning(false); };

    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async () => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            const url = isEdit ? `${API_URL}/products/${formData.id}` : `${API_URL}/products`;
            const method = isEdit ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(formData)
            });
            if (res.status === 401) {
                alert('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
                onLogout();
                return;
            }
            onSave();
        } catch (e) { console.error(e); }
        finally { setIsSaving(false); }
    };

    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này? Hành động không thể hoàn tác.')) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`${API_URL}/products/${formData.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            if (res.status === 401) {
                alert('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
                onLogout();
                return;
            }
            if (res.ok) {
                onSave();
            } else {
                const data = await res.json().catch(() => ({}));
                alert('Không thể xóa sản phẩm: ' + (data.error || 'Lỗi không xác định'));
            }
        } catch (e) {
            console.error('Delete error:', e);
            alert('Lỗi kết nối: ' + e.message);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center animate-in fade-in">
            {isScanning && <QRScanner onResult={handleScanResult} onClose={() => setIsScanning(false)} />}
            <div className="bg-white w-full sm:max-w-lg h-[90vh] sm:h-auto rounded-t-[2rem] sm:rounded-[2rem] flex flex-col shadow-2xl animate-in slide-in-from-bottom-20 overflow-hidden">
                <div className="p-4 border-b border-[#F5F5F7] flex justify-between items-center"><h3 className="font-bold text-[16px]">{isEdit ? 'Sửa' : 'Thêm'} sản phẩm</h3><button onClick={onClose} className="p-2 bg-[#F5F5F7] rounded-full hover:bg-[#E8E8ED]"><X size={20} /></button></div>
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    <div className="flex flex-col items-center gap-3"><div className="w-28 h-28 bg-[#F5F5F7] rounded-2xl overflow-hidden border border-[#E8E8ED] flex items-center justify-center relative">{formData.image ? <img src={getImageUrl(formData.image)} className="w-full h-full object-cover" /> : <ImageIcon className="text-[#D2D2D7]" />}<input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageChange} accept="image/*" /></div><p className="text[12px] text-[#0071E3] font-bold">Chạm để đổi ảnh</p></div>
                    <div className="space-y-4">
                        <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Tên sản phẩm" className="w-full bg-[#F9F9FA] p-4 rounded-xl font-bold outline-none ring-1 ring-transparent focus:ring-[#0071E3]" />
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[11px] font-bold uppercase text-[#86868B] ml-1">Giá lẻ (VND)</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={displayValues.price}
                                    onChange={e => handleNumberInput('price', e.target.value)}
                                    onFocus={() => handleNumberFocus('price')}
                                    onBlur={() => handleNumberBlur('price')}
                                    placeholder="0"
                                    className="w-full bg-[#F9F9FA] p-3 rounded-xl font-bold text-[#0071E3] outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold uppercase text-[#86868B] ml-1">Giá thùng (VND)</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={displayValues.case_price}
                                    onChange={e => handleNumberInput('case_price', e.target.value)}
                                    onFocus={() => handleNumberFocus('case_price')}
                                    onBlur={() => handleNumberBlur('case_price')}
                                    placeholder="0"
                                    className="w-full bg-[#F9F9FA] p-3 rounded-xl font-bold text-[#FF9500] outline-none"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[11px] font-bold uppercase text-[#86868B] ml-1">SL/Thùng</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={displayValues.units_per_case}
                                    onChange={e => handleNumberInput('units_per_case', e.target.value)}
                                    onFocus={() => handleNumberFocus('units_per_case')}
                                    onBlur={() => handleNumberBlur('units_per_case')}
                                    placeholder="1"
                                    className="w-full bg-[#F9F9FA] p-3 rounded-xl font-medium outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold uppercase text-[#86868B] ml-1">Tồn kho</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={displayValues.stock}
                                    onChange={e => handleNumberInput('stock', e.target.value)}
                                    onFocus={() => handleNumberFocus('stock')}
                                    onBlur={() => handleNumberBlur('stock')}
                                    placeholder="0"
                                    className="w-full bg-[#F9F9FA] p-3 rounded-xl font-medium outline-none"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-[11px] font-bold uppercase text-[#86868B] ml-1">Thương hiệu</label><input value={formData.brand || ''} onChange={e => setFormData({ ...formData, brand: e.target.value })} placeholder="VD: Castrol..." className="w-full bg-[#F9F9FA] p-3 rounded-xl font-medium outline-none" /></div>
                            <div><label className="text-[11px] font-bold uppercase text-[#86868B] ml-1">Danh mục</label><input value={formData.category || ''} onChange={e => setFormData({ ...formData, category: e.target.value })} placeholder="VD: Nhớt..." className="w-full bg-[#F9F9FA] p-3 rounded-xl font-medium outline-none" /></div>
                        </div>
                        <div>
                            <label className="text-[11px] font-bold uppercase text-[#86868B] ml-1">Mã vạch (Barcode)</label>
                            <div className="relative mt-1">
                                <input value={formData.code || ''} onChange={e => setFormData({ ...formData, code: e.target.value })} placeholder="Quét hoặc nhập mã..." className="w-full bg-[#F9F9FA] pl-4 pr-12 py-3.5 rounded-xl font-mono text-[14px] outline-none" />
                                <button onClick={() => setIsScanning(true)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white rounded-lg shadow-sm border border-[#E8E8ED] hover:scale-105 transition-transform">
                                    <ScanLine size={18} className="text-[#1D1D1F]" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-[#F5F5F7] flex gap-3">
                    {isEdit && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className={`bg-red-50 text-red-500 p-4 rounded-2xl font-bold flex-shrink-0 transition-all hover:bg-red-100 flex items-center justify-center ${isDeleting ? 'opacity-70 cursor-not-allowed' : 'active:scale-95'}`}
                        >
                            {isDeleting ? (
                                <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <Trash2 size={24} />
                            )}
                        </button>
                    )}
                    <button
                        onClick={handleSubmit}
                        disabled={isSaving}
                        className={`flex-1 bg-[#0071E3] text-white py-4 rounded-2xl font-bold text-[16px] shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 ${isSaving ? 'opacity-70 cursor-not-allowed' : 'active:scale-[0.98]'}`}
                    >
                        {isSaving ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Đang lưu...
                            </>
                        ) : (
                            isEdit ? 'Lưu thay đổi' : 'Thêm mới'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminPage;
