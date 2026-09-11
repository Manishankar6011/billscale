import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { 
  Wallet, DollarSign, Calendar, Eye, Send, Trash2, History, 
  User, CheckCircle2, Clock, XCircle, ArrowUpRight, Search, Plus
} from "lucide-react";
import axios from "axios";
import type { Staff } from "../types";
import { useAuth } from "../context/AuthContext";
import { TableSkeleton } from "../components/Skeleton";
import { useToast } from "../context/ToastContext";
import UpgradePrompt from "../components/UpgradePrompt";

interface PaymentItem {
  _id: string;
  amount: number;
  date: string;
  note?: string;
}

interface StaffSummaryData {
  staff: Staff;
  totalEarned: number;
  totalPaid: number;
  balance: number;
  workingDays: number;
  fullDays: number;
  halfDays: number;
  absentDays: number;
  payments: PaymentItem[];
}

const Salary = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const isContractor = user?.businessType === 'Contractor';

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const { data: staffList = [], isLoading: loading } = useQuery<Staff[]>({
    queryKey: ["staff"],
    queryFn: async () => {
      const res = await axios.get("/api/staff", {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      return res.data;
    },
    enabled: !!user?.token,
  });

  const { data: selectedStaff, isLoading: summaryLoading } = useQuery<StaffSummaryData>({
    queryKey: ["staff-summary", selectedStaffId],
    queryFn: async () => {
      const res = await axios.get(`/api/staff/summary/${selectedStaffId}`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      return res.data;
    },
    enabled: !!selectedStaffId,
  });

  // Pay mutation
  const payMutation = useMutation({
    mutationFn: async (data: any) => {
      return axios.post("/api/staff/pay", data, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["staff-summary", selectedStaffId],
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      showToast(t("staff.payment_success"), "success");
      setAmount("");
      setNote("");
    },
    onError: () => {
      showToast(t("staff.payment_error"), "error");
    },
  });

  // Delete Payment mutation
  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      return axios.delete(`/api/staff/payment/${paymentId}`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["staff-summary", selectedStaffId],
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      showToast("Payment entry deleted", "success");
    },
    onError: () => {
      showToast("Failed to delete payment entry", "error");
    },
  });

  const fetchStaffSummary = (staffId: string) => {
    setSelectedStaffId(staffId);
    setIsModalOpen(true);
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff || !amount || Number(amount) <= 0) return;

    payMutation.mutate({
      staffId: selectedStaff.staff._id!,
      amount: Number(amount),
      note,
      date: new Date(),
    });
  };

  const filteredStaff = staffList.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <TableSkeleton rows={10} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {isContractor ? "Worker Salary & Wage Khata" : t("common.salary")}
          </h1>
          <p className="text-slate-500 font-medium">
            {isContractor 
              ? "Track daily wages, advance payments (Diyagaya paisa), and remaining balance (Baki) for all workers."
              : t("staff.track_earnings")
            }
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-100 p-2 flex items-center shadow-sm max-w-md">
        <Search className="text-slate-400 ml-3 mr-2" size={20} />
        <input 
          type="text" 
          placeholder="Search worker by name or role..." 
          className="w-full bg-transparent border-none py-2 pl-2 pr-4 focus:ring-0 text-slate-800 font-medium placeholder:text-slate-400"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Main Workers Ledger Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">
                  Worker / Staff
                </th>
                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">
                  Wage Type & Rate
                </th>
                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest text-right">
                  Actions & Ledger
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredStaff.map((staff) => (
                <tr
                  key={staff._id}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold text-base">
                        {staff.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{staff.name}</p>
                        <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider">
                          {staff.role}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="font-black text-slate-800 text-base">
                        ₹{staff.salaryAmount.toLocaleString()}
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          staff.salaryType === "monthly"
                            ? "bg-indigo-50 text-indigo-600"
                            : "bg-emerald-50 text-emerald-600"
                        }`}
                      >
                        {staff.salaryType === "monthly" ? "Per Month" : "Per Day"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => fetchStaffSummary(staff._id!)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-600 transition-all shadow-md"
                    >
                      <Eye size={16} /> Open Worker Khata
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredStaff.length === 0 && (
            <div className="p-8 text-center text-slate-500 font-medium">
              No workers found. Go to Workers section to add team members.
            </div>
          )}
        </div>
      </div>

      {/* Staff Ledger & Payout Modal */}
      {isModalOpen && selectedStaff && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-[36px] shadow-2xl p-8 md:p-10 animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh] relative custom-scrollbar">
            
            {/* Header */}
            <div className="flex justify-between items-start mb-8 pb-6 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
                    {selectedStaff.staff.name}
                  </h2>
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full uppercase tracking-wider">
                    {selectedStaff.staff.role}
                  </span>
                </div>
                <p className="text-slate-500 text-sm font-medium">
                  Rate: ₹{selectedStaff.staff.salaryAmount.toLocaleString()} ({selectedStaff.staff.salaryType === 'monthly' ? 'Monthly' : 'Daily Wage'})
                </p>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedStaffId(null);
                }}
                className="bg-slate-100 p-2.5 rounded-2xl text-slate-400 hover:text-slate-800 transition-all font-bold"
              >
                ✕
              </button>
            </div>

            {/* Attendance & Wages Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  Attendance
                </p>
                <p className="text-lg font-black text-slate-800">
                  {selectedStaff.fullDays} Full <span className="text-slate-400 font-normal">|</span> {selectedStaff.halfDays} Half
                </p>
                <p className="text-[11px] font-semibold text-slate-500 mt-1">
                  Total {selectedStaff.workingDays} working days
                </p>
              </div>

              <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">
                  Total Earned (Kamaee)
                </p>
                <p className="text-xl font-black text-emerald-700">
                  ₹{selectedStaff.totalEarned.toLocaleString()}
                </p>
                <p className="text-[11px] font-semibold text-emerald-600 mt-1">
                  Calculated from attendance
                </p>
              </div>

              <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">
                  Total Paid (Diyagaya)
                </p>
                <p className="text-xl font-black text-blue-700">
                  ₹{selectedStaff.totalPaid.toLocaleString()}
                </p>
                <p className="text-[11px] font-semibold text-blue-600 mt-1">
                  Advance + payouts
                </p>
              </div>

              <div className="bg-rose-50/80 p-4 rounded-2xl border border-rose-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-1">
                  Pending Dues (Baki)
                </p>
                <p className="text-xl font-black text-rose-700">
                  ₹{selectedStaff.balance.toLocaleString()}
                </p>
                <p className="text-[11px] font-semibold text-rose-600 mt-1">
                  {selectedStaff.balance > 0 ? "To be paid" : "Settled / Clear"}
                </p>
              </div>
            </div>

            {/* Record Payment Form */}
            <div className="bg-slate-900 text-white p-6 rounded-3xl mb-8 shadow-xl">
              <h3 className="text-base font-black mb-4 flex items-center gap-2">
                <Send className="text-indigo-400" size={18} /> Give Payment / Advance (Paisa Diya)
              </h3>
              <form onSubmit={handlePayment} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                    Amount (₹)
                  </label>
                  <input
                    required
                    type="number"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-indigo-500 font-bold placeholder:text-slate-500"
                    placeholder="Enter amount (e.g. 500)"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                    Note / Purpose (Optional)
                  </label>
                  <input
                    type="text"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-indigo-500 font-bold placeholder:text-slate-500"
                    placeholder="e.g. Advance for site, Kharcha..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={payMutation.isPending}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    {payMutation.isPending ? "Recording..." : "Record Payment"}
                  </button>
                </div>
              </form>
            </div>

            {/* Payment History (Kab-Kab kitna diya) */}
            <div>
              <h3 className="text-base font-black text-slate-800 mb-4 flex items-center gap-2">
                <History className="text-slate-500" size={18} /> Payment History (Kab Kitna Paisa Diya)
              </h3>

              {selectedStaff.payments && selectedStaff.payments.length > 0 ? (
                <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 sticky top-0">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Note</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {selectedStaff.payments.map((p) => (
                        <tr key={p._id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3">
                            {new Date(p.date).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric"
                            })}
                          </td>
                          <td className="px-4 py-3 font-black text-slate-900">
                            ₹{p.amount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs">
                            {p.note || "-"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => {
                                if (window.confirm("Are you sure you want to delete this payment entry?")) {
                                  deletePaymentMutation.mutate(p._id);
                                }
                              }}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors"
                              title="Delete payment entry"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 bg-slate-50 rounded-2xl text-center text-slate-400 text-xs font-semibold">
                  No payment history recorded yet. Use the form above to record cash/advance given to worker.
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Salary;
