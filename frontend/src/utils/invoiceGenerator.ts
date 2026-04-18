import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export const generateInvoice = (sale: any, businessName: string = 'BuildMate ERP', ownerName?: string) => {
    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;

        // Header
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('INVOICE', pageWidth / 2, 20, { align: 'center' });

        doc.setFontSize(14);
        doc.text(businessName, 20, 35);
        
        if (ownerName) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'italic');
            doc.text(`Proprietor: ${ownerName}`, 20, 42);
        }
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Date: ${format(new Date(sale.date), 'dd MMM yyyy')}`, pageWidth - 20, 35, { align: 'right' });
        
        // Shorten ID: Use last 6 chars prepended with BM-
        const displayId = sale._id ? `BM-${sale._id.slice(-6).toUpperCase()}` : 'N/A';
        doc.text(`Invoice ID: ${displayId}`, pageWidth - 20, 42, { align: 'right' });

        // Customer Info
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Bill To: ${sale.customerName || 'Walk-in Customer'}`, 20, 62);

        // Items Table
        const tableColumn = ["Product", "Quantity", "Price", "Total"];
        const tableRows: any[] = [];

        sale.items.forEach((item: any) => {
            const itemData = [
                item.productId?.name || 'Unknown Product',
                `${item.quantity} ${item.productId?.unit || ''}`,
                `Rs.${(item.sellingPrice || 0).toFixed(2)}`,
                `Rs.${((item.quantity || 0) * (item.sellingPrice || 0)).toFixed(2)}`
            ];
            tableRows.push(itemData);
        });

        if (sale.additionalItems && sale.additionalItems.length > 0) {
            sale.additionalItems.forEach((item: any) => {
                tableRows.push([
                    item.name,
                    "1 Unit",
                    `Rs.${(item.price || 0).toFixed(2)}`,
                    `Rs.${(item.price || 0).toFixed(2)}`
                ]);
            });
        }

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 75,
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229] }, // primary-600
            styles: { fontSize: 10, cellPadding: 5 },
            columnStyles: {
                2: { halign: 'right' },
                3: { halign: 'right' }
            }
        });

        let finalY = (doc as any).lastAutoTable.finalY + 10;

        // Summary
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(`Grand Total: Rs.${(sale.totalAmount || 0).toFixed(2)}`, pageWidth - 20, finalY, { align: 'right' });

        if (sale.amountPaid !== undefined && sale.amountPaid < sale.totalAmount) {
            finalY += 7;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Amount Paid: Rs.${(sale.amountPaid || 0).toFixed(2)}`, pageWidth - 20, finalY, { align: 'right' });
            finalY += 6;
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(220, 38, 38); // rose-600
            doc.text(`Balance Due: Rs.${(sale.balanceDue || 0).toFixed(2)}`, pageWidth - 20, finalY, { align: 'right' });
            doc.setTextColor(0, 0, 0);
        } else if (sale.amountPaid !== undefined) {
            finalY += 7;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Status: FULLY PAID`, pageWidth - 20, finalY, { align: 'right' });
        }

        // Footer
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text('Thank you for your business!', pageWidth / 2, doc.internal.pageSize.height - 20, { align: 'center' });

        // Save
        doc.save(`Invoice_${sale.customerName?.replace(/\s+/g, '_') || 'Sale'}_${format(new Date(), 'yyyyMMdd')}.pdf`);
    } catch (error) {
        console.error('Invoice Generation Error:', error);
        alert('Failed to generate invoice. Please try again.');
    }
};
