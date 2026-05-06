import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { 
    ShieldCheck, 
    Calendar, 
    Download, 
    ArrowUpRight, 
    ArrowDownLeft, 
    TrendingUp,
    FileText,
    Activity,
    Info,
    CheckCircle2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { TableSkeleton } from '../components/Skeleton';
import { format } from 'date-fns';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { canUseFeature, type PlanType } from "../utils/planLimits";
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const GSTReports = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [activeTab, setActiveTab] = useState<'gstr1' | 'gstr3b'>('gstr1');

    const hasAccess = canUseFeature((user?.planType as PlanType) || 'free', 'hasGSTReports');

    if (!hasAccess) {
        return (
            <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in duration-500">
                <div className="w-24 h-24 bg-rose-50 text-rose-600 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl shadow-rose-100 rotate-12">
                    <ShieldCheck size={48} />
                </div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tighter mb-4 text-center">
                    GST Reports are <span className="text-rose-600">Locked</span>
                </h2>
                <p className="text-slate-500 font-medium text-center max-w-md mb-10 leading-relaxed">
                    GST compliance tools and detailed tax reports are available in our **Basic** and **Business Pro** plans. Upgrade now to automate your tax filing.
                </p>
                <div className="flex gap-4">
                    <button 
                        onClick={() => navigate(-1)}
                        className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
                    >
                        Go Back
                    </button>
                    <button 
                        onClick={() => navigate('/dashboard/pricing')}
                        className="px-8 py-4 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primary-700 transition-all shadow-lg shadow-primary-200"
                    >
                        View Plans
                    </button>
                </div>
            </div>
        );
    }

    const { data: gstr1Data, isLoading: loadingGSTR1 } = useQuery({
        queryKey: ['gstr1', month, year],
        queryFn: async () => {
            const res = await axios.get(`/api/reports/gstr-1?month=${month}&year=${year}`);
            return res.data;
        }
    });

    const { data: gstr3bData, isLoading: loadingGSTR3B } = useQuery({
        queryKey: ['gstr3b', month, year],
        queryFn: async () => {
            const res = await axios.get(`/api/reports/gstr-3b?month=${month}&year=${year}`);
            return res.data;
        }
    });

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const exportToPDF = (data: any[], type: 'B2B' | 'B2C' | 'GSTR3B') => {
        const doc = new jsPDF();
        const currentMonthName = months[month - 1];
        
        // Header
        doc.setFontSize(22);
        doc.setTextColor(30, 41, 59); // slate-800
        doc.text("BuildMate ERP - GST Report", 14, 20);
        
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // slate-400
        doc.text(
            `${type === 'GSTR3B' ? 'GSTR-3B Summary' : `GSTR-1 ${type} Sales`} | Period: ${currentMonthName} ${year} | Generated: ${format(new Date(), "dd-MMM-yyyy HH:mm")}`,
            14,
            28,
        );

        if (type === 'GSTR3B') {
            // GSTR-3B Summary Table
            autoTable(doc, {
                startY: 40,
                head: [["Category", "Taxable Value", "Tax Amount"]],
                body: [
                    ["Outward Supplies (Sales)", `Rs. ${(gstr3bData?.outwardSupplies?.taxableValue || 0).toLocaleString()}`, `Rs. ${(gstr3bData?.outwardSupplies?.taxAmount || 0).toLocaleString()}`],
                    ["Inward Supplies (ITC)", `Rs. ${(gstr3bData?.inwardSupplies?.taxableValue || 0).toLocaleString()}`, `Rs. ${(gstr3bData?.inwardSupplies?.taxAmount || 0).toLocaleString()}`],
                    ["Net Tax Payable", "-", `Rs. ${Math.max(0, gstr3bData?.netTaxPayable || 0).toLocaleString()}`]
                ],
                theme: "grid",
                headStyles: { fillColor: [5, 150, 105], fontSize: 10, fontStyle: "bold" },
                styles: { fontSize: 9, cellPadding: 5 }
            });
        } else {
            // GSTR-1 B2B or B2C Table
            const headers = type === 'B2B' 
                ? [["GSTIN", "Invoice #", "Date", "Customer", "Taxable Value", "Tax Amount", "Total"]]
                : [["Invoice #", "Date", "Customer", "Taxable Value", "Tax Amount", "Total"]];

            const body = data.map(sale => {
                const row = [
                    sale.invoiceNumber,
                    format(new Date(sale.date), "dd/MM/yyyy"),
                    sale.customerName,
                    (sale.totalAmount - (sale.taxAmount || 0)).toFixed(2),
                    (sale.taxAmount || 0).toFixed(2),
                    sale.totalAmount.toFixed(2)
                ];
                if (type === 'B2B') row.unshift(sale.customerGSTIN);
                return row;
            });

            autoTable(doc, {
                startY: 40,
                head: headers,
                body: body,
                theme: "striped",
                headStyles: { fillColor: type === 'B2B' ? [59, 130, 246] : [245, 158, 11], fontSize: 9, fontStyle: "bold" },
                styles: { fontSize: 8, cellPadding: 3 }
            });
        }

        doc.save(`GSTR_${type}_${currentMonthName}_${year}.pdf`);
    };


    return (
        <div className="space-y-10 pb-20 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/50 p-8 rounded-[2.5rem] border border-white/40 backdrop-blur-md shadow-sm ring-1 ring-slate-200/50">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-3xl flex items-center justify-center shadow-xl shadow-emerald-100 transition-transform hover:scale-105 duration-500">
                        <ShieldCheck className="text-white" size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none mb-1">GST Compliance</h1>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] opacity-60 flex items-center gap-2">
                            <Activity size={12} className="text-emerald-500" />
                            GSTR-1 & GSTR-3B Tax Reports
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
                    <select 
                        value={month} 
                        onChange={(e) => setMonth(Number(e.target.value))}
                        className="bg-transparent font-bold text-sm outline-none px-4 py-2 border-r border-slate-100"
                    >
                        {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                    <select 
                        value={year} 
                        onChange={(e) => setYear(Number(e.target.value))}
                        className="bg-transparent font-bold text-sm outline-none px-4 py-2"
                    >
                        {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 bg-slate-100/50 p-1.5 rounded-[1.5rem] w-fit border border-slate-200/50 shadow-inner">
                <button
                    onClick={() => setActiveTab('gstr1')}
                    className={cn(
                        "px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300",
                        activeTab === 'gstr1' ? "bg-white text-emerald-600 shadow-lg scale-105" : "text-slate-400 hover:text-slate-600"
                    )}
                >
                    GSTR-1 (Sales)
                </button>
                <button
                    onClick={() => setActiveTab('gstr3b')}
                    className={cn(
                        "px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300",
                        activeTab === 'gstr3b' ? "bg-white text-emerald-600 shadow-lg scale-105" : "text-slate-400 hover:text-slate-600"
                    )}
                >
                    GSTR-3B (Summary)
                </button>
            </div>

            {loadingGSTR1 || loadingGSTR3B ? (
                <div className="space-y-6">
                    <div className="grid grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-100 rounded-[2.5rem] animate-pulse"></div>)}
                    </div>
                    <div className="h-96 bg-slate-100 rounded-[3rem] animate-pulse"></div>
                </div>
            ) : activeTab === 'gstr1' ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* GSTR-1 Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm group hover:shadow-xl transition-all duration-500">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Taxable Value</p>
                            <p className="text-2xl font-black text-slate-800 tracking-tighter">₹{(gstr1Data?.summary?.totalTaxableValue || 0).toLocaleString()}</p>
                        </div>
                        <div className="p-8 bg-white rounded-[2.5rem] border border-emerald-100 shadow-sm group hover:shadow-xl transition-all duration-500 bg-emerald-50/10">
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Total GST Collected</p>
                            <p className="text-2xl font-black text-emerald-600 tracking-tighter">₹{(gstr1Data?.summary?.totalTaxAmount || 0).toLocaleString()}</p>
                        </div>
                        <div className="p-8 bg-white rounded-[2.5rem] border border-blue-100 shadow-sm group hover:shadow-xl transition-all duration-500">
                            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">B2B Invoices</p>
                            <p className="text-2xl font-black text-blue-600 tracking-tighter">{gstr1Data?.summary?.b2bCount || 0}</p>
                        </div>
                        <div className="p-8 bg-white rounded-[2.5rem] border border-amber-100 shadow-sm group hover:shadow-xl transition-all duration-500">
                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">B2C Invoices</p>
                            <p className="text-2xl font-black text-amber-600 tracking-tighter">{gstr1Data?.summary?.b2cCount || 0}</p>
                        </div>
                    </div>

                    {/* B2B Invoices Table */}
                    <div className="card p-8 bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/20 relative overflow-hidden group">
                         <div className="absolute top-0 right-0 p-12 text-emerald-50 opacity-20 group-hover:scale-110 transition-transform duration-1000">
                            <TrendingUp size={200} />
                        </div>
                        
                        <div className="relative z-10">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                                <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase flex items-center gap-3">
                                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                                        <ArrowUpRight size={20} />
                                    </div>
                                    B2B Sales (Registered Customers)
                                </h3>
                                <button 
                                    onClick={() => exportToPDF(gstr1Data?.b2b, 'B2B')}
                                    className="flex items-center justify-center gap-3 px-8 py-3 bg-primary-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-700 transition-all shadow-lg active:scale-95"
                                >
                                    <Download size={18} /> Export B2B PDF
                                </button>
                            </div>
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">GSTIN</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Invoice #</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Taxable Value</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Tax Amount</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {(gstr1Data?.b2b || []).map((sale: any) => (
                                            <tr key={sale._id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-black text-primary-600 uppercase tracking-tighter bg-primary-50 px-2 py-1 rounded-md">{sale.customerGSTIN}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-sm font-black text-slate-700">{sale.invoiceNumber}</span>
                                                </td>
                                                <td className="px-6 py-4 text-xs font-bold text-slate-500">{format(new Date(sale.date), "dd/MM/yyyy")}</td>
                                                <td className="px-6 py-4 text-sm font-bold text-slate-700">₹{(sale.totalAmount - (sale.taxAmount || 0)).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-sm font-bold text-emerald-600">₹{(sale.taxAmount || 0).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-sm font-black text-slate-900">₹{sale.totalAmount.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                        {(gstr1Data?.b2b || []).length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-20 text-center">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-3xl flex items-center justify-center">
                                                            <FileText size={32} />
                                                        </div>
                                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No B2B invoices this month</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* B2C Invoices Summary */}
                    <div className="card p-8 bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/20 relative overflow-hidden">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                                    <Users className="w-5 h-5" />
                                </div>
                                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">B2C Sales (Retail)</h3>
                            </div>
                            <div className="flex items-center gap-10">
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoices</p>
                                    <p className="text-lg font-black text-slate-800">{gstr1Data?.summary?.b2cCount || 0}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Value</p>
                                    <p className="text-lg font-black text-emerald-600">₹{((gstr1Data?.b2c || []).reduce((acc: number, s: any) => acc + s.totalAmount, 0)).toLocaleString()}</p>
                                </div>
                                <button 
                                    onClick={() => exportToPDF(gstr1Data?.b2c, 'B2C')}
                                    className="p-3 bg-amber-100 text-amber-600 rounded-2xl hover:bg-amber-600 hover:text-white transition-all shadow-sm"
                                >
                                    <Download size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* GSTR-3B Analysis */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {/* Outward Supplies */}
                        <div className="p-10 bg-white rounded-[3.5rem] border border-emerald-100 shadow-xl shadow-slate-200/20 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 text-emerald-50 opacity-20 group-hover:scale-110 transition-transform duration-1000">
                                <TrendingUp size={160} />
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-8 flex items-center gap-4">
                                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100">
                                        <ArrowUpRight size={24} />
                                    </div>
                                    Outward Supplies (Sales)
                                </h3>
                                <div className="space-y-8">
                                    <div className="flex justify-between items-end pb-4 border-b border-slate-50">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Taxable Turnover</p>
                                            <p className="text-3xl font-black text-slate-800 tracking-tighter">₹{(gstr3bData?.outwardSupplies?.taxableValue || 0).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Total Output Tax (Liability)</p>
                                            <p className="text-4xl font-black text-emerald-600 tracking-tighter">₹{(gstr3bData?.outwardSupplies?.taxAmount || 0).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Inward Supplies */}
                        <div className="p-10 bg-white rounded-[3.5rem] border border-blue-100 shadow-xl shadow-slate-200/20 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 text-blue-50 opacity-20 group-hover:scale-110 transition-transform duration-1000">
                                <ArrowDownLeft size={160} />
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-8 flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
                                        <ArrowDownLeft size={24} />
                                    </div>
                                    Inward Supplies (ITC)
                                </h3>
                                <div className="space-y-8">
                                    <div className="flex justify-between items-end pb-4 border-b border-slate-50">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Purchase Value</p>
                                            <p className="text-3xl font-black text-slate-800 tracking-tighter">₹{(gstr3bData?.inwardSupplies?.taxableValue || 0).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Input Tax Credit (Eligible)</p>
                                            <p className="text-4xl font-black text-blue-600 tracking-tighter">₹{(gstr3bData?.inwardSupplies?.taxAmount || 0).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Net Tax Result */}
                    <div className="bg-slate-900 rounded-[4rem] p-16 text-white flex flex-col md:flex-row items-center justify-between gap-12 relative overflow-hidden shadow-2xl shadow-emerald-100/20">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-transparent to-blue-500/10"></div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/50">
                                    <CheckCircle2 size={24} />
                                </div>
                                <h4 className="text-lg font-black uppercase tracking-[0.2em] text-emerald-400">Monthly Tax Settlement</h4>
                            </div>
                            <p className="text-slate-400 text-sm font-medium max-w-md leading-relaxed">
                                Our system automatically calculates your **Net Tax Payable** by subtracting your Input Tax Credit (Purchases) from your Output Tax Liability (Sales).
                            </p>
                        </div>
                        <div className="text-center md:text-right relative z-10 flex flex-col items-center md:items-end gap-4">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Final Net Payable to Govt.</p>
                                <p className={cn(
                                    "text-6xl font-black tracking-tighter mb-4",
                                    (gstr3bData?.netTaxPayable || 0) > 0 ? "text-white" : "text-emerald-400"
                                )}>
                                    ₹{Math.max(0, gstr3bData?.netTaxPayable || 0).toLocaleString()}
                                </p>
                                {(gstr3bData?.netTaxPayable || 0) < 0 && (
                                    <p className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-4 py-2 rounded-xl inline-block">
                                        Extra Credit: ₹{Math.abs(gstr3bData?.netTaxPayable || 0).toLocaleString()} (Carried Forward)
                                    </p>
                                )}
                            </div>
                            <button 
                                onClick={() => exportToPDF([], 'GSTR3B')}
                                className="flex items-center justify-center gap-3 px-8 py-3 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg active:scale-95 w-fit"
                            >
                                <Download size={18} /> Download GSTR-3B Summary
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 p-10 bg-amber-50 rounded-[3rem] border border-amber-100 text-amber-800 shadow-inner">
                        <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-amber-600 shrink-0 shadow-lg shadow-amber-200/50">
                            <Info size={32} />
                        </div>
                        <div>
                            <p className="text-lg font-black uppercase tracking-tight mb-1">Disclaimer for Tax Filing</p>
                            <p className="text-sm font-medium opacity-80 leading-relaxed max-w-3xl">
                                These values are generated based on your digital records in BuildMate ERP. While we strive for accuracy, tax compliance rules can change. Always cross-verify these summaries with your original physical bills and consult your professional tax advisor before finalizing your GST returns.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const Users = ({ className }: { className?: string }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);

export default GSTReports;
