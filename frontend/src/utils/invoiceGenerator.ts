import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export const generateInvoice = async (
    sale: any, 
    businessName: string = 'BuildMate ERP', 
    ownerName?: string,
    companyLogo?: string,
    companyAddress?: string,
    companyPhone?: string,
    companyEmail?: string,
    signature?: string
) => {
    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        let currentY = 20;

        // Header Title
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('INVOICE', pageWidth / 2, currentY, { align: 'center' });
        currentY += 15;

        // Company Logo & Info
        if (companyLogo) {
            try {
                doc.addImage(companyLogo, 'PNG', 20, currentY, 30, 30);
                // Adjust info position if logo is present
                doc.setFontSize(14);
                doc.text(businessName, 55, currentY + 5);
                
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                let infoY = currentY + 12;
                if (ownerName) { doc.text(`Proprietor: ${ownerName}`, 55, infoY); infoY += 5; }
                if (companyPhone) { doc.text(`Phone: ${companyPhone}`, 55, infoY); infoY += 5; }
                if (companyEmail) { doc.text(`Email: ${companyEmail}`, 55, infoY); infoY += 5; }
                if (companyAddress) {
                    const splitAddress = doc.splitTextToSize(companyAddress, 130);
                    doc.text(splitAddress, 55, infoY);
                }
                currentY += 35;
            } catch (err) {
                console.error("Logo failed to load", err);
                // Fallback if logo fails
                doc.setFontSize(14);
                doc.text(businessName, 20, currentY);
                currentY += 7;
            }
        } else {
            doc.setFontSize(14);
            doc.text(businessName, 20, currentY);
            currentY += 7;
            
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            if (ownerName) { doc.text(`Proprietor: ${ownerName}`, 20, currentY); currentY += 5; }
            if (companyPhone) { doc.text(`Phone: ${companyPhone}`, 20, currentY); currentY += 5; }
            if (companyEmail) { doc.text(`Email: ${companyEmail}`, 20, currentY); currentY += 5; }
            if (companyAddress) {
                const splitAddress = doc.splitTextToSize(companyAddress, 170);
                doc.text(splitAddress, 20, currentY);
                currentY += (splitAddress.length * 5);
            }
            currentY += 5;
        }
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Date: ${format(new Date(sale.date), 'dd MMM yyyy')}`, pageWidth - 20, 35, { align: 'right' });
        
        const displayId = sale._id ? `BM-${sale._id.slice(-6).toUpperCase()}` : (sale.invoiceNumber || 'N/A');
        doc.text(`Invoice ID: ${displayId}`, pageWidth - 20, 42, { align: 'right' });

        // Customer Info
        currentY = Math.max(currentY, 65);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Bill To:`, 20, currentY);
        doc.setFont('helvetica', 'normal');
        doc.text(sale.customerName || 'Walk-in Customer', 35, currentY);
        if (sale.customerPhone) {
            currentY += 5;
            doc.setFontSize(9);
            doc.text(`Phone: ${sale.customerPhone}`, 35, currentY);
        }

        // Items Table
        const tableColumn = ["Product", "Quantity", "Price", "Total"];
        const tableRows: any[] = [];

        (sale.items || []).forEach((item: any) => {
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
            startY: currentY + 10,
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

        // Signature
        if (signature) {
            finalY += 15;
            try {
                doc.addImage(signature, 'PNG', 20, finalY, 40, 15);
                finalY += 18;
                doc.setFontSize(8);
                doc.text('Authorised Signatory', 20, finalY);
            } catch (err) {
                console.error("Signature failed to load", err);
            }
        }

        // Footer
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text('Thank you for your business!', pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });

        // Save
        doc.save(`Invoice_${sale.customerName?.replace(/\s+/g, '_') || 'Sale'}_${format(new Date(), 'yyyyMMdd')}.pdf`);
    } catch (error) {
        console.error('Invoice Generation Error:', error);
        alert('Failed to generate invoice. Please try again.');
    }
};

