import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X } from 'lucide-react';

const QRScanner = ({ onResult, onClose }) => {
    // Dùng ref để kiểm soát instance của scanner, tránh khởi tạo nhiều lần
    const scannerRef = useRef(null);
    const scannerId = "reader-element-id"; // ID cố định cho thẻ div

    useEffect(() => {
        // Khởi tạo scanner
        const html5QrCode = new Html5Qrcode(scannerId);
        scannerRef.current = html5QrCode;

        const config = {
            fps: 20, // Tăng lên 20 để quét mượt hơn (mặc định là 10)
            qrbox: { width: 250, height: 250 }, // Vùng quét
            aspectRatio: 1.0, // Tỉ lệ khung hình vuông giúp xử lý nhanh hơn trên mobile
            disableFlip: false, // Tự động lật nếu cần
        };

        // Bắt đầu quét
        html5QrCode.start(
            { facingMode: "environment" }, // Camera sau
            config,
            (decodedText) => {
                // Khi quét thành công
                // Dừng scanner ngay lập tức để tránh quét lặp lại
                html5QrCode.stop().then(() => {
                    scannerRef.current = null;
                    onClose(); // Đóng scanner trước
                    onResult(decodedText); // Sau đó xử lý kết quả
                }).catch(err => console.error("Stop failed", err));
            },
            (errorMessage) => {
                // Bỏ qua lỗi quét từng frame (rất quan trọng để không spam console)
            }
        ).catch(err => {
            console.error("Camera start error:", err);
            // Xử lý lỗi nếu không mở được camera (ví dụ: quyền truy cập)
        });

        // Cleanup function: Chạy khi component unmount (đóng modal)
        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(err => console.log("Cleanup stop error", err));
                scannerRef.current = null;
            }
        };
    }, []); // Empty dependency array đảm bảo chỉ chạy 1 lần

    return (
        <div className="fixed inset-0 bg-black/95 z-[200] flex flex-col items-center justify-center p-4 text-white animate-in fade-in duration-200">
            <div className="w-full max-w-sm relative flex flex-col items-center">
                {/* Nút đóng */}
                <button
                    onClick={onClose}
                    className="absolute -top-16 right-0 p-3 bg-white/10 hover:bg-white/20 active:scale-95 transition-all rounded-full backdrop-blur-sm z-50"
                    aria-label="Close scanner"
                >
                    <X size={28} />
                </button>

                {/* Khu vực Camera */}
                <div className="relative w-full aspect-square overflow-hidden rounded-[2.5rem] border-4 border-indigo-500/50 shadow-2xl shadow-indigo-500/20 bg-black">
                    {/* Thẻ div chứa camera */}
                    <div id={scannerId} className="w-full h-full" />

                    {/* Hiệu ứng khung ngắm (Overlay trang trí) */}
                    <div className="absolute inset-0 pointer-events-none border-[30px] border-black/30 rounded-[2rem]"></div>

                    {/* Đường line quét (Animation) */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.8)] animate-[scan_2s_infinite_linear] opacity-80 z-10"></div>
                </div>

                <div className="mt-8 text-center space-y-2">
                    <h3 className="text-xl font-bold uppercase tracking-widest text-indigo-400">Đang quét mã</h3>
                    <p className="text-slate-400 text-sm font-medium">Di chuyển camera lại gần mã QR/Barcode</p>
                </div>
            </div>

            {/* Thêm style animation cho đường kẻ quét */}
            <style jsx>{`
                @keyframes scan {
                    0% { transform: translateY(0); opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { transform: translateY(300px); opacity: 0; }
                }
            `}</style>
        </div>
    );
};

export default QRScanner;
