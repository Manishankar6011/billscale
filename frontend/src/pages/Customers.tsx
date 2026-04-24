import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  Users,
  Search,
  Phone,
  MapPin,
  IndianRupee,
  TrendingUp,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { format } from "date-fns";
import Skeleton from "../components/Skeleton";

interface CustomerData {
  _id: string;
  name: string;
  phone: string;
  address?: string;
  totalSales: number;
  totalAmount: number;
  totalPaid: number;
  totalDue: number;
  lastSaleDate?: string;
  invoiceCount: number;
}

const Customers = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { data: customers = [], isLoading: loading } = useQuery<CustomerData[]>({
    queryKey: ["customers"],
    queryFn: async () => {
      const res = await axios.get("/api/customers", {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      return res.data;
    },
    enabled: !!user?.token,
  });

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CustomerData | null>(null);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search),
  );

  const totalCustomers = customers.length;
  const totalRevenue = customers.reduce((a, c) => a + c.totalAmount, 0);
  const totalDueAll = customers.reduce((a, c) => a + c.totalDue, 0);

  if (loading) return <Skeleton count={5} />;

  return (
    <div className="space-y-6">
      {/* Customer Detail side panel */}
      {selected && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-3xl shadow-2xl flex flex-col animate-in zoom-in duration-300">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black text-slate-800">
                  {selected.name}
                </h3>
                <p className="text-sm text-slate-400 font-medium">
                  {selected.phone || "No phone"}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-primary-50 rounded-2xl p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary-600 mb-1">
                    Total Business
                  </p>
                  <p className="text-2xl font-black text-slate-800">
                    ₹{selected.totalAmount.toLocaleString()}
                  </p>
                </div>
                <div
                  className={`${selected.totalDue > 0 ? "bg-rose-50" : "bg-emerald-50"} rounded-2xl p-4`}
                >
                  <p
                    className={`text-[10px] font-black uppercase tracking-widest ${selected.totalDue > 0 ? "text-rose-600" : "text-emerald-600"} mb-1`}
                  >
                    Amount Due
                  </p>
                  <p className={`text-2xl font-black text-slate-800`}>
                    ₹{selected.totalDue.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">Invoices</span>
                  <span className="font-black text-slate-800">
                    {selected.invoiceCount}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">Total Paid</span>
                  <span className="font-black text-emerald-600">
                    ₹{selected.totalPaid.toLocaleString()}
                  </span>
                </div>
                {selected.lastSaleDate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">
                      Last Sale
                    </span>
                    <span className="font-black text-slate-800">
                      {format(new Date(selected.lastSaleDate), "dd MMM yyyy")}
                    </span>
                  </div>
                )}
                {selected.address && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">Address</span>
                    <span className="font-black text-slate-800 text-right max-w-[60%]">
                      {selected.address}
                    </span>
                  </div>
                )}
              </div>
              {selected.phone && (
                <a
                  href={`https://wa.me/${selected.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100"
                >
                  WhatsApp {selected.name}
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Customers</h1>
          <p className="text-slate-500">
            View and manage your customer database
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary-50 text-primary-600 rounded-xl">
              <Users size={18} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Total Customers
            </p>
          </div>
          <p className="text-3xl font-black text-slate-800">{totalCustomers}</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp size={18} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Total Revenue
            </p>
          </div>
          <p className="text-3xl font-black text-slate-800">
            ₹{totalRevenue.toLocaleString()}
          </p>
        </div>
        <div className="bg-white border border-rose-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <IndianRupee size={18} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Total Due
            </p>
          </div>
          <p className="text-3xl font-black text-rose-600">
            ₹{totalDueAll.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center relative bg-white rounded-2xl border border-slate-100 shadow-sm focus-within:ring-2 focus-within:ring-primary-500 transition-all">
        <Search className="absolute left-4 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Search by name or phone..."
          className="w-full bg-transparent !border-none py-4 pl-12 pr-4 !outline-none text-slate-800 font-bold placeholder:font-medium"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Customer Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c) => (
          <div
            key={c._id}
            onClick={() => setSelected(c)}
            className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 cursor-pointer hover:shadow-md hover:border-primary-100 transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg shadow-primary-100">
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Invoices
                </p>
                <p className="text-xl font-black text-slate-800">
                  {c.invoiceCount}
                </p>
              </div>
            </div>
            <h3 className="text-lg font-black text-slate-800 group-hover:text-primary-700 transition-colors tracking-tight">
              {c.name}
            </h3>
            {c.phone && (
              <div className="flex items-center gap-2 mt-1">
                <Phone size={12} className="text-slate-300" />
                <p className="text-sm text-slate-500 font-medium">{c.phone}</p>
              </div>
            )}
            {c.address && (
              <div className="flex items-center gap-2 mt-1">
                <MapPin size={12} className="text-slate-300" />
                <p className="text-sm text-slate-500 font-medium truncate">
                  {c.address}
                </p>
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Total Business
                </p>
                <p className="text-xl font-black text-primary-600">
                  ₹{c.totalAmount.toLocaleString()}
                </p>
              </div>
              {c.totalDue > 0 && (
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-rose-400">
                    Due
                  </p>
                  <p className="text-lg font-black text-rose-600">
                    ₹{c.totalDue.toLocaleString()}
                  </p>
                </div>
              )}
              {c.lastSaleDate && (
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                    Last Sale
                  </p>
                  <p className="text-xs font-bold text-slate-500">
                    {format(new Date(c.lastSaleDate), "dd MMM yy")}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="text-slate-300" size={40} />
          </div>
          <h3 className="text-lg font-bold text-slate-800">
            No customers found
          </h3>
          <p className="text-slate-500">
            Record sales to automatically add customers here.
          </p>
        </div>
      )}
    </div>
  );
};

export default Customers;
