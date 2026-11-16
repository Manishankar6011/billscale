import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Package, 
  Calendar, 
  Search, 
  IndianRupee, 
  Loader2, 
  Download, 
  ChevronDown, 
  ChevronUp, 
  Barcode, 
  User, 
  Phone, 
  FileSpreadsheet, 
  X, 
  Scan,
  Users,
  CheckCircle2,
  Clock,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import BarcodeScanner from '../components/BarcodeScanner';

interface SaleRecord {
  saleId: string;
  invoiceNumber: string;
  date: string;
  customerName: string;
  customerPhone?: string;
  quantity: number;
  sellingPrice: number;
  total: number;
  paymentMode: string;
}

interface ItemSale {
  _id: string;
  productId?: string;
  name: string;
  barcode?: string;
  unit: string;
  totalQuantity: number;
  totalRevenue: number;
  totalProfit: number;
  sales?: SaleRecord[];
}

const ItemSalesReport = () => {
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const monthStartStr = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');

  const [startDate, setStartDate] = useState(monthStartStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [activePreset, setActivePreset] = useState<string>('month');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [salesData, setSalesData] = useState<ItemSale[]>([]);
  const [error, setError] = useState('');
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const { user } = useAuth();
  const canViewProfit = user?.role === 'owner' || user?.role === 'super-admin';
  const totalColSpan = canViewProfit ? 7 : 6;

  const fetchReport = async (overrideSearch?: string, start?: string, end?: string) => {
    const sDate = start !== undefined ? start : startDate;
    const eDate = end !== undefined ? end : endDate;
    const qSearch = overrideSearch !== undefined ? overrideSearch : searchQuery;

    if (!sDate || !eDate) {
      setError('Please select both start and end dates.');
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      const response = await axios.get('/api/analytics/item-sales', {
        params: { 
          startDate: sDate, 
          endDate: eDate,
          search: qSearch.trim() || undefined
        }
      });
      setSalesData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch report');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load on mount
  useEffect(() => {
    fetchReport(undefined, monthStartStr, todayStr);
  }, []);

  // Quick Preset Handlers
  const handlePreset = (preset: 'today' | 'yesterday' | 'week' | 'month' | 'last30') => {
    setActivePreset(preset);
    const d = new Date();
    let s = todayStr;
    let e = todayStr;

    if (preset === 'today') {
      s = todayStr;
      e = todayStr;
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      s = format(y, 'yyyy-MM-dd');
      e = s;
    } else if (preset === 'week') {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      s = format(monday, 'yyyy-MM-dd');
      e = todayStr;
    } else if (preset === 'month') {
      s = monthStartStr;
      e = todayStr;
    } else if (preset === 'last30') {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      s = format(past, 'yyyy-MM-dd');
      e = todayStr;
    }

    setStartDate(s);
    setEndDate(e);
    fetchReport(searchQuery, s, e);
  };

  // Real-time client-side filter for fast typing / barcode scanning
  const filteredSalesData = useMemo(() => {
    if (!searchQuery.trim()) return salesData;
    const q = searchQuery.toLowerCase().trim();
    return salesData.filter((item) => {
      const matchName = item.name?.toLowerCase().includes(q);
      const matchBarcode = item.barcode && item.barcode.toLowerCase().includes(q);
      const matchCustomer = item.sales && item.sales.some(s => 
        (s.customerName && s.customerName.toLowerCase().includes(q)) ||
        (s.customerPhone && s.customerPhone.toLowerCase().includes(q)) ||
        (s.invoiceNumber && s.invoiceNumber.toLowerCase().includes(q))
      );
      return matchName || matchBarcode || matchCustomer;
    });
  }, [salesData, searchQuery]);

  // Auto-expand if only 1 item matches search
  useEffect(() => {
    const single = filteredSalesData[0];
    if (searchQuery.trim() && filteredSalesData.length === 1 && single) {
      setExpandedItems({ [single._id]: true });
    }
  }, [searchQuery, filteredSalesData]);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    filteredSalesData.forEach(item => {
      all[item._id] = true;
    });
    setExpandedItems(all);
  };

  const collapseAll = () => {
    setExpandedItems({});
  };

  const handleBarcodeScan = (code: string) => {
    setSearchQuery(code);
    setIsScannerOpen(false);
    fetchReport(code);
  };

  const totalQuantity = filteredSalesData.reduce((sum, item) => sum + item.totalQuantity, 0);
  const totalRevenue = filteredSalesData.reduce((sum, item) => sum + item.totalRevenue, 0);
  const totalProfit = filteredSalesData.reduce((sum, item) => sum + (item.totalProfit || 0), 0);
  const totalProducts = filteredSalesData.length;
  const totalTransactions = filteredSalesData.reduce((sum, item) => sum + (item.sales?.length || 0), 0);

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59);
    doc.text(user?.companyName || "BuildMate ERP", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Product Sales & Customer History Report | ${startDate} to ${endDate}`, 14, 28);
    
    const tableColumn = ["Product Name", "Barcode", "Quantity Sold", "Unit", "Revenue"];
    if (user?.role === 'owner' || user?.role === 'super-admin') {
      tableColumn.push("Profit");
    }

    const tableRows = filteredSalesData.map(item => {
      const row = [
        item.name,
        item.barcode || "-",
        item.totalQuantity.toString(),
        item.unit,
        item.totalRevenue.toFixed(2),
      ];
      if (user?.role === 'owner' || user?.role === 'super-admin') {
        row.push((item.totalProfit || 0).toFixed(2));
      }
      return row;
    });

    const footRow = [
      `Total Products: ${totalProducts}`,
      "",
      totalQuantity.toString(),
      "",
      totalRevenue.toFixed(2),
    ];
    if (user?.role === 'owner' || user?.role === 'super-admin') {
      footRow.push(totalProfit.toFixed(2));
    }
    const tableFoot = [footRow];

    autoTable(doc, {
      startY: 35,
      head: [tableColumn],
      body: tableRows,
      foot: tableFoot,
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246] },
      footStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold' }
    });

    doc.save(`Product_Sales_Report_${startDate}_to_${endDate}.pdf`);
  };

  const exportToExcel = () => {
    const summaryRows = filteredSalesData.map(item => ({
      "Product Name": item.name,
      "Barcode": item.barcode || "-",
      "Quantity Sold": item.totalQuantity,
      "Unit": item.unit,
      "Total Revenue (₹)": item.totalRevenue,
      ...(user?.role === 'owner' || user?.role === 'super-admin' ? { "Profit (₹)": item.totalProfit } : {})
    }));

    const detailRows: any[] = [];
    filteredSalesData.forEach(item => {
      if (item.sales && item.sales.length > 0) {
        item.sales.forEach(s => {
          detailRows.push({
            "Product Name": item.name,
            "Barcode": item.barcode || "-",
            "Invoice #": s.invoiceNumber,
            "Sale Date": format(new Date(s.date), "dd MMM yyyy, hh:mm a"),
            "Customer Name": s.customerName || "Walk-in Customer",
            "Customer Mobile": s.customerPhone || "-",
            "Quantity Sold": s.quantity,
            "Unit": item.unit,
            "Selling Price (₹)": s.sellingPrice,
            "Total Amount (₹)": s.total,
            "Payment Mode": s.paymentMode
          });
        });
      }
    });

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Product Sales Summary");

    if (detailRows.length > 0) {
      const wsDetails = XLSX.utils.json_to_sheet(detailRows);
      XLSX.utils.book_append_sheet(wb, wsDetails, "Customer Breakdown");
    }

    XLSX.writeFile(wb, `Product_Sales_With_Customers_${startDate}_to_${endDate}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Package className="w-7 h-7 text-primary-600" />
            Product Sales & Customer History
          </h1>
          <p className="text-slate-500 text-xs font-medium mt-0.5">
            Track which products sold, exact sale dates, invoice numbers & who purchased them.
          </p>
        </div>

        {filteredSalesData.length > 0 && (
          <div className="flex items-center gap-2.5">
            <button
              onClick={exportToPDF}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
            >
              <Download className="w-4 h-4 text-blue-600" />
              PDF
            </button>
            <button
              onClick={exportToExcel}
              className="px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-100/70 transition-all shadow-sm active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Excel (with Buyers)
            </button>
          </div>
        )}
      </div>

      {/* Search & Date Filter Card */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-4">
        {/* Row 1: Primary Search Bar */}
        <div className="flex items-center relative bg-slate-50/80 hover:bg-slate-100/60 focus-within:bg-white rounded-2xl border border-slate-200 focus-within:border-primary-500 focus-within:ring-4 focus-within:ring-primary-500/10 transition-all shadow-xs">
          <div className="pl-4 text-slate-400">
            {loading ? (
              <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
            ) : (
              <Search className="w-5 h-5 text-slate-400" />
            )}
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchReport()}
            placeholder="Search by Product Name, Barcode, Customer Name or Invoice #..."
            className="w-full bg-transparent border-none py-3.5 pl-3 pr-36 text-sm font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-medium outline-none focus:ring-0"
          />
          <div className="absolute right-2 flex items-center gap-1.5">
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  fetchReport('');
                }}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-xl transition-all"
                title="Clear search"
              >
                <X size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="px-3 py-2 bg-white hover:bg-primary-50 border border-slate-200 hover:border-primary-200 text-slate-700 hover:text-primary-600 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-2xs"
              title="Scan Barcode with Camera"
            >
              <Scan size={15} className="text-primary-600" />
              <span>Scan Barcode</span>
            </button>
          </div>
        </div>

        {/* Row 2: Date Filters & Quick Presets */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          {/* Date Picker Group */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1 mr-1">
              <Calendar size={13} /> Filter Dates:
            </span>
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200/80 shadow-2xs flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-black uppercase text-slate-400">From</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setActivePreset('custom');
                  }}
                  className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                />
              </div>

              <span className="text-xs font-black text-slate-400 px-0.5">to</span>

              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-black uppercase text-slate-400">To</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setActivePreset('custom');
                  }}
                  className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                />
              </div>

              <button
                onClick={() => fetchReport()}
                disabled={loading}
                className="px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-black flex items-center gap-1.5 hover:bg-primary-700 transition-all shadow-2xs active:scale-95 disabled:opacity-70 ml-1"
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                Fetch Report
              </button>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 mr-1 hidden xl:inline">Range:</span>
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'week', label: 'This Week' },
              { id: 'month', label: 'This Month' },
              { id: 'last30', label: 'Last 30 Days' },
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePreset(preset.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activePreset === preset.id
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-800'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-rose-500 text-xs font-bold pt-1">{error}</p>}
      </div>

      {/* Summary Cards */}
      {filteredSalesData.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Products</p>
              <h3 className="text-xl font-black text-slate-800 mt-0.5">{totalProducts}</h3>
            </div>
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Quantity Sold</p>
              <h3 className="text-xl font-black text-slate-800 mt-0.5">{totalQuantity}</h3>
            </div>
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Revenue</p>
              <h3 className="text-xl font-black text-emerald-600 flex items-center mt-0.5">
                <IndianRupee className="w-4 h-4 mr-0.5" />
                {totalRevenue.toLocaleString()}
              </h3>
            </div>
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Sales Orders</p>
              <h3 className="text-xl font-black text-primary-600 mt-0.5">{totalTransactions}</h3>
            </div>
            <div className="w-10 h-10 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">
              Product-wise Sales List
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md">
              {filteredSalesData.length} items
            </span>
            {searchQuery && (
              <span className="text-[10px] font-bold text-primary-600">
                (Filtered by "{searchQuery}")
              </span>
            )}
          </div>

          {filteredSalesData.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={expandAll}
                className="text-[10px] font-bold text-primary-600 hover:text-primary-700 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs hover:bg-slate-50"
              >
                Expand All Buyers
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="text-[10px] font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs hover:bg-slate-50"
              >
                Collapse All
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4 w-10"></th>
                <th className="py-3 px-4">Product Name & Barcode</th>
                <th className="py-3 px-4 text-right">Quantity Sold</th>
                <th className="py-3 px-4 text-center">Unit</th>
                <th className="py-3 px-4 text-right">Revenue</th>
                {canViewProfit && (
                  <th className="py-3 px-4 text-right">Profit</th>
                )}
                <th className="py-3 px-4 text-center">Customer History</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSalesData.length === 0 ? (
                <tr>
                  <td colSpan={totalColSpan} className="p-12 text-center text-slate-400">
                    <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    {loading ? (
                      <p className="font-bold text-sm text-slate-600">Loading sales data...</p>
                    ) : searchQuery ? (
                      <div>
                        <p className="font-bold text-sm text-slate-700">No product found matching "{searchQuery}"</p>
                        <p className="text-xs text-slate-400 mt-1">Try another name or barcode, or adjust the date range.</p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-bold text-sm text-slate-700">No sales recorded in selected date range.</p>
                        <p className="text-xs text-slate-400 mt-1">Choose different dates and click Fetch Report.</p>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredSalesData.map((item, index) => {
                  const isExpanded = Boolean(expandedItems[item._id]);
                  const buyersCount = item.sales?.length || 0;

                  return (
                    <React.Fragment key={item._id || index}>
                      {/* Product Summary Row */}
                      <tr 
                        onClick={() => toggleExpand(item._id)}
                        className={`cursor-pointer transition-colors ${
                          isExpanded ? 'bg-primary-50/40' : 'hover:bg-slate-50/70'
                        }`}
                      >
                        {/* Expand Chevron */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            className="p-1 text-slate-400 hover:text-primary-600 rounded-lg transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(item._id);
                            }}
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </td>

                        {/* Product Name & Barcode */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-xs text-slate-800 hover:text-primary-600 transition-colors">
                              {item.name}
                            </span>
                            {item.barcode && (
                              <span className="flex items-center gap-1 font-mono text-[10px] text-slate-400 mt-0.5">
                                <Barcode size={11} className="text-slate-400" />
                                {item.barcode}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Quantity */}
                        <td className="py-3.5 px-4 text-right font-black text-xs text-slate-800">
                          {item.totalQuantity}
                        </td>

                        {/* Unit */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md">
                            {item.unit}
                          </span>
                        </td>

                        {/* Revenue */}
                        <td className="py-3.5 px-4 text-right font-black text-xs text-emerald-600">
                          ₹{item.totalRevenue.toLocaleString()}
                        </td>

                        {/* Profit (if authorized) */}
                        {canViewProfit && (
                          <td className="py-3.5 px-4 text-right font-black text-xs text-blue-600">
                            ₹{(item.totalProfit || 0).toLocaleString()}
                          </td>
                        )}

                        {/* Action: View Customer Breakdown */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(item._id);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 mx-auto transition-all ${
                              isExpanded 
                                ? 'bg-primary-600 text-white shadow-2xs' 
                                : 'bg-primary-50 text-primary-700 hover:bg-primary-100'
                            }`}
                          >
                            <Users size={11} />
                            {buyersCount} {buyersCount === 1 ? 'Sale' : 'Sales'}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Accordion: "Kab kab sell hua & Kisne liya hai" */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80">
                          <td colSpan={totalColSpan} className="p-4 pt-1">
                            <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden animate-in slide-in-from-top-1 duration-150">
                              <div className="p-3 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Users size={14} className="text-primary-600" />
                                  <span className="text-xs font-black uppercase tracking-tight text-slate-800">
                                    Customer Sales History for "{item.name}"
                                  </span>
                                  <span className="text-[10px] font-bold bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full">
                                    {buyersCount} {buyersCount === 1 ? 'Buyer' : 'Buyers'}
                                  </span>
                                </div>
                                <span className="text-[10px] font-medium text-slate-500">
                                  Total Sold: <strong className="text-slate-800">{item.totalQuantity} {item.unit}</strong> | Total Revenue: <strong className="text-emerald-600">₹{item.totalRevenue.toLocaleString()}</strong>
                                </span>
                              </div>

                              {!item.sales || item.sales.length === 0 ? (
                                <div className="p-6 text-center text-slate-400 text-xs">
                                  No individual customer sale records found for this product.
                                </div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs">
                                    <thead>
                                      <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-200/70">
                                        <th className="py-2.5 px-3">Date & Time (Kab Sell Hua)</th>
                                        <th className="py-2.5 px-3">Invoice #</th>
                                        <th className="py-2.5 px-3">Customer Name (Kisne Liya)</th>
                                        <th className="py-2.5 px-3">Mobile No.</th>
                                        <th className="py-2.5 px-3 text-right">Quantity</th>
                                        <th className="py-2.5 px-3 text-right">Selling Price</th>
                                        <th className="py-2.5 px-3 text-right">Total Amount</th>
                                        <th className="py-2.5 px-3 text-center">Payment</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                      {item.sales.map((sale, sIdx) => (
                                        <tr key={sIdx} className="hover:bg-slate-50/70 transition-colors">
                                          {/* Date & Time */}
                                          <td className="py-2.5 px-3 font-semibold text-slate-700 whitespace-nowrap">
                                            <span className="flex items-center gap-1.5">
                                              <Clock size={12} className="text-slate-400" />
                                              {format(new Date(sale.date), "dd MMM yyyy, hh:mm a")}
                                            </span>
                                          </td>

                                          {/* Invoice Number */}
                                          <td className="py-2.5 px-3 font-mono font-bold text-primary-600">
                                            #{sale.invoiceNumber}
                                          </td>

                                          {/* Customer Name */}
                                          <td className="py-2.5 px-3 font-bold text-slate-800">
                                            <span className="flex items-center gap-1.5">
                                              <User size={12} className="text-slate-400" />
                                              {sale.customerName || "Walk-in Customer"}
                                            </span>
                                          </td>

                                          {/* Mobile Number */}
                                          <td className="py-2.5 px-3 text-slate-600">
                                            {sale.customerPhone ? (
                                              <a
                                                href={`tel:${sale.customerPhone}`}
                                                className="flex items-center gap-1 hover:text-primary-600 hover:underline"
                                              >
                                                <Phone size={11} className="text-slate-400" />
                                                {sale.customerPhone}
                                              </a>
                                            ) : (
                                              <span className="text-slate-400 italic text-[11px]">-</span>
                                            )}
                                          </td>

                                          {/* Quantity */}
                                          <td className="py-2.5 px-3 text-right font-black text-slate-800">
                                            {sale.quantity} {item.unit}
                                          </td>

                                          {/* Selling Price */}
                                          <td className="py-2.5 px-3 text-right text-slate-600">
                                            ₹{sale.sellingPrice.toLocaleString()}
                                          </td>

                                          {/* Total */}
                                          <td className="py-2.5 px-3 text-right font-black text-emerald-600">
                                            ₹{sale.total.toLocaleString()}
                                          </td>

                                          {/* Payment Mode */}
                                          <td className="py-2.5 px-3 text-center">
                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-black uppercase rounded-md border border-slate-200">
                                              {sale.paymentMode}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Barcode Camera Scanner Modal */}
      {isScannerOpen && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setIsScannerOpen(false)}
        />
      )}
    </div>
  );
};

export default ItemSalesReport;