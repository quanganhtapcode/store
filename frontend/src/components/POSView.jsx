import React, { useMemo, useState } from 'react';
import {
    Search, QrCode, ShoppingCart,
    Image as ImageIcon, Settings, Store, Package, Trash2, X, Minus, Plus, BarChart3, Lock
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const IMAGE_BASE_URL = API_URL.replace('/api', '');

// Helper to get image URL
const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http') || imagePath.startsWith('data:')) return imagePath;
    return `${IMAGE_BASE_URL}${imagePath}`;
};

const POSView = ({
    products,
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    addToCart,
    onAdminClick,
    onStatsClick,
    setShowScanner,
    cart,
    checkout,
    setCart
}) => {
    const [showCartDetail, setShowCartDetail] = useState(false);
    const [showPaymentChoice, setShowPaymentChoice] = useState(false);

    const expandedProducts = useMemo(() => {
        const result = [];
        products.forEach(p => {
            result.push({
                ...p,
                saleType: 'unit',
                finalPrice: p.price,
                displayName: p.name,
                isRetail: true
            });

            if (p.case_price > 0) {
                result.push({
                    ...p,
                    saleType: 'case',
                    finalPrice: p.case_price,
                    displayName: `${p.name} (Thùng ${p.units_per_case})`,
                    isCase: true
                });
            }
        });
        return result;
    }, [products]);

    const productsByBrand = useMemo(() => {
        const groups = {};
        expandedProducts.forEach(p => {
            if (!groups[p.brand]) groups[p.brand] = [];
            groups[p.brand].push(p);
        });
        return groups;
    }, [expandedProducts]);

    const bestSellers = useMemo(() => {
        return [...expandedProducts]
            .filter(p => p.isRetail)
            .sort((a, b) => (b.total_sold || 0) - (a.total_sold || 0))
            .slice(0, 8);
    }, [expandedProducts]);

    const filtered = expandedProducts.filter(p =>
        p.displayName.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (selectedCategory === 'Tất cả' || p.category === selectedCategory)
    );

    const isSearching = searchTerm !== '' || selectedCategory !== 'Tất cả';

    const removeFromCart = (itemId, saleType) => {
        setCart(prev => prev.filter(item => !(item.id === itemId && item.saleType === saleType)));
    };

    const updateQuantity = (itemId, saleType, delta) => {
        setCart(prev => prev.map(item => {
            if (item.id === itemId && item.saleType === saleType) {
                const newQty = item.quantity + delta;
                return newQty > 0 ? { ...item, quantity: newQty } : item;
            }
            return item;
        }).filter(item => item.quantity > 0));
    };

    const handlePayment = (method) => {
        checkout(method); // Pass payment method to checkout
        setShowPaymentChoice(false);
        setShowCartDetail(false);
    };

    const ProductCard = ({ p, size = "md" }) => (
        <button
            key={`${p.id}-${p.saleType}`}
            onClick={() => addToCart(p)}
            className={`w-full max-w-[220px] bg-white p-3.5 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-transparent active:scale-[0.96] transition-all text-left relative group overflow-hidden mx-auto`}
        >
            {p.isCase && (
                <div className="absolute top-2.5 right-2.5 w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center z-10 shadow-sm">
                    <Package size={14} className="text-white" />
                </div>
            )}
            <div className="w-full aspect-square bg-[#FBFBFD] rounded-xl mb-2.5 overflow-hidden flex items-center justify-center">
                {p.image ? (
                    <img src={getImageUrl(p.image)} alt={p.displayName} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                ) : (
                    <div className="text-[#D2D2D7]"><ImageIcon size={size === 'sm' ? 24 : 28} /></div>
                )}
            </div>
            <div className="px-0.5">
                <h4 className={`font-bold text-[#1D1D1F] ${size === 'sm' ? 'text-[12px]' : 'text-[14px]'} leading-tight line-clamp-2 h-[2.4em]`}>
                    {p.displayName}
                </h4>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                    <span className={`${p.isCase ? 'text-emerald-600' : 'text-[#0071E3]'} font-bold ${size === 'sm' ? 'text-[13px]' : 'text-[16px]'}`}>
                        {p.finalPrice.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-[#86868B] font-medium italic">vnd</span>
                </div>
            </div>
        </button>
    );

    return (
        <div className="flex flex-col h-full bg-[#F5F5F7] font-['Inter']">
            <header className="bg-white/90 backdrop-blur-md sticky top-0 z-30 px-4 py-3.5 border-b border-[#D2D2D7]/30 shadow-sm">
                <div className="flex gap-3 items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868B]" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm sản phẩm..."
                            className="w-full bg-[#F5F5F7] border-none rounded-full py-2.5 pl-10 pr-4 text-[13px] font-medium outline-none focus:ring-1 focus:ring-[#0071E3]/30 transition-all placeholder:text-[#86868B]"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setShowScanner(true)}
                        className="w-10 h-10 bg-[#1D1D1F] text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform hover:bg-[#000]"
                    >
                        <QrCode size={18} />
                    </button>
                    <button
                        onClick={onStatsClick}
                        className="w-10 h-10 bg-white border border-[#D2D2D7] text-[#1D1D1F] rounded-full flex items-center justify-center active:bg-gray-50 transition-colors shadow-sm"
                        title="Thống kê"
                    >
                        <BarChart3 size={18} />
                    </button>
                </div>

                <div className="flex gap-2.5 overflow-x-auto scrollbar-hide mt-3.5 py-1">
                    {['Tất cả', ...new Set(products.map(p => p.category))].map(c => (
                        <button
                            key={c}
                            onClick={() => setSelectedCategory(c)}
                            className={`px-5 py-2 rounded-full whitespace-nowrap text-[12px] font-bold transition-all ${selectedCategory === c ? 'bg-[#0071E3] text-white shadow-md' : 'bg-[#E8E8ED] text-[#1D1D1F] hover:bg-[#D2D2D7]/50'}`}
                        >
                            {c}
                        </button>
                    ))}
                </div>
            </header>

            <main className="flex-1 overflow-y-auto pb-36 pt-5">
                {isSearching ? (
                    <section className="px-4">
                        <div className="mb-4 flex justify-between items-center">
                            <h3 className="text-[14px] font-bold text-[#1D1D1F] tracking-tight">Kết quả ({filtered.length})</h3>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {filtered.map(p => (
                                <div key={`${p.id}-${p.saleType}`} className="flex justify-center">
                                    <ProductCard p={p} size="md" />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : (
                    <>
                        {bestSellers.length > 0 && (
                            <section className="mb-8">
                                <div className="px-5 mb-4 flex items-center justify-between">
                                    <h3 className="text-[15px] font-black text-[#1D1D1F] tracking-tight">Thịnh hành</h3>
                                    <div className="h-1 w-8 bg-[#0071E3] rounded-full opacity-80"></div>
                                </div>
                                <div className="flex gap-3.5 overflow-x-auto px-5 pb-2 scrollbar-hide">
                                    {bestSellers.map(p => (
                                        <div key={`best-${p.id}-${p.saleType}`} className="w-40 md:w-48 flex-shrink-0">
                                            <ProductCard p={p} size="md" />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {Object.entries(productsByBrand).map(([brand, items]) => (
                            <section key={brand} className="mb-9">
                                <div className="px-5 mb-3.5 flex items-center justify-between">
                                    <h3 className="text-[15px] font-bold text-[#1D1D1F] tracking-tight opacity-90">{brand}</h3>
                                    <span className="text-[11px] font-bold text-[#86868B] bg-[#F5F5F7] px-2 py-0.5 rounded-md">{items.length}</span>
                                </div>
                                <div className="flex gap-3.5 overflow-x-auto px-5 pb-2 scrollbar-hide">
                                    {items.map(p => (
                                        <div key={`${p.id}-${p.saleType}`} className="w-36 md:w-40 flex-shrink-0">
                                            <ProductCard p={p} size="sm" />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </>
                )}
            </main>

            {showCartDetail && (
                <div className="fixed inset-0 bg-[#1D1D1F]/60 backdrop-blur-md z-[100] flex items-end">
                    <div className="bg-white w-full max-h-[85vh] rounded-t-[2.5rem] p-5 animate-in slide-in-from-bottom-10 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex flex-col">
                        {/* Header */}
                        <div className="flex justify-between items-center mb-4 flex-shrink-0">
                            <h3 className="text-[20px] font-black text-[#1D1D1F]">Giỏ hàng ({cart.length})</h3>
                            <button onClick={() => setShowCartDetail(false)} className="p-2.5 bg-[#F5F5F7] rounded-full hover:bg-[#E8E8ED] transition-colors">
                                <X size={22} className="text-[#1D1D1F]" />
                            </button>
                        </div>

                        {/* Cart Items - Scrollable */}
                        <div className="flex-1 overflow-y-auto space-y-3 mb-4 -mx-2 px-2">
                            {cart.map((item, idx) => (
                                <div key={`cart-${item.id}-${item.saleType}-${idx}`} className="flex items-start gap-3 bg-[#F9F9FA] p-3 rounded-2xl border border-transparent">
                                    {/* Image */}
                                    <div className="w-20 h-20 bg-white rounded-xl overflow-hidden flex-shrink-0 border border-[#F5F5F7]">
                                        {item.image ? (
                                            <img src={getImageUrl(item.image)} alt={item.displayName} loading="lazy" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[#D2D2D7]">
                                                <ImageIcon size={28} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-[#1D1D1F] text-[14px] leading-tight mb-1.5 line-clamp-2">{item.displayName}</h4>
                                        <p className={`font-bold text-[16px] ${item.isCase ? 'text-emerald-600' : 'text-[#0071E3]'}`}>
                                            {item.finalPrice.toLocaleString()}đ
                                        </p>

                                        {/* Quantity controls */}
                                        <div className="flex items-center justify-between mt-2">
                                            <div className="flex items-center gap-2 bg-white p-1 rounded-full shadow-sm border border-[#E8E8ED]">
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.saleType, -1)}
                                                    className="w-8 h-8 bg-[#F5F5F7] rounded-full flex items-center justify-center active:scale-90 transition-all"
                                                >
                                                    <Minus size={14} className="text-[#1D1D1F]" />
                                                </button>
                                                <span className="font-black text-[#1D1D1F] text-[16px] w-8 text-center">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.saleType, 1)}
                                                    className="w-8 h-8 bg-[#0071E3] rounded-full flex items-center justify-center active:scale-90 transition-all text-white"
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => removeFromCart(item.id, item.saleType)}
                                                className="p-2 bg-red-50 text-red-500 rounded-full active:scale-90 transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer - Fixed */}
                        <div className="flex-shrink-0 space-y-3 pt-3 border-t border-[#F5F5F7]">
                            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-[#F5F5F7] to-[#E8E8ED] rounded-2xl">
                                <span className="font-bold text-[#86868B] text-[14px] uppercase tracking-wide">Tổng cộng</span>
                                <span className="font-black text-[#1D1D1F] text-[28px]">{cart.reduce((s, i) => s + (i.finalPrice * i.quantity), 0).toLocaleString()}đ</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => handlePayment('cash')}
                                    className="bg-[#34C759] text-white py-5 rounded-2xl font-bold text-[16px] active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2"
                                >
                                    💵 Tiền mặt
                                </button>
                                <button
                                    onClick={() => handlePayment('transfer')}
                                    className="bg-[#0071E3] text-white py-5 rounded-2xl font-bold text-[16px] active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2"
                                >
                                    📱 Chuyển khoản
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {cart.length > 0 && !showCartDetail && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-40px)] max-w-[380px] z-50">
                    <div
                        onClick={() => setShowCartDetail(true)}
                        className="bg-[#1D1D1F]/95 backdrop-blur-xl rounded-[2.5rem] p-2.5 flex items-center shadow-2xl border border-white/10 overflow-hidden cursor-pointer active:scale-[0.98] transition-all hover:bg-[#000]"
                    >
                        <div className="flex-1 flex items-center pl-5 gap-3.5">
                            <div className="relative">
                                <ShoppingCart size={22} className="text-white" />
                                <span className="absolute -top-2.5 -right-2.5 bg-[#0071E3] text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black border-2 border-[#1D1D1F]">
                                    {cart.reduce((s, i) => s + i.quantity, 0)}
                                </span>
                            </div>
                            <div className="h-8 w-[1px] bg-white/10 mx-1"></div>
                            <div className="flex flex-col justify-center">
                                <span className="font-bold text-white text-[16px] leading-tight">{cart.reduce((s, i) => s + (i.finalPrice * i.quantity), 0).toLocaleString()}đ</span>
                                <span className="text-[10px] text-white/50 font-medium">{cart.length} loại sản phẩm</span>
                            </div>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowCartDetail(true); }}
                            className="bg-[#0071E3] text-white px-6 py-3.5 rounded-full font-bold text-[14px] active:scale-95 transition-all shadow-lg"
                        >
                            Thanh toán
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default POSView;
