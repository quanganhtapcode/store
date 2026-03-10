import React from 'react';
import {
    Settings, ShieldCheck, LogOut, User, Lock, Bell,
    Palette, Database, Globe, ChevronRight
} from 'lucide-react';

const SettingsView = ({ authUser, authToken, onLogout, handleSetup2FA }) => {
    const settingsSections = [
        {
            title: 'Tài khoản',
            items: [
                {
                    icon: User,
                    label: 'Thông tin cá nhân',
                    desc: authUser || 'Admin',
                    color: 'blue',
                    action: null
                },
                {
                    icon: ShieldCheck,
                    label: 'Xác thực 2 lớp (2FA)',
                    desc: 'Bảo vệ tài khoản với Google Authenticator',
                    color: 'green',
                    action: handleSetup2FA
                },
                {
                    icon: Lock,
                    label: 'Đổi mật khẩu',
                    desc: 'Cập nhật mật khẩu đăng nhập',
                    color: 'orange',
                    action: () => alert('Tính năng đang phát triển')
                },
            ]
        },
        {
            title: 'Hệ thống',
            items: [
                {
                    icon: Database,
                    label: 'Sao lưu dữ liệu',
                    desc: 'Xuất và sao lưu cơ sở dữ liệu',
                    color: 'purple',
                    action: () => alert('Tính năng đang phát triển')
                },
                {
                    icon: Globe,
                    label: 'Cấu hình API',
                    desc: `Server: ${import.meta.env.VITE_API_URL || 'localhost:3001'}`,
                    color: 'teal',
                    action: null
                },
            ]
        }
    ];

    const colorMap = {
        blue: 'bg-blue-50 text-blue-500',
        green: 'bg-emerald-50 text-emerald-500',
        orange: 'bg-orange-50 text-orange-500',
        purple: 'bg-purple-50 text-purple-500',
        teal: 'bg-teal-50 text-teal-500',
        red: 'bg-red-50 text-red-500',
    };

    return (
        <div className="space-y-6 animate-in max-w-2xl">
            {/* Header */}
            <div>
                <h2 className="text-[20px] font-bold text-gray-900">Cài đặt</h2>
                <p className="text-[13px] text-gray-400">Quản lý tài khoản và hệ thống</p>
            </div>

            {/* Profile Card */}
            <div className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] rounded-2xl p-6 text-white shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-[22px] font-bold shadow-lg shadow-blue-500/30">
                        {(authUser || 'A').charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="font-bold text-[18px]">{authUser || 'Admin'}</h3>
                        <p className="text-slate-400 text-[13px]">Quản trị viên hệ thống</p>
                    </div>
                </div>
            </div>

            {/* Settings Sections */}
            {settingsSections.map((section, sIdx) => (
                <div key={sIdx}>
                    <h3 className="text-[12px] font-bold uppercase text-gray-400 tracking-wider mb-3 ml-1">{section.title}</h3>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
                        {section.items.map((item, iIdx) => (
                            <button
                                key={iIdx}
                                onClick={item.action}
                                disabled={!item.action}
                                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-default"
                            >
                                <div className={`w-10 h-10 ${colorMap[item.color]} rounded-xl flex items-center justify-center flex-shrink-0`}>
                                    <item.icon size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-[14px] text-gray-900">{item.label}</p>
                                    <p className="text-[12px] text-gray-400 mt-0.5 truncate">{item.desc}</p>
                                </div>
                                {item.action && <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />}
                            </button>
                        ))}
                    </div>
                </div>
            ))}

            {/* Logout */}
            <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-500 p-4 rounded-2xl font-bold text-[14px] hover:bg-red-100 transition-all border border-red-100"
            >
                <LogOut size={18} />
                Đăng xuất
            </button>

            {/* Version */}
            <p className="text-center text-[11px] text-gray-300 pb-4">
                POS Admin Panel v2.0 · Powered by React + Vite
            </p>
        </div>
    );
};

export default SettingsView;
