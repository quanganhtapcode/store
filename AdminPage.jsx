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
            <div className="flex justify-between items-center bg-white p-5 rounded-[2rem] mb-2 shadow-sm border border-[#F5F5F7]">
                <h3 className="text-[20px] font-black text-[#1D1D1F] tracking-tight">Sản phẩm ({products.length})</h3>
                <button
                    onClick={() => setShowAddProduct(true)}
                    className="bg-[#0071E3] text-white px-5 py-3 rounded-full text-[14px] font-bold flex items-center gap-2 active:scale-95 transition-all shadow-md hover:bg-[#0077ED]"
                >
                    <Plus size={18} /> <span className="hidden sm:inline">Thêm mới</span>
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {products.map(p => (
                    <div key={p.id} className="bg-white p-5 rounded-[2rem] flex flex-col sm:flex-row items-start sm:items-center gap-5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-[#F5F5F7] hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className="w-24 h-24 bg-[#F5F5F7] rounded-2xl overflow-hidden flex-shrink-0 border border-[#E8E8ED] mx-auto sm:mx-0">
                            {p.image ? (
                                <img src={p.image} className="w-full h-full object-cover" alt="" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-[#D2D2D7]">
                                    <ImageIcon size={32} />
                                </div>
                            )}
                        </div>

                        <div className="flex-1 min-w-0 w-full text-center sm:text-left">
                            <h4 className="font-extrabold text-[#1D1D1F] text-[18px] mb-3 leading-tight">{p.name}</h4>

                            <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-3">
                                <div>
                                    <span className="text-[10px] text-[#86868B] uppercase font-bold tracking-wider block mb-0.5">Giá lẻ</span>
                                    <span className="text-[#0071E3] font-bold text-[16px] block">{p.price.toLocaleString()}đ</span>
                                </div>
                                {p.case_price > 0 && (
                                    <div>
                                        <span className="text-[10px] text-[#86868B] uppercase font-bold tracking-wider block mb-0.5">Giá thùng ({p.units_per_case})</span>
                                        <span className="text-emerald-600 font-bold text-[16px] block">{p.case_price.toLocaleString()}đ</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-center sm:justify-start gap-3">
                                <div className="bg-[#F5F5F7] px-3 py-1.5 rounded-lg flex items-center gap-2">
                                    <span className="text-[10px] text-[#86868B] uppercase font-bold">Tồn kho</span>
                                    <span className="text-[#1D1D1F] font-bold text-[14px]">{p.stock}</span>
                                </div>
                                {p.code && (
                                    <div className="bg-[#F9F9FA] px-2 py-1.5 rounded-lg flex items-center gap-1.5">
                                        <QrCode size={14} className="text-[#86868B]" />
                                        <span className="text-[11px] text-[#86868B] font-mono font-medium truncate max-w-[80px]">{p.code}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex sm:flex-col gap-2 w-full sm:w-auto mt-2 sm:mt-0 justify-center">
                            <button
                                onClick={() => setEditingProduct(p)}
                                className="w-12 h-12 bg-blue-50 text-[#0071E3] rounded-full flex items-center justify-center active:scale-90 transition-all hover:bg-blue-100"
                            >
                                <Edit3 size={20} />
                            </button>
                            <button
                                onClick={() => handleDeleteProduct(p.id)}
                                className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center active:scale-90 transition-all hover:bg-red-100"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const OrdersTab = () => (
        <div className="space-y-4">
            <h3 className="text-[20px] font-black text-[#1D1D1F] px-2 pb-2">Lịch sử đơn hàng</h3>

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

                    <div className="space-y-3 mb-6 bg-[#F9F9FA] p-4 rounded-3xl max-h-[50vh] overflow-y-auto">
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
                            className="w-full bg-white p-5 rounded-[2rem] flex justify-between items-center active:bg-[#F9F9FA] transition-all shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-[#F5F5F7] hover:shadow-md group"
                        >
                            <div className="flex gap-4 items-center">
                                <div className="w-14 h-14 bg-[#0071E3]/5 group-hover:bg-[#0071E3]/10 rounded-2xl flex items-center justify-center text-[#0071E3] transition-colors">
                                    <Receipt size={24} />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-[#1D1D1F] text-[16px]">Đơn #{o.id.toString().slice(-5)}</p>
                                    <p className="text-[12px] text-[#86868B] font-medium mt-1">{new Date(o.timestamp).toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="font-black text-[#0071E3] text-[18px] block">{o.total.toLocaleString()}đ</span>
                                <span className="text-[11px] text-[#86868B] font-bold">{o.items.length} món</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );

    const DashboardTab = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-[2.5rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#F5F5F7]">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-blue-50 text-[#0071E3] rounded-full flex items-center justify-center">
                            <TrendingUp size={20} />
                        </div>
                        <p className="text-[12px] font-bold text-[#86868B] uppercase tracking-wider">Doanh thu</p>
                    </div>
                    <h3 className="text-[24px] font-black text-[#1D1D1F]">{revenue.toLocaleString()}</h3>
                </div>

                <div className="bg-white p-5 rounded-[2.5rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#F5F5F7]">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center">
                            <ShoppingBag size={20} />
                        </div>
                        <p className="text-[12px] font-bold text-[#86868B] uppercase tracking-wider">Đơn bán</p>
                    </div>
                    <h3 className="text-[24px] font-black text-[#1D1D1F]">{todayOrders.length}</h3>
                </div>
            </div>

            <div className="bg-[#1D1D1F] p-8 rounded-[2.5rem] text-white relative overflow-hidden shadow-2xl">
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <Sparkles size={24} className="text-yellow-400" />
                        <h3 className="text-[18px] font-black tracking-tight">Trợ lý AI Gemini</h3>
                    </div>
                    <p className="text-white/60 text-[14px] mb-8 leading-relaxed max-w-sm font-medium">
                        Phân tích dữ liệu & đề xuất chiến lược.
                    </p>
                    <button className="bg-white text-[#1D1D1F] px-8 py-3 rounded-full font-bold text-[14px] flex items-center gap-2 hover:scale-105 transition-all">
                        Phân tích ngay <ArrowUpRight size={18} />
                    </button>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/30 blur-[80px] rounded-full "></div>
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
            <header className="bg-white/80 backdrop-blur-md border-b border-[#D2D2D7]/30 px-4 py-4 z-20 sticky top-0">
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={onBackToPos}
                        className="flex items-center gap-2 bg-[#E8E8ED] hover:bg-[#D2D2D7] text-[#1D1D1F] px-4 py-2 rounded-full font-bold text-[13px] transition-colors"
                    >
                        <ChevronLeft size={18} /> Quay lại
                    </button>
                    <span className="font-black text-[14px] text-[#1D1D1F] uppercase tracking-widest opacity-40">System Admin</span>
                    <div className="w-24"></div>
                </div>

                <div className="flex justify-center">
                    <div className="flex p-1 bg-[#E8E8ED] rounded-2xl w-full max-w-md shadow-inner">
                        {[
                            { id: 'dashboard', label: 'Dashboard' },
                            { id: 'products', label: 'Sản phẩm' },
                            { id: 'orders', label: 'Đơn hàng' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all ${activeTab === tab.id
                                        ? 'bg-white text-[#1D1D1F] shadow-[0_2px_8px_rgba(0,0,0,0.08)] scale-[1.02]'
                                        : 'text-[#86868B] hover:text-[#1D1D1F]'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 overflow-y-auto p-4 w-full pb-20">
                <div className="max-w-2xl mx-auto w-full">
                    {activeTab === 'dashboard' && <DashboardTab />}
                    {activeTab === 'products' && <ProductsTab />}
                    {activeTab === 'orders' && <OrdersTab />}
                </div>
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
        <div className="fixed inset-0 bg-[#000000]/30 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in">
            <div className="bg-white w-full sm:max-w-xl h-[90vh] sm:h-auto sm:max-h-[90vh] rounded-t-[2.5rem] sm:rounded-[3rem] overflow-hidden shadow-2xl flex flex-col animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300">
                <div className="p-5 border-b border-[#F5F5F7] bg-white text-center relative shrink-0">
                    <h3 className="text-[18px] font-black text-[#1D1D1F]">
                        {isEdit ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
                    </h3>
                    <button onClick={onClose} className="absolute right-5 top-1/2 -translate-y-1/2 p-2 bg-[#F5F5F7] rounded-full hover:bg-[#E8E8ED] transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-white">
                    <div className="space-y-6">
                        {/* Image Upload */}
                        <div className="flex flex-col items-center">
                            <div className="w-32 h-32 bg-[#F5F5F7] rounded-[2rem] overflow-hidden flex items-center justify-center border border-[#E8E8ED] mb-4 relative group">
                                {imagePreview ? (
                                    <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                                ) : (
                                    <ImageIcon size={40} className="text-[#D2D2D7]" />
                                )}
                            </div>
                            <div className="flex gap-2">
                                <label className="bg-[#0071E3] text-white px-4 py-2 rounded-full text-[13px] font-bold cursor-pointer hover:bg-[#0077ED] transition-colors">
                                    Tải ảnh
                                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                                </label>
                                <input
                                    type="text"
                                    placeholder="Dán URL ảnh..."
                                    value={formData.image || ''}
                                    onChange={(e) => { setFormData({ ...formData, image: e.target.value }); setImagePreview(e.target.value); }}
                                    className="bg-[#F9F9FA] px-4 py-2 rounded-full text-[13px] font-medium outline-none focus:ring-1 focus:ring-[#0071E3] transition-all w-48"
                                />
                            </div>
                        </div>

                        {/* Basic Info */}
                        <div className="space-y-4">
                            <div>
                                <label className="text-[11px] font-bold text-[#86868B] uppercase tracking-wider block mb-2 pl-1">Tên sản phẩm</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-5 py-4 bg-[#F9F9FA] rounded-[1.5rem] text-[16px] font-bold text-[#1D1D1F] outline-none focus:ring-2 focus:ring-[#0071E3]/20 transition-all border border-transparent focus:border-[#0071E3]"
                                    placeholder="Tên sản phẩm..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[11px] font-bold text-[#86868B] uppercase tracking-wider block mb-2 pl-1">Thương hiệu</label>
                                    <input
                                        type="text"
                                        value={formData.brand || ''}
                                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                        className="w-full px-4 py-3 bg-[#F9F9FA] rounded-[1.2rem] text-[14px] font-medium outline-none focus:ring-1 focus:ring-[#0071E3]"
                                        placeholder="Thương hiệu"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-[#86868B] uppercase tracking-wider block mb-2 pl-1">Danh mục</label>
                                    <input
                                        type="text"
                                        value={formData.category || ''}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-4 py-3 bg-[#F9F9FA] rounded-[1.2rem] text-[14px] font-medium outline-none focus:ring-1 focus:ring-[#0071E3]"
                                        placeholder="Danh mục"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Pricing */}
                        <div className="bg-[#F9F9FA] p-5 rounded-[2rem] border border-[#F5F5F7]">
                            <h4 className="text-[14px] font-bold text-[#1D1D1F] mb-4 flex items-center gap-2"><Receipt size={16} /> Giá bán</h4>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-3 sm:col-span-1">
                                    <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-wider block mb-1.5">Giá lẻ</label>
                                    <input
                                        type="number"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                                        className="w-full px-4 py-3 bg-white rounded-2xl text-[15px] font-bold text-[#0071E3] outline-none focus:ring-1 focus:ring-[#0071E3] border border-[#E8E8ED]"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-wider block mb-1.5">Giá thùng</label>
                                            <input
                                                type="number"
                                                value={formData.case_price || 0}
                                                onChange={(e) => setFormData({ ...formData, case_price: parseInt(e.target.value) || 0 })}
                                                className="w-full px-4 py-3 bg-white rounded-2xl text-[15px] font-bold text-emerald-600 outline-none focus:ring-1 focus:ring-[#0071E3] border border-[#E8E8ED]"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-[#86868B] uppercase tracking-wider block mb-1.5">SL/Thùng</label>
                                            <input
                                                type="number"
                                                value={formData.units_per_case || 1}
                                                onChange={(e) => setFormData({ ...formData, units_per_case: parseInt(e.target.value) || 1 })}
                                                className="w-full px-4 py-3 bg-white rounded-2xl text-[15px] font-medium outline-none focus:ring-1 focus:ring-[#0071E3] border border-[#E8E8ED]"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Additional */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[11px] font-bold text-[#86868B] uppercase tracking-wider block mb-2 pl-1">Tồn kho</label>
                                <input
                                    type="number"
                                    value={formData.stock || 0}
                                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                                    className="w-full px-5 py-3 bg-[#F9F9FA] rounded-[1.2rem] text-[14px] font-medium outline-none focus:ring-1 focus:ring-[#0071E3]"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-[#86868B] uppercase tracking-wider block mb-2 pl-1 flex items-center gap-1.5"><QrCode size={14} /> Mã QR</label>
                                <input
                                    type="text"
                                    value={formData.code || ''}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    className="w-full px-5 py-3 bg-[#F9F9FA] rounded-[1.2rem] text-[14px] font-mono font-medium outline-none focus:ring-1 focus:ring-[#0071E3]"
                                    placeholder="Scan mã..."
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-5 border-t border-[#F5F5F7] bg-white shrink-0">
                    <button
                        onClick={handleSubmit}
                        className="w-full bg-[#1D1D1F] text-white py-4 rounded-[1.5rem] font-bold text-[16px] flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                    >
                        <Save size={20} /> {isEdit ? 'Lưu thay đổi' : 'Thêm sản phẩm'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminPage;
