import React, { useState, useRef, useEffect } from 'react';
import { Lock, User, Eye, EyeOff, AlertCircle, Loader2, ChevronLeft, ShieldCheck, KeyRound } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const LoginPage = ({ onLogin, onBack }) => {
    const [loginMethod, setLoginMethod] = useState('otp'); // 'otp' | 'password'
    const [username, setUsername] = useState('admin'); // Default admin
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const otpRefs = useRef([]);

    // Auto-focus first OTP input
    useEffect(() => {
        if (loginMethod === 'otp' && otpRefs.current[0]) {
            otpRefs.current[0].focus();
        }
    }, [loginMethod]);

    const handleLogin = async (e) => {
        if (e) e.preventDefault();
        setError('');
        setLoading(true);

        const payload = { username };
        if (loginMethod === 'password') {
            payload.password = password;
        } else {
            payload.otp = otp.join('');
            if (payload.otp.length !== 6) {
                setError('Vui lòng nhập đủ 6 số OTP');
                setLoading(false);
                return;
            }
        }

        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (res.ok && data.token) {
                localStorage.setItem('auth_token', data.token);
                localStorage.setItem('auth_user', JSON.stringify(data.user));
                localStorage.setItem('auth_expiry', Date.now() + data.expiresIn);
                onLogin(data.token, data.user);
            } else {
                setError(data.error || 'Đăng nhập thất bại');
                // Reset OTP if fail
                if (loginMethod === 'otp') {
                    setOtp(['', '', '', '', '', '']);
                    if (otpRefs.current[0]) otpRefs.current[0].focus();
                }
            }
        } catch (err) {
            setError('Lỗi kết nối server');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (index, value) => {
        if (value.length > 1) value = value.slice(-1); // Only 1 char
        if (!/^\d*$/.test(value)) return; // Numbers only

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto move next
        if (value && index < 5) {
            otpRefs.current[index + 1].focus();
        }

        // Auto submit if full
        if (newOtp.join('').length === 6 && index === 5 && value) {
            // Use timeout to let state update
            setTimeout(() => handleLogin(), 100);
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1].focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const data = e.clipboardData.getData('text').slice(0, 6).split('');
        if (data.length > 0) {
            const newOtp = [...otp];
            data.forEach((val, i) => {
                if (i < 6) newOtp[i] = val;
            });
            setOtp(newOtp);
            if (data.length === 6) setTimeout(() => handleLogin(), 100);
            else {
                const focusIndex = Math.min(data.length, 5);
                if (otpRefs.current[focusIndex]) otpRefs.current[focusIndex].focus();
            }
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
                    <h1 className="font-black text-[17px] text-[#1D1D1F]">Đăng nhập Secure</h1>
                </div>
            </header>

            <main className="flex-1 flex items-center justify-center p-5">
                <div className="w-full max-w-sm">
                    {/* Header Icon */}
                    <div className="flex justify-center mb-8">
                        <div className="w-20 h-20 bg-white rounded-[20px] shadow-lg flex items-center justify-center relative overflow-hidden">
                            {loginMethod === 'otp' ? (
                                <ShieldCheck size={40} className="text-[#0071E3] animate-in zoom-in duration-300" />
                            ) : (
                                <Lock size={40} className="text-[#86868B] animate-in zoom-in duration-300" />
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-8 border border-[#D2D2D7]/50">
                        <h2 className="text-2xl font-bold text-[#1D1D1F] text-center mb-1">
                            {loginMethod === 'otp' ? 'Xác thực 2FA' : 'Mật khẩu quản trị'}
                        </h2>
                        <p className="text-center text-[#86868B] text-sm mb-8">
                            {loginMethod === 'otp' ? 'Nhập mã 6 số từ Google Authenticator' : 'Nhập thông tin để tiếp tục'}
                        </p>

                        <form onSubmit={handleLogin} className="space-y-5">
                            {/* Username Field */}
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[#86868B]">
                                    <User size={18} />
                                </div>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Tên tài khoản"
                                    className="w-full bg-[#F5F5F7] border border-transparent rounded-[14px] py-3.5 pl-10 pr-4 text-[15px] font-medium text-[#1D1D1F] outline-none focus:bg-white focus:border-[#0071E3] focus:ring-4 focus:ring-[#0071E3]/10 transition-all placeholder:text-[#86868B]/80"
                                />
                            </div>

                            {loginMethod === 'password' ? (
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[#86868B]">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Mật khẩu"
                                        className="w-full bg-[#F5F5F7] border border-transparent rounded-[14px] py-3.5 pl-10 pr-12 text-[15px] font-medium text-[#1D1D1F] outline-none focus:bg-white focus:border-[#0071E3] focus:ring-4 focus:ring-[#0071E3]/10 transition-all placeholder:text-[#86868B]/80"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-3 flex items-center text-[#86868B] hover:text-[#1D1D1F] p-1"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex justify-between gap-2" onPaste={handlePaste}>
                                    {otp.map((digit, idx) => (
                                        <input
                                            key={idx}
                                            ref={el => otpRefs.current[idx] = el}
                                            type="text"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleOtpChange(idx, e.target.value)}
                                            onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                                            className="w-11 h-14 bg-[#F5F5F7] border border-[#D2D2D7] rounded-xl text-center text-2xl font-bold text-[#1D1D1F] outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all caret-transparent"
                                            inputMode="numeric"
                                            autoComplete="one-time-code"
                                        />
                                    ))}
                                </div>
                            )}

                            {error && (
                                <div className="flex items-center gap-2 text-red-500 bg-red-50 px-3 py-2.5 rounded-xl text-[13px] font-medium animate-in slide-in-from-top-2">
                                    <AlertCircle size={16} />
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#0071E3] text-white py-3.5 rounded-[14px] font-bold text-[15px] shadow-[0_4px_14px_rgba(0,113,227,0.3)] hover:bg-[#0077ED] active:scale-[0.98] transition-all disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2"
                            >
                                {loading && <Loader2 size={18} className="animate-spin" />}
                                {loading ? 'Đang xác thực...' : (loginMethod === 'otp' ? 'Xác minh' : 'Đăng nhập')}
                            </button>
                        </form>

                        {/* Switch Mode */}
                        <div className="mt-6 flex justify-center">
                            <button
                                onClick={() => {
                                    setLoginMethod(loginMethod === 'otp' ? 'password' : 'otp');
                                    setError('');
                                }}
                                className="text-sm font-semibold text-[#0071E3] hover:underline flex items-center gap-1.5 transition-colors"
                            >
                                {loginMethod === 'otp' ? (
                                    <> <KeyRound size={16} /> Dùng mật khẩu </>
                                ) : (
                                    <> <ShieldCheck size={16} /> Dùng mã 2FA (Nhanh) </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default LoginPage;
