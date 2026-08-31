import React from 'react';
import { format } from 'date-fns';

interface A4InvoiceProps {
    sale: any;
    businessName: string;
    ownerName?: string;
    companyLogo?: string;
    companyPhone?: string;
    companyAddress?: string;
    companyEmail?: string;
    signature?: string;
    upiId?: string;
    gstin?: string;
    pan?: string;
    stateName?: string;
    stateCode?: string;
    isPreview?: boolean;
}

const A4Invoice: React.FC<A4InvoiceProps> = ({
    sale,
    businessName,
    ownerName,
    companyLogo,
    companyPhone,
    companyAddress,
    companyEmail,
    signature,
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
                QRCode.toDataURL(upiUrl, { margin: 1, width: 256 })
                    .then(url => setQrDataUrl(url))
                    .catch(err => console.error('QR generation failed', err));
            });
        }
    }, [upiId, sale?.totalAmount, businessName]);

    if (!sale) return null;

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
        <div id="a4-invoice" className={`${isPreview ? 'block shadow-2xl' : 'hidden print:block'} bg-white text-black p-12 w-[210mm] min-h-[297mm] mx-auto font-sans text-base`}>
            {/* Top Toolbar Info */}
            <div className="flex justify-between items-start mb-6">
                <div className="space-y-2">
                    {companyLogo ? (
                        <img src={companyLogo} alt="Logo" className="h-16 object-contain mb-4" />
                    ) : (
                        <h1 className="text-3xl font-black text-black tracking-tighter uppercase">{businessName}</h1>
                    )}
                    <div className="text-xs text-black space-y-0.5">
                        <p className="font-bold text-black text-base">{businessName}</p>
                        {ownerName && <p className="font-bold">Proprietor: {ownerName}</p>}
                        {companyAddress && <p className="max-w-xs whitespace-pre-wrap font-medium">{companyAddress}</p>}
                        {companyPhone && <p className="font-medium">Phone: {companyPhone}</p>}
                        {companyEmail && <p className="font-medium">Email: {companyEmail}</p>}
                        {gstin && <p className="font-bold">GSTIN: {gstin}</p>}
                        {pan && <p className="font-bold">PAN: {pan}</p>}
                        {(stateName || stateCode) && (
                            <p className="font-bold">
                                State: {stateName || ''} {stateCode ? `(${stateCode})` : ''}
                            </p>
                        )}
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-5xl font-black text-black tracking-tighter uppercase mb-4 opacity-10">Invoice</h2>
                    <div className="space-y-1">
                        <p className="text-xs font-bold text-black uppercase tracking-widest">Invoice Number</p>
                        <p className="text-lg font-black text-black tracking-tight">{sale.invoiceNumber}</p>
                        <p className="text-xs font-bold text-black uppercase tracking-widest mt-4">Date of Issue</p>
                        <p className="text-lg font-black text-black tracking-tight">{format(new Date(sale.date), 'dd MMMM yyyy')}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-0 py-1 border-t border-black/10">
                <div className="space-y-0.5">
                    <p className="text-lg font-black text-black leading-tight">Bill To : {sale.customerName || 'Cash Customer'}</p>
                    {sale.customerPhone && <p className="text-black font-bold text-sm">Phone: {sale.customerPhone}</p>}
                    {sale.customerAddress && <p className="text-black font-medium text-xs leading-tight">{sale.customerAddress}</p>}
                    {sale.customerGSTIN && <p className="text-black font-bold text-xs uppercase">GSTIN: {sale.customerGSTIN}</p>}
                    {(sale.customerState || sale.customerStateCode) && (
                        <p className="text-black font-bold text-xs uppercase">
                            State: {sale.customerState || ''} {sale.customerStateCode ? `(${sale.customerStateCode})` : ''}
                        </p>
                    )}
                </div>
                <div className="text-right text-[12px] uppercase tracking-tight text-black flex flex-col justify-center">
                    <p className="font-black mb-0.5">Payment Info:</p>
                    <p className="font-bold opacity-70">Mode: {sale.paymentMode || 'CASH'}</p>
                    <p className="font-bold opacity-70">
                        Status: {sale.status === 'pending' ? 'DUE' : sale.status?.toUpperCase()}
                    </p>
                </div>
            </div>

            <div className="mb-8">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b-4 border-black text-[10px] font-black text-black uppercase tracking-widest">
                            <th className="py-4 px-2">#</th>
                            <th className="py-4 px-2">Description</th>
                            <th className="py-4 px-2 text-right">MRP</th>
                            <th className="py-4 px-2 text-center">Quantity</th>
                            <th className="py-4 px-2 text-right">Unit Price</th>
                            <th className="py-4 px-2 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-black">
                        {(sale.items || []).map((item: any, i: number) => (
                            <tr key={i} className="text-black">
                                <td className="py-5 px-2 font-bold text-black">{String(i + 1).padStart(2, '0')}</td>
                                <td className="py-5 px-2">
                                    <p className="font-black text-black text-base">{item.productId?.name || item.name || 'Item Name'}</p>
                                    {item.description && (
                                        <p className="text-[11px] text-gray-500 italic leading-tight">
                                            {item.description}
                                        </p>
                                    )}
                                    <p className="text-[10px] text-black font-bold uppercase tracking-widest">
                                        {item.unit || 'Units'} 
                                        {item.batchNumber && ` | Batch: ${item.batchNumber}`}
                                        {item.expiryDate && ` | Exp: ${item.expiryDate}`}
                                    </p>
                                    {(() => {
                                        let mrp = item.mrpAtTime || 0;
                                        if (item.productId && typeof item.productId === 'object') {
                                            const p = item.productId as any;
                                            if (p.hasSubUnit && item.unit === p.subUnitName) {
                                                const boxMrp = p.mrp || item.mrpAtTime || 0;
                                                mrp = (p.subUnitMrp && p.subUnitMrp > 0 && p.subUnitMrp < boxMrp) ? p.subUnitMrp : (boxMrp / (p.subUnitValue || 1));
                                            }
                                        }
                                        const discPerUnit = mrp - (item.sellingPrice || 0);
                                        if (discPerUnit > 0) {
                                            return (
                                                <p className="text-[10px] text-green-700 font-black uppercase tracking-widest mt-0.5">
                                                    Saved ₹{discPerUnit.toFixed(2)}/unit
                                                </p>
                                            );
                                        }
                                        return null;
                                    })()}
                                </td>
                                <td className="py-5 px-2 text-right font-bold text-black">₹{(() => {
                                    let mrp = item.mrpAtTime || 0;
                                    if (item.productId && typeof item.productId === 'object') {
                                        const p = item.productId as any;
                                        if (p.hasSubUnit && item.unit === p.subUnitName) {
                                            const boxMrp = p.mrp || item.mrpAtTime || 0;
                                            mrp = (p.subUnitMrp && p.subUnitMrp > 0 && p.subUnitMrp < boxMrp) ? p.subUnitMrp : (boxMrp / (p.subUnitValue || 1));
                                        }
                                    }
                                    return mrp;
                                })().toFixed(0)}</td>
                                <td className="py-5 px-2 text-center font-black text-black text-base">{item.quantity} <span className="text-[10px] font-medium text-slate-500 ml-0.5">{item.unit}</span></td>
                                <td className="py-5 px-2 text-right font-bold text-black">₹{(item.sellingPrice || 0).toFixed(0)}</td>
                                <td className="py-5 px-2 text-right font-black text-black text-base">₹{((item.quantity || 0) * (item.sellingPrice || 0) * (100 / (100 + (item.taxRate || 0)))).toFixed(2)}</td>
                            </tr>
                        ))}
                        {(sale.additionalItems || []).length > 0 && (
                            <tr className="bg-slate-50">
                                <td colSpan={6} className="py-2 px-2 text-[10px] font-black uppercase tracking-widest border-y border-black/10">
                                    Additional Charges & Services
                                </td>
                            </tr>
                        )}
                        {(sale.additionalItems || []).map((item: any, i: number) => (
                            <tr key={`add-${i}`} className="text-black bg-slate-50/30 italic">
                                <td className="py-5 px-2 font-bold text-black">{String((sale.items?.length || 0) + i + 1).padStart(2, '0')}</td>
                                <td className="py-5 px-2">
                                    <p className="font-black text-black">{item.name}</p>
                                    <p className="text-[10px] text-black font-bold uppercase tracking-widest">Service Charge</p>
                                </td>
                                <td className="py-5 px-2 text-right text-black">—</td>
                                <td className="py-5 px-2 text-center font-bold text-black text-base">1</td>
                                <td className="py-5 px-2 text-right font-bold text-black">₹{(item.price || 0).toFixed(0)}</td>
                                <td className="py-5 px-2 text-right font-black text-black text-base">₹{(item.price || 0).toFixed(0)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-end pt-4 border-t-2 border-black">
                <div className="w-full max-w-sm space-y-3">
                    <div className="flex justify-between text-black font-bold text-base">
                        <span>Total Taxable Amount</span>
                        <span>₹{((sale.items || []).reduce((acc: number, item: any) => acc + ((item.quantity || 0) * (item.sellingPrice || 0) * (100 / (100 + (item.taxRate || 0)))), 0)).toFixed(2)}</span>
                    </div>

                    {/* Tax Breakdown */}
                    {(() => {
                        const hsnSummary: Record<string, { taxable: number; rate: number; tax: number }> = {};
                        (sale.items || []).forEach((item: any) => {
                            const hsn = item.hsnCode || "N/A";
                            const itemTotal = (item.quantity || 0) * (item.sellingPrice || 0);
                            const taxRate = item.taxRate || 0;
                            const taxableValue = itemTotal * (100 / (100 + taxRate));
                            const taxAmount = itemTotal - taxableValue;

                            if (taxRate > 0) {
                                if (!hsnSummary[hsn]) {
                                    hsnSummary[hsn] = { taxable: 0, rate: taxRate, tax: 0 };
                                }
                                hsnSummary[hsn].taxable += taxableValue;
                                hsnSummary[hsn].tax += taxAmount;
                            }
                        });

                        const taxes = Object.values(hsnSummary);
                        if (taxes.length === 0) return null;

                        return (
                            <div className="space-y-1 border-y border-black/10 py-2">
                                {taxes.map((t, idx) => (
                                    <div key={idx} className="text-[11px] text-slate-600 font-medium">
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

                    {(sale.additionalItems || []).length > 0 && (
                        <div className="flex justify-between text-black font-bold text-base">
                            <span>Service & Charges</span>
                            <span>₹{((sale.additionalItems || []).reduce((acc: number, item: any) => acc + Number(item.price), 0)).toFixed(2)}</span>
                        </div>
                    )}
                    {(() => {
                        const rOff = Number(sale.roundOffAmount || (sale as any).roundoffAmount || 0);
                        return (
                            <div className="flex justify-between text-black font-bold italic">
                                <span>Round Off</span>
                                <span>{rOff >= 0 ? '(+)' : '(-)'}{Math.abs(rOff).toFixed(2)}</span>
                            </div>
                        );
                    })()}
                    <div className="flex justify-between text-4xl font-black text-black pt-3 border-t-2 border-black">
                        <span>TOTAL</span>
                        <span>₹{(sale.totalAmount || 0).toLocaleString()}</span>
                    </div>

                    {/* Balance Section */}
                    {sale.amountPaid < sale.totalAmount && (
                        <div className="mt-4 p-4 border-t border-black space-y-2">
                            <div className="flex justify-between text-base font-bold text-black">
                                <span>Total Paid</span>
                                <span>₹{(sale.amountPaid || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-2xl font-black text-black border-t-2 border-black pt-2">
                                <span>Balance Due</span>
                                <span>₹{(sale.balanceDue || 0).toLocaleString()}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-8 flex justify-between items-end">
                <div className="text-black text-[11px] font-bold space-y-1">
                    {totalDiscount > 0 && (
                        <div className="mb-4 p-3 border-2 border-green-600 border-dashed rounded-xl bg-green-50 w-fit">
                            <p className="text-[13px] font-black uppercase tracking-widest text-green-700">
                                🎉 Wow! You Saved ₹{totalDiscount.toFixed(2)} on this bill! 🎉
                            </p>
                        </div>
                    )}
                    <p className="uppercase tracking-widest text-black mb-2 border-b-2 border-black w-fit">Terms & Conditions</p>
                    <p>1. Goods once sold will not be taken back.</p>
                    <p>2. Subject to local jurisdiction.</p>
                    <p>3. This is a computer generated invoice.</p>
                    
                    {qrDataUrl && (
                        <div className="mt-8 flex items-center gap-4 border-2 border-black p-4 rounded-3xl w-fit">
                            <img src={qrDataUrl} alt="Scan to Pay" className="w-24 h-24" />
                            <div>
                                <p className="text-sm font-black uppercase tracking-tighter">Scan to Pay</p>
                                <p className="text-lg font-black tracking-tight">₹{sale.totalAmount.toLocaleString()}</p>
                                <p className="text-[10px] font-bold text-slate-500">{upiId}</p>
                            </div>
                        </div>
                    )}
                </div>
                <div className="text-center min-w-[200px]">
                    {signature && (
                        <img src={signature} alt="Signature" className="h-16 mx-auto mb-2 mix-blend-multiply" />
                    )}
                    <div className="border-t-2 border-black pt-2 font-black text-xs uppercase tracking-widest text-black">
                        Authorized Signatory
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-auto pt-12 text-center text-xs font-black text-black uppercase tracking-[0.5em]">
                {businessName} · Thank You
            </div>
        </div>
    );
};

export default A4Invoice;
