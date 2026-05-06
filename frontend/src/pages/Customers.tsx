import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  Users,
  Search,
  Phone,
  MapPin,
  IndianRupee,
  TrendingUp,
  X,
  CreditCard,
  FileText,
  ArrowDownToLine,
  ArrowUpFromLine,
  Loader2,
  Edit2,
  Trash2,
  Plus
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { format } from "date-fns";
import Skeleton from "../components/Skeleton";

interface LedgerEntry {
  id: string;
  type: 'sale' | 'payment';
  date: string;
  amount: number;
  paid?: number;
  due?: number;
  invoiceNumber?: string;
  paymentMode?: string;
  notes?: string;
  runningBalance: number;
}

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

  const queryClient = useQueryClient();
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerData | null>(null);
  const [customerForm, setCustomerForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    gstin: "",
    state: "Bihar",
    stateCode: "10"
  });
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [submittingCustomer, setSubmittingCustomer] = useState(false);

  const handleDeleteCustomer = async (e: React.MouseEvent, c: CustomerData) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete ${c.name}? This will remove their record from your database.`)) return;
    
    try {
      await axios.delete(`/api/customers/${c._id}`, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      showToast("Customer deleted successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      if (selected?._id === c._id) setSelected(null);
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to delete customer", "error");
    }
  };

  const handleEditCustomer = (e: React.MouseEvent, c: any) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditingCustomer(c);
    setCustomerForm({
      name: c.name,
      phone: c.phone || "",
      email: c.email || "",
      address: c.address || "",
      gstin: c.gstin || "",
      state: c.state || "Bihar",
      stateCode: c.stateCode || "10"
    });
    setShowCustomerModal(true);
  };

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCustomer(true);
    try {
      if (isEditing && editingCustomer) {
        await axios.put(`/api/customers/${editingCustomer._id}`, customerForm, {
          headers: { Authorization: `Bearer ${user?.token}` }
        });
        showToast("Customer updated successfully", "success");
      } else {
        await axios.post("/api/customers", customerForm, {
          headers: { Authorization: `Bearer ${user?.token}` }
        });
        showToast("Customer created successfully", "success");
      }
      setShowCustomerModal(false);
      setEditingCustomer(null);
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    } catch (err: any) {
      showToast(err.response?.data?.message || "Action failed", "error");
    } finally {
      setSubmittingCustomer(false);
    }
  };

  const handleSelectCustomer = async (c: CustomerData) => {
    setSelected(c);
    setLoadingLedger(true);
    try {
      const res = await axios.get(`/api/customers/${c._id}/ledger`, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      setLedger(res.data);
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to load ledger", "error");
    } finally {
      setLoadingLedger(false);
    }
  };

  const isSubmittingPaymentRef = useRef(false);

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !paymentAmount || isSubmittingPaymentRef.current) return;
    isSubmittingPaymentRef.current = true;
    setSubmittingPayment(true);
    try {
      await axios.post(`/api/customers/${selected._id}/payments`, {
        amount: Number(paymentAmount),
        paymentMode,
        notes: paymentNotes
      }, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      showToast("Payment recorded successfully", "success");
      setShowPaymentModal(false);
      setPaymentAmount("");
      setPaymentNotes("");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      const updatedCustomer = { ...selected, totalDue: selected.totalDue - Number(paymentAmount), totalPaid: selected.totalPaid + Number(paymentAmount) };
      handleSelectCustomer(updatedCustomer);
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to record payment", "error");
    } finally {
      isSubmittingPaymentRef.current = false;
      setSubmittingPayment(false);
    }
  };

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

              {/* Ledger Section */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                    <FileText size={16} className="text-primary-500" />
                    Ledger History
                  </h4>
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200"
                  >
                    <IndianRupee size={14} />
                    Receive Payment
                  </button>
                </div>
                
                <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                  {loadingLedger ? (
                    <div className="p-8 flex justify-center">
                      <Loader2 size={24} className="text-primary-500 animate-spin" />
                    </div>
                  ) : ledger.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm font-medium">
                      No transactions found
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                      {ledger.map((entry, idx) => (
                        <div key={idx} className="p-4 flex items-center justify-between hover:bg-white transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${entry.type === 'sale' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                              {entry.type === 'sale' ? <ArrowDownToLine size={16} /> : <ArrowUpFromLine size={16} />}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800">
                                {entry.type === 'sale' ? 'Invoice ' + (entry.invoiceNumber || '') : 'Payment Received'}
                              </p>
                              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">
                                {format(new Date(entry.date), "dd MMM yyyy, p")}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-black ${entry.type === 'sale' ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {entry.type === 'sale' ? '-' : '+'}₹{entry.amount.toLocaleString()}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                              Bal: ₹{entry.runningBalance.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {selected.phone && (
                <a
                  href={`https://wa.me/${selected.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 mt-4"
                >
                  WhatsApp {selected.name}
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selected && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="bg-primary-600 p-6 text-white text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                <CreditCard size={32} />
              </div>
              <h3 className="text-xl font-black">Receive Payment</h3>
              <p className="text-primary-100 text-sm mt-1">from {selected.name}</p>
            </div>
            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                  Amount Received (₹)
                </label>
                <div className="relative">
                  <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="number"
                    required
                    min="1"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-slate-800 font-bold focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                    placeholder="Enter amount"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                  Payment Mode
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-slate-800 font-bold focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="card">Card</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-slate-800 font-medium focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                  placeholder="e.g. Cleared pending dues"
                  rows={2}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="flex-1 py-3 bg-primary-600 text-white font-bold rounded-2xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200 disabled:opacity-70 flex justify-center items-center gap-2"
                >
                  {submittingPayment ? <Loader2 size={18} className="animate-spin" /> : 'Save Payment'}
                </button>
              </div>
            </form>
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
        <button
          onClick={() => {
            setIsEditing(false);
            setCustomerForm({
              name: "",
              phone: "",
              email: "",
              address: "",
              gstin: "",
              state: "Bihar",
              stateCode: "10"
            });
            setShowCustomerModal(true);
          }}
          className="flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-100"
        >
          <Plus size={20} />
          Add Customer
        </button>
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
            onClick={() => handleSelectCustomer(c)}
            className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 cursor-pointer hover:shadow-md hover:border-primary-100 transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg shadow-primary-100">
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={(e) => handleEditCustomer(e, c)}
                  className="p-2 bg-slate-50 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={(e) => handleDeleteCustomer(e, c)}
                  className="p-2 bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                >
                  <Trash2 size={16} />
                </button>
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

      {/* Add/Edit Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="bg-primary-600 p-6 text-white flex items-center justify-between">
              <h3 className="text-xl font-black">{isEditing ? 'Edit Customer' : 'Add New Customer'}</h3>
              <button onClick={() => setShowCustomerModal(false)} className="text-white/80 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCustomerSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Customer Name*</label>
                <input
                  type="text"
                  required
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-slate-800 font-bold focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="e.g. Rahul Kumar"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-slate-800 font-bold focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="10 digit number"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">GSTIN</label>
                  <input
                    type="text"
                    value={customerForm.gstin}
                    onChange={(e) => setCustomerForm({ ...customerForm, gstin: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-slate-800 font-bold focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="GSTIN Number"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Email</label>
                <input
                  type="email"
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-slate-800 font-bold focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="customer@email.com"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Address</label>
                <textarea
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-slate-800 font-medium focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                  placeholder="Full address"
                  rows={2}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(false)}
                  className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCustomer}
                  className="flex-1 py-3 bg-primary-600 text-white font-bold rounded-2xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200 disabled:opacity-70 flex justify-center items-center gap-2"
                >
                  {submittingCustomer ? <Loader2 size={18} className="animate-spin" /> : (isEditing ? 'Update' : 'Add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
