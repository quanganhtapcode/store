import React, { useState, useMemo, useRef } from 'react';
import {
    Package, Plus, Search, X, Image as ImageIcon, Sparkles,
    Edit3, Trash2, Save, ScanLine, Grid, List
} from 'lucide-react';
import { Html5Qrcode } from "html5-qrcode";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http') || imagePath.startsWith('data:')) return imagePath;
    let baseUrl = API_URL.replace(/\/api\/?$/, '');
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
    const path = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    return `${baseUrl}${path}`;
};

const formatNumber = (num) => {
    if (num === '' || num === null || num === undefined) return '';
    return Number(num).toLocaleString('vi-VN');
};

const normalizeText = (text) => {
    if (!text) return '';
    return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
};

// QR Scanner
const QRScanner = ({ onResult, onClose }) => {
    const scannerRef = useRef(null);
    const scannerId = "reader-products";

    React.useEffect(() => {
        const html5QrCode = new Html5Qrcode(scannerId);
        scannerRef.current = html5QrCode;
        const start = async () => {
            try {
                const devices = await Html5Qrcode.getCameras();
                if (devices && devices.length) {
                    const backCam = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
                    const cameraId = backCam ? backCam.id : devices[0].id;
                    await html5QrCode.start(cameraId, { fps: 25, qrbox: { width: 250, height: 250 } }, (text) => {
                        html5QrCode.stop().then(() => { onResult(text); onClose(); }).catch(() => {});
                    }, () => {});
                }
            } catch (e) { console.error(e); }
        };
        start();
        return () => { if (scannerRef.current?.isScanning) scannerRef.current.stop().catch(() => {}); };
    }, [onClose, onResult]);

    return (
        <div className="fixed inset-0 bg-black/95 z-[200] flex flex-col items-center justify-center p-4 text-white">
            <div className="w-full max-w-sm relative">
                <button onClick={onClose} className="absolute -top-14 right-0 p-3 bg-white/10 rounded-full z-50"><X size={24} /></button>
                <div className="w-full aspect-square overflow-hidden rounded-2xl border-4 border-indigo-500/50 bg-black">
                    <div id={scannerId} className="w-full h-full" />
                </div>
                <p className="text-center mt-4 text-slate-400 text-sm">Di chuyển camera lại gần mã QR/Barcode</p>
            </div>
        </div>
    );
};

