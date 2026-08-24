import React, { useState } from 'react';
import axios from 'axios';
import { Package, Calendar, Search, IndianRupee, Loader2, Download } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ItemSale {
  _id: string;
  name: string;
  unit: string;
  totalQuantity: number;
  totalRevenue: number;
  totalProfit: number;
}

const ItemSalesReport = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [salesData, setSalesData] = useState<ItemSale[]>([]);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const fetchReport = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates.');
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      const response = await axios.get('/api/analytics/item-sales', {
        params: { startDate, endDate }
      });
      setSalesData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch report');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalQuantity = salesData.reduce((sum, item) => sum + item.totalQuantity, 0);
  const totalRevenue = salesData.reduce((sum, item) => sum + item.totalRevenue, 0);
  const totalProfit = salesData.reduce((sum, item) => sum + (item.totalProfit || 0), 0);
  const totalProducts = salesData.length;

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59);
    doc.text(user?.companyName || "BuildMate ERP", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Product Sales Report | ${startDate} to ${endDate}`, 14, 28);
    
    const tableColumn = ["Product Name", "Quantity Sold", "Unit", "Revenue"];
    if (user?.role === 'owner' || user?.role === 'super-admin') {
      tableColumn.push("Profit");
    }

    const tableRows = salesData.map(item => {
      const row = [
        item.name,
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-6 h-6 text-primary-600" />
            Product Sales Report
          </h1>
          <p className="text-slate-500 text-sm">View product-wise sales quantities and revenue between specific dates.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">From Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 border-2 border-slate-100 hover:border-primary-200 focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 text-slate-800 font-bold outline-none transition-all shadow-sm"
              />
            </div>
          </div>
          <div className="flex-1 w-full">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">To Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 border-2 border-slate-100 hover:border-primary-200 focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 text-slate-800 font-bold outline-none transition-all shadow-sm"
              />
            </div>
          </div>
          <button
            onClick={fetchReport}
            disabled={loading}
            className="w-full md:w-auto px-6 py-2.5 bg-primary-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-700 transition-all active:scale-95 disabled:opacity-70"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            Fetch Report
          </button>
          {salesData.length > 0 && (
            <button
              onClick={exportToPDF}
              className="w-full md:w-auto px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
            >
              <Download className="w-5 h-5 text-blue-600" />
              Download PDF
            </button>
          )}
        </div>
        {error && <p className="text-rose-500 text-sm mt-3">{error}</p>}
      </div>

      {salesData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">Total Items Sold</p>
              <h3 className="text-2xl font-black text-slate-800">{totalQuantity}</h3>
            </div>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">Total Revenue</p>
              <h3 className="text-2xl font-black text-slate-800 flex items-center">
                <IndianRupee className="w-5 h-5 mr-1" />
                {totalRevenue.toLocaleString()}
              </h3>
            </div>
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <IndianRupee className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Product Name
                  {salesData.length > 0 && (
                    <div className="text-[10px] text-slate-400 normal-case mt-0.5">Total Products: {totalProducts}</div>
                  )}
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                  Quantity Sold
                  {salesData.length > 0 && (
                    <div className="text-[10px] text-primary-600 normal-case mt-0.5">Total: {totalQuantity}</div>
                  )}
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Unit</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                  Revenue
                  {salesData.length > 0 && (
                    <div className="text-[10px] text-emerald-600 normal-case mt-0.5">Total: ₹{totalRevenue.toLocaleString()}</div>
                  )}
                </th>
                {(user?.role === 'owner' || user?.role === 'super-admin') && (
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                    Profit
                    {salesData.length > 0 && (
                      <div className="text-[10px] text-blue-600 normal-case mt-0.5">Total: ₹{totalProfit.toLocaleString()}</div>
                    )}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {salesData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    {loading ? 'Loading data...' : 'No sales data found for the selected date range. Select dates and click Fetch Report.'}
                  </td>
                </tr>
              ) : (
                salesData.map((item, index) => (
                  <tr key={item._id || index} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-semibold text-slate-800">{item.name}</td>
                    <td className="p-4 text-right font-medium text-slate-700">{item.totalQuantity}</td>
                    <td className="p-4 text-right text-slate-500 text-sm">{item.unit}</td>
                    <td className="p-4 text-right font-bold text-emerald-600 flex items-center justify-end">
                      <IndianRupee className="w-3.5 h-3.5 mr-0.5" />
                      {item.totalRevenue.toLocaleString()}
                    </td>
                    {(user?.role === 'owner' || user?.role === 'super-admin') && (
                      <td className="p-4 text-right font-bold text-blue-600">
                        <div className="flex items-center justify-end">
                          <IndianRupee className="w-3.5 h-3.5 mr-0.5" />
                          {item.totalProfit.toLocaleString()}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ItemSalesReport;
