import React from 'react';
import { format } from 'date-fns';

interface PrintableInvoiceProps {
    sale: any;
    businessName: string;
    ownerName?: string | undefined;
}

const PrintableInvoice: React.FC<PrintableInvoiceProps> = ({ sale, businessName, ownerName }) => {
    if (!sale) return null;

    const totalItems = (sale.items?.length || 0) + (sale.additionalItems?.length || 0);

    return (
        <div id="printable-invoice" className="hidden print:block bg-white text-black p-4 w-full max-w-[80mm] mx-auto font-mono text-[11px] leading-tight">
            {/* Header */}
            <div className="text-center border-b border-black pb-4 mb-4">
                <h1 className="text-xl font-bold uppercase tracking-tighter">{businessName}</h1>
                {ownerName && <p className="text-[9px] italic mt-1">Proprietor: {ownerName}</p>}
                <div className="mt-3 space-y-0.5 text-[10px]">
                    <p>GSTIN: {sale.gstin || '24ABCDE1234F1Z5'}</p>
                    <p>Phone: {sale.businessPhone || '+91 98765 43210'}</p>
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
                        <th className="py-1 text-right">Amount</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-black/10">
                    {(sale.items || []).map((item: any, i: number) => (
                        <tr key={i}>
                            <td className="py-1 truncate max-w-[30mm]">{item.productId?.name || 'Item'}</td>
                            <td className="py-1 text-center">{item.quantity}</td>
                            <td className="py-1 text-right">{(item.sellingPrice || 0).toFixed(0)}</td>
                            <td className="py-1 text-right">{((item.quantity || 0) * (item.sellingPrice || 0)).toFixed(0)}</td>
                        </tr>
                    ))}
                    {(sale.additionalItems || []).map((item: any, i: number) => (
                        <tr key={`add-${i}`}>
                            <td className="py-1 truncate max-w-[30mm]">{item.name}</td>
                            <td className="py-1 text-center">1</td>
                            <td className="py-1 text-right">{(item.price || 0).toFixed(0)}</td>
                            <td className="py-1 text-right">{(item.price || 0).toFixed(0)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Totals */}
            <div className="border-t border-black pt-2 space-y-1">
                <div className="flex justify-between items-center text-[13px] font-bold">
                    <span>GRAND TOTAL:</span>
                    <span>₹{(sale.totalAmount || 0).toLocaleString()}</span>
                </div>
                <div className="text-[9px] uppercase tracking-tighter text-center mt-4">
                    <p className="border-y border-black/10 py-1">Items: {totalItems} | Payment: {sale.paymentMode || 'CASH'}</p>
                    <p className="mt-4 font-bold">!!! THANK YOU !!!</p>
                    <p className="italic lowercase mt-1 text-[8px]">visit again for best quality products</p>
                </div>
            </div>

            {/* Bottom Margin for Thermal Printers */}
            <div className="h-10"></div>
        </div>
    );
};

export default PrintableInvoice;
