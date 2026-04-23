import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Wallet, DollarSign, Calendar, Eye, Send } from "lucide-react";
import axios from "axios";
import type { Staff } from "../types";
import { useAuth } from "../context/AuthContext";
import { TableSkeleton } from "../components/Skeleton";
import { useToast } from "../context/ToastContext";

const Salary = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

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

  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const { data: selectedStaff, isLoading: summaryLoading } = useQuery({
    queryKey: ["staff-summary", selectedStaffId],
    queryFn: async () => {
      const res = await axios.get(`/api/staff/summary/${selectedStaffId}`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      return res.data;
    },
    enabled: !!selectedStaffId,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  // Mutations
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
      setIsModalOpen(false);
      setAmount("");
      setNote("");
    },
    onError: () => {
      showToast(t("staff.payment_error"), "error");
    },
  });

  const fetchStaffSummary = (staffId: string) => {
    setSelectedStaffId(staffId);
    setIsModalOpen(true);
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;

    payMutation.mutate({
      staffId: selectedStaff.staff._id!,
      amount: Number(amount),
      note,
      date: new Date(),
    });
  };

  if (loading) return <TableSkeleton rows={10} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {t("common.salary")}
          </h1>
          <p className="text-slate-500">{t("staff.track_earnings")}</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">
                  {t("staff.employee")}
                </th>
                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">
                  {t("staff.salary_type")}
                </th>
                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">
                  {t("staff.base_salary")}
                </th>
                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest text-right">
                  {t("common.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {staffList.map((staff) => (
                <tr
                  key={staff._id}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
                        {staff.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{staff.name}</p>
                        <p className="text-xs text-slate-400 uppercase tracking-widest">
                          {staff.role}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        staff.salaryType === "monthly"
                          ? "bg-indigo-50 text-indigo-600"
                          : "bg-emerald-50 text-emerald-600"
                      }`}
                    >
                      {staff.salaryType}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-black text-slate-800">
                    ₹{staff.salaryAmount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => fetchStaffSummary(staff._id!)}
                      className="inline-flex items-center gap-2 px-6 py-2 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-primary-600 transition-all shadow-lg shadow-slate-200"
                    >
                      <Eye size={14} /> {t("staff.calculate_pay")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Salary Modal */}
      {isModalOpen && selectedStaff && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl p-10 animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh] relative custom-scrollbar">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-50 rounded-full blur-3xl -z-10 -mr-32 -mt-32"></div>

            <div className="flex justify-between items-center mb-10">
              <div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tighter">
                  {t("staff.payroll_summary")}
                </h2>
                <p className="text-slate-500 font-medium">
                  {t("staff.detailed_statement", {
                    name: selectedStaff.staff.name,
                  })}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="bg-slate-100 p-3 rounded-2xl text-slate-400 hover:text-slate-800 transition-all font-bold"
              >
                {t("common.close")}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div className="bg-slate-50 p-6 rounded-3xl">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                  {t("staff.days_worked")}
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
                    <Calendar size={16} />
                  </div>
                  <span className="text-2xl font-black text-slate-800">
                    {selectedStaff.workingDays}
                  </span>
                </div>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                  {t("staff.total_earned")}
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                    <DollarSign size={16} />
                  </div>
                  <span className="text-2xl font-black text-slate-800">
                    ₹{selectedStaff.totalEarned.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="bg-primary-600 p-6 rounded-3xl text-white shadow-xl shadow-primary-100">
                <p className="text-xs font-black uppercase tracking-widest text-white/70 mb-2">
                  {t("staff.pending_dues")}
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <Wallet size={16} />
                  </div>
                  <span className="text-2xl font-black">
                    ₹{selectedStaff.balance.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-8 rounded-[32px]">
              <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                <Send className="text-primary-600" size={20} />{" "}
                {t("staff.process_payout")}
              </h3>
              <form
                onSubmit={handlePayment}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">
                    {t("staff.payment_amount")}
                  </label>
                  <input
                    required
                    type="number"
                    className="w-full bg-white border-2 border-slate-100 rounded-2xl p-4 text-slate-800 focus:ring-2 focus:ring-primary-500 transition-all font-bold"
                    placeholder="₹ 0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">
                    {t("staff.note_optional")}
                  </label>
                  <input
                    type="text"
                    className="w-full bg-white border-2 border-slate-100 rounded-2xl p-4 text-slate-800 focus:ring-2 focus:ring-primary-500 transition-all font-bold"
                    placeholder={t("billing.charge_name_placeholder")}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={payMutation.isPending}
                  className="md:col-span-2 btn-primary py-5 mt-2 shadow-2xl shadow-primary-100 font-bold flex items-center justify-center gap-2"
                >
                  {payMutation.isPending
                    ? t("staff.saving")
                    : t("staff.confirm_payment")}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Salary;
