import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Box,
  Edit2,
  Trash2,
  Barcode,
  Scan,
  Loader2,
  RefreshCw,
  AlertCircle,
  FileSpreadsheet,
  Filter,
  ArrowUpDown,
  X,
} from "lucide-react";
import BarcodeScanner from "../components/BarcodeScanner";
import JsBarcode from "jsbarcode";
import axios from "axios";
import type { Product } from "../types";
import { useAuth } from "../context/AuthContext";
import { InventorySkeleton } from "../components/Skeleton";
import { useToast } from "../context/ToastContext";
import BarcodeLabel from "../components/BarcodeLabel";
import BulkUploadModal from "../components/BulkUploadModal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  ChevronDown,
  Download,
  FileText,
  Table as TableIcon,
} from "lucide-react";
import { format } from "date-fns";

const UNIT_GROUPS = {
  weight: ["kg", "gm", "ton", "bag", "bundle", "pack"],
  volume: ["litre", "ml"],
  count: ["nos", "piece", "box", "dozen", "unit"],
  length: ["meter", "ft", "inch"],
  area: ["sqft", "sqmtr"],
};

const ALL_UNITS = Object.values(UNIT_GROUPS).flat();

const Inventory = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // 1. Fetching logic with useQuery
  const {
    data: products = [],
    isLoading: loading,
    isRefetching: refreshing,
  } = useQuery<Product[]>({
    queryKey: ["inventory"],
    queryFn: async () => {
      const res = await axios.get<Product[]>("/api/inventory", {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      return res.data;
    },
    enabled: !!user?.token,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    unit: string;
    stock: string;
    minStockAlert: string;
    pricePerUnit: string;
    purchasePrice: string;
    mrp: string;
    barcode: string;
    batchNumber: string;
  }>({
    name: "",
    unit: "piece",
    stock: "0",
    minStockAlert: "1",
    pricePerUnit: "",
    purchasePrice: "",
    mrp: "",
    barcode: "",
    batchNumber: "",
  });
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const [isContinuousMode, setIsContinuousMode] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "low" | "out">("all");
  const [sortBy, setSortBy] = useState<
    "name" | "price-asc" | "price-desc" | "stock-asc" | "stock-desc"
  >("name");
  const [printLabelData, setPrintLabelData] = useState<Product | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<"add" | "reduce">("add");
  const [adjustmentValue, setAdjustmentValue] = useState("");
  const barcodePreviewRef = useRef<SVGSVGElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const isFormDirty = !!(
    formData.name ||
    formData.barcode ||
    formData.pricePerUnit
  );

  const tryClose = () => {
    if (isFormDirty) {
      setShowLeaveWarning(true);
    } else {
      closeModal();
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      name: "",
      unit: "piece",
      stock: "0",
      minStockAlert: "1",
      pricePerUnit: "",
      purchasePrice: "",
      mrp: "",
      barcode: "",
      batchNumber: "",
    });
    setAdjustmentType("add");
    setAdjustmentValue("");
  };

  const generateBarcode = () => {
    const code = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    setFormData((prev) => ({ ...prev, barcode: code }));
  };

  // 2. Mutations
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingId) {
        return axios.put(`/api/inventory/${editingId}`, data, {
          headers: { Authorization: `Bearer ${user?.token}` },
        });
      } else {
        return axios.post("/api/inventory", data, {
          headers: { Authorization: `Bearer ${user?.token}` },
        });
      }
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      if (editingId) {
        showToast(t("inventory.product_updated"), "success");
      } else {
        if (res.data.message_type === "updated") {
          showToast(t("inventory.merged_success"), "success");
        } else {
          showToast(t("inventory.added_success"), "success");
        }
      }

      if (isContinuousMode && !editingId) {
        setFormData({
          name: "",
          unit: "piece",
          stock: "0",
          minStockAlert: "1",
          pricePerUnit: "",
          purchasePrice: "",
          mrp: "",
          barcode: "",
          batchNumber: "",
        });
        setTimeout(() => nameInputRef.current?.focus(), 100);
      } else {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({
          name: "",
          unit: "piece",
          stock: "0",
          minStockAlert: "1",
          pricePerUnit: "",
          purchasePrice: "",
          mrp: "",
          barcode: "",
          batchNumber: "",
        });
      }
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || t("common.error"), "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return axios.delete(`/api/inventory/${id}`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      showToast(t("inventory.deleted_success"), "success");
    },
    onError: () => {
      showToast(t("common.error"), "error");
    },
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("common.confirm_delete_product"))) return;
    deleteMutation.mutate(id);
  };

  const handleEdit = (product: Product) => {
    setEditingId(product._id || null);
    setFormData({
      name: product.name,
      unit: product.unit,
      stock: product.stock.toString(),
      minStockAlert: product.minStockAlert.toString(),
      pricePerUnit: product.pricePerUnit.toString(),
      purchasePrice: product.purchasePrice.toString(),
      mrp: product.mrp.toString(),
      barcode: product.barcode || "",
      batchNumber: product.batchNumber || "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalStock = Number(formData.stock);
    if (editingId && adjustmentValue) {
      const adj = Number(adjustmentValue);
      finalStock =
        adjustmentType === "add" ? finalStock + adj : finalStock - adj;
    }

    const data = {
      ...formData,
      stock: finalStock,
      minStockAlert: Number(formData.minStockAlert),
      pricePerUnit: Number(formData.pricePerUnit),
      purchasePrice: Number(formData.purchasePrice),
      mrp: Number(formData.mrp),
      barcode: formData.barcode,
      batchNumber: formData.batchNumber,
    };
    saveMutation.mutate(data);
  };

  const filteredProducts = products
    .filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchTerm));

      if (filterType === "low")
        return matchesSearch && p.stock <= p.minStockAlert && p.stock > 0;
      if (filterType === "out") return matchesSearch && p.stock <= 0;
      return matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "price-asc") return a.pricePerUnit - b.pricePerUnit;
      if (sortBy === "price-desc") return b.pricePerUnit - a.pricePerUnit;
      if (sortBy === "stock-asc") return a.stock - b.stock;
      if (sortBy === "stock-desc") return b.stock - a.stock;
      return a.name.localeCompare(b.name);
    });

  const handleScan = React.useCallback(
    (code: string) => {
      setFormData((prev) => ({ ...prev, barcode: code }));
      setIsScannerOpen(false);
      showToast(t("inventory.scanned", { code }), "success");
    },
    [showToast],
  );

  // Summary Calculations
  const totalItems = products.length;
  const totalStockValue = products.reduce(
    (sum, p) => sum + Number(p.stock) * Number(p.pricePerUnit),
    0,
  );

  const exportToCSV = () => {
    const headers = [
      "Product Name",
      "Item Code",
      "MRP",
      "Purchase Price",
      "Selling Price",
      "Stock Qty",
      "Stock Value",
    ];

    const escapeCSV = (val: any) => {
      const str = String(val === null || val === undefined ? "" : val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = products.map((p) => [
      p.name,
      p.barcode || "",
      p.mrp || 0,
      p.purchasePrice,
      p.pricePerUnit,
      p.stock,
      (Number(p.stock) * Number(p.pricePerUnit)).toFixed(2),
    ]);

    const csvContent = [
      `Company: ${escapeCSV(user?.companyName || "BuildMate ERP")}`,
      `Date: ${format(new Date(), "dd-MMM-yyyy")}`,
      `Total Items: ${totalItems}`,
      `Total Stock Value: Rs. ${totalStockValue.toLocaleString()}`,
      "",
      headers.map(escapeCSV).join(","),
      ...rows.map((r) => r.map(escapeCSV).join(",")),
    ].join("\n");

    // Add BOM for Excel UTF-8 compatibility
    const blob = new Blob(["\uFEFF", csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Inventory_Report_${format(new Date(), "yyyy-MM-dd")}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportOpen(false);
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // 1. Create worksheet starting with Summary Info
    const ws = XLSX.utils.aoa_to_sheet([
      ["Company:", user?.companyName || "BuildMate ERP"],
      ["Report Date:", format(new Date(), "dd-MMM-yyyy HH:mm")],
      ["Total Items:", totalItems],
      ["Total Stock Value:", `Rs. ${totalStockValue.toLocaleString()}`],
      [], // Empty spacing row
    ]);

    // 2. Prepare Table Data
    const tableData = products.map((p) => ({
      "Product Name": p.name,
      "Item Code": p.barcode || "",
      MRP: p.mrp || 0,
      "Purchase Price": p.purchasePrice,
      "Selling Price": p.pricePerUnit,
      "Stock Qty": p.stock,
      "Stock Value": Number(
        (Number(p.stock) * Number(p.pricePerUnit)).toFixed(2),
      ),
    }));

    // 3. Add Table JSON starting from A6
    XLSX.utils.sheet_add_json(ws, tableData, { origin: "A6" });

    // 4. Adjust Column Widths
    const wscols = [
      { wch: 35 }, // Product Name
      { wch: 20 }, // Item Code
      { wch: 10 }, // MRP
      { wch: 15 }, // Purchase Price
      { wch: 15 }, // Selling Price
      { wch: 12 }, // Stock Qty
      { wch: 18 }, // Stock Value
    ];
    ws["!cols"] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(
      wb,
      `Inventory_Report_${format(new Date(), "yyyy-MM-dd")}.xlsx`,
    );
    setIsExportOpen(false);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text(user?.companyName || "BuildMate ERP", 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-400
    doc.text(
      `Inventory Status Report | Generated: ${format(new Date(), "dd-MMM-yyyy HH:mm")}`,
      14,
      28,
    );

    // Summary Cards
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(241, 245, 249); // slate-100
    doc.roundedRect(14, 35, 80, 25, 3, 3, "FD");
    doc.roundedRect(105, 35, 91, 25, 3, 3, "FD");

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("TOTAL ITEMS", 20, 42);
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text(totalItems.toString(), 20, 52);

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("TOTAL STOCK VALUE", 111, 42);
    doc.setFontSize(14);
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text(`Rs. ${totalStockValue.toLocaleString()}`, 111, 52);

    // Table
    autoTable(doc, {
      startY: 70,
      head: [
        ["Product Name", "Item Code", "MRP", "Cost", "Price", "Qty", "Value"],
      ],
      body: products.map((p) => [
        p.name,
        p.barcode || "-",
        (p.mrp || 0).toFixed(2),
        p.purchasePrice.toFixed(2),
        p.pricePerUnit.toFixed(2),
        p.stock.toString(),
        (Number(p.stock) * Number(p.pricePerUnit)).toFixed(2),
      ]),
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246], fontSize: 9, fontStyle: "bold" },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: "auto" },
        6: { halign: "right", fontStyle: "bold" },
      },
    });

    doc.save(`Inventory_Report_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    setIsExportOpen(false);
  };

  if (loading) return <InventorySkeleton />;

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
                  {t("inventory.unsaved_changes")}
                </h3>
                <p className="text-sm text-slate-500">
                  {t("inventory.unsaved_changes_desc")}
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowLeaveWarning(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
              >
                {t("inventory.stay")}
              </button>
              <button
                onClick={() => {
                  setShowLeaveWarning(false);
                  closeModal();
                }}
                className="flex-1 py-3 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-rose-700 transition-all"
              >
                {t("inventory.leave_anyway")}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {t("inventory.title")}
          </h1>
          <p className="text-slate-500">{t("inventory.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
            >
              <Download size={18} /> {t("inventory.export")}{" "}
              <ChevronDown size={14} />
            </button>

            {isExportOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                <button
                  onClick={exportToPDF}
                  className="w-full px-4 py-3 text-left text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3"
                >
                  <FileText size={16} className="text-rose-500" />{" "}
                  {t("inventory.download_pdf")}
                </button>
                <button
                  onClick={exportToExcel}
                  className="w-full px-4 py-3 text-left text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3"
                >
                  <TableIcon size={16} className="text-emerald-500" />{" "}
                  {t("inventory.download_excel")}
                </button>
                <button
                  onClick={exportToCSV}
                  className="w-full px-4 py-3 text-left text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3"
                >
                  <FileSpreadsheet size={16} className="text-blue-500" />{" "}
                  {t("inventory.download_csv")}
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              if (user?.planType === "free" || user?.planType === "basic") {
                showToast(
                  "Bulk Upload is only available in Business Pro plan.",
                  "error",
                );
                navigate("/dashboard/pricing");
              } else {
                setIsBulkModalOpen(true);
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-primary-50 hover:border-primary-200 hover:text-primary-600 transition-all shadow-sm"
          >
            <FileSpreadsheet size={18} /> {t("inventory.bulk_upload")}
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            {t("inventory.add_product")}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <Box size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {t("common.total")} {t("common.items")}
            </p>
            <h4 className="text-2xl font-black text-slate-800">
              {totalItems}{" "}
              <span className="text-sm font-medium text-slate-400">
                {t("common.products")}
              </span>
            </h4>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
            <div className="text-xl font-black italic">₹</div>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {t("common.stock_value")}
            </p>
            <h4 className="text-2xl font-black text-emerald-600">
              ₹{totalStockValue.toLocaleString()}
            </h4>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 flex items-center relative bg-white rounded-2xl border border-slate-100 shadow-sm focus-within:ring-2 focus-within:ring-primary-500 transition-all">
          <Search className="absolute left-4 text-slate-400" size={20} />
          <input
            type="text"
            placeholder={t("inventory.search_placeholder")}
            className="w-full bg-transparent !border-none py-4 pl-12 pr-4 !outline-none !focus:ring-0 text-slate-800 font-bold placeholder:font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-4 p-1.5 bg-slate-100 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Filter Dropdown */}
          <div className="relative group">
            <select
              value={filterType}
              onChange={(e) =>
                setFilterType(e.target.value as typeof filterType)
              }
              className="appearance-none pl-10 pr-10 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold text-slate-600 focus:ring-2 focus:ring-primary-500 outline-none shadow-sm cursor-pointer min-w-[160px]"
            >
              <option value="all">{t("inventory.filter_all")}</option>
              <option value="low">{t("inventory.filter_low")}</option>
              <option value="out">{t("inventory.filter_out")}</option>
            </select>
            <Filter
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              size={18}
            />
            <ChevronDown
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"
              size={16}
            />
          </div>

          {/* Sort Dropdown */}
          <div className="relative group">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="appearance-none pl-10 pr-10 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold text-slate-600 focus:ring-2 focus:ring-primary-500 outline-none shadow-sm cursor-pointer min-w-[180px]"
            >
              <option value="name">{t("inventory.sort_name")}</option>
              <option value="price-asc">{t("inventory.sort_price_asc")}</option>
              <option value="price-desc">
                {t("inventory.sort_price_desc")}
              </option>
              <option value="stock-asc">{t("inventory.sort_stock_asc")}</option>
              <option value="stock-desc">
                {t("inventory.sort_stock_desc")}
              </option>
            </select>
            <ArrowUpDown
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              size={18}
            />
            <ChevronDown
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"
              size={16}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => {
          const isLowStock = product.stock <= product.minStockAlert;
          return (
            <div
              key={product._id}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`p-3 rounded-xl ${isLowStock ? "bg-rose-50 text-rose-600" : "bg-primary-50 text-primary-600"}`}
                >
                  <Box size={24} />
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(product)}
                    className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                    title="Edit Product"
                  >
                    <Edit2 size={16} />
                  </button>
                  {product.barcode && (
                    <button
                      onClick={() => {
                        setPrintLabelData(product);
                        setTimeout(() => window.print(), 100);
                      }}
                      className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                      title="Print Barcode Sticker"
                    >
                      <Barcode size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(product._id!)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                    title="Delete Product"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-800 mb-1">
                {product.name}
              </h3>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-slate-500 uppercase font-black tracking-widest">
                  {product.unit}
                </span>
                {product.barcode && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-md">
                      <Barcode size={12} className="text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-500">
                        {product.barcode}
                      </span>
                    </div>
                    <div className="px-2 py-0.5 bg-primary-50 rounded-md">
                      <span className="text-[10px] font-black uppercase text-primary-600 tracking-tighter">
                        Batch: {product.batchNumber || "Default"}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-end justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                    Stock
                  </p>
                  <p
                    className={`text-2xl font-black ${isLowStock ? "text-rose-600" : "text-slate-800"}`}
                  >
                    {Number(product.stock).toFixed(2)}{" "}
                    <span className="text-sm font-medium text-slate-400">
                      {product.unit}
                    </span>
                  </p>
                  <div className="mt-1 flex items-center gap-1.5 grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                    <div className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md text-[9px] font-black uppercase tracking-tighter">
                      Value: ₹
                      {(
                        Number(product.stock) * Number(product.pricePerUnit)
                      ).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      MRP
                    </span>
                    <span className="text-sm font-black text-slate-400 italic font-mono">
                      ₹{product.mrp || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Sell
                    </span>
                    <span className="text-sm font-black text-primary-600">
                      ₹{product.pricePerUnit}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Cost
                    </span>
                    <span className="text-sm font-bold text-slate-500 font-mono">
                      ₹{product.purchasePrice}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Box className="text-slate-300" size={40} />
          </div>
          <h3 className="text-lg font-bold text-slate-800">
            {t("inventory.no_products")}
          </h3>
          <p className="text-slate-500">{t("inventory.no_products_desc")}</p>
        </div>
      )}

      {/* Add Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-8 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar border border-white/20">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-800 tracking-tighter">
                {editingId
                  ? t("common.update") + " " + t("common.products")
                  : t("inventory.add_product")}
              </h2>
              <button
                onClick={tryClose}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                  {t("common.name")}
                </label>
                <input
                  required
                  ref={nameInputRef}
                  type="text"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-slate-800 focus:ring-2 focus:ring-primary-500 transition-all font-bold placeholder:font-medium"
                  placeholder={t("placeholders.product_name")}
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                    {t("inventory.unit")}
                  </label>
                  <select
                    required
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-slate-800 focus:ring-2 focus:ring-primary-500 transition-all font-bold"
                    value={
                      ALL_UNITS.includes(formData.unit)
                        ? formData.unit
                        : "custom"
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "custom") {
                        setFormData({ ...formData, unit: "" });
                      } else {
                        setFormData({ ...formData, unit: val });
                      }
                    }}
                  >
                    {ALL_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u.toUpperCase()}
                      </option>
                    ))}
                    <option value="custom">+ Add Custom Unit</option>
                  </select>
                  {!ALL_UNITS.includes(formData.unit) && (
                    <input
                      type="text"
                      className="mt-2 w-full bg-white border-2 border-primary-100 rounded-2xl p-3 text-sm font-bold animate-in fade-in slide-in-from-top-1 duration-200"
                      placeholder="Enter unit name (e.g. Bucket)"
                      value={formData.unit}
                      onChange={(e) =>
                        setFormData({ ...formData, unit: e.target.value })
                      }
                      autoFocus
                    />
                  )}
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                    {t("inventory.stock")}
                  </label>
                  <input
                    required
                    type="number"
                    disabled={!!editingId}
                    className={`w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-slate-800 focus:ring-2 focus:ring-primary-500 transition-all font-bold ${editingId ? "opacity-70 cursor-not-allowed" : ""}`}
                    placeholder="0"
                    value={formData.stock}
                    onChange={(e) =>
                      setFormData({ ...formData, stock: e.target.value })
                    }
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                </div>
              </div>
              {/* Stock Adjustment Section (New Location) */}
              {editingId && (
                <div className="p-6 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 space-y-5 animate-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-primary-600 shadow-sm">
                        <RefreshCw size={16} />
                      </div>
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                        Stock Adjustment
                      </h3>
                    </div>
                    <div className="px-3 py-1 bg-primary-50 rounded-full text-[9px] font-black uppercase tracking-widest text-primary-600 border border-primary-100">
                      Edit Mode
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8 items-center bg-white p-5 rounded-3xl border-2 border-slate-100 shadow-sm">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        Current Stock
                      </span>
                      <span className="text-2xl font-black tracking-tighter text-slate-700">
                        {formData.stock}{" "}
                        <span className="text-[10px] font-bold text-slate-400 ml-1 italic font-sans">
                          {formData.unit}
                        </span>
                      </span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        Updated Stock
                      </span>
                      <span
                        className={`text-2xl font-black tracking-tighter ${Number(formData.stock) + (adjustmentType === "add" ? Number(adjustmentValue || 0) : -Number(adjustmentValue || 0)) >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                      >
                        {Number(formData.stock) +
                          (adjustmentType === "add"
                            ? Number(adjustmentValue || 0)
                            : -Number(adjustmentValue || 0))}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3 bg-white p-2 rounded-[1.5rem] border-2 border-slate-200 focus-within:border-primary-500 transition-all shadow-sm">
                    <select
                      className="bg-slate-50 text-slate-700 border-r border-slate-200 px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer hover:bg-slate-100 rounded-l-xl"
                      value={adjustmentType}
                      onChange={(e) => setAdjustmentType(e.target.value as any)}
                    >
                      <option value="add">Add (+)</option>
                      <option value="reduce">Reduce (-)</option>
                    </select>
                    <input
                      type="number"
                      className="flex-1 bg-transparent text-slate-800 px-4 py-2 text-md font-black outline-none placeholder:text-slate-300 tracking-tight"
                      placeholder="Enter Quantity to adjust..."
                      value={adjustmentValue}
                      onChange={(e) => setAdjustmentValue(e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                  </div>
                </div>
              )}

              {/* Pricing Section */}
              <div className="p-6 bg-primary-50/50 rounded-[2rem] border border-primary-100 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary-200">
                    <div className="text-[10px] font-black italic">₹</div>
                  </div>
                  <h3 className="text-[10px] font-black text-primary-600 uppercase tracking-widest">
                    {t("inventory.pricing_profit_logic")}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">
                      {t("inventory.cost_price")}
                    </label>
                    <input
                      required
                      type="number"
                      className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-slate-800 focus:ring-2 focus:ring-primary-500 transition-all font-bold"
                      placeholder="Supplier Cost per unit"
                      value={formData.purchasePrice}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          purchasePrice: e.target.value,
                        })
                      }
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">
                      {t("inventory.selling_price")}
                    </label>
                    <input
                      required
                      type="number"
                      className="w-full bg-white border border-primary-500 rounded-2xl p-4 text-slate-800 focus:ring-2 focus:ring-primary-500 transition-all font-black shadow-md shadow-primary-100"
                      placeholder="Price to Customer per unit"
                      value={formData.pricePerUnit}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          pricePerUnit: e.target.value,
                        })
                      }
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">
                      {t("common.mrp")}
                    </label>
                    <input
                      required
                      type="number"
                      className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-slate-800 focus:ring-2 focus:ring-primary-500 transition-all font-bold"
                      placeholder="Printed Price"
                      value={formData.mrp}
                      onChange={(e) =>
                        setFormData({ ...formData, mrp: e.target.value })
                      }
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                  </div>
                </div>

                {/* Live Profit Indicator */}
                {Number(formData.pricePerUnit) > 0 &&
                  Number(formData.purchasePrice) > 0 && (
                    <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-primary-100 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {t("inventory.est_profit_margin")}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-md font-black text-emerald-600">
                          ₹
                          {(
                            Number(formData.pricePerUnit) -
                            Number(formData.purchasePrice)
                          ).toFixed(2)}
                        </p>
                        <p className="text-[9px] font-black text-slate-400">
                          (
                          {(
                            ((Number(formData.pricePerUnit) -
                              Number(formData.purchasePrice)) /
                              Number(formData.purchasePrice)) *
                            100
                          ).toFixed(1)}
                          % Markup)
                        </p>
                      </div>
                    </div>
                  )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                    {t("inventory.low_stock_threshold")}
                  </label>
                  <input
                    required
                    type="number"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-slate-800 focus:ring-2 focus:ring-primary-500 transition-all font-bold"
                    placeholder="1"
                    value={formData.minStockAlert}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        minStockAlert: e.target.value,
                      })
                    }
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                    {t("inventory.batch_name")}
                  </label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-slate-800 focus:ring-2 focus:ring-primary-500 transition-all font-bold"
                    placeholder="e.g. Batch 1"
                    value={formData.batchNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, batchNumber: e.target.value })
                    }
                  />
                </div>
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400">
                      Barcode (Optional)
                    </label>
                    <button
                      type="button"
                      onClick={generateBarcode}
                      className="text-[10px] font-black uppercase tracking-widest text-primary-600 flex items-center gap-1 hover:text-primary-700"
                    >
                      <RefreshCw size={10} /> {t("inventory.auto_generate")}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 pr-14 text-slate-800 focus:ring-2 focus:ring-primary-500 transition-all font-bold"
                      placeholder={t("inventory.barcode_placeholder")}
                      value={formData.barcode}
                      onChange={(e) =>
                        setFormData({ ...formData, barcode: e.target.value })
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setIsScannerOpen(true)}
                      className="absolute right-2 top-2 bottom-2 px-3 bg-white border border-slate-200 rounded-xl text-primary-600 hover:bg-primary-50 transition-all flex items-center justify-center"
                    >
                      <Scan size={20} />
                    </button>
                  </div>
                  {formData.barcode && (
                    <div className="mt-3 p-4 bg-white border-2 border-slate-100 rounded-2xl flex flex-col items-center justify-center">
                      <svg
                        ref={(el) => {
                          if (el && formData.barcode) {
                            try {
                              JsBarcode(el, formData.barcode, {
                                format: "CODE128",
                                width: 2,
                                height: 60,
                                displayValue: true,
                                fontSize: 12,
                                margin: 8,
                              });
                            } catch {}
                          }
                        }}
                        className="w-full max-w-[200px]"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Continuous Mode Toggle */}
              {!editingId && (
                <div className="flex items-center justify-between p-4 bg-primary-50 rounded-2xl border border-primary-100 mt-2 mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      onClick={() => setIsContinuousMode(!isContinuousMode)}
                      className={`w-12 h-6 rounded-full transition-all cursor-pointer relative ${isContinuousMode ? "bg-primary-600" : "bg-slate-300"}`}
                    >
                      <div
                        className={`absolute top-1 bottom-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${isContinuousMode ? "right-1" : "left-1"}`}
                      ></div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">
                        {t("inventory.continuous_mode")}
                      </p>
                      <p className="text-[8px] text-slate-400 font-medium">
                        {t("inventory.continuous_mode_desc")}
                      </p>
                    </div>
                  </div>
                  {isContinuousMode && (
                    <div className="text-[9px] font-black text-primary-600 uppercase animate-bounce">
                      Fast Mode ON
                    </div>
                  )}
                </div>
              )}
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="w-full py-5 bg-primary-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all disabled:bg-slate-300 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {saveMutation.isPending ? (
                  <Loader2 size={24} className="animate-spin" />
                ) : editingId ? (
                  t("common.update") + " " + t("common.products")
                ) : isContinuousMode ? (
                  t("inventory.add_product") + " (Continuous)"
                ) : (
                  t("inventory.add_product")
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {isScannerOpen && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setIsScannerOpen(false)}
        />
      )}
      {/* Barcode Print Container */}
      {printLabelData && (
        <div className="hidden print:block">
          <BarcodeLabel
            product={printLabelData}
            businessName={user?.companyName || "BuildMate ERP"}
          />
          <style>{`
                        @media print {
                            @page { size: 50mm 25mm; margin: 0; }
                            body * { visibility: hidden !important; }
                            #barcode-sticker, #barcode-sticker * { visibility: visible !important; }
                            #barcode-sticker { position: absolute; left: 0; top: 0; display: flex !important; width: 50mm !important; height: 25mm !important; }
                        }
                    `}</style>
        </div>
      )}
      {isBulkModalOpen && (
        <BulkUploadModal
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
          onSuccess={() =>
            queryClient.invalidateQueries({ queryKey: ["inventory"] })
          }
        />
      )}
    </div>
  );
};

export default Inventory;
