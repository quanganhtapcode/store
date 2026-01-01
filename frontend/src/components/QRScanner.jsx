import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X } from 'lucide-react';

const QRScanner = ({ onResult, onClose }) => {
    // Dùng ref để kiểm soát instance của scanner, tránh khởi tạo nhiều lần
    const scannerRef = useRef(null);
    const scannerId = "reader-element-id"; // ID cố định cho thẻ div

    useEffect(() => {
        const html5QrCode = new Html5Qrcode(scannerId);
        scannerRef.current = html5QrCode;

        const startScanner = async () => {
            try {
                // 1. Get List of Cameras
                const devices = await Html5Qrcode.getCameras();

                if (devices && devices.length) {
                    // Try to find 'back' camera
                    const backCamera = devices.find(device => {
                        const label = device.label.toLowerCase();
                        return label.includes('back') || label.includes('sau') || label.includes('environment');
                    });

                    // Use back camera if found, else first available
                    const cameraId = backCamera ? backCamera.id : devices[0].id;

                    const config = {
                        fps: 30,
                        qrbox: (viewfinderWidth, viewfinderHeight) => {
                            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                            return {
                                width: Math.floor(minEdge * 0.75),
                                height: Math.floor(minEdge * 0.75),
                            };
                        },
                        aspectRatio: 1.0,
                        disableFlip: false,
                        experimentalFeatures: {
                            useBarCodeDetectorIfSupported: true
                        }
                    };

                    await html5QrCode.start(
                        cameraId, // Use specific camera ID
                        config,
                        (decodedText) => {
                            // Play beep sound
                            const beep = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQMCI6bO2NSVJxQVkM7Q0qswFBKPx8TAqiMh');
                            beep.play().catch(() => { });

                            html5QrCode.stop().then(() => {
                                scannerRef.current = null;
                                onClose();
                                onResult(decodedText);
                            }).catch(err => console.error("Stop failed", err));
                        },
                        (errorMessage) => { /* ignore */ }
                    );
                } else {
                    console.error("No cameras found.");
                    alert("Không tìm thấy camera trên thiết bị này.");
                    onClose();
                }
            } catch (err) {
                console.error("Camera start error:", err);
                alert("Lỗi khởi động camera: " + err);
                onClose();
            }
        };

        startScanner();


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
