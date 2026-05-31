import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface TransactionItem {
  name: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
}

interface Transaction {
  id: string;
  type: 'sale' | 'payment';
  date: string;
  amount: number;
  paid?: number;
  due?: number;
  invoiceNumber?: string;
  paymentMode?: string;
  notes?: string;
  items?: TransactionItem[];
  runningBalance: number;
}

interface CustomerReportData {
  customer: {
    name: string;
    phone: string;
    address?: string;
    gstin?: string;
  };
  summary: {
    openingBalance: number;
    totalSales: number;
    totalPaid: number;
    closingBalance: number;
  };
  transactions: Transaction[];
  dateRange: {
    start?: string;
    end?: string;
  };
  companyName?: string;
}

export const generateCustomerReportPDF = (data: CustomerReportData) => {
    try {
        const doc = new jsPDF();

        // --- Header & Branding ---
        doc.setFillColor(30, 41, 59); // Slate-800
        doc.rect(0, 0, 210, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.text((data.companyName || "BUILDMATE ERP").toUpperCase(), 15, 25);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Customer Sales & Ledger Report", 15, 32);
        
        doc.setFontSize(16);
        doc.text("STATEMENT OF ACCOUNT", 120, 25);

        // --- Customer Info Section ---
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`Customer: ${data.customer.name.toUpperCase()}`, 15, 55);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        if (data.customer.phone) doc.text(`Phone: ${data.customer.phone}`, 15, 62);
        if (data.customer.address) doc.text(`Address: ${data.customer.address}`, 15, 68);
        if (data.customer.gstin) doc.text(`GSTIN: ${data.customer.gstin}`, 15, 74);
        
        doc.setFont("helvetica", "bold");
        const dateStr = data.dateRange.start && data.dateRange.end 
            ? `${format(new Date(data.dateRange.start), 'dd MMM yyyy')} to ${format(new Date(data.dateRange.end), 'dd MMM yyyy')}` 
            : 'All Time';
        doc.text(`Period: ${dateStr}`, 120, 55);
        doc.text(`Generated On: ${new Date().toLocaleDateString()}`, 120, 62);

        // --- Summary Table ---
        autoTable(doc, {
            startY: 85,
            head: [['Account Summary', 'Amount (Rs.)']],
            body: [
                ['Opening Balance', `Rs. ${data.summary.openingBalance.toLocaleString()}`],
                ['Total Purchases', `Rs. ${data.summary.totalSales.toLocaleString()}`],
                ['Total Payments Received', `Rs. ${data.summary.totalPaid.toLocaleString()}`],
                ['Closing Balance (Amount Due)', `Rs. ${data.summary.closingBalance.toLocaleString()}`],
            ],
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246] },
            styles: { fontSize: 10 }
        });

        let currentY = (doc as any).lastAutoTable?.finalY + 15 || 140;

        // --- Transactions Table ---
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Transaction Details", 15, currentY);

        const tableBody: any[] = [];
        
        data.transactions.forEach(t => {
            const dateStr = format(new Date(t.date), 'dd MMM yyyy');
            
            if (t.type === 'sale') {
                const itemsList = t.items?.map(i => `${i.name} (${i.quantity} ${i.unit})`).join(', ') || 'N/A';
                tableBody.push([
                    dateStr,
                    `Sale ${t.invoiceNumber ? `(${t.invoiceNumber})` : ''}\nItems: ${itemsList}`,
                    `Rs. ${t.amount.toLocaleString()}`,
                    `Rs. ${t.paid?.toLocaleString() || 0}`,
                    `Rs. ${t.runningBalance.toLocaleString()}`
                ]);
            } else {
                tableBody.push([
                    dateStr,
                    `Payment Received (${t.paymentMode || 'Cash'})${t.notes ? `\nNote: ${t.notes}` : ''}`,
                    '-',
                    `Rs. ${t.amount.toLocaleString()}`,
                    `Rs. ${t.runningBalance.toLocaleString()}`
                ]);
            }
        });

        autoTable(doc, {
            startY: currentY + 5,
            head: [['Date', 'Particulars', 'Bill Amount', 'Paid/Received', 'Running Balance']],
            body: tableBody,
            headStyles: { fillColor: [30, 41, 59] },
            styles: { fontSize: 9 },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 25, halign: 'right' },
                3: { cellWidth: 30, halign: 'right' },
                4: { cellWidth: 30, halign: 'right' },
            }
        });

        currentY = (doc as any).lastAutoTable?.finalY + 30;

        // Page break if near bottom
        if (currentY > 260) {
            doc.addPage();
            currentY = 30;
        }

        // --- Footer ---
        doc.setLineWidth(0.5);
        doc.line(15, currentY, 70, currentY);
        doc.setFontSize(10);
        doc.text("Authorized Signature", 15, currentY + 5);
        
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text("Generated by BuildMate ERP Management System", 75, 285);

        // Save PDF
        const fileName = `${data.customer.name.replace(/\s+/g, '_')}_Statement.pdf`;
        doc.save(fileName);
        return true;
    } catch (error) {
        console.error('PDF Generation Error:', error);
        throw error;
    }
};
