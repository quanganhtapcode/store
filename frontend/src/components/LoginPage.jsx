import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, AlertCircle, Loader2, ChevronLeft } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const LoginPage = ({ onLogin, onBack }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (res.ok && data.token) {
                localStorage.setItem('auth_token', data.token);
                localStorage.setItem('auth_user', JSON.stringify(data.user));
                localStorage.setItem('auth_expiry', Date.now() + data.expiresIn);
                onLogin(data.token, data.user);
            } else {
                setError(data.error || 'Đăng nhập thất bại');
            }
        } catch (err) {
            setError('Không thể kết nối đến server');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F5F5F7] flex flex-col font-['Inter']">
            {/* Header */}
            <header className="bg-white/90 backdrop-blur-md px-4 py-3.5 border-b border-[#D2D2D7]/30 shadow-sm">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => window.history.back()}
                        className="w-10 h-10 bg-[#F5F5F7] text-[#1D1D1F] rounded-full flex items-center justify-center active:scale-90 transition-transform"
                    >
                        <ChevronLeft size={22} />
                    </button>
                    <h1 className="font-black text-[17px] text-[#1D1D1F]">Đăng nhập Quản trị</h1>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 flex items-center justify-center p-5">
                <div className="w-full max-w-sm">
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#1D1D1F] rounded-2xl mb-4 shadow-lg">
                            <Lock className="w-7 h-7 text-white" />
                        </div>
                        <h2 className="text-2xl font-black text-[#1D1D1F] tracking-tight">CÁT HẢI POS</h2>
                        <p className="text-[#86868B] text-sm mt-1 font-medium">Hệ thống Quản trị Bán hàng</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl shadow-lg border border-[#E8E8ED]">
                        {error && (
                            <div className="mb-5 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600">
                                <AlertCircle size={18} />
                                <span className="text-sm font-medium">{error}</span>
                            </div>
                        )}

                        {/* Username */}
                        <div className="mb-4">
                            <label className="block text-[#86868B] text-xs font-bold uppercase tracking-wider mb-2 ml-1">
                                Tài khoản
                            </label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868B]" size={18} />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Nhập tài khoản"
                                    className="w-full bg-[#F5F5F7] border border-[#E8E8ED] rounded-xl pl-12 pr-4 py-3.5 text-[#1D1D1F] placeholder:text-[#86868B] outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/10 transition-all text-[15px] font-medium"
                                    required
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="mb-6">
                            <label className="block text-[#86868B] text-xs font-bold uppercase tracking-wider mb-2 ml-1">
                                Mật khẩu
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868B]" size={18} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Nhập mật khẩu"
                                    className="w-full bg-[#F5F5F7] border border-[#E8E8ED] rounded-xl pl-12 pr-12 py-3.5 text-[#1D1D1F] placeholder:text-[#86868B] outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/10 transition-all text-[15px] font-medium"
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#86868B] hover:text-[#1D1D1F] transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#1D1D1F] text-white py-4 rounded-2xl font-bold text-[15px] shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:bg-black"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin" size={18} />
                                    <span>Đang đăng nhập...</span>
                                </>
                            ) : (
                                <span>Đăng nhập</span>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <p className="text-center text-[#86868B] text-xs mt-6 font-medium">
                        © 2025 CÁT HẢI POS
                    </p>
                </div>
            </main>
        </div>
    );
};

export default LoginPage;