// Product Modal
const ProductModal = ({ product, onClose, onSave, authToken, onLogout }) => {
    const isEdit = !!product;
    const [formData, setFormData] = useState(product || { name: '', brand: '', category: '', price: 0, case_price: 0, units_per_case: 1, stock: 0, code: '', image: '', cost_price: 0 });
    const [isScanning, setIsScanning] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [displayValues, setDisplayValues] = useState({
        price: formatNumber(product?.price || 0),
        case_price: formatNumber(product?.case_price || 0),
        cost_price: formatNumber(product?.cost_price || 0),
        units_per_case: String(product?.units_per_case || 1),
        stock: formatNumber(product?.stock || 0)
    });

    const handleNumberInput = (field, value) => {
        const numericValue = value.replace(/[^0-9]/g, '');
        setDisplayValues(prev => ({ ...prev, [field]: numericValue }));
        setFormData(prev => ({ ...prev, [field]: parseInt(numericValue, 10) || (field === 'units_per_case' ? 1 : 0) }));
    };
    const handleNumberBlur = (field) => {
        const value = formData[field] || (field === 'units_per_case' ? 1 : 0);
        setDisplayValues(prev => ({ ...prev, [field]: field === 'units_per_case' ? String(value) : formatNumber(value) }));
    };
    const handleNumberFocus = (field) => {
        const value = formData[field] || '';
        setDisplayValues(prev => ({ ...prev, [field]: value ? String(value) : '' }));
    };

    const compressImage = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('Không đọc được file ảnh'));
            reader.onload = (e) => {
                const img = new Image();
                img.onerror = () => reject(new Error('Định dạng ảnh không được hỗ trợ'));
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width, height = img.height;
                    const maxDim = 900;
                    if (width > height && width > maxDim) { height = Math.round(height * maxDim / width); width = maxDim; }
                    else if (height > maxDim) { width = Math.round(width * maxDim / height); height = maxDim; }
                    canvas.width = width; canvas.height = height;
                    canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                    // Giảm chất lượng nếu ảnh vẫn quá lớn (> ~7MB base64)
                    let quality = 0.8;
                    let result = canvas.toDataURL('image/jpeg', quality);
                    while (result.length > 7 * 1024 * 1024 && quality > 0.3) {
                        quality -= 0.1;
                        result = canvas.toDataURL('image/jpeg', quality);
                    }
                    resolve(result);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    };

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const compressed = await compressImage(file);
                setFormData({ ...formData, image: compressed });
            } catch (err) {
                alert('Không thể đọc ảnh: ' + err.message + '\nVui lòng dùng định dạng JPG, PNG hoặc WebP.');
            }
        }
    };

    const handleSubmit = async () => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            const url = isEdit ? `${API_URL}/products/${formData.id}` : `${API_URL}/products`;
            const res = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                body: JSON.stringify(formData)
            });
            if (res.status === 401) { alert('Phiên đăng nhập hết hạn.'); onLogout(); return; }
            onSave();
        } catch (e) { console.error(e); }
        finally { setIsSaving(false); }
    };

    const handleDelete = async () => {
        if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`${API_URL}/products/${formData.id}`, {
                method: 'DELETE', headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (res.status === 401) { alert('Phiên đăng nhập hết hạn.'); onLogout(); return; }
            if (res.ok) onSave(); else { const data = await res.json(); alert(data.error || 'Lỗi'); }
        } catch (e) { alert('Lỗi: ' + e.message); }
        finally { setIsDeleting(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in">
            {isScanning && <QRScanner onResult={(code) => { setFormData({ ...formData, code }); setIsScanning(false); }} onClose={() => setIsScanning(false)} />}
            <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
                    <h3 className="font-bold text-[18px] text-gray-900">{isEdit ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h3>
                    <button onClick={onClose} className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200"><X size={18} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {/* Image */}
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-24 h-24 bg-gray-50 rounded-2xl overflow-hidden border-2 border-dashed border-gray-200 flex items-center justify-center relative cursor-pointer hover:border-blue-400 transition-colors">
                            {formData.image ? <img src={getImageUrl(formData.image)} className="w-full h-full object-cover" /> : <ImageIcon className="text-gray-300" />}
                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageChange} accept="image/*" />
                        </div>
                        <p className="text-[11px] text-blue-500 font-bold">Chạm để đổi ảnh</p>
                    </div>
                    {/* Name */}
                    <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Tên sản phẩm" className="w-full bg-gray-50 p-4 rounded-xl font-bold outline-none border border-gray-200 focus:border-blue-400 transition-colors text-[14px]" />
                    {/* Prices */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[11px] font-bold uppercase text-gray-400 ml-1 tracking-wider">Giá lẻ (VND)</label>
                            <input type="text" inputMode="numeric" value={displayValues.price} onChange={e => handleNumberInput('price', e.target.value)} onFocus={() => handleNumberFocus('price')} onBlur={() => handleNumberBlur('price')} placeholder="0" className="w-full bg-gray-50 p-3 rounded-xl font-bold text-blue-500 outline-none border border-gray-200 focus:border-blue-400" />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold uppercase text-gray-400 ml-1 tracking-wider">Giá thùng (VND)</label>
                            <input type="text" inputMode="numeric" value={displayValues.case_price} onChange={e => handleNumberInput('case_price', e.target.value)} onFocus={() => handleNumberFocus('case_price')} onBlur={() => handleNumberBlur('case_price')} placeholder="0" className="w-full bg-gray-50 p-3 rounded-xl font-bold text-orange-500 outline-none border border-gray-200 focus:border-orange-400" />
                        </div>
                    </div>
                    {/* Cost Price (Giá nhập) */}
                    <div>
                        <label className="text-[11px] font-bold uppercase text-gray-400 ml-1 tracking-wider">Giá nhập (VND)</label>
                        <div className="relative">
                            <input type="text" inputMode="numeric" value={displayValues.cost_price} onChange={e => handleNumberInput('cost_price', e.target.value)} onFocus={() => handleNumberFocus('cost_price')} onBlur={() => handleNumberBlur('cost_price')} placeholder="0" className="w-full bg-gray-50 p-3 rounded-xl font-bold text-emerald-500 outline-none border border-gray-200 focus:border-emerald-400" />
                            {formData.cost_price > 0 && formData.price > 0 && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-lg">
                                    Margin: {((formData.price - formData.cost_price) / formData.price * 100).toFixed(1)}%
                                </span>
                            )}
                        </div>
                    </div>
                    {/* Units + Stock */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[11px] font-bold uppercase text-gray-400 ml-1 tracking-wider">SL/Thùng</label>
                            <input type="text" inputMode="numeric" value={displayValues.units_per_case} onChange={e => handleNumberInput('units_per_case', e.target.value)} onFocus={() => handleNumberFocus('units_per_case')} onBlur={() => handleNumberBlur('units_per_case')} className="w-full bg-gray-50 p-3 rounded-xl font-medium outline-none border border-gray-200 focus:border-blue-400" />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold uppercase text-gray-400 ml-1 tracking-wider">Tồn kho</label>
                            <input type="text" inputMode="numeric" value={displayValues.stock} onChange={e => handleNumberInput('stock', e.target.value)} onFocus={() => handleNumberFocus('stock')} onBlur={() => handleNumberBlur('stock')} className="w-full bg-gray-50 p-3 rounded-xl font-medium outline-none border border-gray-200 focus:border-blue-400" />
                        </div>
                    </div>
                    {/* Brand + Category */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[11px] font-bold uppercase text-gray-400 ml-1 tracking-wider">Thương hiệu</label>
                            <input value={formData.brand || ''} onChange={e => setFormData({ ...formData, brand: e.target.value })} placeholder="VD: Castrol..." className="w-full bg-gray-50 p-3 rounded-xl font-medium outline-none border border-gray-200 focus:border-blue-400" />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold uppercase text-gray-400 ml-1 tracking-wider">Danh mục</label>
                            <input value={formData.category || ''} onChange={e => setFormData({ ...formData, category: e.target.value })} placeholder="VD: Nhớt..." className="w-full bg-gray-50 p-3 rounded-xl font-medium outline-none border border-gray-200 focus:border-blue-400" />
                        </div>
                    </div>
                    {/* Barcode */}
                    <div>
                        <label className="text-[11px] font-bold uppercase text-gray-400 ml-1 tracking-wider">Mã vạch (Barcode)</label>
                        <div className="relative mt-1">
                            <input value={formData.code || ''} onChange={e => setFormData({ ...formData, code: e.target.value })} placeholder="Quét hoặc nhập mã..." className="w-full bg-gray-50 pl-4 pr-12 py-3.5 rounded-xl font-mono text-[14px] outline-none border border-gray-200 focus:border-blue-400" />
                            <button onClick={() => setIsScanning(true)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:scale-105 transition-transform">
                                <ScanLine size={18} />
                            </button>
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
                    {isEdit && (
                        <button onClick={handleDelete} disabled={isDeleting} className="bg-red-50 text-red-500 p-3.5 rounded-xl font-bold flex-shrink-0 hover:bg-red-100 transition-all disabled:opacity-50">
                            {isDeleting ? <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /> : <Trash2 size={20} />}
                        </button>
                    )}
                    <button onClick={handleSubmit} disabled={isSaving} className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3.5 rounded-xl font-bold text-[15px] shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2">
                        {isSaving ? (<><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Đang lưu...</>) : (isEdit ? 'Lưu thay đổi' : 'Thêm mới')}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ProductsView = ({ products, refreshData, authToken, onLogout }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [editingProduct, setEditingProduct] = useState(null);
    const [showAddProduct, setShowAddProduct] = useState(false);
    const [viewMode, setViewMode] = useState('grid');

    const productsByBrand = useMemo(() => {
        const grouped = {};
        const searchNorm = normalizeText(searchTerm);
        products.filter(p => {
            if (!searchTerm.trim()) return true;
            const searchWords = searchNorm.split(/\s+/).filter(w => w.length > 0);
            return searchWords.every(word =>
                normalizeText(p.name).includes(word) ||
                normalizeText(p.brand).includes(word) ||
                normalizeText(p.code).includes(word) ||
                normalizeText(p.category).includes(word)
            );
        }).forEach(p => {
            const brand = p.brand || 'Khác';
            if (!grouped[brand]) grouped[brand] = [];
            grouped[brand].push(p);
        });
        return grouped;
    }, [products, searchTerm]);

    const totalFiltered = Object.values(productsByBrand).reduce((s, items) => s + items.length, 0);

    return (
        <div className="space-y-5 animate-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-[20px] font-bold text-gray-900">Sản phẩm</h2>
                    <p className="text-[13px] text-gray-400">{totalFiltered} sản phẩm {searchTerm && 'phù hợp'}</p>
                </div>
                <button
                    onClick={() => setShowAddProduct(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2.5 rounded-xl font-bold text-[13px] shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all active:scale-[0.97]"
                >
                    <Plus size={18} />
                    Thêm SP
                </button>
            </div>

            {/* Search */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Tìm sản phẩm, mã vạch, thương hiệu..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-white pl-12 pr-10 py-3 rounded-xl text-[14px] font-medium outline-none border border-gray-200 focus:border-blue-400 focus:shadow-lg focus:shadow-blue-500/10 transition-all"
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-gray-200 rounded-full hover:bg-gray-300">
                            <X size={12} />
                        </button>
                    )}
                </div>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button onClick={() => setViewMode('grid')} className={`p-2.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'}`}>
                        <Grid size={16} />
                    </button>
                    <button onClick={() => setViewMode('list')} className={`p-2.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'}`}>
                        <List size={16} />
                    </button>
                </div>
            </div>

            {/* Product Grid/List */}
            {Object.keys(productsByBrand).length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                    <Package size={48} className="mx-auto mb-3 text-gray-200" />
                    <p className="font-bold text-gray-400">Không tìm thấy sản phẩm</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {Object.entries(productsByBrand).map(([brand, items]) => (
                        <div key={brand}>
                            <div className="flex items-center gap-2 mb-3">
                                <Package size={14} className="text-blue-500" />
                                <h3 className="font-bold text-[14px] text-gray-900">{brand}</h3>
                                <span className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg font-medium">{items.length}</span>
                            </div>
                            {viewMode === 'grid' ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                                    {items.map(p => (
                                        <div
                                            key={p.id}
                                            onClick={() => setEditingProduct(p)}
                                            className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 active:scale-[0.97] transition-all cursor-pointer hover:shadow-lg hover:border-gray-200 group"
                                        >
                                            <div className="h-28 bg-gray-50 flex items-center justify-center relative overflow-hidden">
                                                {p.image ? <img src={getImageUrl(p.image)} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <ImageIcon size={24} className="text-gray-200" />}
                                                <div className={`absolute top-1.5 left-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold shadow-sm ${p.stock <= 5 ? 'bg-red-500 text-white' : 'bg-white/90 text-gray-900'}`}>
                                                    {p.stock}
                                                </div>
                                            </div>
                                            <div className="p-2.5">
                                                <h4 className="font-bold text-gray-900 text-[11px] line-clamp-2 h-[2.4em] mb-1">{p.name}</h4>
                                                <p className="text-blue-500 font-black text-[13px]">{p.price?.toLocaleString()}đ</p>
                                                {p.case_price > 0 && (
                                                    <p className="text-[10px] text-orange-500 font-bold">Thùng: {p.case_price?.toLocaleString()}đ</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {items.map(p => (
                                        <div
                                            key={p.id}
                                            onClick={() => setEditingProduct(p)}
                                            className="bg-white rounded-xl p-3 border border-gray-100 flex items-center gap-3 hover:shadow-md hover:border-gray-200 transition-all cursor-pointer active:scale-[0.99]"
                                        >
                                            <div className="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                                                {p.image ? <img src={getImageUrl(p.image)} loading="lazy" className="w-full h-full object-cover" /> : <ImageIcon size={20} className="text-gray-200" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-[13px] text-gray-900 truncate">{p.name}</h4>
                                                <p className="text-[11px] text-gray-400">{p.brand} · {p.category}</p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className="font-black text-blue-500 text-[14px]">{p.price?.toLocaleString()}đ</p>
                                                <p className={`text-[11px] font-bold ${p.stock <= 5 ? 'text-red-500' : 'text-gray-400'}`}>Tồn: {p.stock}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Product Modal */}
            {(editingProduct || showAddProduct) && (
                <ProductModal
                    product={editingProduct}
                    authToken={authToken}
                    onLogout={onLogout}
                    onClose={() => { setEditingProduct(null); setShowAddProduct(false); }}
                    onSave={() => { refreshData(); setEditingProduct(null); setShowAddProduct(false); }}
                />
            )}
        </div>
    );
};

export default ProductsView;
