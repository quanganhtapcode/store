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
    onAdminClick,
    setShowScanner,
    cart,
    checkout,
    setCart
}) => {
    const [showCartDetail, setShowCartDetail] = useState(false);

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
            className={`flex-shrink-0 ${size === 'sm' ? 'w-36' : 'w-44'} bg-white p-3.5 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-transparent active:scale-[0.96] transition-all text-left relative group overflow-hidden`}
        >
            {p.isCase && (
                <div className="absolute top-2.5 right-2.5 w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center z-10 shadow-sm">
                    <Package size={14} className="text-white" />
                </div>
            )}
            <div className="w-full aspect-square bg-[#FBFBFD] rounded-xl mb-2.5 overflow-hidden flex items-center justify-center">
                {p.image ? (
                    <img src={p.image} alt={p.displayName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
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
                        onClick={onAdminClick}
                        className="w-10 h-10 bg-white border border-[#D2D2D7] text-[#1D1D1F] rounded-full flex items-center justify-center active:bg-gray-50 transition-colors shadow-sm"
                    >
                        <Settings size={20} />
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
                        <div className="grid grid-cols-2 gap-4">
                            {filtered.map(p => <ProductCard p={p} size="md" key={`${p.id}-${p.saleType}`} />)}
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
                                    {bestSellers.map(p => <ProductCard p={p} size="md" key={`best-${p.id}-${p.saleType}`} />)}
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
                                    {items.map(p => <ProductCard p={p} size="sm" key={`${p.id}-${p.saleType}`} />)}
                                </div>
                            </section>
                        ))}
                    </>
                )}
            </main>

            {showCartDetail && (
                <div className="fixed inset-0 bg-[#1D1D1F]/60 backdrop-blur-md z-[100] flex items-end">
                    <div className="bg-white w-full max-h-[75vh] rounded-t-[2.5rem] p-6 animate-in slide-in-from-bottom-10 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-[18px] font-black text-[#1D1D1F]">Giỏ hàng của bạn ({cart.length})</h3>
                            <button onClick={() => setShowCartDetail(false)} className="p-2.5 bg-[#F5F5F7] rounded-full hover:bg-[#E8E8ED] transition-colors">
                                <X size={20} className="text-[#1D1D1F]" />
                            </button>
                        </div>

                        <div className="space-y-3.5 max-h-[50vh] overflow-y-auto mb-6 pr-1">
                            {cart.map((item, idx) => (
                                <div key={`cart-${item.id}-${item.saleType}-${idx}`} className="flex items-center gap-4 bg-[#F9F9FA] p-3.5 rounded-2xl border border-transparent shadow-sm">
                                    <div className="w-16 h-16 bg-white rounded-xl overflow-hidden flex-shrink-0 border border-[#F5F5F7]">
                                        {item.image ? (
                                            <img src={item.image} alt={item.displayName} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[#D2D2D7]">
                                                <ImageIcon size={24} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-[#1D1D1F] text-[14px] truncate mb-1">{item.displayName}</h4>
                                        <p className="text-[#0071E3] font-bold text-[13px]">{item.finalPrice.toLocaleString()}đ</p>
                                    </div>
                                    <div className="flex items-center gap-2.5 bg-white p-1 rounded-full shadow-sm border border-[#F5F5F7]">
                                        <button
                                            onClick={() => updateQuantity(item.id, item.saleType, -1)}
                                            className="w-8 h-8 bg-[#F5F5F7] rounded-full flex items-center justify-center active:scale-90 transition-all hover:bg-[#E8E8ED]"
                                        >
                                            <Minus size={14} className="text-[#1D1D1F]" />
                                        </button>
                                        <span className="font-bold text-[#1D1D1F] text-[14px] w-6 text-center">{item.quantity}</span>
                                        <button
                                            onClick={() => updateQuantity(item.id, item.saleType, 1)}
                                            className="w-8 h-8 bg-[#0071E3] rounded-full flex items-center justify-center active:scale-90 transition-all shadow-md text-white"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => removeFromCart(item.id, item.saleType)}
                                        className="w-8 h-8 bg-red-50 text-red-500 rounded-full flex items-center justify-center active:scale-90 transition-all ml-1"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-5 bg-[#F9F9FA] rounded-3xl border border-[#F5F5F7]">
                                <span className="font-bold text-[#86868B] text-[13px] uppercase tracking-wider">Tổng thanh toán</span>
                                <span className="font-black text-[#1D1D1F] text-[22px]">{cart.reduce((s, i) => s + (i.finalPrice * i.quantity), 0).toLocaleString()}đ</span>
                            </div>
                            <button
                                onClick={() => { checkout(); setShowCartDetail(false); }}
                                className="w-full bg-[#0071E3] text-white py-4.5 rounded-2xl font-bold text-[16px] active:scale-[0.98] transition-all shadow-lg hover:shadow-blue-500/30 hover:bg-[#0077ED]"
                            >
                                Xác nhận thanh toán
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {cart.length > 0 && !showCartDetail && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-40px)] max-w-[380px] z-50 animate-in slide-in-from-bottom-5">
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
                            onClick={(e) => { e.stopPropagation(); checkout(); }}
                            className="bg-[#0071E3] text-white px-8 py-3.5 rounded-full font-bold text-[14px] active:scale-95 transition-all shadow-lg hover:bg-[#0077ED]"
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
