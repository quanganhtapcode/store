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
            <div className="flex justify-between items-center">
                <h3 className="text-[18px] font-bold text-[#1D1D1F]">Quản lý sản phẩm</h3>
                <button
                    onClick={() => setShowAddProduct(true)}
                    className="bg-[#0071E3] text-white px-5 py-2.5 rounded-full text-[13px] font-bold flex items-center gap-2 active:scale-95 transition-all shadow-md"
                >
                    <Plus size={16} /> Thêm mới
                </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
                {products.map(p => (
                    <div key={p.id} className="bg-white p-4 rounded-2xl flex items-center gap-4 shadow-sm border border-[#F5F5F7]">
                        <div className="w-16 h-16 bg-[#F5F5F7] rounded-xl overflow-hidden flex-shrink-0">
                            {p.image ? (
                                <img src={p.image} className="w-full h-full object-cover" alt="" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-[#D2D2D7]">
                                    <ImageIcon size={24} />
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-[#1D1D1F] text-[14px] line-clamp-1">{p.name}</h4>
                            <div className="flex items-center gap-4 mt-1.5">
                                <div>
                                    <span className="text-[9px] text-[#86868B] uppercase font-bold block">Lẻ</span>
                                    <span className="text-[#0071E3] font-bold text-[12px]">{p.price.toLocaleString()}đ</span>
                                </div>
                                {p.case_price > 0 && (
                                    <div>
                                        <span className="text-[9px] text-[#86868B] uppercase font-bold block">Thùng ({p.units_per_case})</span>
                                        <span className="text-emerald-600 font-bold text-[12px]">{p.case_price.toLocaleString()}đ</span>
                                    </div>
                                )}
                                <div>
                                    <span className="text-[9px] text-[#86868B] uppercase font-bold block">Tồn kho</span>
                                    <span className="text-[#1D1D1F] font-bold text-[12px]">{p.stock}</span>
                                </div>
                            </div>
                            {p.code && (
                                <div className="mt-2 flex items-center gap-1.5">
                                    <QrCode size={12} className="text-[#86868B]" />
                                    <span className="text-[10px] text-[#86868B] font-mono">{p.code}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setEditingProduct(p)}
                                className="w-9 h-9 bg-blue-50 text-[#0071E3] rounded-full flex items-center justify-center active:scale-90 transition-all"
                            >
                                <Edit3 size={14} />
                            </button>
                            <button
                                onClick={() => handleDeleteProduct(p.id)}
                                className="w-9 h-9 bg-red-50 text-red-500 rounded-full flex items-center justify-center active:scale-90 transition-all"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const OrdersTab = () => (
        <div className="space-y-4">
            <h3 className="text-[18px] font-bold text-[#1D1D1F]">Lịch sử đơn hàng</h3>

            {selectedOrder ? (
                <div className="bg-white rounded-[2rem] p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h4 className="text-[16px] font-bold text-[#1D1D1F]">Đơn #{selectedOrder.id.toString().slice(-5)}</h4>
                            <p className="text-[11px] text-[#86868B] mt-1 font-medium">{new Date(selectedOrder.timestamp).toLocaleString()}</p>
                        </div>
                        <button onClick={() => setSelectedOrder(null)} className="p-2 bg-[#F5F5F7] rounded-full">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="space-y-3 mb-6">
                        {selectedOrder.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center p-3 bg-[#F5F5F7] rounded-xl">
                                <div>
                                    <p className="font-bold text-[#1D1D1F] text-[13px]">{item.displayName || item.name}</p>
                                    <p className="text-[11px] text-[#86868B]">SL: {item.quantity} x {item.finalPrice?.toLocaleString() || item.price?.toLocaleString()}đ</p>
                                </div>
                                <span className="font-bold text-[#0071E3] text-[13px]">
                                    {((item.finalPrice || item.price) * item.quantity).toLocaleString()}đ
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="pt-4 border-t border-[#F5F5F7]">
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-[#86868B] text-[13px] uppercase">Tổng cộng</span>
                            <span className="font-black text-[#1D1D1F] text-[20px]">{selectedOrder.total.toLocaleString()}đ</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-2">
                    {history.map(o => (
                        <button
                            key={o.id}
                            onClick={() => setSelectedOrder(o)}
                            className="w-full bg-white p-4 rounded-2xl flex justify-between items-center active:bg-[#F5F5F7] transition-colors shadow-sm border border-[#F5F5F7]"
                        >
                            <div className="flex gap-3 items-center">
                                <div className="w-12 h-12 bg-[#0071E3]/10 rounded-xl flex items-center justify-center">
                                    <Receipt size={18} className="text-[#0071E3]" />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-[#1D1D1F] text-[14px]">#{o.id.toString().slice(-5)}</p>
                                    <p className="text-[11px] text-[#86868B] font-medium">{new Date(o.timestamp).toLocaleString()} • {o.items.length} món</p>
                                </div>
                            </div>
                            <span className="font-bold text-[#0071E3] text-[15px]">{o.total.toLocaleString()}đ</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );

    const DashboardTab = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-[#F5F5F7]">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-blue-50 text-[#0071E3] rounded-full flex items-center justify-center">
                            <TrendingUp size={16} />
                        </div>
                        <p className="text-[11px] font-bold text-[#86868B] uppercase tracking-wider">Doanh thu hôm nay</p>
                    </div>
                    <h3 className="text-[24px] font-black text-[#1D1D1F]">{revenue.toLocaleString()}<small className="text-[11px] ml-1.5 opacity-30 font-bold">đ</small></h3>
                </div>

                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-[#F5F5F7]">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center">
                            <ShoppingBag size={16} />
                        </div>
                        <p className="text-[11px] font-bold text-[#86868B] uppercase tracking-wider">Đơn hàng</p>
                    </div>
                    <h3 className="text-[28px] font-black text-[#1D1D1F]">{todayOrders.length}</h3>
                </div>
            </div>

            <div className="bg-gradient-to-br from-[#0071E3] to-[#0059B3] p-8 rounded-[2.5rem] text-white relative overflow-hidden shadow-xl">
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                        <Sparkles size={20} className="animate-pulse" />
                        <h3 className="text-[16px] font-bold">Gemini AI Insights</h3>
                    </div>
                    <p className="text-white/80 text-[13px] mb-6 leading-relaxed">
                        Phân tích dữ liệu bán hàng và đưa ra gợi ý kinh doanh thông minh.
                    </p>
                    <button className="bg-white text-[#0071E3] px-6 py-3 rounded-full font-bold text-[13px] flex items-center gap-2 shadow-lg hover:shadow-xl transition-all">
                        Phân tích ngay <ArrowUpRight size={16} />
                    </button>
                </div>
                <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-white/10 blur-3xl rounded-full"></div>
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
            <header className="bg-white/80 backdrop-blur-md border-b border-[#D2D2D7]/30 px-6 py-4">
                <div className="flex justify-between items-center mb-4">
                    <button
                        onClick={onBackToPos}
                        className="flex items-center gap-2 text-[#0071E3] font-bold text-[14px] active:opacity-60 transition-opacity"
                    >
                        <ChevronLeft size={20} /> Quay lại POS
                    </button>
                    <h1 className="text-[14px] font-black text-[#1D1D1F] uppercase tracking-wider">Quản lý</h1>
                    <div className="w-24"></div>
                </div>

                <div className="flex gap-2">
                    {[
                        { id: 'dashboard', label: 'Tổng quan', icon: TrendingUp },
                        { id: 'products', label: 'Sản phẩm', icon: Package },
                        { id: 'orders', label: 'Đơn hàng', icon: Receipt }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 px-4 py-2.5 rounded-full text-[12px] font-bold flex items-center justify-center gap-2 transition-all ${activeTab === tab.id
                                    ? 'bg-[#0071E3] text-white shadow-md'
                                    : 'bg-[#E8E8ED] text-[#86868B] hover:bg-[#D2D2D7]/50'
                                }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full">
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
        <div className="fixed inset-0 bg-[#1D1D1F]/70 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[2rem] overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-[#F5F5F7]">
                    <div className="flex justify-between items-center">
                        <h3 className="text-[18px] font-bold text-[#1D1D1F]">
                            {isEdit ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
                        </h3>
                        <button onClick={onClose} className="p-2 bg-[#F5F5F7] rounded-full hover:bg-[#E8E8ED] transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                    <div className="space-y-5">
                        {/* Image Upload */}
                        <div>
                            <label className="text-[11px] font-bold text-[#86868B] uppercase tracking-wider block mb-3">Hình ảnh sản phẩm</label>
                            <div className="flex items-center gap-4">
                                <div className="w-24 h-24 bg-[#F5F5F7] rounded-2xl overflow-hidden flex items-center justify-center">
                                    {imagePreview ? (
                                        <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                                    ) : (
                                        <ImageIcon size={32} className="text-[#D2D2D7]" />
                                    )}
                                </div>
                                <label className="flex-1 cursor-pointer">
                                    <div className="border-2 border-dashed border-[#D2D2D7] rounded-xl p-4 text-center hover:border-[#0071E3] transition-colors">
                                        <Upload size={24} className="mx-auto text-[#86868B] mb-2" />
                                        <p className="text-[12px] font-bold text-[#86868B]">Click để chọn ảnh</p>
                                        <p className="text-[10px] text-[#D2D2D7] mt-1">Hoặc paste URL ảnh vào ô bên dưới</p>
                                    </div>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                                </label>
                            </div>
                            <input
                                type="text"
                                placeholder="hoặc paste URL ảnh tại đây..."
                                value={formData.image || ''}
                                onChange={(e) => { setFormData({ ...formData, image: e.target.value }); setImagePreview(e.target.value); }}
                                className="w-full mt-3 px-4 py-3 bg-[#F5F5F7] rounded-xl text-[13px] font-medium outline-none focus:ring-2 focus:ring-[#0071E3]/30 placeholder:text-[#D2D2D7]"
                            />
                        </div>

                        {/* Basic Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="text-[11px] font-bold text-[#86868B] uppercase tracking-wider block mb-2">Tên sản phẩm *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-[#F5F5F7] rounded-xl text-[14px] font-medium outline-none focus:ring-2 focus:ring-[#0071E3]/30"
                                    placeholder="Ví dụ: Turbo Đỏ Lon"
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-[#86868B] uppercase tracking-wider block mb-2">Thương hiệu</label>
                                <input
                                    type="text"
                                    value={formData.brand || ''}
                                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                    className="w-full px-4 py-3 bg-[#F5F5F7] rounded-xl text-[14px] font-medium outline-none focus:ring-2 focus:ring-[#0071E3]/30"
                                    placeholder="Ví dụ: Turbo"
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-[#86868B] uppercase tracking-wider block mb-2">Danh mục</label>
                                <input
                                    type="text"
                                    value={formData.category || ''}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full px-4 py-3 bg-[#F5F5F7] rounded-xl text-[14px] font-medium outline-none focus:ring-2 focus:ring-[#0071E3]/30"
                                    placeholder="Ví dụ: Nước mát"
                                />
                            </div>
                        </div>

                        {/* Pricing */}
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="text-[11px] font-bold text-[#86868B] uppercase tracking-wider block mb-2">Giá lẻ (VND) *</label>
                                <input
                                    type="number"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                                    className="w-full px-4 py-3 bg-[#F5F5F7] rounded-xl text-[14px] font-medium outline-none focus:ring-2 focus:ring-[#0071E3]/30"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-[#86868B] uppercase tracking-wider block mb-2">Giá thùng (VND)</label>
                                <input
                                    type="number"
                                    value={formData.case_price || 0}
                                    onChange={(e) => setFormData({ ...formData, case_price: parseInt(e.target.value) || 0 })}
                                    className="w-full px-4 py-3 bg-[#F5F5F7] rounded-xl text-[14px] font-medium outline-none focus:ring-2 focus:ring-[#0071E3]/30"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-[#86868B] uppercase tracking-wider block mb-2">SL/Thùng</label>
                                <input
                                    type="number"
                                    value={formData.units_per_case || 1}
                                    onChange={(e) => setFormData({ ...formData, units_per_case: parseInt(e.target.value) || 1 })}
                                    className="w-full px-4 py-3 bg-[#F5F5F7] rounded-xl text-[14px] font-medium outline-none focus:ring-2 focus:ring-[#0071E3]/30"
                                />
                            </div>
                        </div>

                        {/* Stock & QR Code */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[11px] font-bold text-[#86868B] uppercase tracking-wider block mb-2">Tồn kho</label>
                                <input
                                    type="number"
                                    value={formData.stock || 0}
                                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                                    className="w-full px-4 py-3 bg-[#F5F5F7] rounded-xl text-[14px] font-medium outline-none focus:ring-2 focus:ring-[#0071E3]/30"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-[#86868B] uppercase tracking-wider block mb-2 flex items-center gap-2">
                                    <QrCode size={14} /> Mã QR Code
                                </label>
                                <input
                                    type="text"
                                    value={formData.code || ''}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    className="w-full px-4 py-3 bg-[#F5F5F7] rounded-xl text-[14px] font-mono font-medium outline-none focus:ring-2 focus:ring-[#0071E3]/30"
                                    placeholder="Mã để quét"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-[#F5F5F7] bg-[#FBFBFD]">
                    <button
                        onClick={handleSubmit}
                        className="w-full bg-[#0071E3] text-white py-4 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-md hover:shadow-lg"
                    >
                        <Save size={18} /> {isEdit ? 'Lưu thay đổi' : 'Thêm sản phẩm'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminPage;
