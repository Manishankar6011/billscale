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
        <div id="printable-invoice" className={`${isPreview ? 'block shadow-md' : 'hidden print:block'} bg-white text-black p-2 w-full max-w-[80mm] mx-auto font-sans text-[12px] leading-tight`}>
            {/* Header */}
            <div className="text-center border-b-2 border-black pb-3 mb-3">
                {companyLogo && (
                    <img src={companyLogo} alt="Company Logo" className="h-14 mx-auto mb-2 object-contain" />
                )}
                <h1 className="text-xl font-bold uppercase tracking-tight">{businessName}</h1>
                {ownerName && <p className="text-[10px] font-bold mt-0.5">Proprietor: {ownerName}</p>}
                <div className="mt-2 space-y-0.5 text-[11px] font-medium">
                    {companyPhone && <p>Contact: {companyPhone}</p>}
                    {companyEmail && <p>Email: {companyEmail}</p>}
                    {companyAddress && <p className="text-[10px] uppercase">{companyAddress}</p>}
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
                    <p><span className="font-bold">DATE:</span> {format(new Date(sale.createdAt || sale.date || new Date()), 'dd-MMM-yyyy hh:mm a')}</p>
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
                    {(sale.items || []).map((item: any, i: number) => (
                        <tr key={i} className="border-b border-black border-dashed">
                            <td className="py-2 pr-1">
                                <p className="font-black text-[12px] leading-tight mb-1">{item.productId?.name || 'Item'}</p>
                                <p className="text-[10px] font-bold">MRP: ₹{item.mrpAtTime || 0} | Unit: {item.unit}</p>
                            </td>
                            <td className="py-2 text-center font-black">{item.quantity}</td>
                            <td className="py-2 text-right">{(item.sellingPrice || 0).toFixed(0)}</td>
                            <td className="py-2 text-right font-black">{((item.quantity || 0) * (item.sellingPrice || 0)).toFixed(0)}</td>
                        </tr>
                    ))}
                    {(sale.additionalItems || []).map((item: any, i: number) => (
                        <tr key={`add-${i}`} className="border-b border-black border-dashed italic">
                            <td className="py-2 font-black text-[12px]">{item.name}</td>
                            <td className="py-2 text-center">1</td>
                            <td className="py-2 text-right">{(item.price || 0).toFixed(0)}</td>
                            <td className="py-2 text-right font-black">{(item.price || 0).toFixed(0)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Totals Section */}
            <div className="border-t-2 border-black pt-2 space-y-1">
                <div className="flex justify-between items-center text-[12px] font-bold">
                    <span>Subtotal:</span>
                    <span className="font-black">₹{(sale.totalAmount - (sale.roundOffAmount || 0)).toLocaleString()}</span>
                </div>
                {roundOffAmount !== undefined && roundOffAmount !== 0 && (
                    <div className="flex justify-between items-center text-[12px] font-bold">
                        <span>Round Off:</span>
                        <span className="font-black">{roundOffAmount >= 0 ? '+' : ''}{roundOffAmount.toFixed(2)}</span>
                    </div>
                )}
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
                    <p className="text-[11px] font-black border-y-2 border-black py-1">Items: {totalItems} | MODE: {sale.paymentMode?.toUpperCase() || 'CASH'}</p>
                    
                    {signature && (
                        <div className="flex flex-col items-center mt-4">
                            <p className="text-[8px] mb-1 font-bold uppercase tracking-widest">Authorized Signature</p>
                            <img src={signature} alt="Signature" className="h-10 object-contain mb-1 mix-blend-multiply" />
                            <div className="w-32 border-t border-black"></div>
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
