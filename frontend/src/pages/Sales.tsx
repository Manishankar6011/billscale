import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Receipt,
  Search,
  Filter,
  ArrowUpRight,
  Scan,
  Barcode,
  Trash2,
  IndianRupee,
  UserPlus,
  Phone,
  MapPin,
  X,
  User,
  Loader2,
  Printer,
  MessageCircle,
  TrendingUp,
  TrendingDown,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ShoppingCart,
} from "lucide-react";
import BarcodeScanner from "../components/BarcodeScanner";
import CustomerSearch from "../components/CustomerSearch";
import axios from "axios";
import type { Sale, Product, Customer } from "../types";
import { useAuth } from "../context/AuthContext";
import Skeleton from "../components/Skeleton";
import { useToast } from "../context/ToastContext";
import { format } from "date-fns";
import PrintableInvoice from "../components/PrintableInvoice";
import A4Invoice from "../components/A4Invoice";
import { generateInvoice } from "../utils/invoiceGenerator";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const UNIT_GROUPS: Record<string, string[]> = {
  weight: ["kg", "gm", "ton", "bag", "bundle", "pack"],
  volume: ["litre", "ml"],
  count: ["nos", "piece", "box", "dozen", "unit"],
  length: ["meter", "ft", "inch"],
  area: ["sqft", "sqmtr"],
};

const ALL_UNITS = Object.values(UNIT_GROUPS).flat();

const getUnitGroup = (unit: string) => {
  return (
    Object.keys(UNIT_GROUPS).find((group) =>
      UNIT_GROUPS[group]?.includes(unit.toLowerCase()),
    ) || "other"
  );
};

type CartItem = {
  productId: string;
  name: string;
  quantity: number;
  sellingPrice: number;
  unit: string;
  conversionFactor: number;
};

const SummaryCard = ({
  title,
  value,
  sub,
  color,
}: {
  title: string;
  value: string;
  sub?: string;
  color: "purple" | "emerald" | "rose";
}) => {
  const colorMap = {
    purple: "bg-violet-600 text-white",
    emerald: "bg-white border-2 border-emerald-200 text-slate-800",
    rose: "bg-white border-2 border-rose-200 text-slate-800",
  };
  const iconColorMap = {
    purple: "text-violet-200",
    emerald: "text-emerald-500",
    rose: "text-rose-500",
  };
  const icons = {
    purple: <TrendingUp size={24} />,
    emerald: <CheckCircle2 size={24} />,
    rose: <AlertCircle size={24} />,
  };
  return (
    <div
      className={`rounded-3xl p-6 flex items-center gap-5 shadow-sm ${colorMap[color]}`}
    >
      <div className={`${iconColorMap[color]}`}>{icons[color]}</div>
      <div>
        <p
          className={`text-[10px] font-black uppercase tracking-widest ${color === "purple" ? "text-violet-200" : "text-slate-400"}`}
        >
          {title}
        </p>
        <p
          className={`text-2xl font-black tracking-tight ${color === "purple" ? "text-white" : "text-slate-900"}`}
        >
          {value}
        </p>
        {sub && (
          <p
            className={`text-[10px] font-medium ${color === "purple" ? "text-violet-200" : "text-slate-400"}`}
          >
            {sub}
          </p>
        )}
      </div>
    </div>
  );
};

