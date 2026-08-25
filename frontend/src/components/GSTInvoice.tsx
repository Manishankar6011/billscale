import React from "react";
import { format } from "date-fns";
import { numberToWords } from "../utils/numberToWords";
import QRCode from "qrcode";

interface GSTInvoiceProps {
  sale: any;
  businessName: string;
  ownerName?: string;
  companyLogo?: string;
  companyPhone?: string;
  companyAddress?: string;
  companyEmail?: string;
  signature?: string;
  gstin?: string;
  pan?: string;
  stateName?: string;
  stateCode?: string;
  upiId?: string;
  isPreview?: boolean;
}

const GSTInvoice: React.FC<GSTInvoiceProps> = ({
  sale,
  businessName,
  companyAddress,
  companyPhone,
  companyEmail,
  signature,
  gstin,
  pan,
  stateName,
  stateCode,
  upiId,
  isPreview = false,
}) => {
  const [qrCodeData, setQrCodeData] = React.useState<string>("");

  React.useEffect(() => {
    if (upiId && sale?.totalAmount > 0) {
      const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(businessName)}&am=${sale.totalAmount}&cu=INR`;
      QRCode.toDataURL(upiUrl, { margin: 1, width: 200 })
        .then((url) => setQrCodeData(url))
        .catch((err) => console.error(err));
    }
  }, [upiId, sale?.totalAmount, businessName]);

  if (!sale) return null;

  const invoiceDate = format(new Date(sale.date), "d-MMM-yy");

  // Tax Calculations
  const hsnSummary: Record<
    string,
    { taxable: number; rate: number; cgst: number; sgst: number }
  > = {};
  let totalQty = 0;

  (sale.items || []).forEach((item: any) => {
    const hsn = item.hsnCode || "N/A";
    const itemTotal = item.quantity * item.sellingPrice;
    const taxRate = item.taxRate || 0;
    // Calculate taxable value and tax
    const taxableValue = Math.round((itemTotal * (100 / (100 + taxRate))) * 100) / 100;
    const totalTax = Math.round((itemTotal - taxableValue) * 100) / 100;

    totalQty += item.quantity || 0;

    if (!hsnSummary[hsn]) {
      hsnSummary[hsn] = { taxable: 0, rate: taxRate, cgst: 0, sgst: 0 };
    }
    hsnSummary[hsn].taxable += taxableValue;
    hsnSummary[hsn].cgst += totalTax / 2;
    hsnSummary[hsn].sgst += totalTax / 2;
  });

  const totalTaxable = Object.values(hsnSummary).reduce(
    (acc, curr) => acc + curr.taxable,
    0,
  );
  const totalCGST = Math.round(Object.values(hsnSummary).reduce(
    (acc, curr) => acc + curr.cgst,
    0,
  ) * 100) / 100;
  const totalSGST = Math.round(Object.values(hsnSummary).reduce(
    (acc, curr) => acc + curr.sgst,
    0,
  ) * 100) / 100;

  // The true subtotal before rounding off
  const subTotal = totalTaxable + totalCGST + totalSGST;
  // Calculate dynamic round off to reach sale.totalAmount
  const dynamicRoundOff = sale.totalAmount - subTotal;
  const grandTotalTax = totalCGST + totalSGST;

  return (
    <div
      id="gst-invoice"
      className={`${isPreview ? "block shadow-2xl" : "hidden print:block"} bg-white text-black p-4 w-[210mm] min-h-[297mm] mx-auto font-serif text-[13px] leading-tight`}
    >
      <div className="border border-black flex flex-col">
        {/* Header Title */}
        <div className="text-center py-1 font-bold text-sm border-b border-black uppercase tracking-widest">
          Tax Invoice
        </div>

        {/* Top Section: Seller & Invoice Details */}
        <div className="flex border-b border-black min-h-[120px]">
          {/* Seller Details */}
          <div className="w-[55%] border-r border-black p-2 flex flex-col">
            <h2 className="text-base font-black uppercase mb-0.5">
              {businessName}
            </h2>
            <p className="whitespace-pre-wrap mb-1">
              {companyAddress || "N/A"}
            </p>
            <p>
              GSTIN/UIN: <span className="font-bold">{gstin || "N/A"}</span>
            </p>
            <p>
              State Name :{" "}
              <span className="font-bold">{stateName || "Bihar"}</span>, Code :{" "}
              <span className="font-bold">{stateCode || "10"}</span>
            </p>
            <p>
              E-Mail :{" "}
              <span className="font-bold italic text-[12px]">
                {companyEmail || "N/A"}
              </span>
            </p>
            {companyPhone && (
              <p>
                Phone : <span className="font-bold">{companyPhone}</span>
              </p>
            )}
          </div>

          {/* Invoice Details Table */}
          <div className="w-[45%] flex flex-col">
            <div className="flex border-b border-black flex-1">
              <div className="w-1/2 border-r border-black p-1">
                <p className="text-[12px] text-gray-600 mb-1">Invoice No.</p>
                <p className="font-bold text-sm">{sale.invoiceNumber}</p>
              </div>
              <div className="w-1/2 p-1">
                <p className="text-[12px] text-gray-600 mb-1">Date:</p>
                <p className="font-bold text-sm">{invoiceDate}</p>
              </div>
            </div>
            <div className="flex border-b border-black flex-1">
              <div className="w-1/2 border-r border-black p-1">
                <p className="text-[12px] text-gray-600">Reference No. & Date</p>
              </div>
              <div className="w-1/2 p-1">
                <p className="text-[12px] text-gray-600">Other References</p>
              </div>
            </div>
            <div className="flex-1 p-1"></div>
            <div className="flex-1 p-1"></div>
          </div>
        </div>

        {/* Middle Section: Buyer Details */}
        <div className="flex border-b border-black min-h-[80px]">
          <div className="w-[55%] border-r border-black p-2">
            <p className="text-[12px] text-gray-600 italic mb-1">
              Buyer (Bill to)
            </p>
            <h3 className="text-base font-black uppercase">
              {sale.customerName || "N/A"}
            </h3>
            <p className="mb-0.5">
              Address:{" "}
              <span className="font-bold">{sale.customerAddress || "N/A"}</span>
            </p>
            <p className="mb-0.5">
              Phone:{" "}
              <span className="font-bold">{sale.customerPhone || "N/A"}</span>
            </p>
            {sale.customerGSTIN && (
              <p className="mb-0.5">
                GSTIN/UIN:{" "}
                <span className="font-bold">{sale.customerGSTIN}</span>
              </p>
            )}
            {sale.customerState && (
              <p>
                State Name :{" "}
                <span className="font-bold">{sale.customerState}</span>, Code :{" "}
                <span className="font-bold">
                  {sale.customerStateCode || "10"}
                </span>
              </p>
            )}
            {sale.customerState ||
              (stateName && (
                <p>
                  State Name :{" "}
                  <span className="font-bold">
                    {sale.customerState || stateName || "Bihar"}
                  </span>
                  , Code :{" "}
                  <span className="font-bold">
                    {sale.customerStateCode || stateCode || "10"}
                  </span>
                </p>
              ))}
          </div>
          <div className="w-[45%] p-2 flex items-center justify-center">
            {qrCodeData && (
              <div className="flex flex-col items-center gap-1 border border-black/10 p-1 rounded">
                <img src={qrCodeData} alt="UPI QR" className="w-20 h-20" />
                <p className="text-[11px] font-bold">Scan to Pay</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-tighter">
                  {upiId}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="flex-grow">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-black text-[12px] uppercase">
                <th className="border-r border-black py-1 px-1 w-8 text-center">
                  Sl
                  <br />
                  No
                </th>
                <th className="border-r border-black py-1 px-2 text-left w-auto">
                  Description of Goods
                </th>
                <th className="border-r border-black py-1 px-1 w-16 text-center">
                  HSN/SAC
                </th>
                <th className="border-r border-black py-1 px-1 w-12 text-center">
                  Quantity
                </th>
                <th className="border-r border-black py-1 px-1 w-20 text-right">
                  Rate
                  <br />
                  <span className="lowercase">(Incl. of Tax)</span>
                </th>
                <th className="py-1 px-1 w-20 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(sale.items || []).map((item: any, i: number) => (
                <tr key={i} className="align-top">
                  <td className="border-r border-black px-1 py-1 text-center font-bold">
                    {i + 1}
                  </td>
                  <td className="border-r border-black px-2 py-1">
                    <p className="font-bold uppercase leading-tight text-[13px]">
                      {item.productId?.name || item.name || "Product"}
                    </p>
                    {item.description && (
                      <p className="text-[11px] text-gray-500 italic mt-0.5">
                        {item.description}
                      </p>
                    )}
                    {(item.batchNumber || item.expiryDate || item.mrpAtTime) && (
                      <div className="text-[10px] font-bold text-gray-600 mt-0.5">
                        {(() => {
                            let mrp = item.mrpAtTime || 0;
                            if (item.productId && typeof item.productId === 'object') {
                                const p = item.productId as any;
                                if (p.hasSubUnit && item.unit === p.subUnitName) {
                                    mrp = (p.subUnitMrp && p.subUnitMrp > 0 && p.subUnitMrp < (p.mrp || 0)) ? p.subUnitMrp : ((p.mrp || 0) / (p.subUnitValue || 1));
                                }
                            }
                            return mrp > 0 ? <span>MRP: ₹{mrp}</span> : null;
                        })()}
                        {item.batchNumber && <span> | B: {item.batchNumber}</span>}
                        {item.expiryDate && <span> | E: {item.expiryDate}</span>}
                      </div>
                    )}
                  </td>
                  <td className="border-r border-black px-1 py-1 text-center">
                    {item.hsnCode || "N/A"}
                  </td>
                  <td className="border-r border-black px-1 py-1 text-center font-bold">
                    {item.quantity} {item.unit || "Nos."}
                  </td>
                  <td className="border-r border-black px-1 py-1 text-right font-bold">
                    {item.sellingPrice.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-1 py-1 text-right font-bold">
                    {(
                      item.quantity *
                      item.sellingPrice *
                      (100 / (100 + (item.taxRate || 0)))
                    ).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              {(sale.additionalItems || []).length > 0 && (
                <tr className="bg-gray-50 italic">
                  <td className="border-r border-black px-1 py-1 text-center font-bold"></td>
                  <td colSpan={5} className="px-2 py-1 text-[11px] font-black uppercase tracking-widest border-b border-black/10">
                    Additional Charges & Services
                  </td>
                </tr>
              )}
              {(sale.additionalItems || []).map((item: any, i: number) => (
                <tr key={`add-${i}`} className="align-top italic bg-gray-50/50">
                  <td className="border-r border-black px-1 py-1 text-center font-bold">
                    {(sale.items?.length || 0) + i + 1}
                  </td>
                  <td className="border-r border-black px-2 py-1">
                    <p className="font-bold uppercase leading-tight text-[13px]">
                      {item.name}
                    </p>
                    <p className="text-[11px] text-gray-500 italic mt-0.5">
                      Service/Charge
                    </p>
                  </td>
                  <td className="border-r border-black px-1 py-1 text-center">—</td>
                  <td className="border-r border-black px-1 py-1 text-center font-bold">1</td>
                  <td className="border-r border-black px-1 py-1 text-right font-bold">
                    {item.price.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-1 py-1 text-right font-bold">
                    {item.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              {/* Empty rows to maintain height */}
              {Array.from({
                length: Math.max(0, 10 - (sale.items?.length || 0)),
              }).map((_, idx) => (
                <tr key={`empty-${idx}`} className="h-6">
                  <td className="border-r border-black px-1"></td>
                  <td className="border-r border-black px-1"></td>
                  <td className="border-r border-black px-1"></td>
                  <td className="border-r border-black px-1"></td>
                  <td className="border-r border-black px-1"></td>
                  <td className="px-1"></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {/* Total Taxable Amount */}
              <tr className="border-t border-black">
                <td className="border-r border-black"></td>
                <td className="border-r border-black text-right px-2 py-1 font-bold uppercase">
                  Total Taxable Amount
                </td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="text-right px-1 py-1 font-bold">
                  {totalTaxable.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </td>
              </tr>
              {/* Tax Rows in Table */}
              <tr>
                <td className="border-r border-black"></td>
                <td className="border-r border-black text-right px-2 py-1 italic font-bold">
                  SGST
                </td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="text-right px-1 py-1 font-bold">
                  {totalSGST.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </td>
              </tr>
              <tr>
                <td className="border-r border-black"></td>
                <td className="border-r border-black text-right px-2 py-1 italic font-bold">
                  CGST
                </td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="text-right px-1 py-1 font-bold">
                  {totalCGST.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </td>
              </tr>
              {(() => {
                const rOff = dynamicRoundOff;
                return (
                  <tr>
                    <td className="border-r border-black text-[11px] px-1 py-0.5 italic">
                      {rOff < -0.001 ? "Less:" : "Add:"}
                    </td>
                    <td className="border-r border-black text-right px-2 py-0.5 italic font-bold">
                      Rounding Off
                    </td>
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td className="text-right px-1 py-0.5 font-bold">
                      {rOff < -0.001 ? `(-)${Math.abs(rOff).toFixed(2)}` : `(+)${rOff.toFixed(2)}`}
                    </td>
                  </tr>
                );
              })()}
              {/* Grand Total Row */}
              <tr className="border-t border-black font-bold">
                <td className="border-r border-black"></td>
                <td className="border-r border-black text-right px-2 py-1 uppercase">
                  Total
                </td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black text-center px-1 py-1">
                  {totalQty} Nos.
                </td>
                <td className="border-r border-black"></td>
                <td className="text-right px-1 py-1 text-[15px]">
                  Rs{" "}
                  {sale.totalAmount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Amount in Words */}
        <div className="border-t border-black p-1">
          <p className="text-[11px]">Amount Chargeable (in words)</p>
          <p className="font-bold uppercase italic text-[13px]">
            INR {numberToWords(sale.totalAmount)}
          </p>
        </div>

        {/* HSN Tax Breakdown Table */}
        <div className="border-t border-black overflow-hidden">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-black text-center bg-gray-50">
                <th rowSpan={2} className="border-r border-black p-1 w-24">
                  HSN/SAC
                </th>
                <th rowSpan={2} className="border-r border-black p-1 w-24">
                  Taxable
                  <br />
                  Value
                </th>
                <th colSpan={2} className="border-r border-black p-1">
                  Central Tax
                </th>
                <th colSpan={2} className="border-r border-black p-1">
                  State Tax
                </th>
                <th rowSpan={2} className="p-1 w-24">
                  Total
                  <br />
                  Tax Amount
                </th>
              </tr>
              <tr className="border-b border-black text-center bg-gray-50">
                <th className="border-r border-black p-1 w-12">Rate</th>
                <th className="border-r border-black p-1 w-20">Amount</th>
                <th className="border-r border-black p-1 w-12">Rate</th>
                <th className="border-r border-black p-1 w-20">Amount</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(hsnSummary).map(([hsn, data]: any) => (
                <tr key={hsn} className="text-right border-b border-black/10">
                  <td className="border-r border-black p-1 text-center font-bold">
                    {hsn}
                  </td>
                  <td className="border-r border-black p-1">
                    {data.taxable.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="border-r border-black p-1 text-center">
                    {data.rate / 2}%
                  </td>
                  <td className="border-r border-black p-1">
                    {data.cgst.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="border-r border-black p-1 text-center">
                    {data.rate / 2}%
                  </td>
                  <td className="border-r border-black p-1">
                    {data.sgst.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="p-1 font-bold">
                    {(data.cgst + data.sgst).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold text-right bg-gray-50 border-t border-black">
                <td className="border-r border-black p-1 text-center uppercase">
                  Total
                </td>
                <td className="border-r border-black p-1">
                  {totalTaxable.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td className="border-r border-black p-1"></td>
                <td className="border-r border-black p-1">
                  {totalCGST.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td className="border-r border-black p-1"></td>
                <td className="border-r border-black p-1">
                  {totalSGST.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td className="p-1">
                  {grandTotalTax.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-black p-1">
          <p className="text-[9px] mb-1">
            Tax Amount (in words) :{" "}
            <span className="font-bold italic uppercase underline">
              INR {numberToWords(grandTotalTax)}
            </span>
          </p>
          <div className="flex justify-between items-start mt-2">
            <div className="w-[60%] space-y-1">
              <p>
                Company's PAN :{" "}
                <span className="font-bold">{pan || "N/A"}</span>
              </p>
              <div className="pt-1">
                <p className="text-[8px] font-bold underline uppercase">
                  Declaration
                </p>
                <p className="text-[8px] leading-tight text-gray-700 italic">
                  Please read the terms and conditions carefully. The warranty
                  is provided by the manufacturer; the shop is not responsible
                  for any warranty claims. Battery charging is covered under
                  warranty. The original bill and warranty card are required for
                  warranty registration with the manufacturer.
                </p>
              </div>
            </div>
            <div className="w-[35%] border border-black min-h-[80px] flex flex-col justify-between p-1 relative overflow-hidden">
              <p className="text-[8px] font-bold text-center">
                for {businessName.toUpperCase()}
              </p>
              {signature && (
                <img
                  src={signature}
                  alt="Sign"
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-10 object-contain opacity-80 mix-blend-multiply"
                />
              )}
              <p className="text-[9px] font-black text-center border-t border-black pt-1">
                Authorised Signatory
              </p>
            </div>
          </div>
          <div className="mt-2 text-center text-[9px] font-bold uppercase tracking-wider space-y-0.5">
            <p>SUBJECT TO {stateName?.toUpperCase() || "ARWAL"} JURISDICTION</p>
            <p className="font-medium text-gray-500">thank you, @</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GSTInvoice;
