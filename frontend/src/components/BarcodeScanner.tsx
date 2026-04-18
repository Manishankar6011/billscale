import React, { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X } from 'lucide-react';

interface BarcodeScannerProps {
    onScan: (decodedText: string) => void;
    onClose: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const scannerContainerId = React.useMemo(() => `reader-${Math.random().toString(36).substr(2, 9)}`, []);

    useEffect(() => {
        console.log("BarcodeScanner: Mounting component with container ID:", scannerContainerId);
        let isMounted = true;

        const startScanner = async () => {
            try {
                // Ensure the container element is in the DOM
                const element = document.getElementById(scannerContainerId);
                if (!element) {
                    console.error("BarcodeScanner: Container element not found");
                    return;
                }

                const html5QrCode = new Html5Qrcode(scannerContainerId);
                scannerRef.current = html5QrCode;

                const config = {
                    fps: 10,
                    qrbox: { width: 250, height: 150 },
                };

                console.log("BarcodeScanner: Starting camera...");
                await html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText) => {
                        console.log("BarcodeScanner: Scan success:", decodedText);
                        if (isMounted) {
                            html5QrCode.stop().then(() => {
                                onScan(decodedText);
                            }).catch(err => console.error("Failed to stop scanner after success", err));
                        }
                    },
                    (errorMessage) => {
                        // Scan failed but camera is still active (normal behavior while searching)
                    }
                );
                console.log("BarcodeScanner: Camera started successfully");

            } catch (err) {
                console.error("BarcodeScanner: Failed to start camera", err);
            }
        };

        // Delay start slightly to ensure DOM is ready
        const timeoutId = setTimeout(startScanner, 300);

        return () => {
            console.log("BarcodeScanner: Unmounting component");
            isMounted = false;
            clearTimeout(timeoutId);
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(err => console.error("Failed to stop scanner on unmount", err));
            }
        };
    }, [onScan, scannerContainerId]);

    return (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[200] flex items-center justify-center p-4 overflow-hidden">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden relative border border-white/20 animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="px-8 pt-8 pb-4 flex justify-between items-center bg-gradient-to-b from-white to-slate-50">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Scan Barcode</h2>
                        <p className="text-slate-500 text-sm font-medium">Position the barcode within the box</p>
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
                    <div id={scannerContainerId} className="overflow-hidden rounded-3xl border-4 border-slate-100 shadow-inner bg-slate-900 min-h-[250px] relative">
                        {/* Overlay to guide user */}
                        <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-32 border-2 border-primary-500 rounded-xl pointer-events-none">
                            <div className="absolute inset-0 animate-pulse bg-primary-500/10"></div>
                        </div>
                    </div>
                </div>

                {/* Footer Logic */}
                <div className="px-8 pb-8 text-center">
                    <div className="flex items-center justify-center gap-2 py-3 px-6 bg-primary-50 text-primary-700 rounded-2xl inline-flex mx-auto">
                        <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></div>
                        <span className="text-xs font-black uppercase tracking-widest">Scanner Active</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BarcodeScanner;
