import React, { useMemo, useState } from 'react';
import {
    Search, QrCode, ShoppingCart,
    Image as ImageIcon, Settings, Store, Package, Trash2, X, Minus, Plus
} from 'lucide-react';

const POSView = ({
    products,
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    addToCart,
    setView,
    setShowScanner,
    cart,
    checkout,
    setCart
}) => {
    const [showCartDetail, setShowCartDetail] = useState(false);

    // Expand products: Split products with case pricing into 2 separate entries
    const expandedProducts = useMemo(() => {
        const result = [];
        products.forEach(p => {
            // Always add retail version
            result.push({
                ...p,
                saleType: 'unit',
                finalPrice: p.price,
                displayName: p.name,
                isRetail: true
            });

            // If has case price, add case version as separate product
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

    const bestSellers = useMemo(() => expandedProducts.filter(p => p.isRetail).slice(0, 8), [expandedProducts]);

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

    const ProductCard = ({ p, size = "md" }) => (
        <button
            key={`${p.id}-${p.saleType}`}
            onClick={() => addToCart(p)}
            className={`flex-shrink-0 ${size === 'sm' ? 'w-32' : 'w-40'} bg-white p-3 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-transparent active:scale-[0.96] transition-all text-left relative group overflow-hidden`}
        >
            {p.isCase && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center z-10">
                    <Package size={12} className="text-white" />
                </div>
            )}
            <div className="w-full aspect-square bg-[#FBFBFD] rounded-xl mb-2 overflow-hidden flex items-center justify-center">
                {p.image ? (
                    <img src={p.image} alt={p.displayName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                ) : (
                    <div className="text-[#D2D2D7]"><ImageIcon size={size === 'sm' ? 20 : 24} /></div>
                )}
            </div>
            <div className="px-0.5">
                <h4 className={`font-semibold text-[#1D1D1F] ${size === 'sm' ? 'text-[10px]' : 'text-[11px]'} leading-tight line-clamp-2 h-7`}>
                    {p.displayName}
                </h4>
                <div className="mt-1 flex items-baseline gap-1">
                    <span className={`${p.isCase ? 'text-emerald-600' : 'text-[#0071E3]'} font-bold ${size === 'sm' ? 'text-[11px]' : 'text-[13px]'}`}>
                        {p.finalPrice.toLocaleString()}
                    </span>
                    <span className="text-[7px] text-[#86868B] font-medium italic">vnd</span>
                </div>
            </div>
        </button>
    );

    return (
        <div className="flex flex-col h-full bg-[#F5F5F7] font-['Inter']">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 px-4 py-3 border-b border-[#D2D2D7]/30">
                <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86868B]" size={16} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm..."
                            className="w-full bg-[#F5F5F7] border-none rounded-full py-2 pl-9 pr-4 text-xs font-medium outline-none focus:ring-1 focus:ring-[#0071E3]/30 transition-all placeholder:text-[#86868B]"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setShowScanner(true)}
                        className="w-9 h-9 bg-[#1D1D1F] text-white rounded-full flex items-center justify-center shadow-sm active:scale-90 transition-transform"
                    >
                        <QrCode size={16} />
                    </button>
                    <button
                        onClick={() => setView('admin')}
                        className="w-9 h-9 bg-white border border-[#D2D2D7] text-[#1D1D1F] rounded-full flex items-center justify-center active:bg-gray-50 transition-colors"
                    >
                        <Settings size={16} />
                    </button>
                </div>

                <div className="flex gap-2 overflow-x-auto scrollbar-hide mt-3 py-1">
                    {['Tất cả', ...new Set(products.map(p => p.category))].map(c => (
                        <button
                            key={c}
                            onClick={() => setSelectedCategory(c)}
                            className={`px-4 py-1.5 rounded-full whitespace-nowrap text-[10px] font-semibold transition-all ${selectedCategory === c ? 'bg-[#0071E3] text-white' : 'bg-[#E8E8ED] text-[#1D1D1F] hover:bg-[#D2D2D7]/50'}`}
                        >
                            {c}
                        </button>
                    ))}
                </div>
            </header>

            <main className="flex-1 overflow-y-auto pb-32 pt-4">
                {isSearching ? (
                    <section className="px-4">
                        <div className="mb-4 flex justify-between items-center">
                            <h3 className="text-[12px] font-bold text-[#1D1D1F] tracking-tight">Kết quả ({filtered.length})</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {filtered.map(p => <ProductCard p={p} size="md" key={`${p.id}-${p.saleType}`} />)}
                        </div>
                    </section>
                ) : (
                    <>
                        {/* Section: Bán chạy */}
                        <section className="mb-8">
                            <div className="px-5 mb-4 flex items-center justify-between">
                                <h3 className="text-[13px] font-bold text-[#1D1D1F] tracking-tight">Thịnh hành</h3>
                                <div className="h-0.5 w-8 bg-[#0071E3] rounded-full"></div>
                            </div>
                            <div className="flex gap-3 overflow-x-auto px-5 pb-2 scrollbar-hide">
                                {bestSellers.map(p => <ProductCard p={p} size="md" key={`best-${p.id}-${p.saleType}`} />)}
                            </div>
                        </section>

                        {/* Section: Theo Hãng */}
                        {Object.entries(productsByBrand).map(([brand, items]) => (
                            <section key={brand} className="mb-8">
                                <div className="px-5 mb-3 flex items-center justify-between">
                                    <h3 className="text-[13px] font-bold text-[#1D1D1F] tracking-tight opacity-80">{brand}</h3>
                                    <span className="text-[9px] font-medium text-[#86868B]">{items.length} món</span>
                                </div>
                                <div className="flex gap-3 overflow-x-auto px-5 pb-2 scrollbar-hide">
                                    {items.map(p => <ProductCard p={p} size="sm" key={`${p.id}-${p.saleType}`} />)}
                                </div>
                            </section>
                        ))}
                    </>
                )}
            </main>

            {/* Cart Detail Modal */}
            {showCartDetail && (
                <div className="fixed inset-0 bg-[#1D1D1F]/60 backdrop-blur-sm z-[100] flex items-end">
                    <div className="bg-white w-full max-h-[70vh] rounded-t-[2.5rem] p-6 animate-in slide-in-from-bottom-10">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-[16px] font-bold text-[#1D1D1F]">Giỏ hàng ({cart.length})</h3>
                            <button onClick={() => setShowCartDetail(false)} className="p-2 bg-[#F5F5F7] rounded-full">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-3 max-h-[50vh] overflow-y-auto mb-6">
                            {cart.map((item, idx) => (
                                <div key={`cart-${item.id}-${item.saleType}-${idx}`} className="flex items-center gap-3 bg-[#F5F5F7] p-3 rounded-2xl">
                                    <div className="w-14 h-14 bg-white rounded-xl overflow-hidden flex-shrink-0">
                                        {item.image ? (
                                            <img src={item.image} alt={item.displayName} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[#D2D2D7]">
                                                <ImageIcon size={20} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-[#1D1D1F] text-[12px] truncate">{item.displayName}</h4>
                                        <p className="text-[#0071E3] font-bold text-[11px]">{item.finalPrice.toLocaleString()}đ</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => updateQuantity(item.id, item.saleType, -1)}
                                            className="w-7 h-7 bg-white rounded-full flex items-center justify-center active:scale-90 transition-all"
                                        >
                                            <Minus size={12} className="text-[#86868B]" />
                                        </button>
                                        <span className="font-bold text-[#1D1D1F] text-[13px] w-6 text-center">{item.quantity}</span>
                                        <button
                                            onClick={() => updateQuantity(item.id, item.saleType, 1)}
                                            className="w-7 h-7 bg-white rounded-full flex items-center justify-center active:scale-90 transition-all"
                                        >
                                            <Plus size={12} className="text-[#0071E3]" />
                                        </button>
                                        <button
                                            onClick={() => removeFromCart(item.id, item.saleType)}
                                            className="ml-2 w-7 h-7 bg-red-50 text-red-500 rounded-full flex items-center justify-center active:scale-90 transition-all"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center p-4 bg-[#F5F5F7] rounded-2xl">
                                <span className="font-bold text-[#86868B] text-[12px] uppercase tracking-wider">Tổng cộng</span>
                                <span className="font-black text-[#1D1D1F] text-[20px]">{cart.reduce((s, i) => s + (i.finalPrice * i.quantity), 0).toLocaleString()}đ</span>
                            </div>
                            <button
                                onClick={() => { checkout(); setShowCartDetail(false); }}
                                className="w-full bg-[#0071E3] text-white py-4 rounded-2xl font-bold text-[15px] active:scale-[0.98] transition-all"
                            >
                                Thanh toán ngay
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cart */}
            {cart.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-[340px] z-50">
                    <div
                        onClick={() => setShowCartDetail(true)}
                        className="bg-[#1D1D1F]/90 backdrop-blur-xl rounded-[2rem] p-2 flex items-center shadow-2xl border border-white/10 overflow-hidden cursor-pointer active:scale-[0.98] transition-all"
                    >
                        <div className="flex-1 flex items-center pl-4 gap-3">
                            <div className="relative">
                                <ShoppingCart size={18} className="text-white" />
                                <span className="absolute -top-2.5 -right-2.5 bg-[#0071E3] text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-black">
                                    {cart.reduce((s, i) => s + i.quantity, 0)}
                                </span>
                            </div>
                            <div className="h-6 w-[1px] bg-white/10 mx-1"></div>
                            <span className="font-bold text-white text-[15px]">{cart.reduce((s, i) => s + (i.finalPrice * i.quantity), 0).toLocaleString()} <small className="text-[9px] opacity-60 font-medium">vnđ</small></span>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); checkout(); }}
                            className="bg-[#0071E3] text-white px-8 py-3 rounded-full font-bold text-[13px] active:scale-95 transition-all shadow-lg"
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
