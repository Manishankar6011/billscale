import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend,
  Cell,
} from "recharts";
import { useTranslation } from "react-i18next";
import {
  TrendingUp,
  Package,
  Users,
  AlertTriangle,
  IndianRupee,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Clock,
  ChevronRight,
  Filter,
  Calendar,
  ArrowRightLeft,
  HandCoins,
  Banknote,
  X,
  Printer,
  Download,
  RefreshCw,
  AlertCircle,
  Receipt,
  ArrowUpCircle,
} from "lucide-react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { DashboardSkeleton } from "../components/Skeleton";
import { useToast } from "../context/ToastContext";
import { format } from "date-fns";

const MetricCard = ({ title, subtitle, value, icon, trend, color }: any) => {
  const colorMap: any = {
    primary: {
      bg: "bg-primary-50",
      text: "text-primary-600",
      ring: "ring-primary-100",
      icon: "bg-primary-100",
      shadow: "shadow-primary-100/50",
    },
    amber: {
      bg: "bg-amber-50",
      text: "text-amber-600",
      ring: "ring-amber-100",
      icon: "bg-amber-100",
      shadow: "shadow-amber-100/50",
    },
    blue: {
      bg: "bg-blue-50",
      text: "text-blue-600",
      ring: "ring-blue-100",
      icon: "bg-blue-100",
      shadow: "shadow-blue-100/50",
    },
    emerald: {
      bg: "bg-emerald-50",
      text: "text-emerald-600",
      ring: "ring-emerald-100",
      icon: "bg-emerald-100",
      shadow: "shadow-emerald-100/50",
    },
    indigo: {
      bg: "bg-indigo-50",
      text: "text-indigo-600",
      ring: "ring-indigo-100",
      icon: "bg-indigo-100",
      shadow: "shadow-indigo-100/50",
    },
    slate: {
      bg: "bg-slate-50",
      text: "text-slate-600",
      ring: "ring-slate-100",
      icon: "bg-slate-100",
      shadow: "shadow-slate-100/50",
    },
  };

  const c = colorMap[color] || colorMap.primary;
  const isNegative = trend?.startsWith("-");

  return (
    <div
      className={`p-8 rounded-[2.5rem] bg-white border border-slate-100 flex flex-col justify-between h-56 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-1 relative overflow-hidden group`}
    >
      {/* Subtle background icon */}
      <div
        className={`absolute -bottom-8 -right-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity duration-500 ${c.text}`}
      >
        {React.cloneElement(icon, { size: 160 })}
      </div>

      <div className="flex justify-between items-start relative z-10">
        <div
          className={`p-4 ${c.icon} ${c.text} rounded-[1.5rem] ring-4 ring-white shadow-lg ${c.shadow} transition-transform group-hover:scale-110 duration-500`}
        >
          {icon}
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 ${isNegative ? "bg-rose-50 text-rose-600 ring-rose-100" : c.bg + " " + c.text + " " + c.ring} rounded-full text-[10px] font-black uppercase tracking-widest ring-1`}
          >
            {isNegative ? (
              <ArrowDownRight size={12} />
            ) : (
              <ArrowUpRight size={12} />
            )}
            {trend}
          </div>
        )}
      </div>

      <div className="relative z-10">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 leading-none">
          {title}
        </p>
        <div className="flex items-baseline gap-2">
          <h3 className="text-3xl font-black text-slate-800 tracking-tighter leading-tight">
            {value}
          </h3>
        </div>
        <p className="text-xs text-slate-400 font-medium">{subtitle}</p>
      </div>
    </div>
  );
};

const ErrorState = ({ message, onRetry }: any) => (
  <div className="flex flex-col items-center justify-center py-20 px-8 bg-rose-50/50 rounded-[3rem] border border-rose-100 animate-in zoom-in-95 duration-500">
    <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-[2rem] flex items-center justify-center mb-6 shadow-xl shadow-rose-100">
      <AlertCircle size={40} />
    </div>
    <h3 className="text-2xl font-black text-slate-800 mb-2">
      Connection Issue
    </h3>
    <p className="text-slate-500 font-medium mb-8 text-center max-w-md">
      {message ||
        "We're having trouble connecting to the server. Please check your connection or try again."}
    </p>
    <button
      onClick={onRetry}
      className="px-8 py-4 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primary-700 shadow-xl shadow-primary-200 transition-all flex items-center gap-3 active:scale-95"
    >
      <RefreshCw size={18} />
      Try Again
    </button>
  </div>
);

const ActivityItem = ({ activity, onClick }: any) => {
  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between p-4 bg-white/50 border border-slate-100 rounded-2xl hover:bg-white hover:shadow-md hover:border-primary-100 transition-all group cursor-pointer"
    >
      <div className="flex items-center gap-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
            activity.status === "paid"
              ? "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white"
              : "bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white"
          }`}
        >
          {activity.status === "paid" ? (
            <Banknote size={20} />
          ) : (
            <Clock size={20} />
          )}
        </div>
        <div>
          <h4 className="font-bold text-slate-800 group-hover:text-primary-700 tracking-tight transition-colors">
            {activity.title}
          </h4>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary-500">
              {activity.invoiceNumber}
            </p>
            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
            <p className="text-[10px] text-slate-400 tracking-tight">
              {activity.date
                ? format(new Date(activity.date), "dd MMM, hh:mm a")
                : "N/A"}
            </p>
          </div>
        </div>
      </div>
      <div className="text-right">
        <p className="font-black text-slate-800 text-base">
          ₹{(activity.amount || 0).toLocaleString()}
        </p>
        <div className="flex items-center justify-end gap-1 mt-0.5">
          <span className="text-[9px] font-black uppercase tracking-tighter text-slate-400">
            {activity.itemCount || 0} items sold
          </span>
          <ChevronRight
            size={12}
            className="text-slate-300 group-hover:translate-x-1 transition-transform"
          />
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState("today");
  const [selectedSale, setSelectedSale] = useState<any>(null);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchStats = async () => {
    try {
      if (!loading) setRefreshing(true);
      setError(null);
      const response = await axios.get(
        `/api/dashboard/stats?timeRange=${timeRange}`,
      );
      setStats(response.data.stats);
      setChartData(response.data.chartData || []);
      setRecentActivity(response.data.recentActivity || []);
      setAlerts(response.data.alerts);
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      setError(
        err.response?.data?.message || "Failed to connect to business server",
      );
      showToast("Connection error. Please retry.", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const getFilterLabel = () => {
    switch (timeRange) {
      case "today":
        return "Today";
      case "yesterday":
        return "Yesterday";
      case "week":
        return "This Week";
      case "month":
        return "This Month";
      case "year":
        return "This Year";
      default:
        return "Period";
    }
  };

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Invoice Modal */}
      {selectedSale && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300 border border-white/20">
            <div className="p-10">
              {/* Modal Header */}
              <div className="flex justify-between items-start mb-8">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary-200">
                      <TrendingUp size={24} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                      Invoice Details
                    </h2>
                  </div>
                  <p className="text-sm font-bold text-primary-500 uppercase tracking-widest">
                    {selectedSale.invoiceNumber}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedSale(null)}
                  className="p-3 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded-2xl text-slate-400 transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Client Info */}
              <div className="grid grid-cols-2 gap-8 mb-8 pb-8 border-b border-slate-100">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    Customer
                  </p>
                  <h3 className="font-bold text-slate-800 text-lg">
                    {selectedSale.customerName}
                  </h3>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    Date
                  </p>
                  <h3 className="font-bold text-slate-800 text-lg">
                    {format(new Date(selectedSale.date), "dd MMM, yyyy")}
                  </h3>
                </div>
              </div>

              {/* Items Table */}
              <div className="mb-8 overflow-hidden rounded-[2rem] border border-slate-100">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50">
                    <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="px-6 py-4">Item Name</th>
                      <th className="px-6 py-4">Quantity</th>
                      <th className="px-6 py-4">Price</th>
                      <th className="px-6 py-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {(selectedSale.items || []).map((item: any, i: number) => (
                      <tr
                        key={i}
                        className="text-sm text-slate-600 hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-6 py-4 font-bold text-slate-800">
                          {item.productId?.name || "Item"}
                        </td>
                        <td className="px-6 py-4">
                          {item.quantity}{" "}
                          {item.unit || item.productId?.unit || "units"}
                        </td>
                        <td className="px-6 py-4">₹{item.sellingPrice}</td>
                        <td className="px-6 py-4 text-right font-black text-slate-800">
                          ₹{item.quantity * item.sellingPrice}
                        </td>
                      </tr>
                    ))}
                    {selectedSale.additionalItems?.map(
                      (item: any, i: number) => (
                        <tr
                          key={`add-${i}`}
                          className="text-sm text-slate-600 hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="px-6 py-4 font-bold text-slate-800">
                            {item.name}
                          </td>
                          <td className="px-6 py-4">1</td>
                          <td className="px-6 py-4">₹{item.price}</td>
                          <td className="px-6 py-4 text-right font-black text-slate-800">
                            ₹{item.price}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>

              {/* Status and Total */}
              <div className="flex justify-between items-center bg-slate-50 p-6 rounded-[2rem]">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    Status
                  </p>
                  <span
                    className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ring-1 ${
                      selectedSale.status === "paid"
                        ? "bg-emerald-50 text-emerald-600 ring-emerald-100"
                        : "bg-amber-50 text-amber-600 ring-amber-100"
                    }`}
                  >
                    {selectedSale.status}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    Grand Total
                  </p>
                  <h3 className="text-3xl font-black text-primary-600 tracking-tighter">
                    ₹{(selectedSale.amount || 0).toLocaleString()}
                  </h3>
                </div>
              </div>
            </div>

            <div className="bg-slate-50/50 p-6 border-t border-slate-100 flex justify-between gap-4">
              <button className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl font-black uppercase tracking-widest text-[10px] text-slate-600 hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                <Download size={16} />
                Download PDF
              </button>
              <button className="flex-1 py-4 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-primary-700 shadow-lg shadow-primary-200 transition-all flex items-center justify-center gap-2">
                <Printer size={16} />
                Print Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/50 p-6 rounded-[2.5rem] border border-white/40 backdrop-blur-sm shadow-sm ring-1 ring-slate-200/50">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-3xl flex items-center justify-center shadow-lg shadow-primary-200 transition-transform hover:scale-105 duration-300">
              <TrendingUp className="text-white" size={32} />
            </div>
            {refreshing && (
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md animate-spin">
                <RefreshCw size={12} className="text-primary-600" />
              </div>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none mb-1">
              Business Overview
            </h1>
            <p className="text-slate-500 font-medium">
              Monitoring {user?.companyName || "your business"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-hidden">
          <button
            onClick={handleRefresh}
            className={`p-4 bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-primary-600 hover:border-primary-100 transition-all shadow-sm active:scale-90 flex-shrink-0 ${refreshing ? "animate-spin" : ""}`}
          >
            <RefreshCw size={20} />
          </button>
          <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 shadow-inner overflow-x-auto no-scrollbar">
            {["today", "yesterday", "week", "month", "year"].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 whitespace-nowrap min-w-fit ${
                  timeRange === range
                    ? "bg-white text-primary-600 shadow-md ring-1 ring-slate-200/50"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={fetchStats} />
      ) : (
        <>
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 1. Period Sales */}
            <MetricCard
              title={`${getFilterLabel()} Sales`}
              subtitle={`Revenue for selected period`}
              value={`₹${stats?.periodSales?.toLocaleString() || 0}`}
              icon={<TrendingUp size={24} />}
              trend={stats?.salesTrend}
              color="emerald"
            />

            {/* 2. Period Profit */}
            <MetricCard
              title={`${getFilterLabel()} Profit`}
              subtitle={`Income after expenses`}
              value={`₹${stats?.periodProfit?.toLocaleString() || 0}`}
              icon={<ArrowUpCircle size={24} />}
              trend={stats?.profitTrend}
              color="primary"
            />

            {/* 3. Period Expenses */}
            <MetricCard
              title={`${getFilterLabel()} Expenses`}
              subtitle={`Purchases & Salaries paid`}
              value={`₹${stats?.periodExpenses?.toLocaleString() || 0}`}
              icon={<Receipt size={24} />}
              trend={stats?.expensesTrend}
              color="amber"
            />

            {/* 4. To Collect */}
            <MetricCard
              title="To Collect"
              subtitle="Pending from customers"
              value={`₹${stats?.toCollect?.toLocaleString() || 0}`}
              icon={<Clock size={24} />}
              trend="Pending"
              color="indigo"
            />

            {/* 5. To Pay */}
            <MetricCard
              title="To Pay"
              subtitle="Pending to suppliers/staff"
              value={`₹${stats?.toPay?.toLocaleString() || 0}`}
              icon={<HandCoins size={24} />}
              trend="Outstanding"
              color="indigo"
            />

            {/* 6. Stock Value */}
            <MetricCard
              title="Stock Value"
              subtitle="Total inventory worth"
              value={`₹${stats?.stockValue?.toLocaleString() || 0}`}
              icon={<Package size={24} />}
              trend={
                stats?.lowStockCount > 0
                  ? `${stats?.lowStockCount} items low`
                  : "Healthy"
              }
              color="blue"
            />

            {/* 7. Estimated Balance */}
            <MetricCard
              title="Estimated Balance"
              subtitle="Total available (Estimated)"
              value={`₹${stats?.estimatedBalance?.toLocaleString() || 0}`}
              icon={<Wallet size={24} />}
              trend="Real-time"
              color="emerald"
            />

            {/* 8. Staff Attendance */}
            <MetricCard
              title="Staff Present"
              subtitle={`${stats?.presentToday || 0}/${stats?.totalStaff || 0} active today`}
              value={(stats?.presentToday || 0).toString()}
              icon={<Users size={24} />}
              trend={stats?.presentToday > 0 ? "Active" : "N/A"}
              color="slate"
            />

            {/* 9. Critical Alerts */}
            <MetricCard
              title="System Alerts"
              subtitle={`${alerts?.length || 0} items need attention`}
              value={(alerts?.length || 0).toString()}
              icon={<AlertTriangle size={24} />}
              trend={alerts?.length > 0 ? "Action Reqd" : "All Clear"}
              color={alerts?.length > 0 ? "amber" : "emerald"}
            />
          </div>

          <div className="mt-12 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Revenue & Profit Trend */}
              <div className="bg-white/70 backdrop-blur-md rounded-[3rem] border border-white/40 shadow-xl p-8 group hover:shadow-2xl transition-all duration-500">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">
                      Revenue & Profit Trend
                    </h3>
                    <p className="text-slate-400 text-sm font-medium">
                      Growth analysis over time
                    </p>
                  </div>
                  <div className="p-3 bg-primary-50 text-primary-600 rounded-2xl">
                    <TrendingUp size={24} />
                  </div>
                </div>
                <div className="h-[300px] w-full relative">
                  {chartData.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
                      <TrendingUp size={48} className="mb-2 opacity-20" />
                      <p className="text-[10px] font-black uppercase tracking-widest">
                        No data for this period
                      </p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                          dataKey="date"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }}
                          tickFormatter={(str) => {
                            const d = new Date(str.replace(" ", "T"));
                            if (timeRange === "today" || timeRange === "yesterday") {
                              return d.getHours() + ":00";
                            }
                            return timeRange === "year"
                              ? d.toLocaleDateString("en-US", { month: "short" })
                              : d.getDate().toString();
                          }}
                        />
                        <YAxis hide />
                        <Tooltip
                          labelFormatter={(label) => {
                            const d = new Date(label.replace(" ", "T"));
                            if (timeRange === "today" || timeRange === "yesterday")
                              return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
                            return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
                          }}
                          contentStyle={{
                            borderRadius: "20px",
                            border: "none",
                            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                            padding: "15px",
                          }}
                          itemStyle={{ fontWeight: 900, fontSize: "12px" }}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="#6366f1"
                          strokeWidth={4}
                          fillOpacity={1}
                          fill="url(#colorRev)"
                        />
                        <Area
                          type="monotone"
                          dataKey="profit"
                          stroke="#10b981"
                          strokeWidth={4}
                          fillOpacity={1}
                          fill="url(#colorProfit)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Revenue vs Expenses */}
              <div className="bg-white/70 backdrop-blur-md rounded-[3rem] border border-white/40 shadow-xl p-8 group hover:shadow-2xl transition-all duration-500">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">
                      Revenue vs Expenses
                    </h3>
                    <p className="text-slate-400 text-sm font-medium">
                      Budget vs Spending
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                    <Receipt size={24} />
                  </div>
                </div>
                <div className="h-[300px] w-full relative">
                  {chartData.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
                      <Receipt size={48} className="mb-2 opacity-20" />
                      <p className="text-[10px] font-black uppercase tracking-widest">
                        No data for this period
                      </p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#f1f5f9"
                        />
                        <XAxis
                          dataKey="date"
                          axisLine={false}
                          tickLine={false}
                          tick={{
                            fill: "#94a3b8",
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                          tickFormatter={(str) => {
                            const d = new Date(str.replace(" ", "T"));
                            if (timeRange === "today" || timeRange === "yesterday") {
                              return d.getHours() + ":00";
                            }
                            return timeRange === "year"
                              ? d.toLocaleDateString("en-US", { month: "short" })
                              : d.getDate().toString();
                          }}
                        />
                        <YAxis hide />
                        <Tooltip
                          cursor={{ fill: "#f8fafc" }}
                          labelFormatter={(label) => {
                            const d = new Date(label.replace(" ", "T"));
                            if (timeRange === "today" || timeRange === "yesterday")
                              return d.toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              });
                            return d.toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            });
                          }}
                          contentStyle={{
                            borderRadius: "20px",
                            border: "none",
                            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                            padding: "15px",
                          }}
                          itemStyle={{ fontWeight: 900, fontSize: "12px" }}
                        />
                        <Bar
                          dataKey="revenue"
                          fill="#6366f1"
                          radius={[10, 10, 0, 0]}
                          barSize={20}
                        />
                        <Bar
                          dataKey="expenses"
                          fill="#f59e0b"
                          radius={[10, 10, 0, 0]}
                          barSize={20}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-8">
            {/* Recent Transactions Activity */}
            <div className="lg:col-span-8 bg-white/70 backdrop-blur-md rounded-[3rem] border border-white/40 shadow-xl shadow-slate-200/50 overflow-hidden group hover:shadow-2xl transition-all duration-500">
              <div className="p-8 border-b border-slate-100/60 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                    <ArrowRightLeft className="text-primary-500" size={24} />
                    Recent Transactions
                  </h2>
                  <p className="text-slate-400 text-sm font-medium">
                    Showing latest billing activity
                  </p>
                </div>
                <button className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-primary-50 hover:text-primary-600 transition-all border border-slate-100">
                  <Filter size={20} />
                </button>
              </div>

              <div className="p-4">
                <div className="space-y-2">
                  {(recentActivity || []).map((activity: any, idx: number) => (
                    <ActivityItem
                      key={activity.id || idx}
                      activity={activity}
                      onClick={() => setSelectedSale(activity)}
                    />
                  ))}
                  {(recentActivity || []).length === 0 && (
                    <div className="py-12 text-center">
                      <div className="w-16 h-16 bg-slate-50 text-slate-200 rounded-3xl flex items-center justify-center mx-auto mb-4">
                        <Banknote size={32} />
                      </div>
                      <p className="text-slate-400 font-bold">
                        No transactions found
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Alerts Logic Sidebar if needed, or other info */}
            <div className="lg:col-span-4 space-y-8">
              {alerts.length > 0 && (
                <div className="bg-rose-50/80 backdrop-blur-md rounded-[2.5rem] p-8 border border-rose-100 shadow-xl shadow-rose-100/50">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-rose-700 font-black uppercase tracking-widest text-xs flex items-center gap-2">
                      <AlertTriangle size={18} />
                      Critical Alerts
                    </h2>
                    <span className="px-2 py-1 bg-rose-200/50 text-rose-700 rounded-lg text-[10px] font-black">
                      {alerts.length}
                    </span>
                  </div>
                  <div className="space-y-4">
                    {alerts.map((alert: any, i: number) => (
                      <div
                        key={i}
                        className="flex gap-4 p-4 bg-white/60 rounded-2xl border border-rose-100 group hover:bg-white transition-all"
                      >
                        <div className="shrink-0 p-2 bg-rose-100 text-rose-600 rounded-xl h-fit">
                          <Package size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800 tracking-tight">
                            {alert.title}
                          </p>
                          <p className="text-xs text-rose-600 font-medium">
                            {alert.message}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
