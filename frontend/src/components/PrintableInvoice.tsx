import React from 'react';
import { format } from 'date-fns';

interface PrintableInvoiceProps {
    sale: any;
    businessName: string;
    ownerName?: string | undefined;
    companyLogo?: string | undefined;
    companyPhone?: string | undefined;
    companyAddress?: string | undefined;
    companyEmail?: string | undefined;
    signature?: string | undefined;
    changeAmount?: number | undefined;
    roundOffAmount?: number | undefined;
    upiId?: string | undefined;
    gstin?: string | undefined;
    pan?: string | undefined;
    stateName?: string | undefined;
    stateCode?: string | undefined;
    isPreview?: boolean;
}

const PrintableInvoice: React.FC<PrintableInvoiceProps> = ({
    sale,
    businessName,
    ownerName,
    companyLogo,
    companyPhone,
    companyAddress,
    companyEmail,
    signature,
    changeAmount,
    roundOffAmount,
    upiId,
    gstin,
    pan,
    stateName,
    stateCode,
    isPreview = false
}) => {
    const [qrDataUrl, setQrDataUrl] = React.useState<string>('');

    React.useEffect(() => {
        if (upiId && sale?.totalAmount > 0) {
            const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(businessName)}&am=${sale.totalAmount}&cu=INR`;
            import('qrcode').then(QRCode => {
                QRCode.toDataURL(upiUrl, { margin: 1, width: 200 })
                    .then(url => setQrDataUrl(url))
                    .catch(err => console.error('QR generation failed', err));
            });
        }
    }, [upiId, sale?.totalAmount, businessName]);

    if (!sale) return null;

    const totalItems = (sale.items?.length || 0) + (sale.additionalItems?.length || 0);

    const totalDiscount = React.useMemo(() => {
        return (sale?.items || []).reduce((acc: number, item: any) => {
            let mrp = item.mrpAtTime || 0;
            if (item.productId && typeof item.productId === 'object') {
                const p = item.productId as any;
                if (p.hasSubUnit && item.unit === p.subUnitName) {
                    const boxMrp = p.mrp || item.mrpAtTime || 0;
                    mrp = (p.subUnitMrp && p.subUnitMrp > 0 && p.subUnitMrp < boxMrp) ? p.subUnitMrp : (boxMrp / (p.subUnitValue || 1));
                }
            }
            const discPerUnit = mrp - (item.sellingPrice || 0);
            return acc + (discPerUnit > 0 ? discPerUnit * (item.quantity || 0) : 0);
        }, 0);
    }, [sale]);

    return (
        <div id="printable-invoice" className={`${isPreview ? 'block shadow-md' : 'hidden print:block'} bg-white text-black p-2 w-full max-w-[85mm] mx-auto font-sans text-[12px] leading-tight`}>
            {/* Header */}
            <div className="text-center border-b-2 border-black pb-3 mb-3">
                {companyLogo && (
                    <img src={companyLogo} alt="Company Logo" className="h-14 mx-auto mb-2 object-contain" />
                )}
                <h1 className="text-xl font-bold uppercase tracking-tight">{businessName}</h1>
                {/* {ownerName && <p className="text-[10px] font-bold mt-0.5">Proprietor: {ownerName}</p>} */}
                <div className="mt-2 space-y-0.5 text-[11px] font-medium">
                    {companyPhone && <p>Contact: {companyPhone}</p>}
                    {companyEmail && <p>Email: {companyEmail}</p>}
                    {companyAddress && <p className="text-[10px] uppercase">{companyAddress}</p>}
                    {gstin && <p className="font-bold">GSTIN: {gstin}</p>}
                    {pan && <p className="font-bold">PAN: {pan}</p>}
                    {(stateName || stateCode) && (
                        <p className="font-bold">
                            State: {stateName || ''} {stateCode ? `(${stateCode})` : ''}
                        </p>
                    )}
                </div>
            </div>

            {/* Invoice Info */}
            <div className="flex justify-between mb-3 text-[11px]">
                <div className="space-y-0.5">
                    <p className="font-bold w-fit mb-1 tracking-widest uppercase">BILL TO :</p>
                    <p className="font-bold text-sm uppercase">{sale.customerName || 'Cash Customer'}</p>
                    {sale.customerPhone && <p className="font-medium">{sale.customerPhone}</p>}
                </div>
                <div className="text-right space-y-0.5">
                    <p className="font-bold uppercase tracking-tighter">Tax Invoice</p>
                    <p><span className="font-bold">INV:</span> {sale.invoiceNumber}</p>
                    <p><span className="font-bold">DATE:</span> {(() => {
                        const d = new Date(sale.date || sale.createdAt || new Date());
                        const c = sale.createdAt ? new Date(sale.createdAt) : null;
                        
                        // If same day, use createdAt to show actual time
                        if (c && format(d, 'yyyy-MM-dd') === format(c, 'yyyy-MM-dd')) {
                            return format(c, 'dd-MMM-yyyy hh:mm a');
                        }
                        // Otherwise use the selected date (time will be 12:00 AM if not specified)
                        return format(d, 'dd-MMM-yyyy');
                    })()}</p>
                </div>
            </div>

            {/* Items Table */}
            <table className="w-full mb-3 border-t-2 border-black">
                <thead>
                    <tr className="border-b-2 border-black text-left font-black text-[11px] uppercase">
                        <th className="py-1">Items</th>
                        <th className="py-1 text-center">Qty</th>
                        <th className="py-1 text-right">Price</th>
                        <th className="py-1 text-right">Total</th>
                    </tr>
                </thead>
                <tbody className="font-bold">
                    {(sale.items || []).map((item: any, i: number) => {
                        let mrp = item.mrpAtTime || 0;
                        if (item.productId && typeof item.productId === 'object') {
                            const p = item.productId as any;
                            if (p.hasSubUnit && item.unit === p.subUnitName) {
                                const boxMrp = p.mrp || item.mrpAtTime || 0;
                                mrp = (p.subUnitMrp && p.subUnitMrp > 0 && p.subUnitMrp < boxMrp) ? p.subUnitMrp : (boxMrp / (p.subUnitValue || 1));
                            }
                        }
                        const discPerUnit = mrp - (item.sellingPrice || 0);

                        return (
                        <tr key={i} className="border-b border-black border-dashed">
                            <td className="py-2 pr-1">
                                <p className="font-black text-[12px] leading-tight mb-1">{i + 1}. {item.productId?.name || item.name || 'Item'}</p>
                                {item.description && (
                                    <p className="text-[10px] text-gray-500 italic ml-1 mb-1 leading-tight">
                                        {item.description}
                                    </p>
                                )}
                                <p className="text-[10px] font-bold ml-1 uppercase">
                                    MRP: ₹{mrp.toFixed(2)} 
                                    {discPerUnit > 0 && ` | SAVE: ₹${discPerUnit.toFixed(2)}/unit`}
                                    {item.batchNumber && ` | B: ${item.batchNumber}`}
                                    {item.expiryDate && ` | E: ${item.expiryDate}`}
                                </p>
                            </td>
                            <td className="py-2 text-center font-black">{item.quantity} <span className="text-[10px] font-medium text-slate-500 ml-0.5">{item.unit}</span></td>
                            <td className="py-2 text-right">{(item.sellingPrice || 0).toFixed(2)}</td>
                            <td className="py-2 text-right font-black">{((item.quantity || 0) * (item.sellingPrice || 0) * (100 / (100 + (item.taxRate || 0)))).toFixed(2)}</td>
                        </tr>
                        );
                    })}
                    {(sale.additionalItems || []).length > 0 && (
                        <tr className="bg-slate-100/50">
                            <td colSpan={4} className="py-1 px-1 text-[10px] font-black uppercase tracking-widest border-y border-black border-dashed">
                                Additional Charges & Services
                            </td>
                        </tr>
                    )}
                    {(sale.additionalItems || []).map((item: any, i: number) => (
                        <tr key={`add-${i}`} className="border-b border-black border-dashed italic">
                            <td className="py-2 pr-1 font-black text-[12px]">{(sale.items?.length || 0) + i + 1}. {item.name}</td>
                            <td className="py-2 text-center font-bold">1</td>
                            <td className="py-2 text-right">{(item.price || 0).toFixed(2)}</td>
                            <td className="py-2 text-right font-black">{(item.price || 0).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Totals Section */}
            <div className="border-t-2 border-black pt-2 space-y-1">
                <div className="flex justify-between items-center text-[12px] font-bold">
                    <span>Total Taxable Amount:</span>
                    <span className="font-black">₹{((sale.items || []).reduce((acc: number, item: any) => acc + ((item.quantity || 0) * (item.sellingPrice || 0) * (100 / (100 + (item.taxRate || 0)))), 0)).toFixed(2)}</span>
                </div>

                {/* Tax Breakdown */}
                {(() => {
                    const hsnSummary: Record<string, { rate: number; tax: number }> = {};
                    (sale.items || []).forEach((item: any) => {
                        const itemTotal = (item.quantity || 0) * (item.sellingPrice || 0);
                        const taxRate = item.taxRate || 0;
                        const taxableValue = itemTotal * (100 / (100 + taxRate));
                        const taxAmount = itemTotal - taxableValue;

                        if (taxRate > 0) {
                            const key = `${taxRate}`;
                            if (!hsnSummary[key]) hsnSummary[key] = { rate: taxRate, tax: 0 };
                            hsnSummary[key].tax += taxAmount;
                        }
                    });

                    const taxes = Object.values(hsnSummary);
                    if (taxes.length === 0) return null;

                    return (
                        <div className="py-1 border-y border-black border-dashed">
                            {taxes.map((t, idx) => (
                                <div key={idx} className="text-[10px] space-y-0.5">
                                    <div className="flex justify-between">
                                        <span>CGST ({t.rate / 2}%)</span>
                                        <span>₹{(t.tax / 2).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>SGST ({t.rate / 2}%)</span>
                                        <span>₹{(t.tax / 2).toFixed(2)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                })()}

                {(() => {
                    const rOff = Number(sale.roundOffAmount || (sale as any).roundoffAmount || 0);
                    if (rOff === 0) return null;
                    return (
                        <div className="flex justify-between items-center text-[11px] font-bold italic text-slate-600">
                            <span>Round Off:</span>
                            <span>{rOff >= 0 ? '(+)' : '(-)'}{Math.abs(rOff).toFixed(2)}</span>
                        </div>
                    );
                })()}
                <div className="flex justify-between items-center text-[16px] font-black border-y-2 border-black py-2 my-1">
                    <span>GRAND TOTAL:</span>
                    <span>₹{(sale.totalAmount || 0).toLocaleString()}</span>
                </div>

                {/* Balance & Payment Details */}
                {(sale.amountPaid !== undefined && sale.amountPaid < sale.totalAmount) && (
                    <div className="border-2 border-black p-1 space-y-0.5">
                        <div className="flex justify-between items-center text-[12px] font-bold">
                            <span>Amount Paid:</span>
                            <span className="font-black">₹{(sale.amountPaid || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-[13px] font-black">
                            <span>Balance Due:</span>
                            <span>₹{(sale.balanceDue || 0).toLocaleString()}</span>
                        </div>
                    </div>
                )}

                {changeAmount !== undefined && changeAmount > 0 && (
                    <div className="flex justify-between items-center text-[12px] font-bold pt-1">
                        <span>Received Amount:</span>
                        <span className="font-black">₹{(sale.amountPaid || (sale.totalAmount + changeAmount)).toLocaleString()}</span>
                    </div>
                )}
                {changeAmount !== undefined && changeAmount > 0 && (
                    <div className="flex justify-between items-center text-[14px] font-black border-t-2 border-black border-dashed pt-1">
                        <span>Change Return:</span>
                        <span>₹{changeAmount.toFixed(0)}</span>
                    </div>
                )}

                {/* Footer Notes */}
                <div className="text-center mt-6 space-y-2 pt-2">
                    {totalDiscount > 0 && (
                        <div className="mb-4 p-2 border-2 border-black border-dashed rounded-lg bg-gray-50">
                            <p className="text-[11px] font-black text-center uppercase tracking-widest">
                                🎉 Wow! You Saved ₹{totalDiscount.toFixed(2)} on this bill! 🎉
                            </p>
                        </div>
                    )}
                    {/* <p className="text-[11px] font-black border-y-2 border-black py-1">Items: {totalItems} | MODE: {sale.paymentMode?.toUpperCase() || 'CASH'}</p> */}
                    
                    {signature && (
                        <div className="flex flex-col items-center mt-4">
                            <p className="text-[8px] mb-1 font-bold uppercase tracking-widest">Authorized Signature</p>
                            <img src={signature} alt="Signature" className="h-10 object-contain mb-1 mix-blend-multiply" />
                            <div className="w-32 border-t border-black"></div>
                        </div>
                    )}

                    {qrDataUrl && (
                        <div className="flex flex-col items-center mt-4 border-2 border-black p-2 rounded-lg">
                            <img src={qrDataUrl} alt="Scan to Pay" className="w-32 h-32 mb-1" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Scan to Pay ₹{sale.totalAmount.toLocaleString()}</p>
                            <p className="text-[8px] font-bold mt-1">{upiId}</p>
                        </div>
                    )}
                    
                    <div className="mt-4">
                        <p className="font-black text-sm tracking-widest uppercase">Thank You!</p>
                        <p className="italic text-[9px] mt-1 font-medium">Please visit us again for quality materials.</p>
                    </div>
                </div>
            </div>

            {/* Margin for cutter - Reduced to prevent extra page */}
            <div className="h-6 border-t border-dashed border-black mt-2"></div>
        </div>
    );
};

export default PrintableInvoice;
