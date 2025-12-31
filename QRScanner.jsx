import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

const QRScanner = ({ onResult, onClose }) => {
    const scannerRef = useRef(null);

    useEffect(() => {
        const startScanner = async () => {
            if (scannerRef.current) {
                try { await scannerRef.current.stop(); } catch (e) { }
            }

            const html5QrCode = new Html5Qrcode("reader", {
                formatsToSupport: [
                    Html5QrcodeSupportedFormats.QR_CODE,
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.EAN_8,
                    Html5QrcodeSupportedFormats.UPC_A,
                    Html5QrcodeSupportedFormats.UPC_E,
                    Html5QrcodeSupportedFormats.CODE_128,
                    Html5QrcodeSupportedFormats.CODE_39,
                    Html5QrcodeSupportedFormats.ITF
                ],
                verbose: false
            });
            scannerRef.current = html5QrCode;

            try {
                // Get available cameras - prefer back camera
                const cameras = await Html5Qrcode.getCameras();
                const cameraId = cameras.find(c => c.label.toLowerCase().includes('back'))?.id || cameras[0]?.id;

                await html5QrCode.start(
                    cameraId || { facingMode: "environment" },
                    {
                        fps: 30,                              // Fast scanning
                        qrbox: { width: 320, height: 180 },   // Wide for barcodes
                        aspectRatio: 16 / 9,
                        videoConstraints: {
                            width: { ideal: 1920 },
                            height: { ideal: 1080 },
                            focusMode: "continuous"
                        }
                    },
                    (decodedText) => {
                        // Success!
                        html5QrCode.stop().then(() => {
                            // Beep sound
                            const beep = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj');
                            beep.play().catch(() => { });
                            onResult(decodedText);
                            onClose();
                        });
                    },
                    () => { /* ignore errors */ }
                );
            } catch (err) {
                console.error("Scanner Error:", err);
            }
        };

        setTimeout(startScanner, 100);

        return () => {
            if (scannerRef.current?.isScanning) {
                scannerRef.current.stop().catch(() => { });
            }
        };
    }, [onClose, onResult]);

    return (
        <div className="fixed inset-0 bg-black z-[200] flex flex-col items-center justify-center">
            {/* Close button */}
            <button
                onClick={onClose}
                className="absolute top-6 right-6 p-3 bg-white/20 rounded-full z-50 backdrop-blur-md active:scale-90 transition-all"
                aria-label="Close scanner"
            >
                <X size={28} className="text-white" />
            </button>

            {/* Instructions */}
            <div className="absolute top-6 left-6 text-white z-50 bg-black/50 px-4 py-2 rounded-lg backdrop-blur-md">
                <p className="text-[14px] font-bold">📷 Quét mã sản phẩm</p>
                <p className="text-[11px] text-white/70">Giữ camera cách mã ~20-30cm</p>
            </div>

            {/* Camera view */}
            <div className="w-full h-full relative flex items-center justify-center">
                <div id="reader" className="w-full max-w-2xl aspect-video bg-black overflow-hidden"></div>

                {/* Scanning frame overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-[340px] h-[140px] border-2 border-green-400 rounded-xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.65)]">
                        {/* Corner decorations */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-xl"></div>
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-xl"></div>
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-xl"></div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-xl"></div>

                        {/* Laser line effect */}
                        <div className="absolute inset-x-4 top-0 bottom-0 overflow-hidden flex items-center">
                            <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-pulse"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom text */}
            <div className="absolute bottom-10 left-0 right-0 text-center">
                <p className="text-white/90 text-[14px] font-medium">Đặt mã vạch trong khung xanh</p>
                <p className="text-white/50 text-[12px] mt-1">Hỗ trợ: EAN-13, UPC, Code-128, QR Code</p>
            </div>
        </div>
    );
};

export default QRScanner;
