import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, CheckCircle2 } from 'lucide-react';

interface BarcodeScannerProps {
    onScan: (decodedText: string) => void;
    onClose: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const scannerContainerId = React.useMemo(() => `reader-${Math.random().toString(36).substr(2, 9)}`, []);
    const [scannedSuccess, setScannedSuccess] = useState(false);

    useEffect(() => {
        let isMounted = true;
        let hasScanned = false;

        const startScanner = async () => {
            try {
                // Ensure the container element is in the DOM
                const element = document.getElementById(scannerContainerId);
                if (!element) {
                    console.error("BarcodeScanner: Container element not found");
                    return;
                }

                // Initialize Html5Qrcode with native BarcodeDetector acceleration if supported
                const html5QrCode = new Html5Qrcode(scannerContainerId, {
                    experimentalFeatures: {
                        useBarCodeDetectorIfSupported: true,
                    },
                    verbose: false,
                });
                scannerRef.current = html5QrCode;

                const config = {
                    fps: 25, // High FPS for rapid scanning
                    qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
                        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                        const size = Math.max(220, Math.floor(minEdge * 0.75));
                        return { width: size, height: size };
                    },
                    aspectRatio: 1.0,
                };

                await html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText) => {
                        if (!isMounted || hasScanned) return;
                        hasScanned = true;
                        setScannedSuccess(true);

                        // Haptic feedback if available
                        try {
                            if ('vibrate' in navigator) navigator.vibrate(40);
                        } catch {}

                        // Immediately trigger scan without waiting for camera shutdown
                        onScan(decodedText);

                        // Stop scanner in background
                        if (html5QrCode.isScanning) {
                            html5QrCode.stop().catch(err => console.error("Failed to stop scanner after success", err));
                        }
                    },
                    () => {
                        // Searching for code (normal behavior)
                    }
                );

            } catch (err) {
                console.error("BarcodeScanner: Failed to start camera", err);
            }
        };

        // Quick mount yield
        const timeoutId = setTimeout(startScanner, 50);

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(err => console.error("Failed to stop scanner on unmount", err));
            }
        };
    }, [onScan, scannerContainerId]);

    return (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[200] flex items-center justify-center p-4 overflow-hidden">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden relative border border-white/20 animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="px-8 pt-8 pb-4 flex justify-between items-center bg-gradient-to-b from-white to-slate-50">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Scan QR / Barcode</h2>
                        <p className="text-slate-500 text-sm font-medium">Position the QR code or barcode inside the frame</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-3 hover:bg-rose-50 hover:text-rose-600 rounded-2xl text-slate-400 transition-all duration-200 group"
                    >
                        <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>

                {/* Scanner Area */}
                <div className="p-8">
                    <div id={scannerContainerId} className="overflow-hidden rounded-3xl border-4 border-slate-100 shadow-inner bg-slate-900 min-h-[280px] relative">
                        {/* Overlay to guide user */}
                        <div className="absolute inset-0 border-[36px] border-black/40 pointer-events-none"></div>
                        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 border-2 rounded-2xl pointer-events-none transition-all duration-200 ${scannedSuccess ? 'border-emerald-500 bg-emerald-500/20' : 'border-primary-500'}`}>
                            {scannedSuccess ? (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <CheckCircle2 size={48} className="text-emerald-400 animate-in zoom-in duration-200" />
                                </div>
                            ) : (
                                <div className="absolute inset-0 animate-pulse bg-primary-500/10 rounded-2xl"></div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Logic */}
                <div className="px-8 pb-8 text-center">
                    <div className={`flex items-center justify-center gap-2 py-3 px-6 rounded-2xl inline-flex mx-auto transition-colors ${scannedSuccess ? 'bg-emerald-50 text-emerald-700' : 'bg-primary-50 text-primary-700'}`}>
                        <div className={`w-2 h-2 rounded-full animate-pulse ${scannedSuccess ? 'bg-emerald-500' : 'bg-primary-500'}`}></div>
                        <span className="text-xs font-black uppercase tracking-widest">
                            {scannedSuccess ? "Product Scanned!" : "Scanner Active"}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BarcodeScanner;
