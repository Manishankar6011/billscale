import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeLabelProps {
    product: any;
    mfgDate?: string;
    expDate?: string;
}

const BarcodeLabel: React.FC<BarcodeLabelProps> = ({ product, mfgDate, expDate }) => {
    const barcodeRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (barcodeRef.current && product?.barcode) {
            try {
                JsBarcode(barcodeRef.current, product.barcode, {
                    format: 'CODE128',
                    width: 1.2,
                    height: 35,
                    displayValue: true,
                    fontSize: 10,
                    margin: 2,
                    fontOptions: 'bold'
                });
            } catch (err) {
                console.error('Barcode generation failed:', err);
            }
        }
    }, [product]);

    if (!product?.barcode) return null;

    return (
        <div id="barcode-sticker" className="hidden print:flex flex-col items-center justify-center bg-white text-black w-[50mm] h-[25mm] overflow-hidden p-1 border border-transparent">
            {/* Dates Header */}
            <div className="flex justify-center gap-2 text-[7px] font-black uppercase tracking-widest text-center w-full mb-0.5">
                {mfgDate && <span>MFG: {mfgDate}</span>}
                {expDate && <span>EXP: {expDate}</span>}
            </div>

            {/* Product Meta */}
            <div className="flex flex-col items-center leading-tight mb-0.5">
                <p className="text-[10px] font-black uppercase truncate max-w-[45mm]">
                    {product.name}
                </p>
                <p className="text-[11px] font-black">
                    MRP: ₹{product.mrp ? product.mrp : <span className="inline-block w-8"></span>}
                </p>
            </div>

            {/* Barcode SVG */}
            <div className="flex items-center justify-center scale-[0.85] origin-top">
                <svg ref={barcodeRef}></svg>
            </div>
        </div>
    );
};

export default BarcodeLabel;
