import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X } from 'lucide-react';

const QRScanner = ({ onResult, onClose }) => {
    const scannerRef = useRef(null);
    const scannerId = "reader-element-id";
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Create instance
        const html5QrCode = new Html5Qrcode(scannerId);
        scannerRef.current = html5QrCode;

        const config = {
            fps: 30, // High FPS for quick scanning
            qrbox: (viewfinderWidth, viewfinderHeight) => {
                const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                return {
                    width: Math.floor(minEdge * 0.75),
                    height: Math.floor(minEdge * 0.75),
                };
            },
            aspectRatio: 1.0,
            disableFlip: false
        };

        const successCallback = (decodedText) => {
            // Play success sound
            const beep = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQMCI6bO2NSVJxQVkM7Q0qswFBKPx8TAqiMh');
            beep.play().catch(() => { });

            // Stop scanner
            html5QrCode.stop().then(() => {
                scannerRef.current = null;
                onClose();
                onResult(decodedText);
            }).catch(err => console.error("Stop failed", err));
        };

        const startScanner = async () => {
            try {
                // Method 1: Try direct environment camera (Fastest)
                await html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    successCallback,
                    (errorMessage) => { /* ignore frame errors */ }
                );
                setIsLoading(false);
            } catch (err) {
                console.warn("Direct start failed, trying device list...", err);

                // Method 2: Fallback to listing cameras
                try {
                    const devices = await Html5Qrcode.getCameras();
                    if (devices && devices.length) {
                        const backCamera = devices.find(d =>
                            d.label.toLowerCase().includes('back') ||
                            d.label.toLowerCase().includes('sau') ||
                            d.label.toLowerCase().includes('environment')
                        );
                        const cameraId = backCamera ? backCamera.id : devices[0].id;

                        await html5QrCode.start(cameraId, config, successCallback, () => { });
                        setIsLoading(false);
                    } else {
                        alert("Không tìm thấy camera");
                        onClose();
                    }
                } catch (e) {
                    console.error("Camera init error:", e);
                    alert("Lỗi camera: " + e.message);
                    onClose();
                }
            }
        };

        // Small delay to ensure DOM is ready
        setTimeout(startScanner, 50);

        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(e => console.error(e));
                scannerRef.current.clear();
            }
        };
    }, []);

    return (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center animate-in fade-in duration-200">
            {/* Close Button */}
            <button
                onClick={() => {
                    if (scannerRef.current && scannerRef.current.isScanning) {
                        scannerRef.current.stop().catch(() => { }).finally(onClose);
                    } else {
                        onClose();
                    }
                }}
                className="absolute top-4 right-4 text-white/80 hover:text-white p-2 z-50 bg-black/20 rounded-full backdrop-blur-md"
            >
                <X size={32} />
            </button>

            <div className="w-full max-w-md relative px-4">
                {/* Scanner Viewport */}
                <div id={scannerId} className="w-full overflow-hidden rounded-3xl shadow-2xl bg-black border-2 border-white/10">
                    {/* Placeholder prevents layout shift */}
                    <div className="aspect-square bg-black"></div>
                </div>

                {/* Loading UI */}
                {isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black z-10 rounded-3xl">
                        <div className="w-12 h-12 border-4 border-white/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                        <p className="font-medium animate-pulse text-blue-400">Đang khởi động Camera...</p>
                    </div>
                )}

                {/* Guide Text */}
                {!isLoading && (
                    <div className="text-center mt-6 animate-in slide-in-from-bottom-4">
                        <p className="text-white font-bold text-lg">Quét mã vạch</p>
                        <p className="text-white/60 text-sm">Di chuyển camera vào mã sản phẩm</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QRScanner;
