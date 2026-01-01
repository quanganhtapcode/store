import React from 'react';
import { Check } from 'lucide-react';

const ReceiptModal = ({ showReceipt, lastOrder, setShowReceipt }) => {
    if (!showReceipt) return null;

    return (
        <div className="fixed inset-0 bg-[#F5F5F7]/80 backdrop-blur-md z-[200] flex items-center justify-center p-8 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-[320px] rounded-[2.5rem] p-10 text-center shadow-[0_20px_50px_rgba(0,0,0,0.1)] animate-in zoom-in-95 font-['Inter']">
                <div className="w-16 h-16 bg-[#0071E3] text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-200">
                    <Check size={32} strokeWidth={3} />
                </div>
                <h2 className="text-[14px] font-bold text-[#86868B] uppercase tracking-[0.2em] mb-2">Thanh toán xong</h2>
                <div className="flex items-baseline justify-center gap-1 mb-10">
                    <span className="text-[32px] font-black text-[#1D1D1F] tracking-tight">{lastOrder?.total.toLocaleString()}</span>
                    <span className="text-[12px] font-bold text-[#1D1D1F] opacity-40 uppercase">vnđ</span>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={() => setShowReceipt(false)}
                        className="w-full bg-[#1D1D1F] text-white py-4 rounded-2xl font-bold text-[15px] active:scale-[0.98] transition-all shadow-sm"
                    >
                        Tiếp tục bán
                    </button>
                    <p className="text-[10px] text-[#86868B] font-medium tracking-wide">Đã tự động cộng đơn vào báo cáo</p>
                </div>
            </div>
        </div>
    );
};

export default ReceiptModal;
