import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportData {
    labour: {
        name: string;
        type: string;
        dailyWage: number;
    };
    period: {
        month: number;
        year: number;
    };
    attendance: any[];
    payments: any[];
    summary: {
        daysPresent: number;
        halfDays: number;
        totalEarnings: number;
        totalPaid: number;
        balance: number;
    };
}

export const generateLabourPDF = (data: ReportData) => {
    try {
        const doc = new jsPDF();
        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        // --- Header & Branding ---
        doc.setFillColor(30, 41, 59); // Slate-800
        doc.rect(0, 0, 210, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.text("BUILDMATE ERP", 15, 25);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Professional Business Management", 15, 32);
        
        doc.setFontSize(18);
        doc.text("LABOUR WAGE BILL", 140, 25);

        // --- Worker Info Section ---
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`Worker: ${data.labour.name.toUpperCase()}`, 15, 55);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(`Type: ${data.labour.type}`, 15, 62);
        const wage = Number(data.labour.dailyWage) || 0;
        doc.text(`Daily Wage: Rs. ${wage.toLocaleString()}`, 15, 67);
        
        doc.setFont("helvetica", "bold");
        const monthIndex = (data.period.month || 1) - 1;
        doc.text(`Billing Month: ${monthNames[monthIndex]} ${data.period.year}`, 140, 55);
        doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 140, 62);

        // --- Summary Table ---
        autoTable(doc, {
            startY: 80,
            head: [['Work Summary', 'Details']],
            body: [
                ['Total Days Worked (Full)', `${data.summary.daysPresent} Days`],
                ['Total Half Days', `${data.summary.halfDays} Days`],
                ['Total Gross Earnings', `Rs. ${(data.summary.totalEarnings || 0).toLocaleString()}`],
                ['Total Advance/Paid', `Rs. ${(data.summary.totalPaid || 0).toLocaleString()}`],
                ['Net Balance Due', `Rs. ${(data.summary.balance || 0).toLocaleString()}`],
            ],
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246] },
            styles: { fontSize: 10 }
        });

        // Track vertical position
        let currentY = (doc as any).lastAutoTable?.finalY + 15 || 135;

        // --- Attendance Table ---
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Attendance Log", 15, currentY);

        autoTable(doc, {
            startY: currentY + 5,
            head: [['Date', 'Site', 'Status', 'Earnings']],
            body: (data.attendance || []).map(att => [
                new Date(att.date).toLocaleDateString(),
                att.siteId?.name || 'OFF-SITE',
                (att.status || 'PRESENT').toUpperCase(),
                `Rs. ${Number(att.status === 'present' ? att.dailyWageAtTime : (att.dailyWageAtTime / 2))}`
            ]),
            headStyles: { fillColor: [30, 41, 59] },
            styles: { fontSize: 9 }
        });

        currentY = (doc as any).lastAutoTable?.finalY + 15 || currentY + 50;

        // --- Payments Table ---
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Payment History", 15, currentY);

        autoTable(doc, {
            startY: currentY + 5,
            head: [['Date', 'Type', 'Method', 'Note', 'Amount']],
            body: (data.payments || []).map(p => [
                new Date(p.paymentDate).toLocaleDateString(),
                (p.type || 'ADVANCE').toUpperCase(),
                (p.method || 'CASH').toUpperCase(),
                p.note || '-',
                `Rs. ${(p.amount || 0).toLocaleString()}`
            ]),
            headStyles: { fillColor: [15, 118, 110] },
            styles: { fontSize: 9 }
        });

        // --- Footer ---
        currentY = (doc as any).lastAutoTable?.finalY + 30 || currentY + 40;
        
        // Page break if near bottom
        if (currentY > 260) {
            doc.addPage();
            currentY = 30;
        }

        doc.setLineWidth(0.5);
        doc.line(15, currentY, 70, currentY);
        doc.setFontSize(10);
        doc.text("Contractor Signature", 15, currentY + 5);
        
        doc.line(140, currentY, 195, currentY);
        doc.text("Worker Signature", 140, currentY + 5);

        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text("Generated by BuildMate ERP Management System", 75, 285);

        // Save PDF
        const fileName = `${data.labour.name.replace(/\s+/g, '_')}_Report_${monthNames[monthIndex]}_${data.period.year}.pdf`;
        doc.save(fileName);
        return true;
    } catch (error) {
        console.error('PDF Generation Error:', error);
        throw error;
    }
};
