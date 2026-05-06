import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowUpRight, ArrowDownLeft, Search, Filter } from "lucide-react";
import axios from "axios";
import type { Sale, Purchase } from "../types";
import { useAuth } from "../context/AuthContext";
import { TableSkeleton } from "../components/Skeleton";
import { useToast } from "../context/ToastContext";
import { format } from "date-fns";

const Ledger = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Queries
  const { data: sales = [], isLoading: salesLoading } = useQuery<Sale[]>({
    queryKey: ["sales", "credit"],
    queryFn: async () => {
      const res = await axios.get("/api/transactions/sales", {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      // Extract sales from paginated response
      const salesArray = res.data.sales || [];
      return salesArray.filter((s: Sale) => s.paymentMode === "credit");
    },
    enabled: !!user?.token,
  });

  const { data: purchases = [], isLoading: purchasesLoading } = useQuery<
    Purchase[]
  >({
    queryKey: ["purchases", "pending"],
    queryFn: async () => {
      const res = await axios.get("/api/transactions/purchases", {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      // Extract purchases from paginated response
      const purchasesArray = res.data.purchases || [];
      return purchasesArray.filter((p: Purchase) => p.paymentStatus === "pending");
    },
    enabled: !!user?.token,
  });

  const loading = salesLoading || purchasesLoading;
  const [tab, setTab] = useState<"customer" | "supplier">("customer");

  if (loading) return <TableSkeleton rows={10} />;

  const totalCustomerCredit = sales.reduce(
    (acc, sale) => acc + sale.totalAmount,
    0,
  );
  const totalSupplierPending = purchases.reduce(
    (acc, purchase) => acc + purchase.totalAmount,
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {t("ledger.title")}
          </h1>
          <p className="text-slate-500">{t("ledger.subtitle")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-rose-100 transition-colors"></div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
              <ArrowDownLeft size={24} />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-slate-400">
              {t("billing.receivable")}
            </span>
          </div>
          <p className="text-4xl font-black text-slate-800 tracking-tighter">
            ₹{totalCustomerCredit.toLocaleString()}
          </p>
        </div>

        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-amber-100 transition-colors"></div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
              <ArrowUpRight size={24} />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-slate-400">
              {t("billing.payable")}
            </span>
          </div>
          <p className="text-4xl font-black text-slate-800 tracking-tighter">
            ₹{totalSupplierPending.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
        <button
          onClick={() => setTab("customer")}
          className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            tab === "customer"
              ? "bg-white text-primary-600 shadow-sm"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          {t("billing.customer_udhaar")}
        </button>
        <button
          onClick={() => setTab("supplier")}
          className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            tab === "supplier"
              ? "bg-white text-primary-600 shadow-sm"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          {t("billing.supplier_dues")}
        </button>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-xs font-black uppercase text-slate-400 tracking-widest">
                  {t("common.date")}
                </th>
                <th className="px-8 py-5 text-xs font-black uppercase text-slate-400 tracking-widest">
                  {tab === "customer"
                    ? t("billing.customer")
                    : t("billing.supplier")}
                </th>
                <th className="px-8 py-5 text-xs font-black uppercase text-slate-400 tracking-widest">
                  {t("billing.items_count")}
                </th>
                <th className="px-8 py-5 text-xs font-black uppercase text-slate-400 tracking-widest text-right">
                  {t("billing.pending_amount")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {tab === "customer"
                ? sales.map((sale) => (
                    <tr
                      key={sale._id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-8 py-5 text-sm text-slate-500 font-medium">
                        {format(new Date(sale.date), "dd MMM yyyy")}
                      </td>
                      <td className="px-8 py-5">
                        <p className="font-bold text-slate-800">
                          {sale.customerName}
                        </p>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col gap-1">
                          {sale.items.map((item, i: number) => (
                            <span
                              key={i}
                              className="text-sm font-medium text-slate-600"
                            >
                              {(item.productId as any)?.name} ({item.quantity})
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <p className="text-lg font-black text-rose-600">
                          ₹{sale.totalAmount.toLocaleString()}
                        </p>
                      </td>
                    </tr>
                  ))
                : purchases.map((purchase) => (
                    <tr
                      key={purchase._id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-8 py-5 text-sm text-slate-500 font-medium">
                        {format(new Date(purchase.date), "dd MMM yyyy")}
                      </td>
                      <td className="px-8 py-5">
                        <p className="font-bold text-slate-800">
                          {purchase.supplierName}
                        </p>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col gap-1">
                          {purchase.items.map((item, i) => (
                            <span
                              key={i}
                              className="text-sm font-medium text-slate-600"
                            >
                              {item.name} ({item.quantity})
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <p className="text-lg font-black text-amber-600">
                          ₹{purchase.totalAmount.toLocaleString()}
                        </p>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Ledger;
