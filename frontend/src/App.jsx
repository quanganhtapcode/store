import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import QRScanner from './components/QRScanner';
import POSView from './components/POSView';
import AdminPage from './components/AdminPage';
import ReceiptModal from './components/ReceiptModal';
import LoginPage from './components/LoginPage';
import StatsModal from './components/StatsModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Auth helper functions
const getAuthToken = () => localStorage.getItem('auth_token');
const getAuthUser = () => {
    try {
        return JSON.parse(localStorage.getItem('auth_user'));
    } catch {
        return null;
    }
};
const isAuthenticated = () => {
    const token = getAuthToken();
    const expiry = localStorage.getItem('auth_expiry');
    if (!token || !expiry) return false;
    return Date.now() < parseInt(expiry);
};
const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_expiry');
};

const App = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [history, setHistory] = useState([]);
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Tất cả');

    // UI States
    const [showReceipt, setShowReceipt] = useState(false);
    const [lastOrder, setLastOrder] = useState(null);
    const [showScanner, setShowScanner] = useState(false);
    const [showStats, setShowStats] = useState(false);  // NEW: Stats Modal

    // Auth States
    const [authToken, setAuthToken] = useState(getAuthToken());
    const [authUser, setAuthUser] = useState(getAuthUser());

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
        // Check auth status on mount
        if (!isAuthenticated()) {
            setAuthToken(null);
            setAuthUser(null);
        }
    }, []);

    const handleLogin = (token, user) => {
        setAuthToken(token);
        setAuthUser(user);
        navigate('/admin');
    };

    const handleLogout = async () => {
        try {
            await fetch(`${API_URL}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
        } catch (e) {
            console.error('Logout error:', e);
        }
        logout();
        setAuthToken(null);
        setAuthUser(null);
        navigate('/');
    };

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

    const checkout = async (paymentMethod = 'cash') => {
        if (cart.length === 0) return;
        const total = cart.reduce((s, i) => s + (i.finalPrice * i.quantity), 0);
        const order = {
            items: cart,
            total,
            payment_method: paymentMethod,
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
                fetchData();
            }
        } catch (error) {
            console.error("Checkout failed:", error);
        }
    };

    // Protected Admin Route Component - Full Admin with Login
    const ProtectedAdmin = () => {
        if (!isAuthenticated()) {
            return <LoginPage onLogin={handleLogin} />;
        }
        return (
            <AdminPage
                products={products}
                history={history}
                refreshData={fetchData}
                onBackToPos={() => navigate('/')}
                authToken={authToken}
                authUser={authUser}
                onLogout={handleLogout}
            />
        );
    };

    return (
        <>
            <Routes>
                <Route path="/" element={
                    <POSView
                        products={products}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        selectedCategory={selectedCategory}
                        setSelectedCategory={setSelectedCategory}
                        addToCart={addToCart}
                        onAdminClick={() => navigate('/admin')}
                        onStatsClick={() => setShowStats(true)}
                        setShowScanner={setShowScanner}
                        cart={cart}
                        checkout={checkout}
                        setCart={setCart}
                    />
                } />
                <Route path="/admin/*" element={<ProtectedAdmin />} />
                <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
            </Routes>

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

            {/* Stats Modal - No login required */}
            <StatsModal
                isOpen={showStats}
                onClose={() => setShowStats(false)}
            />

            <style dangerouslySetInnerHTML={{
                __html: `
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');
                    .scrollbar-hide::-webkit-scrollbar { display: none; }
                    .animate-in { animation: fadeIn 0.3s ease-out; }
                    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                `}}
            />
        </>
    );
};

export default App;
