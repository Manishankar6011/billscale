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
    isPreview = false
}) => {
    if (!sale) return null;

    const totalItems = (sale.items?.length || 0) + (sale.additionalItems?.length || 0);

    return (
        <div id="printable-invoice" className={`${isPreview ? 'block shadow-inner' : 'hidden print:block'} bg-white text-black p-4 w-full max-w-[80mm] mx-auto font-mono text-[11px] leading-tight`}>
            {/* Header */}
            <div className="text-center border-b border-black pb-4 mb-4">
                {companyLogo && (
                    <img src={companyLogo} alt="Company Logo" className="h-12 mx-auto mb-2 object-contain" />
                )}
                <h1 className="text-xl font-bold uppercase tracking-tighter">{businessName}</h1>
                {ownerName && <p className="text-[9px] italic mt-1">Proprietor: {ownerName}</p>}
                <div className="mt-3 space-y-0.5 text-[10px]">
                    {companyPhone && <p>Phone: {companyPhone}</p>}
                    {companyEmail && <p>Email: {companyEmail}</p>}
                    {companyAddress && <p className="text-[9px] whitespace-pre-wrap">{companyAddress}</p>}
                    {!companyPhone && <p>Phone: {sale.businessPhone || '+91 98765 43210'}</p>}
                </div>
            </div>

            {/* Invoice Info */}
            <div className="flex justify-between mb-4 border-b border-black pb-2">
                <div className="space-y-0.5">
                    <p className="font-bold">Bill To:</p>
                    <p>{sale.customerName || 'Cash Customer'}</p>
                    {sale.customerPhone && <p>{sale.customerPhone}</p>}
                </div>
                <div className="text-right space-y-0.5">
                    <p><span className="font-bold">Inv #:</span> {sale.invoiceNumber}</p>
                    <p><span className="font-bold">Date:</span> {format(new Date(sale.date), 'dd/MM/yy')}</p>
                </div>
            </div>

            {/* Items Table */}
            <table className="w-full mb-4">
                <thead>
                    <tr className="border-b border-black text-left">
                        <th className="py-1">Description</th>
                        <th className="py-1 text-center">Qty</th>
                        <th className="py-1 text-right">Rate</th>
                        <th className="py-1 text-right">Amt</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-black/10">
                    {(sale.items || []).map((item: any, i: number) => (
                        <tr key={i}>
                            <td className="py-1">
                                <p className="truncate max-w-[28mm]">{item.productId?.name || 'Item'}</p>
                                <p className="text-[8px] opacity-70">MRP: ₹{item.mrpAtTime || 0}</p>
                            </td>
                            <td className="py-1 text-center">{item.quantity}</td>
                            <td className="py-1 text-right">{(item.sellingPrice || 0).toFixed(0)}</td>
                            <td className="py-1 text-right">{((item.quantity || 0) * (item.sellingPrice || 0)).toFixed(0)}</td>
                        </tr>
                    ))}
                    {(sale.additionalItems || []).map((item: any, i: number) => (
                        <tr key={`add-${i}`} className="italic">
                            <td className="py-1 truncate max-w-[28mm]">{item.name}</td>
                            <td className="py-1 text-center">1</td>
                            <td className="py-1 text-right">{(item.price || 0).toFixed(0)}</td>
                            <td className="py-1 text-right">{(item.price || 0).toFixed(0)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Totals */}
            <div className="border-t border-black pt-2 space-y-1">
                <div className="flex justify-between items-center text-[10px]">
                    <span>Subtotal:</span>
                    <span>₹{(sale.totalAmount - (sale.roundOffAmount || 0)).toLocaleString()}</span>
                </div>
                {roundOffAmount !== undefined && roundOffAmount !== 0 && (
                    <div className="flex justify-between items-center text-[10px]">
                        <span>Round Off:</span>
                        <span>{roundOffAmount >= 0 ? '+' : ''}{roundOffAmount.toFixed(2)}</span>
                    </div>
                )}
                <div className="flex justify-between items-center text-[13px] font-bold border-t border-black/20 pt-1">
                    <span>GRAND TOTAL:</span>
                    <span>₹{(sale.totalAmount || 0).toLocaleString()}</span>
                </div>

                {/* Payment Breakdown (Partial Payments) */}
                {(sale.amountPaid !== undefined && sale.amountPaid < sale.totalAmount) && (
                    <div className="border-y border-black/10 py-1 my-1 space-y-0.5">
                        <div className="flex justify-between items-center text-[11px]">
                            <span>Paid:</span>
                            <span>₹{(sale.amountPaid || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px] font-bold">
                            <span>Balance:</span>
                            <span>₹{(sale.balanceDue || 0).toLocaleString()}</span>
                        </div>
                    </div>
                )}

                {changeAmount !== undefined && changeAmount > 0 && (
                    <div className="flex justify-between items-center text-[11px] border-t border-black/10 pt-1">
                        <span>Received:</span>
                        <span>₹{(sale.amountPaid || (sale.totalAmount + changeAmount)).toLocaleString()}</span>
                    </div>
                )}
                {changeAmount !== undefined && changeAmount > 0 && (
                    <div className="flex justify-between items-center text-[12px] font-bold">
                        <span>Change:</span>
                        <span>₹{changeAmount.toFixed(0)}</span>
                    </div>
                )}

                <div className="text-[9px] uppercase tracking-tighter text-center mt-4">
                    <p className="border-y border-black/10 py-1">Items: {totalItems} | {sale.paymentMode || 'CASH'}</p>
                    {signature && (
                        <div className="mt-4 flex flex-col items-end">
                            <img src={signature} alt="Signature" className="h-8 object-contain mb-1 mix-blend-multiply" />
                            <p className="text-[7px] border-t border-black/10 pt-1 w-24 text-center">Auth. Signatory</p>
                        </div>
                    )}
                    <p className="mt-4 font-bold text-xs tracking-widest">!!! THANK YOU !!!</p>
                    <p className="italic lowercase mt-1 text-[8px]">visit again for quality building materials</p>
                </div>
            </div>

            {/* Bottom Margin for Thermal Printers */}
            <div className="h-10"></div>
        </div>
    );
};

export default PrintableInvoice;
