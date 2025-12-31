import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const QRScanner = ({ onResult, onClose }) => {
    const scannerRef = useRef(null);

    useEffect(() => {
        // Load script động
        const script = document.createElement('script');
        script.src = "https://unpkg.com/html5-qrcode";
        script.async = true;
        script.onload = () => {
            const html5QrCode = new window.Html5Qrcode("reader");
            const config = { fps: 10, qrbox: { width: 250, height: 250 } };

            html5QrCode.start(
                { facingMode: "environment" },
                config,
                (decodedText) => {
                    onResult(decodedText);
                    html5QrCode.stop().then(() => onClose());
                },
                (errorMessage) => { /* ignore errors */ }
            ).catch(err => console.error("Scanner Error:", err));

            scannerRef.current = html5QrCode;
        };
        document.body.appendChild(script);

        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop();
            }
        };
    }, [onClose, onResult]);

    return (
        <div className="fixed inset-0 bg-black/90 z-[200] flex flex-col items-center justify-center p-6 text-white">
            <div className="w-full max-w-sm relative">
                <button
                    onClick={onClose}
                    className="absolute -top-16 right-0 p-4 bg-white/10 rounded-full"
                    aria-label="Close scanner"
                >
                    <X size={32} />
                </button>
                <div id="reader" className="w-full aspect-square border-4 border-indigo-500 rounded-[3rem] overflow-hidden bg-black"></div>
                <div className="mt-8 text-center">
                    <h3 className="text-2xl font-black uppercase tracking-widest mb-2">Đang quét mã</h3>
                    <p className="text-slate-400 font-medium italic">Vui lòng đưa Camera lại gần mã sản phẩm</p>
                </div>
            </div>
        </div>
    );
};

export default QRScanner;
