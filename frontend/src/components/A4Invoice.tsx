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
    isPreview = false
}) => {
    if (!sale) return null;

    const totalItems = (sale.items?.length || 0) + (sale.additionalItems?.length || 0);

    return (
        <div id="a4-invoice" className={`${isPreview ? 'block shadow-2xl' : 'hidden print:block'} bg-white text-slate-800 p-12 w-[210mm] min-h-[297mm] mx-auto font-sans text-sm`}>
            {/* Top Toolbar Info (Optional/Design) */}
            <div className="flex justify-between items-start mb-12">
                <div className="space-y-2">
                    {companyLogo ? (
                        <img src={companyLogo} alt="Logo" className="h-16 object-contain mb-4" />
                    ) : (
                        <h1 className="text-3xl font-black text-primary-600 tracking-tighter uppercase">{businessName}</h1>
                    )}
                    <div className="text-xs text-slate-500 space-y-0.5">
                        <p className="font-bold text-slate-700">{businessName}</p>
                        {ownerName && <p>Proprietor: {ownerName}</p>}
                        {companyAddress && <p className="max-w-xs whitespace-pre-wrap">{companyAddress}</p>}
                        {companyPhone && <p>Phone: {companyPhone}</p>}
                        {companyEmail && <p>Email: {companyEmail}</p>}
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-5xl font-black text-slate-200 tracking-tighter uppercase mb-4">Invoice</h2>
                    <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Invoice Number</p>
                        <p className="text-lg font-black text-slate-800 tracking-tight">{sale.invoiceNumber}</p>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-4">Date of Issue</p>
                        <p className="text-lg font-black text-slate-800 tracking-tight">{format(new Date(sale.date), 'dd MMMM yyyy')}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-12 mb-12 p-8 bg-slate-50 rounded-3xl border border-slate-100">
                <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Billed To</h3>
                    <p className="text-xl font-black text-slate-800 mb-1">{sale.customerName || 'Cash Customer'}</p>
                    <p className="text-slate-500 font-medium">{sale.customerPhone || 'No Phone provided'}</p>
                    {sale.customerAddress && <p className="text-slate-500 text-xs mt-2">{sale.customerAddress}</p>}
                </div>
                <div className="text-right">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Payment Info</h3>
                    <p className="text-lg font-black text-slate-800 uppercase tracking-tight">{sale.paymentMode || 'CASH'}</p>
                    <p className={`text-xs font-black uppercase tracking-widest mt-1 ${
                        sale.status === 'paid' ? 'text-emerald-500' : 
                        sale.status === 'partial' ? 'text-amber-500' : 'text-rose-500'
                    }`}>
                        Status: {sale.status === 'pending' ? 'DUE' : sale.status?.toUpperCase()}
                    </p>
                </div>
            </div>

            <div className="mb-12">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b-2 border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <th className="py-4 px-2">#</th>
                            <th className="py-4 px-2">Description</th>
                            <th className="py-4 px-2 text-right">MRP</th>
                            <th className="py-4 px-2 text-center">Quantity</th>
                            <th className="py-4 px-2 text-right">Unit Price</th>
                            <th className="py-4 px-2 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {(sale.items || []).map((item: any, i: number) => (
                            <tr key={i} className="text-slate-700">
                                <td className="py-5 px-2 font-bold text-slate-300">{String(i + 1).padStart(2, '0')}</td>
                                <td className="py-5 px-2">
                                    <p className="font-black text-slate-800">{item.productId?.name || 'Item Name'}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.unit || 'Units'}</p>
                                </td>
                                <td className="py-5 px-2 text-right font-medium text-slate-400">₹{(item.mrpAtTime || 0).toFixed(2)}</td>
                                <td className="py-5 px-2 text-center font-bold">{item.quantity}</td>
                                <td className="py-5 px-2 text-right font-medium">₹{(item.sellingPrice || 0).toFixed(2)}</td>
                                <td className="py-5 px-2 text-right font-black text-slate-900">₹{((item.quantity || 0) * (item.sellingPrice || 0)).toFixed(2)}</td>
                            </tr>
                        ))}
                        {(sale.additionalItems || []).map((item: any, i: number) => (
                            <tr key={`add-${i}`} className="text-slate-700 bg-slate-50/50 italic">
                                <td className="py-5 px-2 font-bold text-slate-300">{String((sale.items?.length || 0) + i + 1).padStart(2, '0')}</td>
                                <td className="py-5 px-2">
                                    <p className="font-black text-slate-800">{item.name}</p>
                                    <p className="text-[10px] text-primary-400 font-bold uppercase tracking-widest">Service / Additional Charge</p>
                                </td>
                                <td className="py-5 px-2 text-right text-slate-300">—</td>
                                <td className="py-5 px-2 text-center font-bold">1</td>
                                <td className="py-5 px-2 text-right font-medium">₹{(item.price || 0).toFixed(2)}</td>
                                <td className="py-5 px-2 text-right font-black text-slate-900">₹{(item.price || 0).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-end pt-8 border-t-2 border-slate-100">
                <div className="w-full max-w-sm space-y-3">
                    <div className="flex justify-between text-slate-500 font-bold">
                        <span>Items Subtotal</span>
                        <span>₹{((sale.items || []).reduce((acc: number, item: any) => acc + (item.quantity * item.sellingPrice), 0)).toFixed(2)}</span>
                    </div>
                    {(sale.additionalItems || []).length > 0 && (
                        <div className="flex justify-between text-slate-500 font-bold">
                            <span>Service & Other Charges</span>
                            <span>₹{((sale.additionalItems || []).reduce((acc: number, item: any) => acc + Number(item.price), 0)).toFixed(2)}</span>
                        </div>
                    )}
                    {sale.roundOffAmount !== 0 && (
                        <div className="flex justify-between text-slate-500 font-bold italic">
                            <span>Round Off</span>
                            <span>{sale.roundOffAmount > 0 ? '+' : ''}{sale.roundOffAmount.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-3xl font-black text-slate-900 pt-5 border-t-2 border-slate-900">
                        <span>GRAND TOTAL</span>
                        <span>₹{(sale.totalAmount || 0).toFixed(2)}</span>
                    </div>

                    {/* Partial Payment Section */}
                    {sale.amountPaid < sale.totalAmount && (
                        <div className="mt-6 p-6 bg-rose-50 rounded-[2rem] border border-rose-100 space-y-3">
                            <div className="flex justify-between text-sm font-bold text-slate-600">
                                <span>Total Paid</span>
                                <span>₹{(sale.amountPaid || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-lg font-black text-rose-600 border-t border-rose-200 pt-2">
                                <span>Balance Remaining</span>
                                <span>₹{(sale.balanceDue || 0).toFixed(2)}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-20 flex justify-between items-end">
                <div className="text-slate-400 text-[10px] font-bold space-y-1">
                    <p className="uppercase tracking-widest text-slate-300 mb-2">Terms & Conditions</p>
                    <p>1. Goods once sold will not be taken back.</p>
                    <p>2. Subect to local jurisdiction.</p>
                    <p>3. This is a computer generated invoice.</p>
                </div>
                <div className="text-center min-w-[150px]">
                    {signature && (
                        <img src={signature} alt="Signature" className="h-12 mx-auto mb-2 mix-blend-multiply" />
                    )}
                    <div className="border-t border-slate-200 pt-2 font-black text-[10px] uppercase tracking-widest text-slate-800">
                        Authorized Signatory
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-auto pt-12 text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">
                {businessName} · Quality & Trust
            </div>
        </div>
    );
};

export default A4Invoice;
