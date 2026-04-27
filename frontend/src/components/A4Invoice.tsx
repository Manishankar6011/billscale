import React from 'react';
import { format } from 'date-fns';

interface A4InvoiceProps {
    sale: any;
    businessName: string;
    ownerName?: string | undefined;
    companyLogo?: string | undefined;
    companyPhone?: string | undefined;
    companyAddress?: string | undefined;
    companyEmail?: string | undefined;
    signature?: string | undefined;
    upiId?: string | undefined;
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

    const totalItems = (sale.items?.length || 0) + (sale.additionalItems?.length || 0);

    return (
        <div id="a4-invoice" className={`${isPreview ? 'block shadow-2xl' : 'hidden print:block'} bg-white text-black p-12 w-[210mm] min-h-[297mm] mx-auto font-sans text-sm`}>
            {/* Top Toolbar Info */}
            <div className="flex justify-between items-start mb-12">
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

            <div className="grid grid-cols-2 gap-12 mb-12 p-8 bg-slate-50 rounded-3xl border-2 border-black">
                <div>
                    <h3 className="text-[10px] font-black text-black uppercase tracking-[0.2em] mb-3">BILL TO :</h3>
                    <p className="text-xl font-black text-black mb-1">{sale.customerName || 'Cash Customer'}</p>
                    <p className="text-black font-bold text-base">{sale.customerPhone || 'No Phone provided'}</p>
                    {sale.customerAddress && <p className="text-black font-medium text-xs mt-2">{sale.customerAddress}</p>}
                </div>
                <div className="text-right">
                    <h3 className="text-[10px] font-black text-black uppercase tracking-[0.2em] mb-3">Payment Info</h3>
                    <p className="text-lg font-black text-black uppercase tracking-tight">{sale.paymentMode || 'CASH'}</p>
                    <p className="text-xs font-black uppercase tracking-widest mt-1 text-black">
                        Status: {sale.status === 'pending' ? 'DUE' : sale.status?.toUpperCase()}
                    </p>
                </div>
            </div>

            <div className="mb-12">
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
                                    <p className="font-black text-black text-base">{item.productId?.name || 'Item Name'}</p>
                                    <p className="text-[10px] text-black font-bold uppercase tracking-widest">{item.unit || 'Units'}</p>
                                </td>
                                <td className="py-5 px-2 text-right font-bold text-black">₹{(item.mrpAtTime || 0).toFixed(0)}</td>
                                <td className="py-5 px-2 text-center font-black text-black text-base">{item.quantity}</td>
                                <td className="py-5 px-2 text-right font-bold text-black">₹{(item.sellingPrice || 0).toFixed(0)}</td>
                                <td className="py-5 px-2 text-right font-black text-black text-base">₹{((item.quantity || 0) * (item.sellingPrice || 0)).toFixed(0)}</td>
                            </tr>
                        ))}
                        {(sale.additionalItems || []).map((item: any, i: number) => (
                            <tr key={`add-${i}`} className="text-black bg-slate-50 italic">
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

            <div className="flex justify-end pt-8 border-t-4 border-black">
                <div className="w-full max-w-sm space-y-3">
                    <div className="flex justify-between text-black font-bold text-base">
                        <span>Items Subtotal</span>
                        <span>₹{((sale.items || []).reduce((acc: number, item: any) => acc + (item.quantity * item.sellingPrice), 0)).toFixed(2)}</span>
                    </div>
                    {(sale.additionalItems || []).length > 0 && (
                        <div className="flex justify-between text-black font-bold text-base">
                            <span>Service & Charges</span>
                            <span>₹{((sale.additionalItems || []).reduce((acc: number, item: any) => acc + Number(item.price), 0)).toFixed(2)}</span>
                        </div>
                    )}
                    {typeof sale.roundOffAmount === 'number' && sale.roundOffAmount !== 0 && (
                        <div className="flex justify-between text-black font-bold italic">
                            <span>Round Off</span>
                            <span>{sale.roundOffAmount > 0 ? '+' : ''}{sale.roundOffAmount.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-4xl font-black text-black pt-5 border-t-4 border-black">
                        <span>TOTAL</span>
                        <span>₹{(sale.totalAmount || 0).toLocaleString()}</span>
                    </div>

                    {/* Balance Section */}
                    {sale.amountPaid < sale.totalAmount && (
                        <div className="mt-6 p-6 bg-slate-50 rounded-[2rem] border-2 border-black space-y-3">
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

            <div className="mt-20 flex justify-between items-end">
                <div className="text-black text-[11px] font-bold space-y-1">
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
