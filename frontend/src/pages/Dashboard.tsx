import React, { useState } from "react";
import { useQuery } from '@tanstack/react-query';
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
} from "recharts";
import { useTranslation } from "react-i18next";
import {
  TrendingUp,
  Package,
  Users,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Clock,
  ChevronRight,
  Filter,
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
  Search,
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

const ErrorState = ({ message, onRetry }: any) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 bg-rose-50/50 rounded-[3rem] border border-rose-100 animate-in zoom-in-95 duration-500">
      <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-[2rem] flex items-center justify-center mb-6 shadow-xl shadow-rose-100">
        <AlertCircle size={40} />
      </div>
      <h3 className="text-2xl font-black text-slate-800 mb-2">
        {t("dashboard.connection_issue")}
      </h3>
      <p className="text-slate-500 font-medium mb-8 text-center max-w-md">
        {message || t("dashboard.connection_desc")}
      </p>
      <button
        onClick={onRetry}
        className="px-8 py-4 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primary-700 shadow-xl shadow-primary-200 transition-all flex items-center gap-3 active:scale-95"
      >
        <RefreshCw size={18} />
        {t("dashboard.try_again")}
      </button>
    </div>
  );
};

const CustomTooltip = ({ active, payload, label, timeRange }: any) => {
  if (active && payload && payload.length) {
    const d = new Date(label.replace(" ", "T"));
    let labelText = "";
    if (timeRange === "today" || timeRange === "yesterday") {
      labelText = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    } else {
      labelText = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    }

    return (
      <div className="bg-white/80 backdrop-blur-xl border border-white/40 shadow-[0_20px_50px_rgba(0,0,0,0.12)] rounded-[2rem] p-6 animate-in zoom-in-95 duration-200 min-w-[220px]">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 border-b border-slate-100 pb-3">
          {labelText}
        </p>
        <div className="space-y-4">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <div 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ backgroundColor: entry.color || entry.fill }} 
                />
                <span className="text-xs font-bold text-slate-500 capitalize">
                  {entry.name}
                </span>
              </div>
              <span className="text-sm font-black text-slate-900 tracking-tight">
                ₹{entry.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const ActivityItem = ({ activity, onClick }: any) => {
  const { t } = useTranslation();
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
            {activity.itemCount || 0} {t("dashboard.items_sold")}
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
  const [timeRange, setTimeRange] = useState("today");
  const { data: dashboardData, isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['dashboard-stats', timeRange],
    queryFn: async () => {
      const response = await axios.get(
        `/api/dashboard/stats?timeRange=${timeRange}`,
      );
      return response.data;
    },
    enabled: !!user?.token
  });

  const stats = dashboardData?.stats;
  const chartData = dashboardData?.chartData || [];
  const recentActivity = dashboardData?.recentActivity || [];
  const alerts = dashboardData?.alerts || [];
  

  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [transactionSearch, setTransactionSearch] = useState("");

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const filteredActivity = (recentActivity || [])
    .filter((act: any) => 
      act.customerName?.toLowerCase().includes(transactionSearch.toLowerCase()) ||
      act.invoiceNumber?.toLowerCase().includes(transactionSearch.toLowerCase()) ||
      act.amount?.toString().includes(transactionSearch)
    )
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const error = queryError ? (queryError as any).response?.data?.message || "Failed to load dashboard" : null;

  const getFilterLabel = () => {
    switch (timeRange) {
      case "today":
        return t("dashboard.today");
      case "yesterday":
        return t("dashboard.yesterday");
      case "week":
        return t("dashboard.week");
      case "month":
        return t("dashboard.month");
      case "year":
        return t("dashboard.year");
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
                      {t("dashboard.invoice_details")}
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
                    {t("billing.customer")}
                  </p>
                  <h3 className="font-bold text-slate-800 text-lg">
                    {selectedSale.customerName}
                  </h3>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    {t("common.date")}
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
                      <th className="px-6 py-4">{t("inventory.product_details")}</th>
                      <th className="px-6 py-4">{t("common.qty")}</th>
                      <th className="px-6 py-4">{t("common.price")}</th>
                      <th className="px-6 py-4 text-right">{t("common.total")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {(selectedSale.items || []).map((item: any, i: number) => (
                      <tr
                        key={i}
                        className="text-sm text-slate-600 hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-6 py-4 font-bold text-slate-800 flex items-center gap-2">
                          <span className="w-5 h-5 flex items-center justify-center bg-slate-100 text-slate-400 rounded text-[10px] font-black">
                            {i + 1}
                          </span>
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
                          <td className="px-6 py-4 font-bold text-slate-800 flex items-center gap-2">
                            <span className="w-5 h-5 flex items-center justify-center bg-amber-50 text-amber-400 rounded text-[10px] font-black">
                              {(selectedSale.items?.length || 0) + i + 1}
                            </span>
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
              <div className="bg-slate-50 p-6 rounded-[2rem] space-y-4">
                {typeof selectedSale.roundOffAmount === 'number' && selectedSale.roundOffAmount !== 0 && (
                  <div className="flex justify-between items-center text-sm font-bold text-slate-500 italic">
                    <span>Round Off:</span>
                    <span>{selectedSale.roundOffAmount > 0 ? '+' : ''}{selectedSale.roundOffAmount.toFixed(2)}</span>
                  </div>
                )}
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                      {t("dashboard.status")}
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
                    {t("common.total")}
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
                {t("dashboard.download_pdf")}
              </button>
              <button className="flex-1 py-4 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-primary-700 shadow-lg shadow-primary-200 transition-all flex items-center justify-center gap-2">
                <Printer size={16} />
                {t("dashboard.print_invoice")}
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
              {t("dashboard.business_overview")}
            </h1>
            <p className="text-slate-500 font-medium">
              {t("dashboard.subtitle")}
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
                {t(`dashboard.${range}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => refetch()} />
      ) : (
        <div className="space-y-12 pb-12">
          {/* Recent Transactions (Top) */}
          <div className="bg-white/70 backdrop-blur-md rounded-[3rem] border border-white/40 shadow-xl shadow-slate-200/50 overflow-hidden group hover:shadow-2xl transition-all duration-500">
            <div className="p-8 border-b border-slate-100/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                  <ArrowRightLeft className="text-primary-500" size={28} />
                  {t("dashboard.recent_transactions")}
                </h2>
                <p className="text-slate-400 text-sm font-medium">
                  {t("dashboard.showing_latest")}
                </p>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors" size={16} />
                  <input 
                    type="text"
                    placeholder="Search invoices, customers..."
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 pl-11 pr-4 text-sm font-bold focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                    value={transactionSearch}
                    onChange={(e) => setTransactionSearch(e.target.value)}
                  />
                  {transactionSearch && (
                    <button
                      onClick={() => setTransactionSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-slate-200 text-slate-500 hover:text-rose-600 rounded-lg transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <button className="p-3.5 bg-slate-50 text-slate-400 rounded-2xl hover:bg-primary-50 hover:text-primary-600 transition-all border border-slate-100">
                  <Filter size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 h-[450px] overflow-y-auto custom-scrollbar bg-slate-50/30">
              <div className="space-y-3">
                {filteredActivity.map((activity: any, idx: number) => (
                  <ActivityItem
                    key={activity.id || idx}
                    activity={activity}
                    onClick={() => setSelectedSale(activity)}
                  />
                ))}
                {filteredActivity.length === 0 && (
                  <div className="py-24 text-center">
                    <div className="w-20 h-20 bg-white shadow-xl shadow-slate-100 text-slate-200 rounded-[2rem] flex items-center justify-center mx-auto mb-6 animate-pulse">
                      <Banknote size={40} />
                    </div>
                    <h3 className="text-lg font-black text-slate-800 mb-1">No transactions found</h3>
                    <p className="text-slate-400 font-medium tracking-tight">
                      Try adjusting your search terms
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sales & Profit Report (Clean Area Chart) */}
          <div className="bg-white/70 backdrop-blur-md rounded-[3rem] border border-white/40 shadow-xl p-8 group hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
              <TrendingUp size={140} />
            </div>
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 relative z-10">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-100">
                    <TrendingUp size={20} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">{t("dashboard.sales_report")}</h3>
                </div>
                <p className="text-slate-400 text-sm font-medium ml-1">
                  {chartData.length > 0
                    ? `${new Date(chartData[0]?.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} to ${new Date(chartData[chartData.length - 1]?.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
                    : t("dashboard.no_data")
                  }
                </p>
              </div>
              
              <div className="flex flex-col md:flex-row items-center gap-6">
                 {/* Period Selector */}
                 <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/60">
                    {["today", "yesterday", "week", "month", "year"].map((range) => (
                      <button
                        key={range}
                        onClick={() => setTimeRange(range)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-200 ${
                          timeRange === range
                            ? "bg-white text-emerald-600 shadow-sm"
                            : "text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        {t(`dashboard.${range}`)}
                      </button>
                    ))}
                 </div>

                 {/* Legend */}
                 <div className="flex items-center gap-4 text-xs font-bold">
                    <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                       <span className="text-slate-500">{t("dashboard.revenue")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-full bg-primary-500"></div>
                       <span className="text-slate-500">{t("dashboard.profit")}</span>
                    </div>
                 </div>
              </div>
            </div>

            <div className="h-[400px] w-full relative z-10">
              {chartData.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
                  <TrendingUp size={48} className="mb-2 opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-widest">{t("dashboard.no_data")}</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
                    <defs>
                      <linearGradient id="colorSalesGreen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="colorProfitBlue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#E2E8F0" strokeDasharray="5 5" opacity={0.3} />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 900 }}
                      dy={20}
                      tickFormatter={(str) => {
                        const d = new Date(str.replace(" ", "T"));
                        if (timeRange === "today" || timeRange === "yesterday") return d.getHours() + ":00";
                        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                        return timeRange === "year"
                          ? d.toLocaleDateString("en-US", { month: "short" })
                          : (days[d.getDay()] || d.getDate().toString());
                      }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 900 }}
                      tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                    />
                    <Tooltip
                      content={<CustomTooltip timeRange={timeRange} />}
                      cursor={{ stroke: '#E2E8F0', strokeWidth: 2, strokeDasharray: '8 8', opacity: 0.2 }}
                    />
                    <Area
                      type="monotone"
                      name={t("dashboard.revenue")}
                      dataKey="revenue"
                      stroke="#10b981"
                      strokeWidth={4}
                      fillOpacity={1}
                      fill="url(#colorSalesGreen)"
                      activeDot={{ r: 8, strokeWidth: 4, stroke: '#fff', fill: '#10b981' }}
                      dot={false}
                      animationDuration={2000}
                    />
                    <Area
                      type="monotone"
                      name={t("dashboard.profit")}
                      dataKey="profit"
                      stroke="#3b82f6"
                      strokeWidth={4}
                      fillOpacity={1}
                      fill="url(#colorProfitBlue)"
                      activeDot={{ r: 8, strokeWidth: 4, stroke: '#fff', fill: '#3b82f6' }}
                      dot={false}
                      animationDuration={2500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <MetricCard
              title={`${getFilterLabel()} ${t("common.sales")}`}
              subtitle={t("dashboard.revenue")}
              value={`₹${stats?.periodSales?.toLocaleString() || 0}`}
              icon={<TrendingUp size={24} />}
              trend={stats?.salesTrend}
              color="emerald"
            />
            <MetricCard
              title={`${getFilterLabel()} ${t("dashboard.profit")}`}
              subtitle={t("dashboard.growth_analysis")}
              value={`₹${stats?.periodProfit?.toLocaleString() || 0}`}
              icon={<ArrowUpCircle size={24} />}
              trend={stats?.profitTrend}
              color="primary"
            />
            <MetricCard
              title={`${getFilterLabel()} ${t("dashboard.expenses")}`}
              subtitle={t("dashboard.budget_vs_spending")}
              value={`₹${stats?.periodExpenses?.toLocaleString() || 0}`}
              icon={<Receipt size={24} />}
              trend={stats?.expensesTrend}
              color="amber"
            />
            <MetricCard
              title={t("dashboard.to_collect")}
              subtitle={t("billing.receivable")}
              value={`₹${stats?.toCollect?.toLocaleString() || 0}`}
              icon={<Clock size={24} />}
              trend={t("billing.pending")}
              color="indigo"
            />
            <MetricCard
              title={t("dashboard.to_pay")}
              subtitle={t("billing.payable")}
              value={`₹${stats?.toPay?.toLocaleString() || 0}`}
              icon={<HandCoins size={24} />}
              trend={t("billing.pending")}
              color="indigo"
            />
            <MetricCard
              title={t("dashboard.stock_value")}
              subtitle={t("dashboard.stats.monthly_revenue")}
              value={`₹${stats?.stockValue?.toLocaleString() || 0}`}
              icon={<Package size={24} />}
              trend={stats?.lowStockCount > 0 ? `${stats?.lowStockCount} items low` : t("dashboard.all_clear")}
              color="blue"
            />
            <MetricCard
              title={t("dashboard.est_balance")}
              subtitle={t("dashboard.stats.monthly_revenue")}
              value={`₹${stats?.estimatedBalance?.toLocaleString() || 0}`}
              icon={<Wallet size={24} />}
              trend="Real-time"
              color="emerald"
            />
            <MetricCard
              title={t("dashboard.staff_present")}
              subtitle={`${stats?.presentToday || 0}/${stats?.totalStaff || 0} active today`}
              value={(stats?.presentToday || 0).toString()}
              icon={<Users size={24} />}
              trend={stats?.presentToday > 0 ? "Active" : "N/A"}
              color="slate"
            />
            <MetricCard
              title={t("dashboard.system_alerts")}
              subtitle={`${alerts?.length || 0} items need attention`}
              value={(alerts?.length || 0).toString()}
              icon={<AlertTriangle size={24} />}
              trend={alerts?.length > 0 ? t("dashboard.action_reqd") : t("dashboard.all_clear")}
              color={alerts?.length > 0 ? "amber" : "emerald"}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8">
              <div className="bg-white/70 backdrop-blur-md rounded-[3rem] border border-white/40 shadow-xl p-8 h-full">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">{t("dashboard.revenue_vs_expenses")}</h3>
                    <p className="text-slate-400 text-sm font-medium">{t("dashboard.budget_vs_spending")}</p>
                  </div>
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                    <Receipt size={24} />
                  </div>
                </div>
                <div className="h-[350px] w-full relative">
                  {chartData.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
                      <Receipt size={48} className="mb-2 opacity-20" />
                      <p className="text-[10px] font-black uppercase tracking-widest">{t("dashboard.no_data")}</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="#E2E8F0" strokeDasharray="3 3" opacity={0.4} />
                        <XAxis dataKey="date" hide />
                        <YAxis hide />
                        <Tooltip content={<CustomTooltip timeRange={timeRange} />} cursor={{ fill: '#F8FAFC', opacity: 0.4 }} />
                        <Bar name={t("dashboard.revenue")} dataKey="revenue" fill="#0284c7" radius={[6, 6, 0, 0]} barSize={12} />
                        <Bar name={t("dashboard.expenses")} dataKey="expenses" fill="#f59e0b" radius={[6, 6, 0, 0]} barSize={12} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-4">
              {alerts.length > 0 && (
                <div className="bg-rose-50/80 backdrop-blur-md rounded-[2.5rem] p-8 border border-rose-100 shadow-xl shadow-rose-100/50 h-full">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-rose-700 font-black uppercase tracking-widest text-xs flex items-center gap-2">
                      <AlertTriangle size={18} />
                      {t("dashboard.critical_alerts")}
                    </h2>
                    <span className="px-2 py-1 bg-rose-200/50 text-rose-700 rounded-lg text-[10px] font-black">{alerts.length}</span>
                  </div>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                    {alerts.map((alert: any, i: number) => (
                      <div key={i} className="flex gap-4 p-4 bg-white/60 rounded-2xl border border-rose-100 group hover:bg-white transition-all">
                        <div className="shrink-0 p-2 bg-rose-100 text-rose-600 rounded-xl h-fit"><Package size={18} /></div>
                        <div>
                          <p className="text-sm font-black text-slate-800 tracking-tight">{alert.title}</p>
                          <p className="text-xs text-rose-600 font-medium">{alert.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