const Sales = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [paymentMode, setPaymentMode] = useState<"cash" | "credit">("cash");
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "pending">(
    "paid",
  );
  const [invoiceFormat, setInvoiceFormat] = useState<"thermal" | "a4">(
    "thermal",
  );
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedSaleForPreview, setSelectedSaleForPreview] = useState<Sale | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  // Round-off & change calculator
  const [roundOff, setRoundOff] = useState(false);
  const [amountReceived, setAmountReceived] = useState("");

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [additionalItems, setAdditionalItems] = useState<
    { name: string; price: string }[]
  >([]);

  // Item-Add modal (new)
  const [isItemsModalOpen, setIsItemsModalOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [itemQtyMap, setItemQtyMap] = useState<Record<string, string>>({});
  const [itemPriceMap, setItemPriceMap] = useState<Record<string, string>>({});

  // Additional charge inputs (new)
  const [newChargeName, setNewChargeName] = useState("");
  const [newChargePrice, setNewChargePrice] = useState("");

  // UI Logic State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [matchingProducts, setMatchingProducts] = useState<Product[]>([]);
  const [hwScannerInput, setHwScannerInput] = useState("");
  const [autoPrint, setAutoPrint] = useState(true);
  const [printData, setPrintData] = useState<any>(null);
  const scannerInputRef = useRef<HTMLInputElement>(null);

  // Leave warning
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const [pendingCloseAction, setPendingCloseAction] = useState<
    (() => void) | null
  >(null);

  // Filter State
  const [filterSearch, setFilterSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const isFormDirty =
    cart.length > 0 ||
    additionalItems.length > 0 ||
    customerName !== "" ||
    customerPhone !== "";

  const tryClose = useCallback(
    (action: () => void) => {
      if (isFormDirty) {
        setPendingCloseAction(() => action);
        setShowLeaveWarning(true);
      } else {
        action();
      }
    },
    [isFormDirty],
  );

  const tryCloseItemsModal = () => {
    const hasSelectedItems = Object.values(itemQtyMap).some(
      (q) => Number(q) > 0,
    );
    if (hasSelectedItems) {
      setPendingCloseAction(() => () => {
        setIsItemsModalOpen(false);
        setItemQtyMap({});
        setItemPriceMap({});
      });
      setShowLeaveWarning(true);
    } else {
      setIsItemsModalOpen(false);
    }
  };

  const resetForm = () => {
    setCustomerName("");
    setCustomerPhone("");
    setCustomerAddress("");
    setCart([]);
    setAdditionalItems([]);
    setPaymentMode("cash");
    setAmountReceived("");
    setRoundOff(false);
    setPaymentStatus("paid");
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  // Grand total calculations
  const rawTotal =
    cart.reduce((acc, item) => acc + item.quantity * item.sellingPrice, 0) +
    additionalItems.reduce((acc, item) => acc + (Number(item.price) || 0), 0);
  const roundOffAmount = roundOff ? Math.round(rawTotal) - rawTotal : 0;
  const grandTotal = rawTotal + roundOffAmount;
  const changeAmount =
    amountReceived !== "" ? Number(amountReceived) - grandTotal : null;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [salesRes, productsRes] = await Promise.all([
        axios.get("/api/transactions/sales", {
          headers: { Authorization: `Bearer ${user?.token}` },
        }),
        axios.get("/api/inventory", {
          headers: { Authorization: `Bearer ${user?.token}` },
        }),
      ]);
      setSales(salesRes.data);
      setProducts(productsRes.data);
    } catch (err) {
      showToast("Error loading data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppShare = (sale: any) => {
    if (!sale) return;
    const storeName = user?.companyName || "BuildMate ERP";
    const total = (sale.totalAmount || 0).toLocaleString();
    const publicLink = `${window.location.origin}/public-invoice/${sale._id}`;
    const message = `Hello ${sale.customerName || "Customer"}, thank you for shopping at *${storeName}*! Your invoice ${sale.invoiceNumber} for *₹${total}* is ready. View it here: ${publicLink}`;
    window.open(
      `https://wa.me/${sale.customerPhone ? sale.customerPhone.replace(/\D/g, "") : ""}?text=${encodeURIComponent(message)}`,
      "_blank",
    );
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (cart.length === 0) {
      showToast("Add at least one item to cart", "error");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await axios.post(
        "/api/transactions/sales",
        {
          customerName,
          customerPhone,
          customerAddress,
          items: cart.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unit: i.unit,
            conversionFactor: i.conversionFactor,
            sellingPrice: i.sellingPrice,
          })),
          additionalItems: additionalItems.map((i) => ({
            name: i.name,
            price: Number(i.price),
          })),
          paymentMode,
          date,
          status: paymentStatus,
          amountPaid: Number(amountReceived) || 0,
          roundOffAmount: roundOffAmount,
        },
        { headers: { Authorization: `Bearer ${user?.token}` } },
      );

      const newSale = response.data;
      showToast("Sale recorded successfully!", "success");
      if (autoPrint && newSale) {
        setPrintData(newSale);
        setTimeout(() => window.print(), 500);
      }
      setIsModalOpen(false);
      fetchData();
      resetForm();
    } catch (err: any) {
      showToast(
        err.response?.data?.message || "Error processing sale",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScan = useCallback(
    (code: string) => {
      const trimmedCode = code.trim();
      if (!trimmedCode) return;
      const matches = products.filter((p) => p.barcode === trimmedCode);
      if (matches.length === 0) {
        showToast(`Product with barcode ${trimmedCode} not found`, "error");
        return;
      }
      if (matches.length === 1) {
        const product = matches[0]!;
        setCart((prev) => [
          ...prev,
          {
            productId: product._id!,
            name: product.name,
            quantity: 1,
            sellingPrice: product.pricePerUnit,
            unit: product.unit,
            conversionFactor: 1,
          },
        ]);
        showToast(`${product.name} added to bill`, "success");
        setIsScannerOpen(false);
        setHwScannerInput("");
      } else {
        setMatchingProducts(matches);
        setIsScannerOpen(false);
      }
    },
    [products, showToast],
  );

  // Item modal handlers
  const filteredItems = products.filter(
    (p) =>
      p.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
      (p.barcode && p.barcode.includes(itemSearch)),
  );

  const addItemsFromModal = () => {
    const newItems: CartItem[] = [];
    Object.entries(itemQtyMap).forEach(([productId, qty]) => {
      if (Number(qty) > 0) {
        const product = products.find((p) => p._id === productId);
        if (product) {
          const price = Number(itemPriceMap[productId]) || product.pricePerUnit;
          newItems.push({
            productId,
            name: product.name,
            quantity: Number(qty),
            sellingPrice: price,
            unit: product.unit,
            conversionFactor: 1,
          });
        }
      }
    });
    if (newItems.length === 0) {
      showToast("Set quantity for at least one item", "error");
      return;
    }
    setCart((prev) => [...prev, ...newItems]);
    setItemQtyMap({});
    setItemPriceMap({});
    setItemSearch("");
    setIsItemsModalOpen(false);
  };

  // Filtered Sales
  const filteredSales = sales.filter((sale) => {
    const matchesSearch =
      sale.customerName.toLowerCase().includes(filterSearch.toLowerCase()) ||
      sale.invoiceNumber.toLowerCase().includes(filterSearch.toLowerCase()) ||
      (sale.customerPhone && sale.customerPhone.includes(filterSearch));
    const saleDate = new Date(sale.date).setHours(0, 0, 0, 0);
    const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
    const end = endDate ? new Date(endDate).setHours(0, 0, 0, 0) : null;
    return (
      matchesSearch &&
      (!start || saleDate >= start) &&
      (!end || saleDate <= end)
    );
  });

  // Summary metrics
  const totalSales = filteredSales.reduce(
    (a, s) => a + (s.totalAmount || 0),
    0,
  );
  const totalPaid = filteredSales
    .filter((s) => s.status === "paid")
    .reduce((a, s) => a + (s.totalAmount || 0), 0);
  const totalUnpaid = filteredSales
    .filter((s) => s.status === "pending")
    .reduce((a, s) => a + (s.totalAmount || 0), 0);
  const totalNetProfit = filteredSales.reduce((a, s) => {
    const cost = (s.items || []).reduce((acc, item) => {
      const factor = item.conversionFactor || 1;
      return acc + item.purchasePriceAtTime * (item.quantity / factor);
    }, 0);
    return a + (s.totalAmount - cost);
  }, 0);

  // Export PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Sales Report — ${user?.companyName || "Business"}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), "dd MMM yyyy HH:mm")}`, 14, 28);
    const rows = filteredSales.map((sale) => {
      const cost = (sale.items || []).reduce(
        (acc, item) =>
          acc +
          item.purchasePriceAtTime *
            (item.quantity / (item.conversionFactor || 1)),
        0,
      );
      const profit = sale.totalAmount - cost;
      const margin =
        sale.totalAmount > 0
          ? ((profit / sale.totalAmount) * 100).toFixed(1)
          : "0";
      return [
        format(new Date(sale.date), "dd MMM yy"),
        sale.invoiceNumber,
        sale.customerName,
        `Rs.${(sale.totalAmount || 0).toFixed(0)}`,
        `Rs.${cost.toFixed(0)}`,
        `Rs.${profit.toFixed(0)}`,
        `${margin}%`,
        sale.status.toUpperCase(),
      ];
    });
    autoTable(doc, {
      head: [
        [
          "Date",
          "Invoice#",
          "Customer",
          "Sale",
          "Cost",
          "Profit",
          "Margin",
          "Status",
        ],
      ],
      body: rows,
      startY: 35,
    });
    doc.save(`Sales_Report_${format(new Date(), "yyyyMMdd")}.pdf`);
    showToast("PDF exported!", "success");
  };

  // Export Excel
  const exportExcel = () => {
    const rows = filteredSales.map((sale) => {
      const cost = (sale.items || []).reduce(
        (acc, item) =>
          acc +
          item.purchasePriceAtTime *
            (item.quantity / (item.conversionFactor || 1)),
        0,
      );
      const profit = sale.totalAmount - cost;
      const margin =
        sale.totalAmount > 0
          ? ((profit / sale.totalAmount) * 100).toFixed(1)
          : "0";
      return {
        Date: format(new Date(sale.date), "dd MMM yyyy"),
        "Invoice#": sale.invoiceNumber,
        Customer: sale.customerName,
        Phone: sale.customerPhone || "",
        "Sale Amount": sale.totalAmount,
        "Cost Price": Number(cost.toFixed(2)),
        "Net Profit": Number(profit.toFixed(2)),
        "Margin %": `${margin}%`,
        Status: sale.status,
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales");
    XLSX.writeFile(wb, `Sales_Report_${format(new Date(), "yyyyMMdd")}.xlsx`);
    showToast("Excel exported!", "success");
  };

  const handleCustomerSelect = (customer: Customer) => {
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone);
    setCustomerAddress(customer.address || "");
  };
  const handleAddNewCustomer = (query: string) => {
    if (/^\d{10}$/.test(query)) {
      setCustomerPhone(query);
      setCustomerName("");
    } else {
      setCustomerName(query);
      setCustomerPhone("");
    }
    setCustomerAddress("");
    setIsNewCustomerModalOpen(true);
  };

  if (loading) return <Skeleton count={5} />;

  return (
    <div className="space-y-6">
      {/* Leave Warning Modal */}
      {showLeaveWarning && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 animate-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">
                  Unsaved Sale Data
                </h3>
                <p className="text-sm text-slate-500">
                  You have items in your cart. Are you sure you want to leave?
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowLeaveWarning(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
              >
                Stay
              </button>
              <button
                onClick={() => {
                  setShowLeaveWarning(false);
                  if (pendingCloseAction) {
                    pendingCloseAction();
                    setPendingCloseAction(null);
                  }
                }}
                className="flex-1 py-3 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-rose-700 transition-all"
              >
                Leave Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {t("billing.sale_title")}
          </h1>
          <p className="text-slate-500">
            Track and generate invoices for product sales
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportPDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-primary-50 hover:border-primary-200 hover:text-primary-600 transition-all shadow-sm"
          >
            <Download size={16} /> PDF
          </button>
          <button
            onClick={exportExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 transition-all shadow-sm"
          >
            <FileSpreadsheet size={16} /> Excel
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} /> New Sale
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          title="Total Sales"
          value={`₹${totalSales.toLocaleString()}`}
          sub={`${filteredSales.length} invoices`}
          color="purple"
        />
        <SummaryCard
          title="Total Paid"
          value={`₹${totalPaid.toLocaleString()}`}
          sub={`${filteredSales.filter((s) => s.status === "paid").length} invoices`}
          color="emerald"
        />
        <SummaryCard
          title="Total Unpaid"
          value={`₹${totalUnpaid.toLocaleString()}`}
          sub={`${filteredSales.filter((s) => s.status === "pending").length} invoices`}
          color="rose"
        />
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="md:col-span-1">
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
            Search Invoice / Customer
          </label>
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
              size={18}
            />
            <input
              type="text"
              className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-primary-500 transition-all"
              placeholder="Name, Phone, Invoice..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
            From Date
          </label>
          <input
            type="date"
            className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-primary-500 transition-all"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
            To Date
          </label>
          <input
            type="date"
            className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-primary-500 transition-all"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {/* Net Profit summary bar */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-white shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/10 rounded-2xl">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Net Profit (Filtered)
            </p>
            <p
              className={`text-2xl font-black tracking-tight ${totalNetProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}
            >
              {totalNetProfit >= 0 ? "+" : ""}₹
              {Math.abs(totalNetProfit).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6 text-right">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">
              Margin
            </p>
            <p className="text-xl font-black text-white">
              {totalSales > 0
                ? ((totalNetProfit / totalSales) * 100).toFixed(1)
                : 0}
              %
            </p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">
              Invoices
            </p>
            <p className="text-xl font-black text-white">
              {filteredSales.length}
            </p>
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">
                  {t("common.date")}
                </th>
                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">
                  {t("billing.customer")}
                </th>
                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">
                  Total MRP
                </th>
                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">
                  Sale Price
                </th>
                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">
                  Cost Price
                </th>
                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">
                  Profit
                </th>
                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">
                  Margin %
                </th>
                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">
                  Items
                </th>
                <th className="px-6 py-4 text-right pr-10 text-xs font-black uppercase text-slate-400 tracking-widest">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredSales.map((sale) => {
                const totalMrp = (sale.items || []).reduce((acc, item) => {
                  const factor = item.conversionFactor || 1;
                  return acc + item.mrpAtTime * (item.quantity / factor);
                }, 0);
                const totalCost = (sale.items || []).reduce((acc, item) => {
                  const factor = item.conversionFactor || 1;
                  return (
                    acc + item.purchasePriceAtTime * (item.quantity / factor)
                  );
                }, 0);
                const profit = (sale.totalAmount || 0) - totalCost;
                const profitPerc =
                  (sale.totalAmount || 0) > 0
                    ? (profit / sale.totalAmount) * 100
                    : 0;
                return (
                  <tr
                    key={sale._id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {format(new Date(sale.date), "dd MMM yyyy")}
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                        #{sale.invoiceNumber}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">
                        {sale.customerName}
                      </p>
                      {sale.customerPhone && (
                        <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                          <Phone size={10} /> {sale.customerPhone}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">
                        ₹{(totalMrp || 0).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Total MRP
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-black text-primary-700">
                        ₹{(sale.totalAmount || 0).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Sale Price
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-600">
                        ₹{(totalCost || 0).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Cost Price
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div
                        className={`flex items-center gap-1 font-black ${profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                      >
                        {profit >= 0 ? (
                          <TrendingUp size={14} />
                        ) : (
                          <TrendingDown size={14} />
                        )}
                        {profit >= 0 ? "+" : ""}₹
                        {Math.abs(profit).toLocaleString()}
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Net Profit
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p
                        className={`font-black uppercase tracking-widest text-xs ${profit >= 0 ? "text-emerald-500" : "text-rose-500"}`}
                      >
                        {profitPerc.toFixed(1)}%
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Margin
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                          <Barcode size={14} />
                        </div>
                        <p className="font-black text-slate-800 tracking-tight">
                          {(sale.items?.length || 0) +
                            (sale.additionalItems?.length || 0)}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                            <button
                                onClick={() => setPrintData(sale)}
                                className="group relative p-3 bg-primary-50 text-primary-600 hover:bg-primary-600 hover:text-white rounded-2xl transition-all shadow-sm active:scale-95"
                                title="View / Print Invoice"
                            >
                                <Receipt size={18} />
                                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">View Invoice</span>
                            </button>
                            <button
                                onClick={() => handleWhatsAppShare(sale)}
                                className="group relative p-3 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-2xl transition-all shadow-sm active:scale-95"
                                title="Share on WhatsApp"
                            >
                                <MessageCircle size={18} fill="currentColor" />
                                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">WhatsApp Share</span>
                            </button>
                        </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredSales.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Receipt className="text-slate-300" size={28} />
              </div>
              <p className="text-slate-500 font-medium">
                No sales found for this period
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Sale Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 animate-in fade-in zoom-in duration-200 h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h2 className="text-2xl font-black text-slate-800 tracking-tighter">
                Record New Sale
              </h2>
              <button
                onClick={() => tryClose(closeModal)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all"
              >
                &times;
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5 flex-1 overflow-y-auto pr-2 custom-scrollbar"
            >
              {/* Customer Section */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400">
                      {t("billing.customer")}
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsNewCustomerModalOpen(true)}
                      className="text-[10px] font-black uppercase tracking-widest text-primary-600 hover:text-primary-700 flex items-center gap-1"
                    >
                      <UserPlus size={12} /> Quick Add
                    </button>
                  </div>
                  <CustomerSearch
                    onSelect={handleCustomerSelect}
                    onAddNew={handleAddNewCustomer}
                    initialValue={customerName}
                  />
                  {customerPhone && (
                    <div className="mt-2 p-3 bg-primary-50 rounded-2xl border border-primary-100 flex items-center justify-between animate-in slide-in-from-top-1 duration-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white text-primary-600 rounded-lg flex items-center justify-center">
                          <User size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">
                            {customerName}
                          </p>
                          <p className="text-[10px] font-medium text-slate-400">
                            {customerPhone}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerName("");
                          setCustomerPhone("");
                          setCustomerAddress("");
                        }}
                        className="text-slate-300 hover:text-rose-500 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                    Invoice Date
                  </label>
                  <input
                    type="date"
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-800 focus:ring-2 focus:ring-primary-500 transition-all font-bold text-sm"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Barcode Scanner Area */}
              <div className="p-5 bg-gradient-to-br from-primary-50 to-white rounded-[2rem] space-y-4 border border-primary-100 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary-600">
                    Barcode Scanner
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-primary-600/10 text-primary-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-600 hover:text-white transition-all border border-primary-200"
                  >
                    <Scan size={14} /> Camera
                  </button>
                </div>
                <div className="relative">
                  <Barcode
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-400"
                    size={20}
                  />
                  <input
                    ref={scannerInputRef}
                    type="text"
                    placeholder="Scan barcode with machine..."
                    className="w-full bg-white border-2 border-primary-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all placeholder:font-medium"
                    value={hwScannerInput}
                    onChange={(e) => setHwScannerInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleScan(hwScannerInput);
                      }
                    }}
                  />
                </div>
              </div>

              {/* Add Items Button */}
              <button
                type="button"
                onClick={() => setIsItemsModalOpen(true)}
                className="w-full flex items-center justify-center gap-3 p-5 rounded-2xl bg-primary-600 text-white font-black uppercase tracking-widest text-sm hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 active:scale-[0.98]"
              >
                <ShoppingCart size={20} /> Add Items from Inventory
              </button>

              {/* Additional Charges Section (New) */}
              <div className="p-5 bg-amber-50 rounded-[2rem] border border-amber-100 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                  Additional Charges (Service/Delivery)
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Charge Name (e.g. Labour)"
                    className="flex-1 bg-white border border-amber-200 rounded-xl p-3 text-xs font-bold min-w-0"
                    value={newChargeName}
                    onChange={(e) => setNewChargeName(e.target.value)}
                  />
                  <div className="flex gap-2 sm:w-auto w-full">
                    <input
                      type="number"
                      placeholder="Amount"
                      className="flex-1 sm:w-24 bg-white border border-amber-200 rounded-xl p-3 text-xs font-bold"
                      value={newChargePrice}
                      onChange={(e) => setNewChargePrice(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newChargeName && newChargePrice) {
                          setAdditionalItems((prev) => [
                            ...prev,
                            { name: newChargeName, price: newChargePrice },
                          ]);
                          setNewChargeName("");
                          setNewChargePrice("");
                        }
                      }}
                      className="p-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 shrink-0"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Cart List */}
              {(cart.length > 0 || additionalItems.length > 0) && (
                <div className="space-y-2 border-y border-slate-100 py-4">
                  {cart.map((item, idx) => (
                    <div
                      key={`cart-${idx}`}
                      className="flex items-center justify-between text-sm bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary-50 text-primary-600 rounded-xl">
                          <Barcode size={16} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 tracking-tight">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                            {item.quantity} {item.unit} × ₹
                            {item.sellingPrice.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-black text-slate-800">
                          ₹
                          {(item.quantity * item.sellingPrice).toLocaleString()}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            setCart(cart.filter((_, i) => i !== idx))
                          }
                          className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {additionalItems.map((item, idx) => (
                    <div
                      key={`add-${idx}`}
                      className="flex items-center justify-between text-sm bg-amber-50/30 p-4 rounded-2xl border border-amber-100/50 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                          <IndianRupee size={16} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-amber-600 font-black uppercase tracking-widest">
                            Additional Charge
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-black text-slate-800">
                          ₹{Number(item.price).toLocaleString()}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            setAdditionalItems(
                              additionalItems.filter((_, i) => i !== idx),
                            )
                          }
                          className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Payment & totals Section */}
              <div className="space-y-4 p-5 bg-slate-50 rounded-3xl">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Payment Mode
                  </label>
                  <select
                    className="bg-white border border-slate-200 rounded-xl p-2 text-xs font-black uppercase text-slate-700"
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as any)}
                  >
                    <option value="cash">Cash</option>
                    <option value="credit">Credit</option>
                  </select>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={roundOff}
                      onChange={(e) => setRoundOff(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Round Off
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={paymentStatus === "paid"}
                      onChange={(e) =>
                        setPaymentStatus(e.target.checked ? "paid" : "pending")
                      }
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Mark as Paid
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoPrint}
                      onChange={(e) => setAutoPrint(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Auto-Print
                    </span>
                  </label>
                </div>

                {/* Grand Total */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Grand Total
                  </p>
                  <p className="text-3xl font-black text-primary-600 tracking-tighter">
                    ₹{grandTotal.toLocaleString()}
                  </p>
                </div>

                {/* Amount Received / Change Calculator */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Amount Received from Customer
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="number"
                      placeholder="e.g. 500"
                      className="flex-1 bg-white border border-slate-200 rounded-2xl p-3 text-sm font-bold focus:ring-2 focus:ring-primary-500 transition-all min-w-0"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setAmountReceived(grandTotal.toString())}
                      className="px-4 py-3 bg-primary-50 text-primary-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-100 transition-all border border-primary-200 whitespace-nowrap"
                    >
                      Exact Amount
                    </button>
                  </div>
                  {changeAmount !== null && (
                    <div
                      className={`flex items-center justify-between p-3 rounded-2xl ${changeAmount >= 0 ? "bg-emerald-50 border border-emerald-100" : "bg-rose-50 border border-rose-100"}`}
                    >
                      <p
                        className={`text-xs font-black uppercase tracking-widest ${changeAmount >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                      >
                        {changeAmount >= 0 ? "Change to Return" : "Balance Due"}
                      </p>
                      <p
                        className={`text-xl font-black ${changeAmount >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                      >
                        ₹{Math.abs(changeAmount).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit */}
              {!printData && (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-primary-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={24} className="animate-spin" />{" "}
                      Processing...
                    </>
                  ) : (
                    <>
                      <Receipt size={20} /> Complete Sale (₹
                      {grandTotal.toLocaleString()})
                    </>
                  )}
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Invoice Preview Modal (Success or Table Action) */}
      {printData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-0 md:p-10 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-5xl h-full md:h-[90vh] md:rounded-[3rem] shadow-2xl flex flex-col md:flex-row overflow-hidden border border-white/20">
            
            {/* Preview Area */}
            <div className="flex-1 bg-slate-50 p-4 md:p-8 overflow-y-auto custom-scrollbar flex flex-col items-center">
                <div className="md:hidden flex justify-between items-center w-full mb-4 px-2">
                     <h3 className="font-black text-slate-800 uppercase tracking-tighter text-lg">Invoice Preview</h3>
                     <button onClick={() => setPrintData(null)} className="p-2 bg-white rounded-full shadow-sm text-slate-400">
                        <X size={20} />
                     </button>
                </div>

              <div
                className={`bg-white shadow-2xl transition-all duration-500 overflow-visible ${invoiceFormat === "thermal" ? "rounded-2xl md:rounded-[2rem] p-6 md:p-10 max-w-[80mm] w-full" : "w-[210mm] min-h-[297mm] scale-[0.45] md:scale-[0.55] lg:scale-[0.75] origin-top mb-[-120px] md:mb-[-150px] lg:mb-[-100px]"}`}
              >
                {invoiceFormat === "thermal" ? (
                  <PrintableInvoice
                    sale={printData}
                    businessName={user?.companyName || "BuildMate ERP"}
                    ownerName={user?.name}
                    companyLogo={user?.logoUrl || (user?.tenantId as any)?.logoUrl}
                    companyEmail={user?.billingEmail || (user?.tenantId as any)?.billingEmail}
                    companyAddress={
                      user?.billingAddress || (user?.tenantId as any)?.billingAddress
                    }
                    companyPhone={user?.phone || (user?.tenantId as any)?.phone}
                    signature={user?.signature || (user?.tenantId as any)?.signature}
                    changeAmount={
                      changeAmount !== null && changeAmount > 0
                        ? changeAmount
                        : undefined
                    }
                    roundOffAmount={
                      printData?.roundOffAmount || roundOffAmount
                    }
                    isPreview={true}
                  />
                ) : (
                  <A4Invoice
                    sale={printData}
                    businessName={user?.companyName || "BuildMate ERP"}
                    ownerName={user?.name}
                    companyLogo={user?.logoUrl || (user?.tenantId as any)?.logoUrl}
                    companyEmail={user?.billingEmail || (user?.tenantId as any)?.billingEmail}
                    companyAddress={
                      user?.billingAddress || (user?.tenantId as any)?.billingAddress
                    }
                    companyPhone={user?.phone || (user?.tenantId as any)?.phone}
                    signature={user?.signature || (user?.tenantId as any)?.signature}
                    isPreview={true}
                  />
                )}
              </div>
              <style>{`
                @media print {
                    @page { size: ${invoiceFormat === "thermal" ? "80mm auto" : "A4"}; margin: ${invoiceFormat === "thermal" ? "0" : "15mm"}; }
                    body * { visibility: hidden !important; }
                    #${invoiceFormat === "thermal" ? "printable-invoice" : "a4-invoice"}, #${invoiceFormat === "thermal" ? "printable-invoice" : "a4-invoice"} * { visibility: visible !important; }
                    #${invoiceFormat === "thermal" ? "printable-invoice" : "a4-invoice"} { position: absolute; left: 0; top: 0; display: block !important; width: 100% !important; }
                }
              `}</style>
            </div>

            {/* Actions Side/Bottom Panel */}
            <div className="w-full md:w-[400px] bg-white p-8 md:p-12 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-100">
              <div className="hidden md:block">
                <div className="w-16 h-16 bg-primary-50 text-primary-600 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                  <Receipt size={32} />
                </div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-1">
                  Invoice Actions
                </h3>
                <p className="text-slate-400 font-medium mb-8 text-sm">
                  Managing Invoice #{printData.invoiceNumber}
                </p>
              </div>

                <div className="space-y-6">
                    {/* Format Switcher */}
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Print Format</label>
                        <div className="bg-slate-50 p-1.5 rounded-2xl flex gap-1.5">
                            <button
                                onClick={() => setInvoiceFormat("thermal")}
                                className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${invoiceFormat === "thermal" ? "bg-white text-primary-600 shadow-md" : "text-slate-400 hover:text-slate-600"}`}
                            >
                                Thermal (80mm)
                            </button>
                            <button
                                onClick={() => setInvoiceFormat("a4")}
                                className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${invoiceFormat === "a4" ? "bg-white text-primary-600 shadow-md" : "text-slate-400 hover:text-slate-600"}`}
                            >
                                A4 Standard
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="w-full py-4 bg-primary-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-primary-100 hover:bg-primary-700 transition-all flex items-center justify-center gap-3 active:scale-95"
                        >
                            <Printer size={18} /> Print Now
                        </button>
                        <button
                            type="button"
                            onClick={() => handleWhatsAppShare(printData)}
                            className="w-full py-4 bg-emerald-500 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-100 hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 active:scale-95"
                        >
                            <MessageCircle size={18} fill="currentColor" /> WhatsApp Share
                        </button>
                        <button
                            type="button"
                            onClick={() => generateInvoice(printData, user?.companyName || "Business", user?.name || "Admin")}
                            className="w-full py-4 bg-slate-50 text-slate-600 rounded-[1.5rem] font-black uppercase tracking-widest text-xs hover:bg-slate-100 transition-all flex items-center justify-center gap-3 border border-slate-200 shadow-sm"
                        >
                            <Download size={18} /> Download PDF
                        </button>
                    </div>
                </div>

              <button
                type="button"
                onClick={() => {
                  setPrintData(null);
                }}
                className="w-full py-4 text-slate-400 hover:text-rose-500 font-black uppercase tracking-[0.2em] text-[10px] transition-all mt-8"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Items Add Modal */}
      {isItemsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/55 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div
            className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col"
            style={{ maxHeight: "90vh" }}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={tryCloseItemsModal}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all"
                >
                  <ArrowLeft size={20} />
                </button>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">
                  Add Items to Bill
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="flex items-center gap-2 px-3 py-2 bg-primary-50 text-primary-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary-100 border border-primary-200"
              >
                <Scan size={14} /> Scan
              </button>
            </div>

            <div className="p-4 border-b border-slate-100 shrink-0">
              <div className="relative">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Search by Item / Barcode..."
                  className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-primary-500 transition-all"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10 bg-white border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      Item Name
                    </th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      Stock
                    </th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      MRP
                    </th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      Sale Price
                    </th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest w-28">
                      Qty
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredItems.map((p) => (
                    <tr
                      key={p._id}
                      className={`hover:bg-primary-50/30 transition-colors ${itemQtyMap[p._id!] && Number(itemQtyMap[p._id!]) > 0 ? "bg-emerald-50/30" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-800 text-sm">
                          {p.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                          {p.unit} · {p.batchNumber || "Default"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm font-black text-slate-600">
                        {Number(p.stock).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-slate-500">
                        ₹{p.mrp || 0}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          className="w-24 bg-white border border-slate-200 rounded-xl p-2 text-sm font-bold focus:ring-2 focus:ring-primary-500"
                          placeholder={p.pricePerUnit.toString()}
                          value={itemPriceMap[p._id!] || ""}
                          onChange={(e) =>
                            setItemPriceMap((prev) => ({
                              ...prev,
                              [p._id!]: e.target.value,
                            }))
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        {(!itemQtyMap[p._id!] || Number(itemQtyMap[p._id!]) === 0) ? (
                          <button
                            onClick={() => {
                              setItemQtyMap(prev => ({ ...prev, [p._id!]: "1" }));
                              setItemPriceMap(prev => ({ ...prev, [p._id!]: p.pricePerUnit.toString() }));
                              setItemSearch(""); // Auto-clear search on add as requested
                            }}
                            className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary-700 shadow-lg shadow-primary-100 transition-all active:scale-95"
                          >
                            <Plus size={14} /> Add
                          </button>
                        ) : (
                          <div className="flex items-center bg-emerald-50 rounded-xl p-1 border border-emerald-100 w-fit">
                            <button
                              onClick={() => setItemQtyMap(prev => ({ ...prev, [p._id!]: Math.max(0, Number(prev[p._id!]) - 1).toString() }))}
                              className="w-8 h-8 flex items-center justify-center bg-white text-emerald-600 rounded-lg shadow-sm hover:bg-emerald-100 transition-all"
                            >
                              -
                            </button>
                            <span className="w-10 text-center font-black text-emerald-700 text-sm">
                              {itemQtyMap[p._id!]}
                            </span>
                            <button
                              onClick={() => {
                                const current = Number(itemQtyMap[p._id!]);
                                if (current < p.stock) {
                                  setItemQtyMap(prev => ({ ...prev, [p._id!]: (current + 1).toString() }));
                                  setItemSearch(""); // Keep clearing search on increment to stay fast
                                } else {
                                  showToast(`Max stock reached: ${p.stock}`, 'error');
                                }
                              }}
                              className="w-8 h-8 flex items-center justify-center bg-primary-600 text-white rounded-lg shadow-sm hover:bg-primary-700 transition-all"
                            >
                              +
                            </button>
                          </div>
                        )}
                        {Number(itemQtyMap[p._id!] || 0) > p.stock && (
                          <p className="text-[10px] font-black text-rose-600 uppercase tracking-tight mt-1 ml-1">
                            Exceeds Stock
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredItems.length === 0 && (
                <div className="text-center py-16">
                  <ShoppingCart
                    className="text-slate-200 mx-auto mb-3"
                    size={40}
                  />
                  <p className="text-slate-400 font-medium">No items found</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-4 shrink-0">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                {Object.values(itemQtyMap).filter((q) => Number(q) > 0).length}{" "}
                item(s) selected
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={tryCloseItemsModal}
                  className="px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={products.some(
                    (p) => Number(itemQtyMap[p._id!] || 0) > p.stock,
                  )}
                  onClick={addItemsFromModal}
                  className="px-8 py-3 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 active:scale-[0.98] disabled:bg-slate-300 disabled:shadow-none"
                >
                  Add Items to Bill
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Customer Modal */}
      {isNewCustomerModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-end justify-center sm:items-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl p-8 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center">
                  <UserPlus size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">
                    New Customer
                  </h3>
                  <p className="text-slate-500 text-xs font-medium">
                    Add to your business contacts
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNewCustomerModalOpen(false)}
                className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-rose-50 hover:text-rose-600 transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 px-1">
                  Full Name
                </label>
                <div className="relative">
                  <User
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                    size={18}
                  />
                  <input
                    type="text"
                    className="w-full bg-slate-50 border-none rounded-[1.5rem] py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-primary-500 transition-all"
                    placeholder="Enter customer name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 px-1">
                  Mobile Number
                </label>
                <div className="relative">
                  <Phone
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                    size={18}
                  />
                  <input
                    type="text"
                    className="w-full bg-slate-50 border-none rounded-[1.5rem] py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-primary-500 transition-all"
                    placeholder="10-digit mobile number"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    maxLength={10}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 px-1">
                  Address (Optional)
                </label>
                <div className="relative">
                  <MapPin
                    className="absolute left-4 top-4 text-slate-300"
                    size={18}
                  />
                  <textarea
                    className="w-full bg-slate-50 border-none rounded-[1.5rem] py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-primary-500 transition-all min-h-[100px]"
                    placeholder="Customer location/address"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                  />
                </div>
              </div>
              <button
                onClick={() => setIsNewCustomerModalOpen(false)}
                className="w-full py-5 bg-primary-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all mt-4"
              >
                Done & Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {isScannerOpen && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setIsScannerOpen(false)}
        />
      )}

      {/* Batch Selection Modal */}
      {matchingProducts.length > 0 && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[115] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in duration-200 border border-white/20">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <Filter size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">
                Select Batch
              </h3>
              <p className="text-slate-500 text-sm font-medium">
                Multiple batches found for this barcode
              </p>
            </div>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {matchingProducts.map((p) => (
                <button
                  key={p._id}
                  type="button"
                  onClick={() => {
                    setCart((prev) => [
                      ...prev,
                      {
                        productId: p._id!,
                        name: p.name,
                        quantity: 1,
                        sellingPrice: p.pricePerUnit,
                        unit: p.unit,
                        conversionFactor: 1,
                      },
                    ]);
                    showToast(`${p.name} added to bill`, "success");
                    setMatchingProducts([]);
                    setHwScannerInput("");
                  }}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-primary-50 hover:border-primary-200 border-2 border-transparent transition-all group"
                >
                  <div className="text-left">
                    <p className="font-bold text-slate-800 group-hover:text-primary-700">
                      {p.name}
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Batch: {p.batchNumber || "Default"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-primary-600">
                      ₹{p.pricePerUnit.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Stock: {Number(p.stock).toFixed(2)} {p.unit}
                    </p>
                  </div>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setMatchingProducts([])}
              className="w-full mt-6 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <PrintableInvoice
        sale={printData}
        businessName={user?.companyName || "BuildMate ERP"}
        ownerName={user?.name}
        companyLogo={(user?.tenantId as any)?.logoUrl}
        companyEmail={(user?.tenantId as any)?.billingEmail}
        companyAddress={(user?.tenantId as any)?.billingAddress}
        companyPhone={(user?.tenantId as any)?.phone}
        signature={(user?.tenantId as any)?.signature}
        changeAmount={
          changeAmount !== null && changeAmount > 0 ? changeAmount : undefined
        }
        roundOffAmount={roundOffAmount !== 0 ? roundOffAmount : undefined}
      />
    </div>
  );
};

export default Sales;
