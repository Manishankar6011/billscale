import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Save,
  Tag,
  Search,
  Box,
  Layers,
  Edit2,
  Trash2,
  AlertTriangle,
  Barcode,
  Scan,
  Loader2,
  RefreshCw,
  AlertCircle,
  FileSpreadsheet,
  Filter,
  ArrowUpDown,
  X,
  ShoppingBag,
  Image as ImageIcon,
  Upload,
} from "lucide-react";
import BarcodeScanner from "../components/BarcodeScanner";
import JsBarcode from "jsbarcode";
import axios from "axios";
import type { Product, PaginatedResponse } from "../types";
import { useAuth } from "../context/AuthContext";
import { InventorySkeleton } from "../components/Skeleton";
import { useToast } from "../context/ToastContext";
import BarcodeLabel from "../components/BarcodeLabel";
import BulkUploadModal from "../components/BulkUploadModal";
import MasterProductSelectionModal from "../components/MasterProductSelectionModal";
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
import { canUseFeature, PLAN_LIMITS } from "../utils/planLimits";
import UpgradePrompt from "../components/UpgradePrompt";

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

  // State Declarations
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "low" | "out" | "expiry">("all");
  const [sortBy, setSortBy] = useState<
    "name" | "price-asc" | "price-desc" | "stock-asc" | "stock-desc"
  >("name");

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 1. Fetching logic with useInfiniteQuery
  const {
    data,
    isLoading: loading,
    isRefetching: refreshing,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
  } = useInfiniteQuery<PaginatedResponse<Product>>({
    queryKey: ["inventory", debouncedSearchTerm, filterType, sortBy],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await axios.get<PaginatedResponse<Product>>(
        "/api/inventory",
        {
          params: {
            page: pageParam,
            limit: 12,
            search: debouncedSearchTerm,
            filterType,
            sortBy,
          },
          headers: { Authorization: `Bearer ${user?.token}` },
        },
      );
      return res.data;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.currentPage < lastPage.pagination.totalPages) {
        return lastPage.pagination.currentPage + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: !!user?.token,
    placeholderData: keepPreviousData,
  });

  const products = useMemo(() => {
    return data?.pages.flatMap((page) => page.products) || [];
  }, [data]);

  const existingCategories = useMemo(() => {
    const cats = [...new Set(products.map((p: any) => p.category).filter(Boolean))] as string[];
    if (!cats.includes("General")) cats.unshift("General");
    return cats;
  }, [products]);

  // Infinite Scroll Observer
  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback(
    (node: HTMLDivElement) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    name: string;
    unit: string;
    stock: string;
    minStockAlert: string;
    pricePerUnit: string;
    purchasePrice: string;
    mrp: string;
    discountPercent: string;
    barcode: string;
    batchNumber: string;
    hsnCode: string;
    gstRate: string;
    category: string;
    // Medical fields
    genericName: string;
    manufacturer: string;
    drugSchedule: string;
    rackLocation: string;
    expiryDate: string;
    hasSubUnit: boolean;
    subUnitName: string;
    subUnitValue: string;
    subUnitMrp: string;
    subUnitSalePrice: string;
    subUnitPurchasePrice: string;
    subUnitBarcode: string;
    subUnitDiscount: string;
    imageUrl: string;
  }>({
    name: "",
    unit: "piece",
    stock: "0",
    minStockAlert: "1",
    pricePerUnit: "",
    purchasePrice: "",
    mrp: "",
    discountPercent: "",
    barcode: "",
    batchNumber: "",
    hsnCode: "",
    gstRate: "0",
    category: "General",
    genericName: "",
    manufacturer: "",
    drugSchedule: "",
    rackLocation: "",
    expiryDate: "",
    hasSubUnit: false,
    subUnitName: "",
    subUnitValue: "",
    subUnitMrp: "",
    subUnitSalePrice: "",
    subUnitPurchasePrice: "",
    subUnitBarcode: "",
    subUnitDiscount: "",
    imageUrl: "",
  });
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [imageInputMode, setImageInputMode] = useState<"upload" | "url">("upload");
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const [isContinuousMode, setIsContinuousMode] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isBulkCategoryModalOpen, setIsBulkCategoryModalOpen] = useState(false);
  const [bulkCategoryValue, setBulkCategoryValue] = useState("General");
  const [isCreatingNewCategory, setIsCreatingNewCategory] = useState(false);

  const [printLabelData, setPrintLabelData] = useState<Product | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<"add" | "reduce">("add");
  const [adjustmentValue, setAdjustmentValue] = useState("");

  const nameInputRef = useRef<HTMLInputElement>(null);

  const [isBarcodePrintModalOpen, setIsBarcodePrintModalOpen] = useState(false);
  const [barcodePrintCount, setBarcodePrintCount] = useState(40);
  const [selectedBarcodeProduct, setSelectedBarcodeProduct] =
    useState<Product | null>(null);
  const [barcodeMfgDate, setBarcodeMfgDate] = useState("");
  const [barcodeExpDate, setBarcodeExpDate] = useState("");
  const [showThermalSettings, setShowThermalSettings] = useState(false);
  const [thermalSettings, setThermalSettings] = useState({
    rollWidth: 80,
    labelsPerRow: 1,
    labelWidth: 50,
    labelHeight: 25,
    gapX: 2,
    gapY: 2,
    rotate90: true, // Default to true since many thermal label printers expect portrait feed
    continuousRoll: false,
  });

  const [stockValueDisplay, setStockValueDisplay] = useState<"purchase" | "sell">("purchase");
  const [isSmartModalOpen, setIsSmartModalOpen] = useState(false);
  const [smartSelectedData, setSmartSelectedData] = useState<any[]>([]);

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
      discountPercent: "",
      barcode: "",
      batchNumber: "",
      hsnCode: "",
      gstRate: "0",
      category: "General",
      genericName: "",
      manufacturer: "",
      drugSchedule: "",
      rackLocation: "",
      expiryDate: "",
      hasSubUnit: false,
      subUnitName: "",
      subUnitValue: "",
      subUnitMrp: "",
      subUnitSalePrice: "",
      subUnitPurchasePrice: "",
      subUnitBarcode: "",
      subUnitDiscount: "",
      imageUrl: "",
    });
    setAdjustmentType("add");
    setAdjustmentValue("");
  };

  // ── 3-way price sync helpers ──────────────────────────────────────────────
  // All handlers use functional setFormData(prev => ...) to avoid stale closure.  // Helper to sync subunit prices
  const syncSubUnitPrices = (prev: typeof formData, updates: Partial<typeof formData>) => {
    const merged = { ...prev, ...updates };
    const numVal = Number(merged.subUnitValue);
    if (merged.hasSubUnit && numVal > 0) {
      const mrp = Number(merged.mrp) || 0;
      const sprice = Number(merged.pricePerUnit) || 0;
      const cost = Number(merged.purchasePrice) || 0;
      return {
        ...merged,
        subUnitMrp: mrp > 0 ? (mrp / numVal).toFixed(2) : "",
        subUnitSalePrice: sprice > 0 ? (sprice / numVal).toFixed(2) : "",
        subUnitPurchasePrice: cost > 0 ? (cost / numVal).toFixed(2) : "",
      };
    }
    return merged;
  };

  // MRP changes → if discount > 0 recalculate sale; else if sale exists recalculate discount
  const handleMrpChange = (val: string) => {
    const mrp = parseFloat(val);
    setFormData((prev) => {
      const disc = parseFloat(prev.discountPercent);
      const sale = parseFloat(prev.pricePerUnit);
      if (!isNaN(mrp) && mrp > 0) {
        if (!isNaN(disc) && disc > 0) {
          // Discount is genuinely set (>0) → recalculate sale price
          const newSale = parseFloat((mrp * (1 - disc / 100)).toFixed(2));
          return syncSubUnitPrices(prev, { mrp: val, pricePerUnit: newSale.toString() });
        } else if (!isNaN(sale) && sale > 0) {
          // Sale price is set → recalculate discount
          const newDisc = parseFloat(((1 - sale / mrp) * 100).toFixed(2));
          return syncSubUnitPrices(prev, { mrp: val, discountPercent: newDisc > 0 ? newDisc.toString() : "" });
        }
      }
      return syncSubUnitPrices(prev, { mrp: val });
    });
  };

  // Sale Price changes → if MRP exists recalculate discount
  const handleSalePriceChange = (val: string) => {
    const sale = parseFloat(val);
    setFormData((prev) => {
      const mrp = parseFloat(prev.mrp);
      if (!isNaN(sale) && !isNaN(mrp) && mrp > 0) {
        const newDisc = parseFloat(((1 - sale / mrp) * 100).toFixed(2));
        // Only store discount if it's meaningfully > 0
        return syncSubUnitPrices(prev, { pricePerUnit: val, discountPercent: newDisc > 0 ? newDisc.toString() : "" });
      }
      return syncSubUnitPrices(prev, { pricePerUnit: val });
    });
  };

  // Discount changes → if MRP exists recalculate sale price
  const handleDiscountChange = (val: string) => {
    const disc = parseFloat(val);
    setFormData((prev) => {
      const mrp = parseFloat(prev.mrp);
      if (!isNaN(disc) && disc > 0 && !isNaN(mrp) && mrp > 0) {
        const newSale = parseFloat((mrp * (1 - disc / 100)).toFixed(2));
        return syncSubUnitPrices(prev, { discountPercent: val, pricePerUnit: newSale.toString() });
      }
      // disc = 0 or mrp not set: just store the typed value, don't force sale price
      return syncSubUnitPrices(prev, { discountPercent: val });
    });
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
          discountPercent: "",
          barcode: "",
          batchNumber: "",
          hsnCode: "",
          gstRate: "0",
          category: "General",
          genericName: "",
          manufacturer: "",
          drugSchedule: "",
          rackLocation: "",
          expiryDate: "",
          hasSubUnit: false,
          subUnitName: "",
          subUnitValue: "",
          subUnitMrp: "",
          subUnitSalePrice: "",
          subUnitPurchasePrice: "",
          subUnitBarcode: "",
          subUnitDiscount: "",
          imageUrl: "",
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
          discountPercent: "",
          barcode: "",
          batchNumber: "",
          hsnCode: "",
          gstRate: "0",
          category: "General",
          genericName: "",
          manufacturer: "",
          drugSchedule: "",
          rackLocation: "",
          expiryDate: "",
          hasSubUnit: false,
          subUnitName: "",
          subUnitValue: "",
          subUnitMrp: "",
          subUnitSalePrice: "",
          subUnitPurchasePrice: "",
          subUnitBarcode: "",
          subUnitDiscount: "",
          imageUrl: "",
        });
      }
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || t("common.error"), "error");
    },
  });

  const bulkUpdateCategoryMutation = useMutation({
    mutationFn: async (data: { productIds: string[], updateData: any }) => {
      return axios.put('/api/inventory/bulk-update', data, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      showToast(t("inventory.updated_success") || "Categories updated successfully", "success");
      setIsBulkCategoryModalOpen(false);
      setSelectedProductIds([]);
      setBulkCategoryValue("");
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || t("common.error"), "error");
    }
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
    // Auto-compute discount from MRP vs sale price
    const mrp = product.mrp || 0;
    const sale = product.pricePerUnit || 0;
    const autoDiscount = mrp > 0 && sale > 0 && mrp >= sale
      ? parseFloat(((1 - sale / mrp) * 100).toFixed(2))
      : 0;
    setFormData({
      name: product.name,
      unit: product.unit,
      stock: product.stock.toString(),
      minStockAlert: product.minStockAlert.toString(),
      pricePerUnit: product.pricePerUnit.toString(),
      purchasePrice: product.purchasePrice.toString(),
      mrp: product.mrp.toString(),
      discountPercent: autoDiscount > 0 ? autoDiscount.toString() : "",
      barcode: product.barcode || "",
      batchNumber: product.batchNumber || "",
      hsnCode: product.hsnCode || "",
      gstRate: (product.gstRate || 0).toString(),
      category: product.category || "General",
      genericName: product.genericName || "",
      manufacturer: product.manufacturer || "",
      drugSchedule: product.drugSchedule || "",
      rackLocation: product.rackLocation || "",
      expiryDate: product.expiryDate ? format(new Date(product.expiryDate), "yyyy-MM-dd") : "",
      hasSubUnit: product.hasSubUnit || false,
      subUnitName: product.subUnitName || "",
      subUnitValue: product.subUnitValue ? product.subUnitValue.toString() : "",
      subUnitMrp: product.subUnitMrp ? product.subUnitMrp.toString() : "",
      subUnitSalePrice: product.subUnitSalePrice ? product.subUnitSalePrice.toString() : "",
      subUnitPurchasePrice: product.subUnitPurchasePrice ? product.subUnitPurchasePrice.toString() : "",
      subUnitBarcode: product.subUnitBarcode || "",
      subUnitDiscount: product.subUnitDiscount ? product.subUnitDiscount.toString() : "",
      imageUrl: product.imageUrl || "",
    });
    setIsModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (50KB)
    if (file.size > 50 * 1024) {
      showToast("Image size must be less than 50KB", "error");
      return;
    }

    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      showToast("Please upload a valid image file", "error");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
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
      hsnCode: formData.hsnCode,
      gstRate: Number(formData.gstRate),
      category: formData.category,
      genericName: formData.genericName,
      manufacturer: formData.manufacturer,
      drugSchedule: formData.drugSchedule,
      rackLocation: formData.rackLocation,
      expiryDate: formData.expiryDate || undefined,
      hasSubUnit: formData.hasSubUnit,
      subUnitName: formData.subUnitName,
      subUnitValue: Number(formData.subUnitValue),
      subUnitMrp: Number(formData.subUnitMrp),
      subUnitSalePrice: Number(formData.subUnitSalePrice),
      subUnitPurchasePrice: Number(formData.subUnitPurchasePrice),
      subUnitBarcode: formData.subUnitBarcode,
      subUnitDiscount: Number(formData.subUnitDiscount),
      imageUrl: formData.imageUrl,
    };
    saveMutation.mutate(data);
  };

  const handleSmartSelect = (selectedProducts: any[], batchType: string) => {
    const formattedData = selectedProducts.map(p => ({
      name: p.name,
      batchNumber: batchType === 'Retail' ? 'Retail' : 'Wholesale',
      barcode: p.barcode || '',
      purchasePrice: p.purchasePrice,
      pricePerUnit: p.pricePerUnit,
      mrp: p.mrp,
      stock: 0,
      unit: p.unit
    }));
    setSmartSelectedData(formattedData);
    setIsBulkModalOpen(true);
  };

  // Server-side filtering/sorting is already handled by useInfiniteQuery params
  const filteredProducts = products;

  const handleScan = React.useCallback(
    (code: string) => {
      setFormData((prev) => ({ ...prev, barcode: code }));
      setIsScannerOpen(false);
      showToast(t("inventory.scanned", { code }), "success");
    },
    [showToast],
  );

  // Summary Calculations
  // Summary Calculations - Using global totals from the API
  const totalItems = data?.pages[0]?.pagination.totalCount || 0;
  const totalSellingValue = data?.pages[0]?.totalSellingValue || 0;
  const totalPurchaseValue = data?.pages[0]?.totalPurchaseValue || 0;
  const totalStockValue = stockValueDisplay === "purchase" ? totalPurchaseValue : totalSellingValue;

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

  const generateBarcodePDF = (product: Product, count: number, printType: 'a4' | 'thermal' = 'a4') => {
    const isThermal = printType === 'thermal';
    
    // Calculate margins based on settings to center labels on the roll
    const calculatedMarginX = Math.max(0, (thermalSettings.rollWidth - (thermalSettings.labelsPerRow * thermalSettings.labelWidth) - (thermalSettings.labelsPerRow - 1) * thermalSettings.gapX) / 2);
    
    const marginX = isThermal ? calculatedMarginX : 7;
    // For thermal, top margin should be 0 because itemHeight already covers the full page height
    const marginY = isThermal ? 0 : 10;
    const isContinuous = isThermal && thermalSettings.continuousRoll;
    const gapX = isThermal ? thermalSettings.gapX : 2;
    const gapY = isThermal && !isContinuous ? 0 : (isThermal ? thermalSettings.gapY : 2); // Use gapY for continuous rolls

    const cols = isThermal ? thermalSettings.labelsPerRow : 4;
    const itemWidth = isThermal ? thermalSettings.labelWidth : 48;
    const itemHeight = isThermal ? thermalSettings.labelHeight : 25;

    const itemsPerPage = isThermal ? (isContinuous ? count : cols) : cols * 11;
    // Disable rotation for continuous rolls since they are printed on a dynamic vertical strip
    const rotate = isThermal && thermalSettings.rotate90 && !isContinuous;
    
    // Calculate total height needed for continuous roll
    const totalRows = Math.ceil(count / cols);
    const totalHeight = isContinuous 
        ? (totalRows * itemHeight) + ((totalRows - 1) * gapY) + (marginY * 2)
        : itemHeight;
    
    const formatWidth = rotate ? itemHeight : thermalSettings.rollWidth;
    const formatHeight = rotate ? thermalSettings.rollWidth : totalHeight;
    const orientation = formatWidth > formatHeight ? "landscape" : "portrait";
    
    const finalDoc = isThermal 
        ? new jsPDF({ 
            orientation: orientation as "portrait" | "landscape", 
            unit: "mm", 
            format: [formatWidth, formatHeight] 
          })
        : new jsPDF("p", "mm", "a4");
        
    const applyRotation = (docInstance: any) => {
      if (rotate) {
        docInstance.advancedAPI((d: any) => {
          // Maps (X,Y) -> (-Y+itemHeight, X). Clockwise 90-deg rotation.
          d.setCurrentTransformationMatrix(new d.Matrix(0, 1, -1, 0, itemHeight, 0));
        });
      }
    };
    
    applyRotation(finalDoc);
    
    const canvas = document.createElement("canvas");

    // Generate barcode at higher resolution to prevent blurriness and ensure fast scanning
    JsBarcode(canvas, product.barcode || "", {
      format: "CODE128",
      width: isThermal ? (itemWidth > 40 ? 3 : 2) : 4,
      height: isThermal ? 80 : 120, // Just the bars
      displayValue: false, // Turn off canvas text, we will draw it natively in jsPDF for crispness
      margin: 0,
    });
    const barcodeImg = canvas.toDataURL("image/png");

    for (let i = 0; i < count; i++) {
      if (i > 0 && i % itemsPerPage === 0) {
        finalDoc.addPage();
        applyRotation(finalDoc);
      }

      const pageIdx = i % itemsPerPage;
      const col = pageIdx % cols;
      const row = isThermal ? (isContinuous ? Math.floor(pageIdx / cols) : 0) : Math.floor(pageIdx / cols);

      const x = marginX + col * (itemWidth + gapX);
      const y = marginY + row * (itemHeight + gapY);

      if (!isThermal) {
        finalDoc.setDrawColor(240);
        finalDoc.setLineWidth(0.1);
        finalDoc.roundedRect(x, y, itemWidth, itemHeight, 1, 1, "S");
      }

      finalDoc.setTextColor(0);

      // Product Name with Word Wrap
      finalDoc.setFontSize(isThermal ? 8 : 9);
      finalDoc.setFont("helvetica", "bold");
      const splitTitle = finalDoc.splitTextToSize(product.name, itemWidth - 4);
      // Limit to 2 lines max
      const titleLines = splitTitle.length > 2 ? [splitTitle[0], splitTitle[1].substring(0, splitTitle[1].length - 3) + "..."] : splitTitle;
      
      finalDoc.text(titleLines, x + itemWidth / 2, y + (isThermal ? 4 : 5), { align: "center" });

      const titleHeightOffset = (titleLines.length - 1) * (isThermal ? 3.5 : 4);
      let currentY = y + (isThermal ? 5 : 6) + titleHeightOffset;

      // Optional MRP
      const hasMrp = product.mrp && product.mrp.toString().trim() !== "";
      if (hasMrp) {
        finalDoc.setFontSize(isThermal ? 7 : 8);
        finalDoc.text(`MRP: Rs. ${product.mrp}`, x + itemWidth / 2, currentY + (isThermal ? 2 : 3), { align: "center" });
        currentY += (isThermal ? 3 : 4);
      }

      // Optional Dates
      const datesText = [];
      if (barcodeMfgDate) datesText.push(`MFG: ${barcodeMfgDate}`);
      if (barcodeExpDate) datesText.push(`EXP: ${barcodeExpDate}`);
      if (datesText.length > 0) {
        finalDoc.setFontSize(isThermal ? 6 : 7); 
        finalDoc.text(datesText.join(" | "), x + itemWidth / 2, currentY + (isThermal ? 2 : 2), { align: "center" });
        currentY += (isThermal ? 3 : 3);
      }

      // Draw Barcode Image (Bars only)
      const barcodeWidth = itemWidth - (isThermal ? 6 : 10);
      const bottomPadding = isThermal ? 5 : 6;
      const remainingHeightForBarcode = itemHeight - (currentY - y) - bottomPadding; // Leave space for text below
      const barcodeHeight = Math.max(5, remainingHeightForBarcode);
      
      finalDoc.addImage(
        barcodeImg,
        "PNG",
        x + (itemWidth - barcodeWidth) / 2,
        currentY,
        barcodeWidth,
        barcodeHeight,
      );

      // Draw Barcode Number Natively (Perfect crispness)
      finalDoc.setFontSize(isThermal ? 8 : 9);
      finalDoc.text(product.barcode || "", x + itemWidth / 2, currentY + barcodeHeight + (isThermal ? 3 : 4), { align: "center" });
    }

    // Open in new tab for printing or download directly
    const blob = finalDoc.output("blob");
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    finalDoc.save(`${product.name}_Barcodes.pdf`);
    showToast(`${count} Barcodes generated successfully!`, "success");
    setIsBarcodePrintModalOpen(false);
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
        <div className="grid grid-cols-2 lg:flex lg:flex-nowrap items-center gap-2 md:gap-3 w-full md:w-auto">
          {/* Export Dropdown */}
          <div className="relative w-full sm:w-auto">
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
            >
              <Download size={18} /> {t("inventory.export")}{" "}
              <ChevronDown size={14} />
            </button>

            {isExportOpen && (
              <div className="absolute right-0 sm:right-0 left-0 sm:left-auto mt-2 w-full sm:w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
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
              if (!canUseFeature(user?.planType || 'free', 'hasAISmartAssistant')) {
                showToast(
                  "Smart Library is only available in Business Pro plan.",
                  "error",
                );
                navigate("/dashboard/pricing");
              } else {
                setIsSmartModalOpen(true);
              }
            }}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-primary-600 to-indigo-600 border-none rounded-2xl text-sm font-bold text-white hover:shadow-lg hover:shadow-primary-200 transition-all shadow-sm active:scale-95 whitespace-nowrap"
          >
            <ShoppingBag size={18} /> Smart Add
          </button>
          
          {selectedProductIds.length > 0 && (
            <button
              onClick={() => setIsBulkCategoryModalOpen(true)}
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2.5 bg-white border border-indigo-200 rounded-2xl text-sm font-bold text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 transition-all shadow-sm whitespace-nowrap animate-in fade-in zoom-in duration-200"
            >
              <Layers size={18} /> Assign Category ({selectedProductIds.length})
            </button>
          )}
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
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-primary-50 hover:border-primary-200 hover:text-primary-600 transition-all shadow-sm whitespace-nowrap"
          >
            <FileSpreadsheet size={18} /> {t("inventory.bulk_upload")}
          </button>
          <button
            onClick={() => {
              const plan = user?.planType || 'free';
              const maxProducts = PLAN_LIMITS[plan].maxProducts;
              if (totalItems >= maxProducts) {
                showToast(`Your current plan is limited to ${maxProducts} products. Please upgrade for more.`, 'error');
                navigate('/dashboard/pricing');
                return;
              }
              setIsModalOpen(true);
            }}
            className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto whitespace-nowrap"
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
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
              <div className="text-xl font-black italic">₹</div>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {stockValueDisplay === "purchase" ? "Purchase" : "Selling"} {t("common.stock_value")}
              </p>
              <h4 className="text-2xl font-black text-emerald-600">
                ₹{totalStockValue.toLocaleString()}
              </h4>
            </div>
          </div>
          <button
            onClick={() => setStockValueDisplay(stockValueDisplay === "purchase" ? "sell" : "purchase")}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border border-slate-100 flex items-center gap-2"
          >
            <RefreshCw size={12} className={stockValueDisplay === "sell" ? "rotate-180 transition-transform" : "transition-transform"} />
            {stockValueDisplay === "purchase" ? "Switch to Sell" : "Switch to Purchase"}
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 flex items-center relative bg-white rounded-2xl border border-slate-100 shadow-sm focus-within:ring-2 focus-within:ring-primary-500 transition-all">
          {isFetching && !isFetchingNextPage ? (
            <Loader2 className="absolute left-4 text-primary-500 animate-spin" size={20} />
          ) : (
            <Search className="absolute left-4 text-slate-400" size={20} />
          )}
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

        <div className="grid grid-cols-2 sm:flex items-center gap-3 w-full sm:w-auto">
          {/* Select All Checkbox */}
          <label className="flex items-center justify-center gap-2 px-4 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold text-slate-600 cursor-pointer shadow-sm hover:bg-slate-50 transition-colors w-full sm:w-auto whitespace-nowrap">
            <input 
              type="checkbox"
              className="w-5 h-5 rounded-full border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
              checked={filteredProducts.length > 0 && selectedProductIds.length === filteredProducts.length}
              onChange={(e) => {
                if(e.target.checked) setSelectedProductIds(filteredProducts.map(p => p._id!));
                else setSelectedProductIds([]);
              }}
            />
            Select All
          </label>

          {/* Filter Dropdown */}
          <div className="relative group">
            <select
              value={filterType}
              onChange={(e) =>
                setFilterType(e.target.value as typeof filterType)
              }
              className="appearance-none pl-10 pr-10 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold text-slate-600 focus:ring-2 focus:ring-primary-500 outline-none shadow-sm cursor-pointer w-full sm:min-w-[160px]"
            >
              <option value="all">{t("inventory.filter_all")}</option>
              <option value="low">{t("inventory.filter_low")}</option>
              <option value="out">{t("inventory.filter_out")}</option>
              {user?.businessType === 'Medical' && (
                <option value="expiry">{t("inventory.filter_expiry")}</option>
              )}
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
              className="appearance-none pl-10 pr-10 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold text-slate-600 focus:ring-2 focus:ring-primary-500 outline-none shadow-sm cursor-pointer w-full sm:min-w-[180px]"
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
              {/* Product Card Content (unchanged) */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox"
                    className="w-6 h-6 rounded-full border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer shadow-sm"
                    checked={selectedProductIds.includes(product._id!)}
                    onChange={(e) => {
                      if(e.target.checked) setSelectedProductIds([...selectedProductIds, product._id!]);
                      else setSelectedProductIds(selectedProductIds.filter(id => id !== product._id));
                    }}
                  />
                  {product.imageUrl ? (
                    <div className="w-12 h-12 rounded-xl overflow-hidden shadow-sm shrink-0 border border-slate-100">
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div
                      className={`p-3 rounded-xl shrink-0 ${isLowStock ? "bg-rose-50 text-rose-600" : "bg-primary-50 text-primary-600"}`}
                    >
                      <Box size={24} />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 transition-opacity">
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
                        setSelectedBarcodeProduct(product);
                        setIsBarcodePrintModalOpen(true);
                      }}
                      className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                      title="Print Multiple Barcodes"
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
                {product.expiryDate && (
                  <div className={`px-2 py-0.5 rounded-md flex items-center gap-1 ${new Date(product.expiryDate) < new Date() ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                    <RefreshCw size={10} className={new Date(product.expiryDate) < new Date() ? 'animate-pulse' : ''} />
                    <span className="text-[10px] font-black uppercase tracking-tighter">
                      Exp: {format(new Date(product.expiryDate), "MMM yyyy")}
                    </span>
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
                    {product.hasSubUnit && product.subUnitValue ? (
                      <>
                        {Math.floor(Number(product.stock))}{" "}
                        <span className="text-sm font-medium text-slate-400">{product.unit}</span>
                        {Math.round((Number(product.stock) - Math.floor(Number(product.stock))) * product.subUnitValue) > 0 && (
                          <>
                            <span className="mx-1 text-slate-300">,</span>
                            {Math.round((Number(product.stock) - Math.floor(Number(product.stock))) * product.subUnitValue)}{" "}
                            <span className="text-sm font-medium text-slate-400">{product.subUnitName}</span>
                          </>
                        )}
                        <span className="block text-[10px] text-indigo-500 font-bold uppercase tracking-wider mt-1 opacity-80 leading-tight">
                          (1 {product.unit} = {product.subUnitValue} {product.subUnitName})
                        </span>
                      </>
                    ) : (
                      <>
                        {Number(product.stock).toFixed(2)}{" "}
                        <span className="text-sm font-medium text-slate-400">
                          {product.unit}
                        </span>
                      </>
                    )}
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

      {/* Infinite Scroll Trigger */}
      <div
        ref={lastElementRef}
        className="h-20 flex items-center justify-center mt-4"
      >
        {isFetchingNextPage ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="animate-spin text-primary-600" size={32} />
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">
              Loading more products...
            </p>
          </div>
        ) : hasNextPage ? (
          <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">
            Scroll for more
          </p>
        ) : products.length > 0 ? (
          <div className="flex flex-col items-center gap-2 opacity-40">
            <div className="w-8 h-1 bg-slate-200 rounded-full" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              End of inventory
            </p>
          </div>
        ) : null}
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
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto overflow-x-hidden custom-scrollbar border border-white/20">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                    {user?.businessType === 'Medical' ? "Medicine Name (Brand Name)" : t("common.name")}
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
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                    Category
                  </label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-slate-800 focus:ring-2 focus:ring-primary-500 transition-all font-bold placeholder:font-medium"
                    placeholder="e.g. Snacks, Electronics"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                    HSN Code (Optional)
                  </label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-slate-800 focus:ring-2 focus:ring-primary-500 transition-all font-bold placeholder:font-medium"
                    placeholder="e.g. 8413"
                    value={formData.hsnCode}
                    onChange={(e) =>
                      setFormData({ ...formData, hsnCode: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                    GST Rate (%)
                  </label>
                  <select
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-slate-800 focus:ring-2 focus:ring-primary-500 transition-all font-bold"
                    value={formData.gstRate}
                    onChange={(e) =>
                      setFormData({ ...formData, gstRate: e.target.value })
                    }
                  >
                    <option value="0">Exempt (0%)</option>
                    <option value="5">GST 5%</option>
                    <option value="12">GST 12%</option>
                    <option value="18">GST 18%</option>
                    <option value="28">GST 28%</option>
                  </select>
                </div>
              </div>

              {user?.enableInventoryImageUpload && (
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                    Product Image
                  </label>
                  
                  <div className="flex gap-2 mb-4 bg-slate-100 p-1 rounded-xl w-fit">
                    <button
                      type="button"
                      onClick={() => setImageInputMode("upload")}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                        imageInputMode === "upload" 
                          ? "bg-white text-slate-800 shadow-sm" 
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageInputMode("url")}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                        imageInputMode === "url" 
                          ? "bg-white text-slate-800 shadow-sm" 
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      Image URL
                    </button>
                  </div>

                  <div className="flex items-center gap-4">
                    {formData.imageUrl ? (
                      <div className="relative w-24 h-24 rounded-2xl border-2 border-slate-100 overflow-hidden group shrink-0">
                        <img src={formData.imageUrl} alt="Product preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, imageUrl: "" }))}
                          className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="text-white" size={20} />
                        </button>
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 bg-slate-50 shrink-0">
                        <ImageIcon size={24} className="mb-1 opacity-50" />
                        <span className="text-[9px] font-black uppercase tracking-widest">No Image</span>
                      </div>
                    )}
                    <div className="flex-grow">
                      {imageInputMode === "upload" ? (
                        <label className="flex items-center justify-center gap-2 w-full bg-slate-50 hover:bg-slate-100 border-2 border-slate-100 rounded-2xl py-3 px-4 text-slate-600 font-black text-xs uppercase tracking-widest cursor-pointer transition-colors">
                          <Upload size={16} />
                          Upload Image (Max 50KB)
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageChange}
                          />
                        </label>
                      ) : (
                        <input
                          type="url"
                          placeholder="Paste image URL here..."
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-slate-800 focus:ring-2 focus:ring-primary-500 transition-all font-bold placeholder:font-medium"
                          value={formData.imageUrl}
                          onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {user?.businessType === 'Medical' && (
                <div className="p-6 bg-blue-50/50 rounded-[2rem] border border-blue-100 space-y-5 animate-in slide-in-from-top-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                      <ShoppingBag size={16} />
                    </div>
                    <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                      {t("inventory.medical_details")}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">
                        {t("inventory.generic_name")}
                      </label>
                      <input
                        type="text"
                        className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-slate-800 focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                        placeholder="e.g. Paracetamol"
                        value={formData.genericName}
                        onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">
                        {t("inventory.manufacturer")}
                      </label>
                      <input
                        type="text"
                        className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-slate-800 focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                        placeholder="e.g. Cipla"
                        value={formData.manufacturer}
                        onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">
                        {t("inventory.expiry_date")}
                      </label>
                      <input
                        type="date"
                        className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-slate-800 focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                        value={formData.expiryDate}
                        onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">
                        {t("inventory.rack_location")}
                      </label>
                      <input
                        type="text"
                        className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-slate-800 focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                        placeholder="e.g. Shelf A-1"
                        value={formData.rackLocation}
                        onChange={(e) => setFormData({ ...formData, rackLocation: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">
                        {t("inventory.drug_schedule")}
                      </label>
                      <select
                        className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-slate-800 focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                        value={formData.drugSchedule}
                        onChange={(e) => setFormData({ ...formData, drugSchedule: e.target.value })}
                      >
                        <option value="">None</option>
                        <option value="Schedule H">Schedule H</option>
                        <option value="Schedule H1">Schedule H1</option>
                        <option value="Schedule G">Schedule G</option>
                        <option value="Schedule X">Schedule X</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 items-center bg-white p-5 rounded-3xl border-2 border-slate-100 shadow-sm">
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
                      placeholder="Qty to adjust..."
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        setFormData((prev) => syncSubUnitPrices(prev, { purchasePrice: e.target.value }))
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
                      onChange={(e) => handleSalePriceChange(e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                  </div>
                  {/* MRP + Discount — 3-way sync */}
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">
                      {t("common.mrp")}
                    </label>
                    <input
                      required
                      type="number"
                      className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-slate-800 focus:ring-2 focus:ring-primary-500 transition-all font-bold"
                      placeholder="Printed Price"
                      value={formData.mrp}
                      onChange={(e) => handleMrpChange(e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-rose-400 mb-2 ml-1 flex items-center gap-1">
                      <span>Discount %</span>
                      {formData.discountPercent && (
                        <span className="ml-1 px-1.5 py-0.5 bg-rose-100 text-rose-600 rounded-full text-[8px] font-black animate-pulse">
                          Auto
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="any"
                        className="w-full bg-rose-50 border-2 border-rose-200 rounded-2xl p-4 pr-10 text-rose-700 focus:ring-2 focus:ring-rose-400 focus:border-rose-400 transition-all font-black placeholder:text-rose-200"
                        placeholder="0.00"
                        value={formData.discountPercent}
                        onChange={(e) => handleDiscountChange(e.target.value)}
                        onWheel={(e) => e.currentTarget.blur()}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-400 font-black text-sm pointer-events-none">%</span>
                    </div>
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

              {/* Subunit Configuration Section */}
              <div className="p-5 bg-indigo-50/50 rounded-[28px] border-2 border-indigo-100 mt-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-200/40 to-transparent rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700"></div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                      <Layers size={20} />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-indigo-400 uppercase tracking-widest">
                        Advanced
                      </p>
                      <h4 className="font-bold text-indigo-900 text-sm">
                        Enable Subunits (Fractional Sale)
                      </h4>
                    </div>
                  </div>
                  <div
                    onClick={() =>
                      setFormData({
                        ...formData,
                        hasSubUnit: !formData.hasSubUnit,
                      })
                    }
                    className={`w-14 h-8 rounded-full transition-all cursor-pointer relative ${formData.hasSubUnit ? "bg-indigo-500" : "bg-slate-300"}`}
                  >
                    <div
                      className={`absolute top-1.5 bottom-1.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${formData.hasSubUnit ? "right-1.5" : "left-1.5"}`}
                    ></div>
                  </div>
                </div>

                {formData.hasSubUnit && (
                  <div className="space-y-4 relative z-10 animate-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-2xl border border-indigo-50">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                          Subunit Name (e.g. piece)
                        </label>
                        <input
                          type="text"
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={formData.subUnitName}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              subUnitName: e.target.value,
                            })
                          }
                          placeholder="piece"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                          Qty in 1 {formData.unit || "unit"}
                        </label>
                        <input
                          type="number"
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={formData.subUnitValue}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData((prev) => {
                              const mrp = Number(prev.mrp) || 0;
                              const sprice = Number(prev.pricePerUnit) || 0;
                              const cost = Number(prev.purchasePrice) || 0;
                              const numVal = Number(val) || 1;

                              return {
                                ...prev,
                                subUnitValue: val,
                                subUnitMrp: mrp > 0 ? (mrp / numVal).toFixed(2) : "",
                                subUnitSalePrice: sprice > 0 ? (sprice / numVal).toFixed(2) : "",
                                subUnitPurchasePrice: cost > 0 ? (cost / numVal).toFixed(2) : "",
                              };
                            });
                          }}
                          placeholder="10"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                          Cost
                        </label>
                        <input
                          type="number"
                          className="w-full bg-white border-2 border-indigo-100 rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={formData.subUnitPurchasePrice}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              subUnitPurchasePrice: e.target.value,
                            })
                          }
                          placeholder="Cost"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                          MRP
                        </label>
                        <input
                          type="number"
                          className="w-full bg-white border-2 border-indigo-100 rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={formData.subUnitMrp}
                          onChange={(e) => {
                            const newMrp = e.target.value;
                            setFormData((prev) => {
                              const mrpNum = Number(newMrp);
                              const saleNum = Number(prev.subUnitSalePrice);
                              let disc = prev.subUnitDiscount;
                              if (mrpNum > 0 && saleNum > 0 && mrpNum >= saleNum) {
                                disc = ((1 - saleNum / mrpNum) * 100).toFixed(2);
                              }
                              return {
                                ...prev,
                                subUnitMrp: newMrp,
                                subUnitDiscount: disc,
                              };
                            });
                          }}
                          placeholder="MRP"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                          Sale Price
                        </label>
                        <input
                          type="number"
                          className="w-full bg-white border-2 border-indigo-100 rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={formData.subUnitSalePrice}
                          onChange={(e) => {
                            const newSale = e.target.value;
                            setFormData((prev) => {
                              const saleNum = Number(newSale);
                              const mrpNum = Number(prev.subUnitMrp);
                              let disc = prev.subUnitDiscount;
                              if (mrpNum > 0 && saleNum > 0 && mrpNum >= saleNum) {
                                disc = ((1 - saleNum / mrpNum) * 100).toFixed(2);
                              }
                              return {
                                ...prev,
                                subUnitSalePrice: newSale,
                                subUnitDiscount: disc,
                              };
                            });
                          }}
                          placeholder="Sale"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                          Discount %
                        </label>
                        <input
                          type="number"
                          className="w-full bg-white border-2 border-indigo-100 rounded-xl py-2 px-3 text-sm font-bold text-rose-500 focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={formData.subUnitDiscount}
                          onChange={(e) => {
                            const newDisc = e.target.value;
                            setFormData((prev) => {
                              const discNum = Number(newDisc);
                              const mrpNum = Number(prev.subUnitMrp);
                              let sale = prev.subUnitSalePrice;
                              if (mrpNum > 0 && discNum >= 0 && discNum <= 100) {
                                sale = (mrpNum * (1 - discNum / 100)).toFixed(2);
                              }
                              return {
                                ...prev,
                                subUnitDiscount: newDisc,
                                subUnitSalePrice: sale,
                              };
                            });
                          }}
                          placeholder="Disc"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                        Subunit Barcode (Optional)
                      </label>
                      <input
                        type="text"
                        className="w-full bg-white border-2 border-indigo-100 rounded-xl py-2 px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={formData.subUnitBarcode}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            subUnitBarcode: e.target.value,
                          })
                        }
                        placeholder="Scan or type barcode"
                      />
                    </div>
                  </div>
                )}
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
            mfgDate={barcodeMfgDate}
            expDate={barcodeExpDate}
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
      {/* Barcode Print Quantity Modal */}
      {isBarcodePrintModalOpen && selectedBarcodeProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 animate-in zoom-in duration-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                <Barcode size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">
                  Print Barcodes
                </h3>
                <p className="text-sm text-slate-500 truncate max-w-[250px]">
                  {selectedBarcodeProduct.name}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  Number of Barcodes (for A4 Paper)
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 text-xl font-black focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all"
                  value={barcodePrintCount}
                  onChange={(e) => setBarcodePrintCount(Number(e.target.value))}
                  autoFocus
                />
                <p className="mt-2 text-[10px] text-slate-400 font-medium">
                  * 44 barcodes fit on one A4 sheet.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                    Mfg Date
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 10/24"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 text-xl font-black focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all"
                    value={barcodeMfgDate}
                    onChange={(e) => setBarcodeMfgDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                    Exp Date
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 10/25"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 text-xl font-black focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all"
                    value={barcodeExpDate}
                    onChange={(e) => setBarcodeExpDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowThermalSettings(!showThermalSettings)}
                  className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-emerald-600 transition-colors"
                >
                  <ChevronDown className={`transition-transform ${showThermalSettings ? "rotate-180" : ""}`} size={16} />
                  Advanced Thermal Roll Settings
                </button>
                
                {showThermalSettings && (
                  <div className="mt-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-4 animate-in slide-in-from-top-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Roll Width (mm)</label>
                        <input type="number" className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none" value={thermalSettings.rollWidth} onChange={(e) => setThermalSettings({...thermalSettings, rollWidth: Number(e.target.value)})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Stickers per Row</label>
                        <input type="number" className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none" value={thermalSettings.labelsPerRow} onChange={(e) => setThermalSettings({...thermalSettings, labelsPerRow: Number(e.target.value)})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Sticker Width (mm)</label>
                        <input type="number" className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none" value={thermalSettings.labelWidth} onChange={(e) => setThermalSettings({...thermalSettings, labelWidth: Number(e.target.value)})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Sticker Height (mm)</label>
                        <input type="number" className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none" value={thermalSettings.labelHeight} onChange={(e) => setThermalSettings({...thermalSettings, labelHeight: Number(e.target.value)})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Horiz. Gap (mm)</label>
                        <input type="number" className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none" value={thermalSettings.gapX} onChange={(e) => setThermalSettings({...thermalSettings, gapX: Number(e.target.value)})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Vertical Gap (mm)</label>
                        <input type="number" className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none" value={thermalSettings.gapY} onChange={(e) => setThermalSettings({...thermalSettings, gapY: Number(e.target.value)})} />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 mt-2">
                      <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 text-emerald-600 rounded" 
                        checked={thermalSettings.rotate90} 
                        onChange={(e) => setThermalSettings({...thermalSettings, rotate90: e.target.checked})} 
                        />
                        Rotate 90°
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 text-emerald-600 rounded" 
                        checked={thermalSettings.continuousRoll} 
                        onChange={(e) => setThermalSettings({...thermalSettings, continuousRoll: e.target.checked})} 
                        />
                        Continuous Roll (Single Page)
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setIsBarcodePrintModalOpen(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    generateBarcodePDF(selectedBarcodeProduct, barcodePrintCount, 'a4')
                  }
                  className="flex-1 py-4 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primary-700 shadow-xl shadow-primary-200 transition-all flex items-center justify-center gap-2"
                >
                  <Download size={16} />
                  A4 PDF
                </button>
                <button
                  onClick={() =>
                    generateBarcodePDF(selectedBarcodeProduct, barcodePrintCount, 'thermal')
                  }
                  className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-700 shadow-xl shadow-emerald-200 transition-all flex items-center justify-center gap-2"
                >
                  <Barcode size={16} />
                  Thermal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Label for single print (legacy compatibility) */}
      {printLabelData && (
        <BarcodeLabel
          product={printLabelData}
          mfgDate={barcodeMfgDate}
          expDate={barcodeExpDate}
        />
      )}

      {/* Bulk Category Assign Modal */}
      {isBulkCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 animate-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                  <Layers size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">Assign Category</h3>
                  <p className="text-sm text-slate-500">Updating {selectedProductIds.length} items</p>
                </div>
              </div>
              <button
                onClick={() => setIsBulkCategoryModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Category</label>
                {!isCreatingNewCategory ? (
                    <select
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 text-base font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                        value={bulkCategoryValue}
                        onChange={(e) => {
                            if (e.target.value === "__NEW__") {
                                setIsCreatingNewCategory(true);
                                setBulkCategoryValue("");
                            } else {
                                setBulkCategoryValue(e.target.value);
                            }
                        }}
                    >
                        {existingCategories.map((cat: string) => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                        <option value="__NEW__">+ Create New Category</option>
                    </select>
                ) : (
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            placeholder="Enter new category name..."
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 text-base font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                            value={bulkCategoryValue}
                            onChange={(e) => setBulkCategoryValue(e.target.value)}
                            autoFocus
                        />
                        <button
                            type="button"
                            onClick={() => {
                                setIsCreatingNewCategory(false);
                                setBulkCategoryValue("General");
                            }}
                            className="p-4 bg-slate-100 text-slate-500 hover:text-rose-600 rounded-2xl transition-colors shrink-0"
                            title="Cancel"
                        >
                            <X size={20} />
                        </button>
                    </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setIsBulkCategoryModalOpen(false)}
                  className="flex-1 px-6 py-4 rounded-2xl font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={!bulkCategoryValue.trim() || bulkUpdateCategoryMutation.isPending}
                  onClick={() => bulkUpdateCategoryMutation.mutate({ productIds: selectedProductIds, updateData: { category: bulkCategoryValue.trim() } })}
                  className="flex-1 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {bulkUpdateCategoryMutation.isPending ? <Loader2 className="animate-spin" size={18} /> : "Update"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isBulkModalOpen && (
        <BulkUploadModal
          isOpen={isBulkModalOpen}
          onClose={() => {
            setIsBulkModalOpen(false);
            setSmartSelectedData([]);
          }}
          initialData={smartSelectedData}
          onSuccess={() =>
            queryClient.invalidateQueries({ queryKey: ["inventory"] })
          }
        />
      )}

      {isSmartModalOpen && (
        <MasterProductSelectionModal 
          isOpen={isSmartModalOpen}
          onClose={() => setIsSmartModalOpen(false)}
          onSelect={handleSmartSelect}
        />
      )}
    </div>
  );
};

export default Inventory;
