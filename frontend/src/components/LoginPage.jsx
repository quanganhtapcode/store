import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, AlertCircle, Loader2, ShieldCheck, Sparkles } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const LoginPage = ({ onLogin }) => {
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
        <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 font-['Inter'] relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0">
                {/* Gradient orbs */}
                <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-600/30 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-600/30 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[150px]"></div>

                {/* Grid pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
            </div>

            <div className="relative w-full max-w-md">
                {/* Logo/Title */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-3xl mb-5 shadow-2xl shadow-indigo-500/30 relative">
                        <ShieldCheck className="w-10 h-10 text-white" />
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-[#0a0a0f] flex items-center justify-center">
                            <Sparkles size={10} className="text-white" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
                        Gemini POS
                    </h1>
                    <p className="text-white/40 text-sm font-medium">
                        Hệ thống Quản trị Bán hàng Chuyên nghiệp
                    </p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="bg-white/[0.03] backdrop-blur-xl p-8 rounded-[2rem] border border-white/[0.08] shadow-2xl relative overflow-hidden">
                    {/* Form glow effect */}
                    <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl"></div>

                    <div className="relative">
                        {error && (
                            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 animate-in slide-in-from-top-2">
                                <AlertCircle size={20} />
                                <span className="text-sm font-medium">{error}</span>
                            </div>
                        )}

                        {/* Username */}
                        <div className="mb-5">
                            <label className="block text-white/50 text-xs font-bold uppercase tracking-wider mb-2 ml-1">
                                Tài khoản
                            </label>
                            <div className="relative group">
                                <div className="absolute left-0 top-0 bottom-0 w-14 flex items-center justify-center">
                                    <User className="text-white/30 group-focus-within:text-blue-400 transition-colors" size={20} />
                                </div>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Nhập tài khoản"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-14 pr-4 py-4 text-white placeholder:text-white/25 outline-none focus:border-blue-500/50 focus:bg-white/[0.08] focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                                    required
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="mb-8">
                            <label className="block text-white/50 text-xs font-bold uppercase tracking-wider mb-2 ml-1">
                                Mật khẩu
                            </label>
                            <div className="relative group">
                                <div className="absolute left-0 top-0 bottom-0 w-14 flex items-center justify-center">
                                    <Lock className="text-white/30 group-focus-within:text-blue-400 transition-colors" size={20} />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Nhập mật khẩu"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-14 pr-14 py-4 text-white placeholder:text-white/25 outline-none focus:border-blue-500/50 focus:bg-white/[0.08] focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors p-1"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 relative overflow-hidden group"
                        >
                            {/* Button shine effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>

                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    <span>Đang đăng nhập...</span>
                                </>
                            ) : (
                                <>
                                    <span>Đăng nhập</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>

                {/* Footer */}
                <div className="text-center mt-8 space-y-2">
                    <p className="text-white/20 text-xs">
                        🔒 Kết nối được bảo mật bằng SSL
                    </p>
                    <p className="text-white/30 text-xs">
                        © 2024 Gemini POS - Phiên bản 2.0
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
