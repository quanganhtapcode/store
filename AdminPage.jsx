import React, { useState, useMemo } from 'react';
import {
    ChevronLeft, Package, Receipt, TrendingUp, ShoppingBag,
    Plus, Edit3, Trash2, Save, X, Upload, Image as ImageIcon,
    QrCode, Sparkles, ArrowUpRight
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const AdminPage = ({ products, history, refreshData, onBackToPos }) => {
    const [activeTab, setActiveTab] = useState('products');
    const [editingProduct, setEditingProduct] = useState(null);
    const [showAddProduct, setShowAddProduct] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);

    const today = new Date().toLocaleDateString();
    const todayOrders = useMemo(() => history.filter(o => new Date(o.timestamp).toLocaleDateString() === today), [history, today]);
    const revenue = useMemo(() => todayOrders.reduce((s, o) => s + o.total, 0), [todayOrders]);

    const ProductsTab = () => (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-3xl mb-2 shadow-sm border border-[#F5F5F7]">
                <h3 className="text-[20px] font-black text-[#1D1D1F] tracking-tight">Quản lý sản phẩm ({products.length})</h3>
                <button
                    onClick={() => setShowAddProduct(true)}
                    className="bg-[#0071E3] text-white px-6 py-3 rounded-full text-[14px] font-bold flex items-center gap-2 active:scale-95 transition-all shadow-md hover:shadow-lg"
                >
                    <Plus size={18} /> Thêm mới
                </button>
            </div>

            <div className="grid grid-cols-1 gap-3.5">
                {products.map(p => (
                    <div key={p.id} className="bg-white p-5 rounded-3xl flex items-center gap-5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-[#F5F5F7] hover:shadow-md transition-shadow">
                        <div className="w-20 h-20 bg-[#F5F5F7] rounded-2xl overflow-hidden flex-shrink-0 border border-[#E8E8ED]">
                            {p.image ? (
                                <img src={p.image} className="w-full h-full object-cover" alt="" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-[#D2D2D7]">
                                    <ImageIcon size={32} />
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-extrabold text-[#1D1D1F] text-[16px] line-clamp-1 mb-2">{p.name}</h4>
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                                <div>
                                    <span className="text-[10px] text-[#86868B] uppercase font-bold block mb-0.5">Giá lẻ</span>
                                    <span className="text-[#0071E3] font-bold text-[14px]">{p.price.toLocaleString()}đ</span>
                                </div>
                                {p.case_price > 0 && (
                                    <div>
                                        <span className="text-[10px] text-[#86868B] uppercase font-bold block mb-0.5">Giá thùng ({p.units_per_case})</span>
                                        <span className="text-emerald-600 font-bold text-[14px]">{p.case_price.toLocaleString()}đ</span>
                                    </div>
                                )}
                                <div>
                                    <span className="text-[10px] text-[#86868B] uppercase font-bold block mb-0.5">Tồn kho</span>
                                    <span className="text-[#1D1D1F] font-bold text-[14px] bg-[#F5F5F7] px-2 py-0.5 rounded-md">{p.stock}</span>
                                </div>
                            </div>
                            {p.code && (
                                <div className="mt-3 flex items-center gap-1.5 bg-[#F9F9FA] inline-flex px-2 py-1 rounded-lg">
                                    <QrCode size={14} className="text-[#86868B]" />
                                    <span className="text-[11px] text-[#86868B] font-mono font-medium">{p.code}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setEditingProduct(p)}
                                className="w-11 h-11 bg-blue-50 text-[#0071E3] rounded-full flex items-center justify-center active:scale-90 transition-all hover:bg-blue-100"
                            >
                                <Edit3 size={18} />
                            </button>
                            <button
                                onClick={() => handleDeleteProduct(p.id)}
                                className="w-11 h-11 bg-red-50 text-red-500 rounded-full flex items-center justify-center active:scale-90 transition-all hover:bg-red-100"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const OrdersTab = () => (
        <div className="space-y-4">
            <h3 className="text-[20px] font-black text-[#1D1D1F] px-2">Lịch sử đơn hàng</h3>

            {selectedOrder ? (
                <div className="bg-white rounded-[2.5rem] p-7 shadow-lg animate-in fade-in zoom-in-95">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h4 className="text-[18px] font-black text-[#1D1D1F]">Chi tiết đơn #{selectedOrder.id.toString().slice(-5)}</h4>
                            <p className="text-[13px] text-[#86868B] mt-1 font-medium">{new Date(selectedOrder.timestamp).toLocaleString()}</p>
                        </div>
                        <button onClick={() => setSelectedOrder(null)} className="p-3 bg-[#F5F5F7] rounded-full hover:bg-[#E8E8ED]">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-3 mb-6 bg-[#F9F9FA] p-4 rounded-3xl">
                        {selectedOrder.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center p-3 bg-white rounded-2xl shadow-sm border border-[#F5F5F7]">
                                <div>
                                    <p className="font-bold text-[#1D1D1F] text-[14px]">{item.displayName || item.name}</p>
                                    <p className="text-[12px] text-[#86868B] mt-0.5">SL: {item.quantity} x {item.finalPrice?.toLocaleString() || item.price?.toLocaleString()}đ</p>
                                </div>
                                <span className="font-bold text-[#0071E3] text-[15px]">
                                    {((item.finalPrice || item.price) * item.quantity).toLocaleString()}đ
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="pt-4 border-t border-[#F5F5F7]">
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-[#86868B] text-[14px] uppercase tracking-wider">Tổng thanh toán</span>
                            <span className="font-black text-[#1D1D1F] text-[24px]">{selectedOrder.total.toLocaleString()}đ</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    {history.map(o => (
                        <button
                            key={o.id}
                            onClick={() => setSelectedOrder(o)}
                            className="w-full bg-white p-5 rounded-3xl flex justify-between items-center active:bg-[#F9F9FA] transition-all shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-[#F5F5F7] hover:shadow-md"
                        >
                            <div className="flex gap-4 items-center">
                                <div className="w-14 h-14 bg-[#0071E3]/10 rounded-2xl flex items-center justify-center text-[#0071E3]">
                                    <Receipt size={24} />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-[#1D1D1F] text-[16px]">Đơn hàng #{o.id.toString().slice(-5)}</p>
                                    <p className="text-[12px] text-[#86868B] font-medium mt-1">{new Date(o.timestamp).toLocaleString()} • <span className="text-[#1D1D1F]">{o.items.length} món</span></p>
                                </div>
                            </div>
                            <span className="font-black text-[#0071E3] text-[18px]">{o.total.toLocaleString()}đ</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );

    const DashboardTab = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-5">
                <div className="bg-white p-6 rounded-[2.5rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#F5F5F7] hover:-translate-y-1 transition-transform cursor-default">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-blue-50 text-[#0071E3] rounded-full flex items-center justify-center">
                            <TrendingUp size={20} />
                        </div>
                        <p className="text-[12px] font-bold text-[#86868B] uppercase tracking-wider">Doanh thu</p>
                    </div>
                    <h3 className="text-[28px] font-black text-[#1D1D1F]">{revenue.toLocaleString()}<small className="text-[14px] ml-2 opacity-40 font-bold">VND</small></h3>
                </div>

                <div className="bg-white p-6 rounded-[2.5rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#F5F5F7] hover:-translate-y-1 transition-transform cursor-default">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center">
                            <ShoppingBag size={20} />
                        </div>
                        <p className="text-[12px] font-bold text-[#86868B] uppercase tracking-wider">Đơn bán</p>
                    </div>
                    <h3 className="text-[32px] font-black text-[#1D1D1F]">{todayOrders.length}</h3>
                </div>
            </div>

            <div className="bg-gradient-to-br from-[#0071E3] to-[#0052A3] p-8 rounded-[2.5rem] text-white relative overflow-hidden shadow-2xl shadow-blue-500/20">
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <Sparkles size={24} className="animate-pulse text-yellow-300" />
                        <h3 className="text-[18px] font-black tracking-tight">Trợ lý AI Gemini</h3>
                    </div>
                    <p className="text-white/90 text-[14px] mb-8 leading-relaxed max-w-sm font-medium">
                        Phân tích dữ liệu bán hàng thời gian thực và đề xuất nhập hàng thông minh.
                    </p>
                    <button className="bg-white text-[#0071E3] px-7 py-3.5 rounded-full font-bold text-[14px] flex items-center gap-2 shadow-xl hover:shadow-2xl hover:scale-105 transition-all">
                        Phân tích ngay <ArrowUpRight size={18} />
                    </button>
                </div>
                <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-white/10 blur-[80px] rounded-full mix-blend-overlay"></div>
                <div className="absolute top-0 right-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>
            </div>
        </div>
    );

    const handleDeleteProduct = async (id) => {
        if (!confirm('Bạn có chắc muốn xóa sản phẩm này?')) return;

        try {
            const res = await fetch(`${API_URL}/products/${id}`, { method: 'DELETE' });
            if (res.ok) {
                refreshData();
            }
        } catch (error) {
            console.error('Delete failed:', error);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-[#F5F5F7] font-['Inter']">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-[#D2D2D7]/30 px-6 py-5 z-20">
                <div className="flex justify-between items-center mb-5">
                    <button
                        onClick={onBackToPos}
                        className="flex items-center gap-2 text-[#0071E3] font-bold text-[15px] hover:opacity-70 transition-opacity bg-blue-50 px-4 py-2 rounded-full"
                    >
                        <ChevronLeft size={20} /> Quay lại P.O.S
                    </button>
                    <h1 className="text-[15px] font-black text-[#1D1D1F] uppercase tracking-widest opacity-80">System Admin</h1>
                    <div className="w-32"></div>
                </div>

                <div className="flex gap-3 bg-[#E8E8ED] p-1.5 rounded-full w-fit mx-auto">
                    {[
                        { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
                        { id: 'products', label: 'DS Sản phẩm', icon: Package },
                        { id: 'orders', label: 'DS Đơn hàng', icon: Receipt }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-6 py-2.5 rounded-full text-[13px] font-bold flex items-center justify-center gap-2 transition-all ${activeTab === tab.id
                                    ? 'bg-white text-[#1D1D1F] shadow-md'
                                    : 'text-[#86868B] hover:text-[#1D1D1F]'
                                }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full pb-20">
                {activeTab === 'dashboard' && <DashboardTab />}
                {activeTab === 'products' && <ProductsTab />}
                {activeTab === 'orders' && <OrdersTab />}
            </main>

            {/* Edit/Add Product Modal */}
            {(editingProduct || showAddProduct) && (
                <ProductModal
                    product={editingProduct}
                    onClose={() => { setEditingProduct(null); setShowAddProduct(false); }}
                    onSave={() => { refreshData(); setEditingProduct(null); setShowAddProduct(false); }}
                />
            )}
        </div>
    );
};

const ProductModal = ({ product, onClose, onSave }) => {
    const isEdit = !!product;
    const [formData, setFormData] = useState(product || {
        name: '',
        brand: '',
        category: '',
        price: 0,
        case_price: 0,
        units_per_case: 1,
        stock: 0,
        code: '',
        image: ''
    });
    const [imagePreview, setImagePreview] = useState(product?.image || '');

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
                setFormData({ ...formData, image: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async () => {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

        try {
            const url = isEdit ? `${API_URL}/products/${formData.id}` : `${API_URL}/products`;
            const method = isEdit ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                onSave();
            }
        } catch (error) {
            console.error('Save failed:', error);
        }
    };

    return (
        <div className="fixed inset-0 bg-[#000000]/40 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[2.5rem] overflow-hidden shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-[#F5F5F7] bg-white sticky top-0 z-10">
                    <div className="flex justify-between items-center">
                        <h3 className="text-[20px] font-black text-[#1D1D1F]">
                            {isEdit ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
                        </h3>
                        <button onClick={onClose} className="p-3 bg-[#F5F5F7] rounded-full hover:bg-[#E8E8ED] transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="p-8 overflow-y-auto max-h-[calc(90vh-140px)] bg-white">
                    <div className="space-y-6">
                        {/* Image Upload */}
                        <div>
                            <label className="text-[12px] font-bold text-[#86868B] uppercase tracking-wider block mb-3">Hình ảnh sản phẩm</label>
                            <div className="flex gap-6">
                                <div className="w-32 h-32 bg-[#F5F5F7] rounded-3xl overflow-hidden flex items-center justify-center border border-[#E8E8ED]">
                                    {imagePreview ? (
                                        <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                                    ) : (
                                        <ImageIcon size={40} className="text-[#D2D2D7]" />
                                    )}
                                </div>
                                <div className="flex-1 space-y-3">
                                    <label className="block cursor-pointer">
                                        <div className="border-2 border-dashed border-[#D2D2D7] rounded-2xl p-6 text-center hover:border-[#0071E3] hover:bg-blue-50/50 transition-all group">
                                            <Upload size={28} className="mx-auto text-[#86868B] mb-2 group-hover:text-[#0071E3]" />
                                            <p className="text-[13px] font-bold text-[#1D1D1F] group-hover:text-[#0071E3]">Tải ảnh lên</p>
                                        </div>
                                        <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Hoặc dán URL ảnh tại đây..."
                                        value={formData.image || ''}
                                        onChange={(e) => { setFormData({ ...formData, image: e.target.value }); setImagePreview(e.target.value); }}
                                        className="w-full px-5 py-3.5 bg-[#F9F9FA] rounded-xl text-[13px] font-medium outline-none focus:ring-2 focus:ring-[#0071E3]/20 transition-all placeholder:text-[#D2D2D7] border border-transparent focus:border-[#0071E3]"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Basic Info */}
                        <div className="grid grid-cols-2 gap-5">
                            <div className="col-span-2">
                                <label className="text-[12px] font-bold text-[#86868B] uppercase tracking-wider block mb-2">Tên sản phẩm *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-5 py-4 bg-[#F9F9FA] rounded-2xl text-[16px] font-bold text-[#1D1D1F] outline-none focus:ring-2 focus:ring-[#0071E3]/20 border border-transparent focus:border-[#0071E3] transition-all"
                                    placeholder="Ví dụ: Turbo Đỏ Lon"
                                />
                            </div>

                            <div>
                                <label className="text-[12px] font-bold text-[#86868B] uppercase tracking-wider block mb-2">Thương hiệu</label>
                                <input
                                    type="text"
                                    value={formData.brand || ''}
                                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                    className="w-full px-5 py-3.5 bg-[#F9F9FA] rounded-xl text-[14px] font-medium outline-none focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
                                    placeholder="Ví dụ: Turbo"
                                />
                            </div>

                            <div>
                                <label className="text-[12px] font-bold text-[#86868B] uppercase tracking-wider block mb-2">Danh mục</label>
                                <input
                                    type="text"
                                    value={formData.category || ''}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full px-5 py-3.5 bg-[#F9F9FA] rounded-xl text-[14px] font-medium outline-none focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
                                    placeholder="Ví dụ: Nước mát"
                                />
                            </div>
                        </div>

                        {/* Pricing */}
                        <div className="bg-[#F9F9FA] p-5 rounded-3xl border border-[#F5F5F7]">
                            <h4 className="text-[14px] font-bold text-[#1D1D1F] mb-4 flex items-center gap-2"><Receipt size={16} /> Thiết lập giá</h4>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-[11px] font-bold text-[#86868B] uppercase tracking-wider block mb-2">Giá lẻ (VND) *</label>
                                    <input
                                        type="number"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                                        className="w-full px-4 py-3 bg-white rounded-xl text-[15px] font-bold text-[#0071E3] outline-none focus:ring-2 focus:ring-[#0071E3]/20 border border-[#E8E8ED] focus:border-[#0071E3]"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-[#86868B] uppercase tracking-wider block mb-2">Giá thùng (VND)</label>
                                    <input
                                        type="number"
                                        value={formData.case_price || 0}
                                        onChange={(e) => setFormData({ ...formData, case_price: parseInt(e.target.value) || 0 })}
                                        className="w-full px-4 py-3 bg-white rounded-xl text-[15px] font-bold text-emerald-600 outline-none focus:ring-2 focus:ring-[#0071E3]/20 border border-[#E8E8ED] focus:border-[#0071E3]"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-[#86868B] uppercase tracking-wider block mb-2">SL/Thùng</label>
                                    <input
                                        type="number"
                                        value={formData.units_per_case || 1}
                                        onChange={(e) => setFormData({ ...formData, units_per_case: parseInt(e.target.value) || 1 })}
                                        className="w-full px-4 py-3 bg-white rounded-xl text-[15px] font-medium outline-none focus:ring-2 focus:ring-[#0071E3]/20 border border-[#E8E8ED] focus:border-[#0071E3]"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Stock & QR Code */}
                        <div className="grid grid-cols-2 gap-5">
                            <div>
                                <label className="text-[12px] font-bold text-[#86868B] uppercase tracking-wider block mb-2">Tồn kho</label>
                                <input
                                    type="number"
                                    value={formData.stock || 0}
                                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                                    className="w-full px-5 py-3.5 bg-[#F9F9FA] rounded-xl text-[14px] font-medium outline-none focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-[12px] font-bold text-[#86868B] uppercase tracking-wider block mb-2 flex items-center gap-2">
                                    <QrCode size={16} /> Mã QR Code
                                </label>
                                <input
                                    type="text"
                                    value={formData.code || ''}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    className="w-full px-5 py-3.5 bg-[#F9F9FA] rounded-xl text-[14px] font-mono font-medium outline-none focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
                                    placeholder="Mã vạch sản phẩm"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-[#F5F5F7] bg-[#F9F9FA]">
                    <button
                        onClick={handleSubmit}
                        className="w-full bg-[#0071E3] text-white py-4 rounded-2xl font-bold text-[16px] flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-lg hover:shadow-blue-500/30 hover:bg-[#0077ED]"
                    >
                        <Save size={20} /> {isEdit ? 'Lưu thay đổi' : 'Thêm sản phẩm'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminPage;
