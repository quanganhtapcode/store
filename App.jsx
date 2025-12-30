import React, { useState, useEffect } from 'react';
import QRScanner from './QRScanner';
import POSView from './POSView';
import AdminView from './AdminView';
import ReceiptModal from './ReceiptModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const App = () => {
    const [view, setView] = useState('pos');
    const [products, setProducts] = useState([]);
    const [history, setHistory] = useState([]);
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Tất cả');

    // UI States
    const [showReceipt, setShowReceipt] = useState(false);
    const [lastOrder, setLastOrder] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiResponse, setAiResponse] = useState(null);
    const [showScanner, setShowScanner] = useState(false);

    // Fetch Data from SQL API
    const fetchData = async () => {
        try {
            const [pRes, hRes] = await Promise.all([
                fetch(`${API_URL}/products`),
                fetch(`${API_URL}/orders`)
            ]);
            const pData = await pRes.json();
            const hData = await hRes.json();
            setProducts(pData);
            setHistory(hData);
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- ACTIONS ---
    const handleScanResult = (code) => {
        const product = products.find(p => p.code === code || p.id === code);
        if (product) {
            addToCart({ ...product, saleType: 'unit', finalPrice: product.price, displayName: product.name });
        } else {
            alert("Không tìm thấy sản phẩm có mã này: " + code);
        }
    };

    const addToCart = (p) => {
        if (p.stock <= 0) return;
        setCart(prev => {
            const exist = prev.find(i => i.id === p.id && i.saleType === p.saleType);
            if (exist) return prev.map(i => (i.id === p.id && i.saleType === p.saleType) ? { ...i, quantity: i.quantity + 1 } : i);
            return [...prev, { ...p, quantity: 1 }];
        });
    };

    const checkout = async () => {
        if (cart.length === 0) return;
        const total = cart.reduce((s, i) => s + (i.finalPrice * i.quantity), 0);
        const order = {
            items: cart,
            total,
            timestamp: Date.now()
        };

        try {
            const res = await fetch(`${API_URL}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(order)
            });

            if (res.ok) {
                setLastOrder(order);
                setCart([]);
                setShowReceipt(true);
                fetchData(); // Refresh stock
            }
        } catch (error) {
            console.error("Checkout failed:", error);
        }
    };

    const askGemini = async (prompt, system) => {
        setAiLoading(true);
        const apiKey = "";
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    systemInstruction: { parts: [{ text: system }] }
                })
            });
            const data = await res.json();
            setAiResponse(data.candidates?.[0]?.content?.parts?.[0]?.text || "Không có phản hồi từ AI.");
        } catch (e) {
            setAiResponse("Lỗi AI: Vui lòng kiểm tra API Key.");
        } finally {
            setAiLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto h-screen relative overflow-hidden font-['Inter']">
            {view === 'pos' ? (
                <POSView
                    products={products}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    selectedCategory={selectedCategory}
                    setSelectedCategory={setSelectedCategory}
                    addToCart={addToCart}
                    setView={setView}
                    setShowScanner={setShowScanner}
                    cart={cart}
                    checkout={checkout}
                    setCart={setCart}
                />
            ) : (
                <AdminView
                    setView={setView}
                    history={history}
                    askGemini={askGemini}
                    aiLoading={aiLoading}
                    aiResponse={aiResponse}
                    setAiResponse={setAiResponse}
                    products={products}
                    refreshData={fetchData}
                />
            )}

            {showScanner && (
                <QRScanner
                    onResult={handleScanResult}
                    onClose={() => setShowScanner(false)}
                />
            )}

            <ReceiptModal
                showReceipt={showReceipt}
                lastOrder={lastOrder}
                setShowReceipt={setShowReceipt}
            />

            <style dangerouslySetInnerHTML={{
                __html: `
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                    .scrollbar-hide::-webkit-scrollbar { display: none; }
                    .animate-in { animation: fadeIn 0.3s ease-out; }
                    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                `}}
            />
        </div>
    );
};

export default App;
