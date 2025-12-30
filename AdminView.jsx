import React, { useMemo, useState } from 'react';
import {
    ChevronLeft, Sparkles, X, TrendingUp, ShoppingBag, ArrowUpRight,
    Package, Edit3, Trash2, Plus, Save, Image as ImageIcon, Receipt
} from 'lucide-react';

const AdminView = ({
    setView,
    history,
    askGemini,
    aiLoading,
    aiResponse,
    setAiResponse,
    products,
    refreshData
}) => {
    const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, products, orders
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [editingProduct, setEditingProduct] = useState(null);
    const [showAddProduct, setShowAddProduct] = useState(false);

    const today = new Date().toLocaleDateString();
    const todayOrders = useMemo(() => history.filter(o => new Date(o.timestamp).toLocaleDateString() === today), [history, today]);
    const revenue = useMemo(() => todayOrders.reduce((s, o) => s + o.total, 0), [todayOrders]);

    const DashboardTab = () => (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-[2rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-transparent">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 bg-blue-50 text-[#0071E3] rounded-full flex items-center justify-center">
                            <TrendingUp size={14} />
                        </div>
                        <p className="text-[10px] font-bold text-[#86868B] uppercase tracking-wider">Doanh thu</p>
                    </div>
                    <h3 className="text-[20px] font-black text-[#1D1D1F]">{revenue.toLocaleString()}<small className="text-[10px] ml-1 opacity-30 font-bold uppercase">đ</small></h3>
                </div>

                <div className="bg-white p-5 rounded-[2rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-transparent">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center">
                            <ShoppingBag size={14} />
                        </div>
                        <p className="text-[10px] font-bold text-[#86868B] uppercase tracking-wider">Đơn hàng</p>
                    </div>
                    <h3 className="text-[24px] font-black text-[#1D1D1F]">{todayOrders.length}</h3>
                </div>
            </div>

            {/* Gemini Card */}
            <div className="bg-[#1D1D1F] p-7 rounded-[2.5rem] text-white relative overflow-hidden group shadow-2xl">
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
                            <Sparkles size={16} />
                        </div>
                        <h3 className="text-[14px] font-bold tracking-tight">Trợ lý Gemini</h3>
                    </div>
                    <p className="text-white/60 text-[12px] mb-6 leading-relaxed max-w-[200px]">AI sẽ gợi ý các mặt hàng bán chạy và kế hoạch nhập kho cho bạn.</p>
                    <button
                        onClick={() => askGemini(`Phân tích doanh thu ${revenue}đ từ các đơn hàng: ${todayOrders.map(o => o.items.map(i => i.name).join(',')).join(';')}`, "Bạn là chuyên gia kinh doanh thực tế.")}
                        className="bg-white text-[#1D1D1F] px-6 py-2.5 rounded-full font-bold text-[12px] active:scale-95 transition-all flex items-center gap-2 shadow-lg"
                        disabled={aiLoading}
                    >
                        {aiLoading ? "Đang nghĩ..." : "Phân tích ngay"}
                        {!aiLoading && <ArrowUpRight size={14} />}
                    </button>
                </div>
                <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-blue-600/30 blur-[80px] rounded-full"></div>
            </div>

            {aiResponse && (
                <div className="bg-white p-6 rounded-[2rem] border border-[#D2D2D7]/50 shadow-sm animate-in zoom-in-95">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-[#1D1D1F] text-[11px] uppercase tracking-widest opacity-40">Phân tích chi tiết</h4>
                        <button onClick={() => setAiResponse(null)} className="text-[#D2D2D7] hover:text-[#1D1D1F] transition-colors"><X size={18} /></button>
                    </div>
                    <p className="text-[#1D1D1F] text-[13px] leading-[1.6] font-medium">{aiResponse}</p>
                </div>
            )}

            {/* Recent Orders */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-transparent overflow-hidden">
                <h3 className="p-5 font-bold text-[#1D1D1F] text-[12px] uppercase tracking-wider opacity-40 border-b border-[#F5F5F7]">Đơn hàng gần đây</h3>
                <div className="divide-y divide-[#F5F5F7] max-h-[300px] overflow-y-auto">
                    {history.length > 0 ? history.slice(0, 10).map(o => (
                        <button
                            key={o.id}
                            onClick={() => { setSelectedOrder(o); setActiveTab('orders'); }}
                            className="w-full p-4 flex justify-between items-center hover:bg-[#F5F5F7] transition-colors text-left"
                        >
                            <div className="flex gap-3 items-center">
                                <div className="w-10 h-10 bg-[#F5F5F7] rounded-xl flex items-center justify-center text-[#86868B] font-bold text-[10px]">
                                    #{o.id.toString().slice(-3)}
                                </div>
                                <div>
                                    <p className="font-bold text-[#1D1D1F] text-[13px]">{o.total.toLocaleString()}đ</p>
                                    <p className="text-[10px] text-[#86868B] font-medium">{new Date(o.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {o.items.length} món</p>
                                </div>
                            </div>
                            <ArrowUpRight size={16} className="text-[#D2D2D7]" />
                        </button>
                    )) : (
                        <div className="p-10 text-center text-[#D2D2D7] font-medium text-[12px]">Chưa có giao dịch</div>
                    )}
                </div>
            </div>
        </div>
    );

    const ProductsTab = () => (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-[16px] font-bold text-[#1D1D1F]">Quản lý sản phẩm ({products.length})</h3>
                <button
                    onClick={() => setShowAddProduct(true)}
                    className="bg-[#0071E3] text-white px-4 py-2 rounded-full text-[12px] font-bold flex items-center gap-2 active:scale-95 transition-all"
                >
                    <Plus size={14} /> Thêm mới
                </button>
            </div>

            <div className="space-y-2">
                {products.map(p => (
                    <div key={p.id} className="bg-white p-4 rounded-2xl flex items-center gap-3">
                        <div className="w-12 h-12 bg-[#F5F5F7] rounded-xl overflow-hidden flex-shrink-0">
                            {p.image ? <img src={p.image} className="w-full h-full object-cover" alt="" /> : <ImageIcon size={20} className="text-[#D2D2D7] m-auto" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-[#1D1D1F] text-[12px] truncate">{p.name}</h4>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-[#0071E3] font-bold text-[11px]">Lẻ: {p.price.toLocaleString()}đ</span>
                                {p.case_price > 0 && (
                                    <span className="text-emerald-600 font-bold text-[11px]">Thùng: {p.case_price.toLocaleString()}đ</span>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => setEditingProduct(p)}
                            className="w-8 h-8 bg-[#F5F5F7] rounded-full flex items-center justify-center active:scale-90 transition-all"
                        >
                            <Edit3 size={12} className="text-[#0071E3]" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );

    const OrdersTab = () => (
        <div className="space-y-4">
            <h3 className="text-[16px] font-bold text-[#1D1D1F]">Lịch sử đơn hàng ({history.length})</h3>

            {selectedOrder ? (
                <div className="bg-white rounded-[2rem] p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h4 className="text-[14px] font-bold text-[#1D1D1F]">Đơn hàng #{selectedOrder.id.toString().slice(-5)}</h4>
                            <p className="text-[10px] text-[#86868B] mt- font-medium">{new Date(selectedOrder.timestamp).toLocaleString()}</p>
                        </div>
                        <button onClick={() => setSelectedOrder(null)} className="p-2 bg-[#F5F5F7] rounded-full">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="space-y-3 mb-6">
                        {selectedOrder.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center p-3 bg-[#F5F5F7] rounded-xl">
                                <div>
                                    <p className="font-bold text-[#1D1D1F] text-[12px]">{item.displayName || item.name}</p>
                                    <p className="text-[10px] text-[#86868B]">SL: {item.quantity} x {item.finalPrice?.toLocaleString() || item.price?.toLocaleString()}đ</p>
                                </div>
                                <span className="font-bold text-[#0071E3] text-[12px]">
                                    {((item.finalPrice || item.price) * item.quantity).toLocaleString()}đ
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="pt-4 border-t border-[#F5F5F7]">
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-[#86868B] text-[12px] uppercase">Tổng cộng</span>
                            <span className="font-black text-[#1D1D1F] text-[18px]">{selectedOrder.total.toLocaleString()}đ</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-2">
                    {history.map(o => (
                        <button
                            key={o.id}
                            onClick={() => setSelectedOrder(o)}
                            className="w-full bg-white p-4 rounded-2xl flex justify-between items-center active:bg-[#F5F5F7] transition-colors"
                        >
                            <div className="flex gap-3 items-center">
                                <div className="w-10 h-10 bg-[#0071E3]/10 rounded-xl flex items-center justify-center">
                                    <Receipt size={16} className="text-[#0071E3]" />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-[#1D1D1F] text-[13px]">#{o.id.toString().slice(-5)}</p>
                                    <p className="text-[10px] text-[#86868B] font-medium">{new Date(o.timestamp).toLocaleString()} • {o.items.length} món</p>
                                </div>
                            </div>
                            <span className="font-bold text-[#0071E3] text-[14px]">{o.total.toLocaleString()}đ</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-[#F5F5F7] font-['Inter']">
            <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4 border-b border-[#D2D2D7]/30">
                <div className="flex justify-between items-center mb-4">
                    <button
                        onClick={() => setView('pos')}
                        className="flex items-center gap-1.5 text-[#1D1D1F] font-bold text-[13px] active:opacity-60 transition-opacity"
                    >
                        <ChevronLeft size={18} /> Quay lại
                    </button>
                    <h1 className="text-[13px] font-bold text-[#1D1D1F] tracking-tight uppercase opacity-40">Quản lý</h1>
                    <div className="w-16"></div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2">
                    {[
                        { id: 'dashboard', label: 'Tổng quan', icon: TrendingUp },
                        { id: 'products', label: 'Sản phẩm', icon: Package },
                        { id: 'orders', label: 'Đơn hàng', icon: Receipt }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 px-4 py-2 rounded-full text-[11px] font-bold flex items-center justify-center gap-2 transition-all ${activeTab === tab.id
                                    ? 'bg-[#0071E3] text-white shadow-md'
                                    : 'bg-[#E8E8ED] text-[#86868B]'
                                }`}
                        >
                            <tab.icon size={14} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-5 pb-20">
                {activeTab === 'dashboard' && <DashboardTab />}
                {activeTab === 'products' && <ProductsTab />}
                {activeTab === 'orders' && <OrdersTab />}
            </main>

            {/* Edit Product Modal */}
            {editingProduct && (
                <ProductEditModal
                    product={editingProduct}
                    onClose={() => setEditingProduct(null)}
                    onSave={(updated) => {
                        // Call API to update product
                        fetch(`http://localhost:3001/api/products/${updated.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(updated)
                        }).then(() => {
                            refreshData();
                            setEditingProduct(null);
                        });
                    }}
                />
            )}
        </div>
    );
};

const ProductEditModal = ({ product, onClose, onSave }) => {
    const [formData, setFormData] = useState(product);

    return (
        <div className="fixed inset-0 bg-[#1D1D1F]/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-md rounded-[2rem] p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-[16px] font-bold text-[#1D1D1F]">Chỉnh sửa sản phẩm</h3>
                    <button onClick={onClose} className="p-2 bg-[#F5F5F7] rounded-full">
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-wider block mb-2">Tên sản phẩm</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 bg-[#F5F5F7] rounded-xl text-[13px] font-medium outline-none focus:ring-2 focus:ring-[#0071E3]/30"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-wider block mb-2">Giá lẻ (VND)</label>
                            <input
                                type="number"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) })}
                                className="w-full px-4 py-3 bg-[#F5F5F7] rounded-xl text-[13px] font-medium outline-none focus:ring-2 focus:ring-[#0071E3]/30"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-wider block mb-2">Giá thùng (VND)</label>
                            <input
                                type="number"
                                value={formData.case_price || 0}
                                onChange={(e) => setFormData({ ...formData, case_price: parseInt(e.target.value) })}
                                className="w-full px-4 py-3 bg-[#F5F5F7] rounded-xl text-[13px] font-medium outline-none focus:ring-2 focus:ring-[#0071E3]/30"
                            />
                        </div>
                    </div>

                    <button
                        onClick={() => onSave(formData)}
                        className="w-full bg-[#0071E3] text-white py-4 rounded-2xl font-bold text-[14px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                    >
                        <Save size={16} /> Lưu thay đổi
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminView;
