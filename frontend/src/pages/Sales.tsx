import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  useQuery,
} from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Receipt,
  Search,
  Filter,
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
  Edit,
  Eye,
  EyeOff,
} from "lucide-react";
import BarcodeScanner from "../components/BarcodeScanner";
import CustomerSearch from "../components/CustomerSearch";
import axios from "axios";
import type {
  Sale,
  Product,
  Customer,
  PaginatedResponse,
  PaginatedSalesResponse,
} from "../types";
import { useAuth } from "../context/AuthContext";
import { TableSkeleton, MetricsSkeleton } from "../components/Skeleton";
import { useToast } from "../context/ToastContext";
import { format } from "date-fns";
import PrintableInvoice from "../components/PrintableInvoice";
import A4Invoice from "../components/A4Invoice";
import GSTInvoice from "../components/GSTInvoice";
import { generateInvoice } from "../utils/invoiceGenerator";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { canUseFeature, PLAN_LIMITS } from "../utils/planLimits";
import UpgradePrompt from "../components/UpgradePrompt";

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
  originalSellingPrice: number; // base price before discount
  discountPercent: number;       // 0–100 discount applied on this item
  purchasePrice: number;
  mrp: number;
  unit: string;
  conversionFactor: number;
  hsnCode?: string | undefined;
  gstRate?: number | undefined;
  batchNumber?: string | undefined;
  expiryDate?: string | undefined;
  isSubUnit?: boolean;
};

const SummaryCard = ({
  title,
  value,
  sub,
  color,
  onClick,
  isClickable,
}: {
  title: string;
  value: string;
  sub?: string;
  color: "purple" | "emerald" | "rose";
  onClick?: () => void;
  isClickable?: boolean;
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
      onClick={onClick}
      className={`rounded-3xl p-6 flex items-center gap-5 shadow-sm transition-all duration-300 w-full h-full overflow-hidden min-w-0 ${colorMap[color]} ${
        isClickable
          ? "cursor-pointer hover:shadow-xl hover:-translate-y-1 active:scale-95"
          : ""
      }`}
    >
      <div className={`${iconColorMap[color]} shrink-0`}>{icons[color]}</div>
      <div className="flex-1 min-w-0 w-0">
        <p
          className={`text-[10px] font-black uppercase tracking-widest ${color === "purple" ? "text-violet-200" : "text-slate-400"}`}
        >
          {title}
        </p>
        <p
          className={`text-2xl font-black tracking-tight overflow-x-auto whitespace-nowrap no-scrollbar max-w-full ${color === "purple" ? "text-white" : "text-slate-900"}`}
        >
          {value}
        </p>
        {sub && (
          <p
            className={`text-[10px] font-medium truncate max-w-full ${color === "purple" ? "text-violet-200" : "text-slate-400"}`}
          >
            {sub}
          </p>
        )}
      </div>
      {isClickable && (
        <div
          className={`${color === "purple" ? "text-violet-200" : "text-slate-300"}`}
        >
          <Filter size={16} />
        </div>
      )}
    </div>
  );
};

const getSubUnitMrp = (p: Product) => (p.subUnitMrp && p.subUnitMrp > 0 && p.subUnitMrp < (p.mrp || 0)) ? p.subUnitMrp : ((p.mrp || 0) / (p.subUnitValue || 1));
const getSubUnitSalePrice = (p: Product) => (p.subUnitSalePrice && p.subUnitSalePrice > 0 && p.subUnitSalePrice < (p.pricePerUnit || 0)) ? p.subUnitSalePrice : ((p.pricePerUnit || 0) / (p.subUnitValue || 1));
const getSubUnitPurchasePrice = (p: Product) => (p.subUnitPurchasePrice && p.subUnitPurchasePrice > 0 && p.subUnitPurchasePrice < (p.purchasePrice || 0)) ? p.subUnitPurchasePrice : ((p.purchasePrice || 0) / (p.subUnitValue || 1));

const Sales = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const isSubmittingRef = useRef(false);

  // State Declarations (Moved to top)
  const [filterSearch, setFilterSearch] = useState("");
  const [debouncedFilterSearch, setDebouncedFilterSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [timeRange, setTimeRange] = useState("all");
  const [showRangeMenu, setShowRangeMenu] = useState(false);
  const [showProfitRangeMenu, setShowProfitRangeMenu] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "paid" | "unpaid">("all");

  const handleRangeSelect = (range: string) => {
    const today = new Date();
    let start = "";
    let end = format(today, "yyyy-MM-dd");

    if (range === "today") {
      start = end;
    } else if (range === "yesterday") {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      start = format(yesterday, "yyyy-MM-dd");
      end = start;
    } else if (range === "week") {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      start = format(startOfWeek, "yyyy-MM-dd");
    } else if (range === "month") {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      start = format(startOfMonth, "yyyy-MM-dd");
    } else if (range === "year") {
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      start = format(startOfYear, "yyyy-MM-dd");
    } else if (range === "custom") {
      // Don't change dates, just set range label
      setTimeRange("custom");
      setShowRangeMenu(false);
      setShowProfitRangeMenu(false);
      return;
    } else {
      start = "";
      end = "";
    }

    setStartDate(start);
    setEndDate(end);
    setTimeRange(range);
    setShowRangeMenu(false);
    setShowProfitRangeMenu(false);
  };

  const [itemSearch, setItemSearch] = useState("");
  const [debouncedItemSearch, setDebouncedItemSearch] = useState("");
  const [scannedProducts, setScannedProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Record<string, Product>>({});
  const [itemsModalMode, setItemsModalMode] = useState<"all" | "scan" | null>(null);

  // Debounce search terms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedFilterSearch(filterSearch), 500);
    return () => clearTimeout(timer);
  }, [filterSearch]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedItemSearch(itemSearch), 500);
    return () => clearTimeout(timer);
  }, [itemSearch]);

  // Infinite Query for Sales
  const {
    data: salesData,
    isLoading: salesLoading,
    fetchNextPage: fetchNextSalesPage,
    hasNextPage: hasNextSalesPage,
    isFetchingNextPage: isFetchingNextSalesPage,
  } = useInfiniteQuery<PaginatedSalesResponse>({
    queryKey: ["sales", debouncedFilterSearch, startDate, endDate, filterStatus],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await axios.get<PaginatedSalesResponse>(
        "/api/transactions/sales",
        {
          params: {
            page: pageParam,
            limit: 20,
            search: debouncedFilterSearch,
            startDate,
            endDate,
            status: filterStatus,
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
  });

  const sales = useMemo(() => {
    return salesData?.pages.flatMap((page) => page.sales) || [];
  }, [salesData]);

  const salesSummary = useMemo(() => {
    return (
      salesData?.pages[0]?.summary || {
        totalAmount: 0,
        totalPaid: 0,
        totalUnpaid: 0,
        totalProfit: 0,
        totalAdditionalCharges: 0,
        totalRoundOff: 0,
        paidCount: 0,
        pendingCount: 0,
      }
    );
  }, [salesData]);

  // Specific query for monthly count (to enforce limits)
  const { data: monthlyCountData } = useQuery({
    queryKey: ['monthly-sales-count'],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const res = await axios.get('/api/transactions/sales', {
        params: {
          startDate: startOfMonth.toISOString().split('T')[0],
          limit: 1
        },
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      return res.data.pagination.totalCount;
    },
    enabled: !!user?.token && user?.planType === 'free'
  });

  // Infinite Query for Inventory
  const {
    data: productsData,
    isLoading: productsLoading,
    fetchNextPage: fetchNextProductsPage,
    hasNextPage: hasNextProductsPage,
    isFetchingNextPage: isFetchingNextProductsPage,
  } = useInfiniteQuery<PaginatedResponse<Product>>({
    queryKey: ["inventory", debouncedItemSearch],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await axios.get<PaginatedResponse<Product>>(
        "/api/inventory",
        {
          params: {
            page: pageParam,
            limit: 20,
            search: debouncedItemSearch,
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
  });

  const products = useMemo(() => {
    // If in scan mode and no search query, show ONLY scanned items
    if (itemsModalMode === "scan" && !itemSearch) {
      return scannedProducts;
    }

    const flatProducts = productsData?.pages.flatMap((page) => page.products) || [];
    // Combine scanned products and query results, avoiding duplicates
    const combined = [...scannedProducts];
    flatProducts.forEach(p => {
      if (!combined.find(s => s._id === p._id)) {
        combined.push(p);
      }
    });
    return combined;
  }, [productsData, scannedProducts, itemsModalMode, itemSearch]);

  // Infinite Scroll Observers
  const salesObserver = useRef<IntersectionObserver | null>(null);
  const lastSaleElementRef = useCallback(
    (node: HTMLTableRowElement) => {
      if (salesLoading) return;
      if (salesObserver.current) salesObserver.current.disconnect();
      salesObserver.current = new IntersectionObserver((entries) => {
        if (
          entries[0]?.isIntersecting &&
          hasNextSalesPage &&
          !isFetchingNextSalesPage
        ) {
          fetchNextSalesPage();
        }
      });
      if (node) salesObserver.current.observe(node);
    },
    [
      salesLoading,
      hasNextSalesPage,
      isFetchingNextSalesPage,
      fetchNextSalesPage,
    ],
  );

  const productsObserver = useRef<IntersectionObserver | null>(null);
  const lastProductElementRef = useCallback(
    (node: HTMLTableRowElement) => {
      if (productsLoading) return;
      // Don't trigger infinite scroll if we are in "scan only" mode (showing just scanned items)
      if (itemsModalMode === "scan" && !itemSearch) return;

      if (productsObserver.current) productsObserver.current.disconnect();
      productsObserver.current = new IntersectionObserver((entries) => {
        if (
          entries[0]?.isIntersecting &&
          hasNextProductsPage &&
          !isFetchingNextProductsPage
        ) {
          fetchNextProductsPage();
        }
      });
      if (node) productsObserver.current.observe(node);
    },
    [
      productsLoading,
      hasNextProductsPage,
      isFetchingNextProductsPage,
      fetchNextProductsPage,
      itemsModalMode,
      itemSearch,
    ],
  );

  useEffect(() => {
    if ((location.state as any)?.openModal) {
      setIsModalOpen(true);
      // Clear location state to prevent modal reopening on refresh
      window.history.replaceState({}, document.title || "");
    }
  }, [location.state]);

  const isInitialLoading =
    (salesLoading || productsLoading) &&
    sales.length === 0 &&
    products.length === 0;
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerGSTIN, setCustomerGSTIN] = useState("");
  const [customerState, setCustomerState] = useState("");
  const [customerStateCode, setCustomerStateCode] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<"cash" | "credit">("cash");
  const [invoiceFormat, setInvoiceFormat] = useState<"thermal" | "modern" | "gst">(
    "thermal",
  );

  // Sync default invoice format from user settings
  useEffect(() => {
    if (user?.invoiceFormat) {
      setInvoiceFormat(user.invoiceFormat as any);
    }
  }, [user?.invoiceFormat]);

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  // Round-off & change calculator
  const [roundOff, setRoundOff] = useState(false);
  const [amountReceived, setAmountReceived] = useState("");

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [additionalItems, setAdditionalItems] = useState<
    { name: string; price: string; profitPercent: string }[]
  >([]);
  const [customItems, setCustomItems] = useState<
    { name: string; price: string; quantity: string; profitPercent: string }[]
  >([]);

  // Item-Add modal (removed itemsModalMode from here)

  const [itemQtyMap, setItemQtyMap] = useState<Record<string, string>>({});
  const [itemPriceMap, setItemPriceMap] = useState<Record<string, string>>({});
  const [itemUnitMap, setItemUnitMap] = useState<Record<string, 'unit' | 'subunit'>>({});
  // Additional charge inputs (new)
  const [newChargeName, setNewChargeName] = useState("");
  const [newChargePrice, setNewChargePrice] = useState("");
  const [newChargeProfitPercent, setNewChargeProfitPercent] = useState("0");

  const [newCustomName, setNewCustomName] = useState("");
  const [newCustomPrice, setNewCustomPrice] = useState("");
  const [newCustomQuantity, setNewCustomQuantity] = useState("1");
  const [newCustomProfitPercent, setNewCustomProfitPercent] = useState("0");

  // UI Logic State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [matchingProducts, setMatchingProducts] = useState<Product[]>([]);
  const [hwScannerInput, setHwScannerInput] = useState("");
  const [autoPrint, setAutoPrint] = useState(true);
  const [showQRCode, setShowQRCode] = useState(false);
  const [printData, setPrintData] = useState<any>(null);
  const [selectedSaleForEdit, setSelectedSaleForEdit] = useState<Sale | null>(
    null,
  );
  const scannerInputRef = useRef<HTMLInputElement>(null);

  // Leave warning
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const [pendingCloseAction, setPendingCloseAction] = useState<
    (() => void) | null
  >(null);

  // Auto-print effect with sessionStorage guard to prevent duplicate prints across remounts
  useEffect(() => {
    if (printData && autoPrint && printData._id) {
      const lastPrintedId = sessionStorage.getItem("last_auto_printed_id");
      if (printData._id !== lastPrintedId) {
        sessionStorage.setItem("last_auto_printed_id", printData._id);
        const timer = setTimeout(() => {
          window.print();
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [printData, autoPrint]);

  // Handle unsaved changes warning

  const [showProfit, setShowProfit] = useState(false);

  const isFormDirty =
    cart.length > 0 ||
    additionalItems.length > 0 ||
    customItems.length > 0 ||
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
        setItemsModalMode(null);
        setScannedProducts([]);
        setItemQtyMap({});
        setItemPriceMap({});
      });
      setShowLeaveWarning(true);
    } else {
      setItemsModalMode(null);
      setScannedProducts([]);
    }
  };

  const resetForm = () => {
    setCustomerName("");
    setCustomerPhone("");
    setCustomerAddress("");
    setCustomerGSTIN("");
    setCustomerState("");
    setCustomerStateCode("");
    setCustomerId(null);
    setCart([]);
    setAdditionalItems([]);
    setCustomItems([]);
    setPaymentMode("cash");
    setAmountReceived("");
    setRoundOff(false);
    setScannedProducts([]);
    setSelectedProducts({});
    setNewChargeProfitPercent("0");
    setNewCustomName("");
    setNewCustomPrice("");
    setNewCustomQuantity("1");
    setNewCustomProfitPercent("0");
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedSaleForEdit(null);
    resetForm();
  };

  // Grand total calculations
  const rawTotal =
    cart.reduce((acc, item) => acc + item.quantity * item.sellingPrice, 0) +
    additionalItems.reduce((acc, item) => acc + (Number(item.price) || 0), 0) +
    customItems.reduce((acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
  const roundOffAmount = roundOff ? Math.round(rawTotal) - rawTotal : 0;
  const grandTotal = rawTotal + roundOffAmount;
  const changeAmount =
    amountReceived !== "" ? Number(amountReceived) - grandTotal : null;

  // Auto-sync amountReceived for cash sales
  useEffect(() => {
    if (paymentMode === "cash" && isModalOpen && !selectedSaleForEdit) {
      setAmountReceived(grandTotal.toString());
    }
  }, [grandTotal, paymentMode, isModalOpen, selectedSaleForEdit]);

  // Mutations
  const createSaleMutation = useMutation({
    mutationFn: async (saleData: Partial<Sale>) => {
      return axios.post<Sale>("/api/transactions/sales", saleData, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
    },
    onSuccess: (res) => {
      isSubmittingRef.current = false;
      const newSale = res.data;
      showToast(t("billing.sale_recorded"), "success");
      if (autoPrint && newSale) {
        setPrintData(newSale);
      }
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      resetForm();
    },
    onError: (err: any) => {
      isSubmittingRef.current = false;
      showToast(
        err.response?.data?.message || t("billing.error_processing_sale"),
        "error",
      );
    },
  });

  const updateSaleMutation = useMutation({
    mutationFn: async (saleData: Partial<Sale>) => {
      return axios.put<Sale>(
        `/api/transactions/sales/${selectedSaleForEdit?._id}`,
        saleData,
        {
          headers: { Authorization: `Bearer ${user?.token}` },
        },
      );
    },
    onSuccess: (res) => {
      isSubmittingRef.current = false;
      showToast(t("billing.sale_updated"), "success");
      if (autoPrint && res.data) {
        setPrintData(res.data);
      }
      setIsModalOpen(false);
      setSelectedSaleForEdit(null);
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      resetForm();
    },
    onError: (err: any) => {
      isSubmittingRef.current = false;
      showToast(
        err.response?.data?.message || t("billing.error_updating_sale"),
        "error",
      );
    },
  });

  const deleteSaleMutation = useMutation({
    mutationFn: async (id: string) => {
      return axios.delete(`/api/transactions/sales/${id}`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
    },
    onSuccess: () => {
      showToast(t("billing.sale_deleted"), "success");
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || "Error deleting sale", "error");
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (data: Partial<Customer>) => {
      return axios.post<Customer>("/api/customers", data, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
    },
    onSuccess: (res) => {
      showToast("Customer saved to database!", "success");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setIsNewCustomerModalOpen(false);
      
      // Auto-select the newly created customer
      setCustomerId(res.data._id || null);
      setCustomerName(res.data.name);
      setCustomerPhone(res.data.phone || "");
      setCustomerAddress(res.data.address || "");
    },
    onError: (err: any) => {
      // If customer already exists, we just close and apply locally
      if (err.response?.status === 400) {
        setIsNewCustomerModalOpen(false);
      } else {
        showToast(
          err.response?.data?.message || "Error saving customer",
          "error",
        );
      }
    },
  });

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
    if (isSubmittingRef.current) return;
    
    // Plan Limit Check
    const plan = user?.planType || 'free';
    const limit = PLAN_LIMITS[plan].maxBillsPerMonth;
    
    if (limit !== Infinity && !selectedSaleForEdit) {
        const currentMonthSales = monthlyCountData || 0;
        if (currentMonthSales >= limit) {
            showToast(`Monthly limit reached (${limit} bills). Please upgrade for unlimited billing.`, 'error');
            navigate('/dashboard/pricing');
            return;
        }
    }

    if (cart.length === 0) {
      showToast("Add at least one item to cart", "error");
      return;
    }
    isSubmittingRef.current = true;

    const saleData: Partial<Sale> = {
      ...(customerId ? { customerId } : {}),
      customerName: customerName.trim() || "Cash Sale",
      customerPhone,
      customerAddress,
      customerGSTIN,
      customerState,
      customerStateCode,
      items: cart.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unit: i.unit,
        conversionFactor: i.conversionFactor,
        sellingPrice: i.sellingPrice,
        purchasePriceAtTime: i.purchasePrice,
        mrpAtTime: i.mrp,
        hsnCode: i.hsnCode,
        taxRate: i.gstRate || 0,
        taxAmount: i.gstRate ? (i.quantity * i.sellingPrice * i.gstRate) / (100 + i.gstRate) : 0,
        batchNumber: i.batchNumber,
        expiryDate: i.expiryDate
      })),
      additionalItems: [
        ...additionalItems.map((i) => ({
          name: i.name,
          price: Number(i.price) || 0,
          profitPercent: Number(i.profitPercent) || 0,
        })),
        ...(newChargeName && newChargePrice
          ? [
              {
                name: newChargeName,
                price: Number(newChargePrice) || 0,
                profitPercent: Number(newChargeProfitPercent) || 0,
              },
            ]
          : []),
      ],
      customItems: [
        ...customItems.map((i) => ({
          name: i.name,
          price: Number(i.price) || 0,
          quantity: Number(i.quantity) || 1,
          profitPercent: Number(i.profitPercent) || 0,
        })),
        ...(newCustomName && newCustomPrice
          ? [
              {
                name: newCustomName,
                price: Number(newCustomPrice) || 0,
                quantity: Number(newCustomQuantity) || 1,
                profitPercent: Number(newCustomProfitPercent) || 0,
              },
            ]
          : []),
      ],

      paymentMode,
      date: (() => {
        const now = new Date();
        const selectedDateStr = (date || now.toISOString().split("T")[0]) as string;
        const isToday = selectedDateStr === now.toISOString().split("T")[0];
        
        if (isToday && !selectedSaleForEdit) {
          return now.toISOString();
        }
        
        const d = new Date(selectedDateStr);
        d.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
        return d.toISOString();
      })(),
      status: Number(amountReceived) >= grandTotal && grandTotal > 0 ? "paid" : Number(amountReceived) > 0 ? "partial" : "pending",
      amountPaid: Number(amountReceived) || 0,
      roundOffAmount: roundOffAmount,
      showQRCode,
    };

    if (selectedSaleForEdit) {
      updateSaleMutation.mutate(saleData);
    } else {
      createSaleMutation.mutate(saleData);
    }
  };

  const handleScan = useCallback(
    async (code: string) => {
      const trimmedCode = code.trim();
      if (!trimmedCode) return;

      if (itemsModalMode !== null) {
        setItemSearch(trimmedCode);
      }

      // Try local search first
      let product = products.find((p) => p.barcode === trimmedCode || p.subUnitBarcode === trimmedCode);

      let isSubUnitScan = false;

      if (!product) {
        try {
          const res = await axios.get(`/api/inventory/barcode/${trimmedCode}`, {
            headers: { Authorization: `Bearer ${user?.token}` },
          });
          product = res.data;
        } catch (err) {
          showToast(`Product with barcode ${trimmedCode} not found`, "error");
          return;
        }
      }

      if (product) {
        setIsScannerOpen(false);
        setHwScannerInput("");
        const pid = product._id!;
        isSubUnitScan = Boolean(product.hasSubUnit && product.subUnitBarcode === trimmedCode);

        if (itemsModalMode !== null) {
          // Add to scannedProducts so it appears at top
          setScannedProducts(prev => {
            const others = prev.filter(p => p._id !== pid);
            return [product!, ...others];
          });
          setItemQtyMap((prev) => ({
            ...prev,
            [pid]: (Number(prev[pid] || 0) + 1).toString(),
          }));
          setItemUnitMap((prev) => ({
            ...prev,
            [pid]: isSubUnitScan ? 'subunit' : 'unit',
          }));
          setItemPriceMap((prev) => ({
            ...prev,
            [pid]: isSubUnitScan ? (product!.subUnitSalePrice || product!.pricePerUnit).toString() : product!.pricePerUnit.toString(),
          }));
          setSelectedProducts((prev) => ({
            ...prev,
            [pid]: product!,
          }));
          setItemSearch("");
          showToast(`${product.name} qty increased in list`, "success");
        } else {
          setCart((prev) => {
            // we should try to match both product ID AND whether it's a subunit
            const existingIndex = prev.findIndex((item) => item.productId === pid && Boolean(item.isSubUnit) === isSubUnitScan);
            if (existingIndex !== -1) {
              // Move existing item to top and increment qty
              const item = prev[existingIndex]!;
              const others = prev.filter((_, idx) => idx !== existingIndex);
              return [{ ...item, quantity: item.quantity + 1 }, ...others];
            }
            // Add new item to top
            return [
              {
                productId: pid,
                name: product!.name,
                quantity: 1,
                unit: isSubUnitScan ? (product!.subUnitName || 'SubUnit') : product!.unit,
                conversionFactor: isSubUnitScan ? (product!.subUnitValue || 1) : 1,
                sellingPrice: isSubUnitScan ? getSubUnitSalePrice(product!) : product!.pricePerUnit,
                originalSellingPrice: isSubUnitScan ? getSubUnitSalePrice(product!) : product!.pricePerUnit,
                discountPercent: (() => {
                  const mrp = isSubUnitScan ? getSubUnitMrp(product!) : (product!.mrp || 0);
                  const sale = isSubUnitScan ? getSubUnitSalePrice(product!) : (product!.pricePerUnit || 0);
                  return mrp > 0 && sale > 0 && mrp >= sale
                    ? parseFloat(((1 - sale / mrp) * 100).toFixed(2))
                    : 0;
                })(),
                purchasePrice: isSubUnitScan ? getSubUnitPurchasePrice(product!) : product!.purchasePrice,
                mrp: isSubUnitScan ? getSubUnitMrp(product!) : (product!.mrp || 0),
                hsnCode: product!.hsnCode,
                gstRate: product!.gstRate,
                batchNumber: product!.batchNumber,
                expiryDate: product!.expiryDate ? format(new Date(product!.expiryDate), "dd MMM yy") : undefined,
                isSubUnit: isSubUnitScan,
              },
              ...prev,
            ];
          });
          showToast(`${product.name} added to cart`, "success");
        }
      }
    },
    [
      products,
      user?.token,
      showToast,
      itemsModalMode,
      setItemQtyMap,
      setItemPriceMap,
      setItemSearch,
      setCart,
      setIsScannerOpen,
      setHwScannerInput,
    ],
  );

  // Item modal handlers
  // Item modal handlers optimized with useMemo
  const filteredItems = useMemo(() => {
    return (
      itemsModalMode === "scan"
        ? products.filter(
            (p) =>
              Number(itemQtyMap[p._id!]) > 0 ||
              (itemSearch &&
                (p.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
                  (p.barcode && p.barcode.includes(itemSearch)))),
          )
        : products.filter(
            (p) =>
              p.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
              (p.barcode && p.barcode.includes(itemSearch)),
          )
    ).sort((a, b) => {
      const qtyA = Number(itemQtyMap[a._id!] || 0);
      const qtyB = Number(itemQtyMap[b._id!] || 0);
      if (qtyA > 0 && qtyB === 0) return -1;
      if (qtyA === 0 && qtyB > 0) return 1;
      return 0;
    });
  }, [products, itemsModalMode, itemSearch, itemQtyMap]);

  const addItemsFromModal = () => {
    const newItems: CartItem[] = [];
    Object.entries(itemQtyMap).forEach(([productId, qty]) => {
      if (Number(qty) > 0) {
        const product = products.find((p) => p._id === productId) || selectedProducts[productId];
        if (product) {
          const isSub = Boolean(itemUnitMap[productId] === 'subunit' && product.hasSubUnit);
          const baseSale = isSub ? getSubUnitSalePrice(product) : product.pricePerUnit;
          const baseMrp = isSub ? getSubUnitMrp(product) : (product.mrp || 0);
          const baseCost = isSub ? getSubUnitPurchasePrice(product) : product.purchasePrice;
          const price = Number(itemPriceMap[productId]) || baseSale;

          newItems.push({
            productId,
            name: product.name,
            quantity: Number(qty),
            sellingPrice: price,
            originalSellingPrice: baseSale,
            discountPercent: (() => {
              return baseMrp > 0 && price > 0 && baseMrp >= price
                ? parseFloat(((1 - price / baseMrp) * 100).toFixed(2))
                : 0;
            })(),
            purchasePrice: baseCost,
            mrp: baseMrp,
            unit: isSub ? (product.subUnitName || 'SubUnit') : product.unit,
            conversionFactor: isSub ? (product.subUnitValue || 1) : 1,
            isSubUnit: isSub,
            hsnCode: product.hsnCode,
            gstRate: product.gstRate,
            batchNumber: product.batchNumber,
            expiryDate: product.expiryDate ? format(new Date(product.expiryDate), "dd MMM yy") : undefined,
          });
        }
      }
    });
    if (newItems.length === 0) {
      showToast("Set quantity for at least one item", "error");
      return;
    }
    setCart((prev) => {
      const updatedCart = [...prev];
      newItems.forEach((newItem) => {
        const existingIdx = updatedCart.findIndex(
          (item) => item.productId === newItem.productId,
        );
        if (existingIdx !== -1) {
          const existingItem = updatedCart[existingIdx]!;
          updatedCart[existingIdx] = {
            ...existingItem,
            quantity: existingItem.quantity + newItem.quantity,
          };
        } else {
          updatedCart.push(newItem);
        }
      });
      return updatedCart;
    });
    setItemQtyMap({});
    setItemPriceMap({});
    setSelectedProducts({});
    setItemSearch("");
    setItemsModalMode(null);
  };

  // Sales are already filtered by the backend
  const filteredSales = sales;

  // Summary metrics from backend
  // Summary metrics from backend (Excluding additional charges for accurate item-based profit view)
  const totalSales =
    salesSummary.totalAmount -
    (salesSummary.totalAdditionalCharges || 0) -
    (salesSummary.totalRoundOff || 0);
  const totalPaid = Math.max(
    0,
    salesSummary.totalPaid -
      (salesSummary.totalAdditionalCharges || 0) -
      (salesSummary.totalRoundOff || 0),
  );
  const totalUnpaid = salesSummary.totalUnpaid;
  const totalNetProfit = salesSummary.totalProfit;

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
    setCustomerPhone(customer.phone ?? "");
    setCustomerAddress(customer.address || "");
    setCustomerGSTIN(customer.gstin || "");
    setCustomerState(customer.state || "");
    setCustomerStateCode(customer.stateCode || "");
    setCustomerId(customer._id || null);
  };
  const handleAddNewCustomer = (query: string) => {
    setCustomerId(null);
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

  const handleEdit = (sale: Sale) => {
    setSelectedSaleForEdit(sale);
    setCustomerName(sale.customerName);
    setCustomerPhone(sale.customerPhone || "");
    setCustomerAddress(sale.customerAddress || "");
    setCustomerGSTIN(sale.customerGSTIN || "");
    setCustomerState(sale.customerState || "");
    setCustomerStateCode(sale.customerStateCode || "");
    setCustomerId(sale.customerId || null);
    setPaymentMode(sale.paymentMode as any);
    setDate(new Date(sale.date).toISOString().split("T")[0]);
    setAmountReceived(sale.amountPaid.toString());
    setRoundOff(sale.roundOffAmount !== 0);
    setCart(
      sale.items.map((i) => {
        const pId =
          typeof i.productId === "object"
            ? (i.productId as any)?._id
            : i.productId;
        const pName =
          typeof i.productId === "object"
            ? (i.productId as any)?.name
            : "Product";
        return {
          productId: pId || (i as any).productId,
          name: pName || "Product",
          quantity: i.quantity,
          sellingPrice: i.sellingPrice,
          originalSellingPrice: i.sellingPrice,
          discountPercent: (() => {
            const mrp = i.mrpAtTime || 0;
            const sale = i.sellingPrice || 0;
            return mrp > 0 && sale > 0 && mrp >= sale
              ? parseFloat(((1 - sale / mrp) * 100).toFixed(2))
              : 0;
          })(),
          purchasePrice: (() => {
            let cost = i.purchasePriceAtTime || 0;
            if (i.productId && typeof i.productId === 'object') {
              const p = i.productId as any;
              if (p.hasSubUnit && i.unit === p.subUnitName) {
                const boxCost = p.purchasePrice || i.purchasePriceAtTime || 0;
                cost = (p.subUnitPurchasePrice && p.subUnitPurchasePrice > 0 && p.subUnitPurchasePrice < boxCost) ? p.subUnitPurchasePrice : (boxCost / (p.subUnitValue || 1));
              } else if (i.unit === p.unit) {
                cost = p.purchasePrice || i.purchasePriceAtTime || 0;
              }
            }
            return cost;
          })(),
          mrp: (() => {
            let mrp = i.mrpAtTime || 0;
            if (i.productId && typeof i.productId === 'object') {
              const p = i.productId as any;
              if (p.hasSubUnit && i.unit === p.subUnitName) {
                const boxMrp = p.mrp || i.mrpAtTime || 0;
                mrp = (p.subUnitMrp && p.subUnitMrp > 0 && p.subUnitMrp < boxMrp) ? p.subUnitMrp : (boxMrp / (p.subUnitValue || 1));
              } else if (i.unit === p.unit) {
                mrp = p.mrp || i.mrpAtTime || 0;
              }
            }
            return mrp;
          })(),
          unit: i.unit,
          conversionFactor: i.conversionFactor,
          gstRate: i.taxRate,
          hsnCode: i.hsnCode,
        };
      }),
    );
    setAdditionalItems(
      (sale.additionalItems || []).map((i) => ({
        name: i.name,
        price: i.price.toString(),
        profitPercent: (i.profitPercent || 0).toString(),
      })),
    );
    setCustomItems(
      (sale.customItems || []).map((i) => ({
        name: i.name,
        price: i.price.toString(),
        quantity: (i.quantity || 1).toString(),
        profitPercent: (i.profitPercent || 0).toString(),
      })),
    );
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (
      window.confirm(
        "Are you sure you want to delete this sale? This will revert stock and cannot be undone.",
      )
    ) {
      deleteSaleMutation.mutate(id);
    }
  };

  if (isInitialLoading)
    return (
      <div className="space-y-6">
        <MetricsSkeleton />
        <TableSkeleton rows={10} />
      </div>
    );

  return (
    <div className="w-full">
      <div className="space-y-6 print:hidden">
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
                  {t("inventory.stay")}
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
                  {t("inventory.leave_anyway")}
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
            <p className="text-slate-500">{t("billing.sale_subtitle")}</p>
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
              <Plus size={20} /> {t("billing.new_sale")}
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="flex overflow-x-auto gap-4 pb-4 sm:pb-0 sm:grid sm:grid-cols-3 no-scrollbar w-full overflow-y-visible">
          <div className="relative group w-[320px] max-w-[320px] sm:w-full sm:max-w-none min-w-0 flex-shrink-0">
            <SummaryCard
              title={t("billing.total_sales")}
              value={`₹${totalSales.toLocaleString()}`}
              sub={
                timeRange === "all"
                  ? `${salesData?.pages[0]?.pagination.totalCount || 0} ${t("billing.invoices")}`
                  : `${t(`dashboard.${timeRange}`)} ${t("common.sales")}`
              }
              color="purple"
              isClickable={true}
              onClick={() => setShowRangeMenu(!showRangeMenu)}
            />
            {showRangeMenu && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 z-30 p-2 animate-in slide-in-from-top-2 duration-200">
                {["today", "yesterday", "week", "month", "year", "all", "custom"].map((range) => (
                  <button
                    key={range}
                    onClick={() => handleRangeSelect(range)}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                      timeRange === range
                        ? "bg-primary-50 text-primary-600"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {range === "all" ? "All Time" : range === "custom" ? "Custom Range" : t(`dashboard.${range}`)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-[320px] max-w-[320px] sm:w-full sm:max-w-none min-w-0 flex-shrink-0">
            <SummaryCard
              title={t("billing.total_paid")}
              value={`₹${totalPaid.toLocaleString()}`}
              sub={`${salesSummary.paidCount || 0} ${t("billing.invoices")}`}
              color="emerald"
              isClickable={true}
              onClick={() => setFilterStatus(filterStatus === "paid" ? "all" : "paid")}
            />
          </div>

          <div className="w-[320px] max-w-[320px] sm:w-full sm:max-w-none min-w-0 flex-shrink-0">
            <SummaryCard
              title={t("billing.total_unpaid")}
              value={`₹${totalUnpaid.toLocaleString()}`}
              sub={`${salesSummary.pendingCount || 0} ${t("billing.invoices")}`}
              color="rose"
              isClickable={true}
              onClick={() => setFilterStatus(filterStatus === "unpaid" ? "all" : "unpaid")}
            />
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-100/50 rounded-2xl w-fit">
          {[
            { id: "all", label: "All Invoices" },
            { id: "paid", label: "Paid Only" },
            { id: "unpaid", label: "Unpaid / Pending" },
          ].map((status) => (
            <button
              key={status.id}
              onClick={() => setFilterStatus(status.id as any)}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                filterStatus === status.id
                  ? "bg-white text-primary-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {status.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="md:col-span-1">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              {t("billing.search_sales")}
            </label>
            <div className="relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                size={18}
              />
              <input
                type="text"
                className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-primary-500 transition-all"
                placeholder={t("billing.search_sales_placeholder")}
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              {t("billing.date_from")}
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
              {t("billing.date_to")}
            </label>
            <input
              type="date"
              className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-primary-500 transition-all"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {user?.role !== 'staff' && (
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-5 flex flex-col lg:flex-row items-center justify-between gap-6 text-white shadow-xl group relative overflow-visible">
            <div className="flex flex-col sm:flex-row items-center gap-6 w-full lg:w-auto">
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="p-3 bg-white/10 rounded-2xl flex-shrink-0">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-1">
                    {t("billing.net_profit")}
                    <button
                      onClick={() => setShowProfit(!showProfit)}
                      className="p-1 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
                    >
                      {showProfit ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                  </p>
                  <p
                    className={`text-2xl font-black tracking-tight transition-all duration-300 ${showProfit ? (totalNetProfit >= 0 ? "text-emerald-400" : "text-rose-400") : "text-slate-600 blur-sm select-none"}`}
                  >
                    {showProfit ? (
                      <>
                        {totalNetProfit >= 0 ? "+" : ""}₹
                        {Math.abs(totalNetProfit).toLocaleString()}
                      </>
                    ) : (
                      "₹ *****"
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => setShowProfitRangeMenu(!showProfitRangeMenu)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5"
                  >
                    <Filter size={14} />
                    {timeRange === "all" ? "All Time" : timeRange === "custom" ? "Custom Range" : t(`dashboard.${timeRange}`)}
                  </button>
                  {showProfitRangeMenu && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 p-2 animate-in slide-in-from-top-2 duration-200 text-slate-800">
                      {["today", "yesterday", "week", "month", "year", "all", "custom"].map((range) => (
                        <button
                          key={range}
                          onClick={() => {
                            handleRangeSelect(range);
                            setShowProfitRangeMenu(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            timeRange === range
                              ? "bg-primary-50 text-primary-600"
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {range === "all" ? "All Time" : range === "custom" ? "Custom Range" : t(`dashboard.${range}`)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-8 text-right w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 border-white/10 pt-4 lg:pt-0">
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">
                  {t("billing.margin")}
                </p>
                <p
                  className={`text-xl font-black transition-all duration-300 ${showProfit ? "text-white" : "text-slate-600 blur-sm select-none"}`}
                >
                  {showProfit ? (
                    <>
                      {totalSales > 0
                        ? ((totalNetProfit / totalSales) * 100).toFixed(1)
                        : 0}
                      %
                    </>
                  ) : (
                    "**%"
                  )}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">
                  {t("billing.invoices")}
                </p>
                <p className="text-xl font-black text-white">
                  {salesData?.pages[0]?.pagination.totalCount || 0}
                </p>
              </div>
            </div>
          </div>
        )}

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
                    {t("common.mrp")}
                  </th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">
                    {t("billing.sale_price")}
                  </th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">
                    {t("billing.total_paid")}
                  </th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">
                    {t("billing.balance_due")}
                  </th>
                  {user?.role !== 'staff' && (
                    <>
                      <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">
                        {t("billing.cost_price")}
                      </th>
                      <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">
                        {t("billing.profit")}
                      </th>
                      <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">
                        {t("billing.margin_perc")}
                      </th>
                    </>
                  )}
                  <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">
                    {t("common.items")}
                  </th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">
                    Billed By
                  </th>
                  <th className="px-6 py-4 text-right pr-10 text-xs font-black uppercase text-slate-400 tracking-widest">
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sales.map((sale, index) => {
                  const isLastElement = index === sales.length - 1;

                  const totalMrp = (sale.items || []).reduce((acc, item) => {
                    let mrp = item.mrpAtTime || 0;
                    if (item.productId && typeof item.productId === 'object') {
                      const p = item.productId as any;
                      if (p.hasSubUnit && item.unit === p.subUnitName) {
                        const boxMrp = p.mrp || item.mrpAtTime || 0;
                        mrp = (p.subUnitMrp && p.subUnitMrp > 0 && p.subUnitMrp < boxMrp) ? p.subUnitMrp : (boxMrp / (p.subUnitValue || 1));
                      } else if (item.unit === p.unit) {
                        mrp = p.mrp || item.mrpAtTime || 0;
                      }
                    }
                    return acc + mrp * item.quantity;
                  }, 0);
                  const totalCost = (sale.items || []).reduce((acc, item) => {
                    let cost = item.purchasePriceAtTime || 0;
                    if (item.productId && typeof item.productId === 'object') {
                      const p = item.productId as any;
                      if (p.hasSubUnit && item.unit === p.subUnitName) {
                        const boxCost = p.purchasePrice || item.purchasePriceAtTime || 0;
                        cost = (p.subUnitPurchasePrice && p.subUnitPurchasePrice > 0 && p.subUnitPurchasePrice < boxCost) ? p.subUnitPurchasePrice : (boxCost / (p.subUnitValue || 1));
                      } else if (item.unit === p.unit) {
                        cost = p.purchasePrice || item.purchasePriceAtTime || 0;
                      }
                    }
                    return acc + cost * item.quantity;
                  }, 0);
                  const additionalChargesTotal = (
                    sale.additionalItems || []
                  ).reduce((acc, item) => acc + (Number(item.price) || 0), 0);
                  const additionalChargesProfit = (
                    sale.additionalItems || []
                  ).reduce(
                    (acc, item) =>
                      acc +
                      ((Number(item.price) || 0) * (item.profitPercent || 0)) /
                        100,
                    0,
                  );
                  const profit =
                    (sale.totalAmount || 0) -
                    additionalChargesTotal +
                    additionalChargesProfit -
                    (sale.roundOffAmount || 0) -
                    totalCost;
                  const profitPerc =
                    (sale.totalAmount || 0) > 0
                      ? (profit /
                          (sale.totalAmount -
                            additionalChargesTotal -
                            (sale.roundOffAmount || 0))) *
                        100
                      : 0;
                  return (
                    <tr
                      key={sale._id}
                      ref={isLastElement ? lastSaleElementRef : null}
                      className="hover:bg-slate-50/50 transition-all border-l-4 border-transparent hover:border-primary-500"
                    >
                      <td className="px-6 py-5">
                        <p className="text-sm font-bold text-slate-800">
                          {format(new Date(sale.date), "dd MMM yy")}
                        </p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                          {sale.invoiceNumber}
                        </p>
                        <div className="mt-2 text-[8px] font-black uppercase tracking-[0.2em] inline-block px-2 py-0.5 rounded-md border">
                          {sale.status === "paid" ? (
                            <span className="text-emerald-600 bg-emerald-50 border-emerald-100">
                              {t("billing.paid")}
                            </span>
                          ) : sale.status === "partial" ? (
                            <span className="text-amber-600 bg-amber-50 border-amber-100">
                              {t("billing.partial")}
                            </span>
                          ) : (
                            <span className="text-rose-600 bg-rose-50 border-rose-100">
                              {t("billing.pending")}
                            </span>
                          )}
                        </div>
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
                          ₹{((sale.totalAmount || 0) - additionalChargesTotal - (sale.roundOffAmount || 0)).toLocaleString()}
                        </p>
                        {additionalChargesTotal > 0 && (
                          <p className="text-[10px] text-amber-600 font-bold">
                            + ₹{additionalChargesTotal.toLocaleString()} Charges
                          </p>
                        )}
                        <p className="text-[10px] text-slate-400 font-medium">
                          Item Total (Bill: ₹{sale.totalAmount?.toLocaleString()})
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-emerald-600">
                          ₹{Math.max(0, (sale.amountPaid || 0) - additionalChargesTotal - (sale.roundOffAmount || 0)).toLocaleString()}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          Item Paid (Total: ₹{sale.amountPaid?.toLocaleString()})
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-rose-600">
                          ₹{(sale.balanceDue || 0).toLocaleString()}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          Dues
                        </p>
                      </td>
                      {user?.role !== 'staff' && (
                        <>
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
                              {t("billing.net_profit")}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <p
                              className={`font-black uppercase tracking-widest text-xs ${profit >= 0 ? "text-emerald-500" : "text-rose-500"}`}
                            >
                              {profitPerc.toFixed(1)}%
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              {t("billing.margin")}
                            </p>
                          </td>
                        </>
                      )}
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
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-600">
                          {typeof sale.createdBy === 'object' ? (sale.createdBy as any).name : 'Owner'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
                          Staff Member
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(sale)}
                            className="group relative p-2.5 bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white rounded-xl transition-all shadow-sm active:scale-95"
                            title="Edit Sale"
                          >
                            <Receipt size={16} />
                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                              Edit Sale
                            </span>
                          </button>
                          <button
                            onClick={() => handleDelete(sale._id!)}
                            className="group relative p-2.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl transition-all shadow-sm active:scale-95"
                            title="Delete Sale"
                          >
                            <Trash2 size={16} />
                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                              Delete Sale
                            </span>
                          </button>
                          <button
                            onClick={() => setPrintData(sale)}
                            className="group relative p-2.5 bg-primary-50 text-primary-600 hover:bg-primary-600 hover:text-white rounded-xl transition-all shadow-sm active:scale-95"
                            title="View / Print Invoice"
                          >
                            <Printer size={16} />
                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                              {t("billing.view_invoice")}
                            </span>
                          </button>
                          <button
                            onClick={() => handleWhatsAppShare(sale)}
                            className="group relative p-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all shadow-sm active:scale-95"
                            title="Share on WhatsApp"
                          >
                            <MessageCircle size={16} fill="currentColor" />
                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                              {t("billing.whatsapp_share")}
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {isFetchingNextSalesPage && (
              <div className="flex justify-center p-6 bg-slate-50/30">
                <Loader2 className="animate-spin text-primary-600" size={24} />
              </div>
            )}
            {!hasNextSalesPage && sales.length > 0 && (
              <div className="text-center py-6 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                End of transactions
              </div>
            )}

            {filteredSales.length === 0 && (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Receipt className="text-slate-300" size={28} />
                </div>
                <p className="text-slate-500 font-medium">
                  {t("billing.no_sales_found")}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sale Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4 print:hidden">
          <div className="bg-white w-full max-w-6xl rounded-3xl shadow-2xl p-8 animate-in fade-in zoom-in duration-200 h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h2 className="text-2xl font-black text-slate-800 tracking-tighter">
                {selectedSaleForEdit ? "Edit Sale" : t("billing.new_sale")}
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
                      <UserPlus size={12} /> {t("billing.quick_add")}
                    </button>
                  </div>
                  <CustomerSearch
                    onSelect={handleCustomerSelect}
                    onAddNew={handleAddNewCustomer}
                    initialValue={customerName}
                  />
                  {(customerName || customerPhone) && (
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
                            {customerPhone || "No mobile number"}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerName("");
                          setCustomerPhone("");
                          setCustomerAddress("");
                          setCustomerId(null);
                        }}
                        className="text-slate-300 hover:text-rose-500 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                      {t("billing.invoice_date")}
                    </label>
                    <input
                      type="date"
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-800 focus:ring-2 focus:ring-primary-500 transition-all font-bold text-sm"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                      Customer GSTIN (Optional)
                    </label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-800 focus:ring-2 focus:ring-primary-500 transition-all font-bold text-sm"
                      value={customerGSTIN}
                      onChange={(e) => setCustomerGSTIN(e.target.value.toUpperCase())}
                      placeholder="27AAAAA0000A1Z5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                      Customer State
                    </label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-800 focus:ring-2 focus:ring-primary-500 transition-all font-bold text-sm"
                      value={customerState}
                      onChange={(e) => setCustomerState(e.target.value)}
                      placeholder="e.g. Bihar"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                      State Code
                    </label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-800 focus:ring-2 focus:ring-primary-500 transition-all font-bold text-sm"
                      value={customerStateCode}
                      onChange={(e) => setCustomerStateCode(e.target.value)}
                      placeholder="e.g. 10"
                    />
                  </div>
                </div>
              </div>

              {/* Scan and Add Items Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setItemsModalMode("scan")}
                  className="flex-1 flex items-center justify-center gap-3 p-5 rounded-2xl bg-white border-2 border-primary-100 text-primary-600 font-black uppercase tracking-widest text-sm hover:bg-primary-50 transition-all shadow-sm active:scale-[0.98]"
                >
                  <Scan size={20} />{" "}
                  {t("billing.scan_products") || "Scan Items"}
                </button>
                <button
                  type="button"
                  onClick={() => setItemsModalMode("all")}
                  className="flex-1 flex items-center justify-center gap-3 p-5 rounded-2xl bg-primary-600 text-white font-black uppercase tracking-widest text-sm hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 active:scale-[0.98]"
                >
                  <ShoppingCart size={20} /> {t("billing.add_from_inventory")}
                </button>
              </div>

              {/* Cart List */}
              {(cart.length > 0 || additionalItems.length > 0 || customItems.length > 0) && (
                <div className="space-y-2 border-y border-slate-100 py-4">
                  {cart.map((item, idx) => (
                    <div
                      key={`cart-${idx}`}
                      className="flex items-center justify-between text-sm bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 flex items-center justify-center bg-primary-50 text-primary-600 rounded-xl font-black text-xs">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 tracking-tight">
                            {item.name}
                          </p>
                          {/* Price info badges: Cost Price + MRP */}
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {item.purchasePrice > 0 && (
                              <span className="text-[9px] font-black uppercase tracking-widest text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded">
                                Cost: ₹{item.purchasePrice.toLocaleString()}
                              </span>
                            )}
                            {item.mrp > 0 && (
                              <span className="text-[9px] font-black uppercase tracking-widest text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded">
                                MRP: ₹{item.mrp.toLocaleString()}
                              </span>
                            )}
                            {item.hsnCode && (
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                HSN: {item.hsnCode}
                              </span>
                            )}
                            {item.gstRate !== undefined && item.gstRate > 0 && (
                              <span className="text-[9px] font-black uppercase tracking-widest text-primary-500">
                                GST: {item.gstRate}%
                              </span>
                            )}
                            {item.batchNumber && (
                              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-1 rounded">
                                Batch: {item.batchNumber}
                              </span>
                            )}
                            {item.expiryDate && (
                              <span className="text-[9px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 px-1 rounded">
                                Exp: {item.expiryDate}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <button
                              type="button"
                              onClick={() =>
                                setCart((prev) =>
                                  prev.map((it, i) =>
                                    i === idx
                                      ? {
                                          ...it,
                                          quantity: Math.max(
                                            1,
                                            it.quantity - 1,
                                          ),
                                        }
                                      : it,
                                  ),
                                )
                              }
                              className="w-6 h-6 flex items-center justify-center bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-all text-xs"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              step="any"
                              value={item.quantity}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setCart((prev) =>
                                  prev.map((it, i) =>
                                    i === idx ? { ...it, quantity: val } : it,
                                  ),
                                );
                              }}
                              onWheel={(e) => e.currentTarget.blur()}
                              className="text-xs font-black text-slate-700 w-12 text-center bg-transparent border-none focus:ring-0 p-0"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setCart((prev) =>
                                  prev.map((it, i) =>
                                    i === idx
                                      ? { ...it, quantity: it.quantity + 1 }
                                      : it,
                                  ),
                                )
                              }
                              className="w-6 h-6 flex items-center justify-center bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-all text-xs"
                            >
                              +
                            </button>
                            {/* Discount % input */}
                            <div className="flex items-center py-1 gap-1 px-2 bg-rose-50 border-2 border-rose-100 rounded-2xl hover:border-rose-400 transition-all group/disc shadow-sm">
                              <span className="text-[10px] text-rose-400 font-black uppercase tracking-widest whitespace-nowrap">Disc%</span>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step="any"
                                value={item.discountPercent}
                                onChange={(e) => {
                                  const disc = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                                  const base = item.originalSellingPrice;
                                  const newPrice = parseFloat((base * (1 - disc / 100)).toFixed(2));
                                  setCart((prev) =>
                                    prev.map((it, i) =>
                                      i === idx
                                        ? { ...it, discountPercent: disc, sellingPrice: newPrice }
                                        : it,
                                    ),
                                  );
                                }}
                                onWheel={(e) => e.currentTarget.blur()}
                                className="w-10 bg-transparent py-2 px-1 p-0 rounded-md border-none focus:ring-0 text-sm font-black text-rose-600"
                              />
                            </div>
                            {/* Selling price input */}
                            <div className="flex items-center py-1 gap-2 px-4 bg-white border-2 border-slate-100 rounded-2xl hover:border-primary-500 transition-all group/price shadow-sm">
                              <Edit
                                size={14}
                                className="text-slate-300 group-hover/price:text-primary-500 transition-colors"
                              />
                              <div className="flex items-center gap-2 border-slate-100">
                                {(() => {
                                  const originalProduct = products.find(p => p._id === item.productId);
                                  if (originalProduct?.hasSubUnit) {
                                    return (
                                      <select
                                        value={item.isSubUnit ? 'subunit' : 'unit'}
                                        onChange={(e) => {
                                          const isSub = e.target.value === 'subunit';
                                          const mrp = isSub ? getSubUnitMrp(originalProduct) : (originalProduct.mrp || 0);
                                          const sale = isSub ? getSubUnitSalePrice(originalProduct) : (originalProduct.pricePerUnit || 0);
                                          const cost = isSub ? getSubUnitPurchasePrice(originalProduct) : (originalProduct.purchasePrice || 0);
                                          const uName = isSub ? (originalProduct.subUnitName || 'SubUnit') : originalProduct.unit;
                                          const cFactor = isSub ? (originalProduct.subUnitValue || 1) : 1;
                                          
                                          setCart(prev => prev.map((it, i) => i === idx ? {
                                            ...it,
                                            isSubUnit: isSub,
                                            unit: uName,
                                            conversionFactor: cFactor,
                                            sellingPrice: sale,
                                            originalSellingPrice: sale,
                                            mrp: mrp,
                                            purchasePrice: cost,
                                            discountPercent: (mrp > 0 && sale > 0 && mrp >= sale) ? parseFloat(((1 - sale / mrp) * 100).toFixed(2)) : 0
                                          } : it));
                                        }}
                                        className="text-[10px] text-indigo-600 font-black uppercase tracking-widest bg-indigo-50 border-none rounded focus:ring-0 px-1 py-0.5 cursor-pointer mr-1"
                                      >
                                        <option value="unit">{originalProduct.unit}</option>
                                        <option value="subunit">{originalProduct.subUnitName || 'SubUnit'}</option>
                                      </select>
                                    );
                                  }
                                  return (
                                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mr-1">
                                      {item.unit}
                                    </span>
                                  );
                                })()}
                                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                                  × ₹
                                </span>
                                <input
                                  type="number"
                                  value={item.sellingPrice}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    // When price edited manually, reset discount to 0
                                    const base = item.originalSellingPrice || val;
                                    const disc = base > 0 ? parseFloat(((1 - val / base) * 100).toFixed(1)) : 0;
                                    setCart((prev) =>
                                      prev.map((it, i) =>
                                        i === idx
                                          ? { ...it, sellingPrice: val, discountPercent: Math.max(0, disc) }
                                          : it,
                                      ),
                                    );
                                  }}
                                  onWheel={(e) => e.currentTarget.blur()}
                                  className="w-20 bg-transparent py-2 px-2 p-0 rounded-md border-slate-100 focus:ring-0 text-sm font-black hover:border-primary-500"
                                />
                              </div>
                            </div>
                          </div>
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
                        <div className="w-8 h-8 flex items-center justify-center bg-amber-100 text-amber-600 rounded-xl font-black text-xs">
                          {cart.length + idx + 1}
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
                        <div>
                          <p className="font-black text-slate-800 text-right">
                            ₹{Number(item.price).toLocaleString()}
                          </p>
                          <p className="text-[10px] text-emerald-600 font-bold text-right">
                            Profit: {item.profitPercent}%
                          </p>
                        </div>
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
                  {customItems.map((item, idx) => (
                    <div
                      key={`cust-${idx}`}
                      className="flex items-center justify-between text-sm bg-blue-50/30 p-4 rounded-2xl border border-blue-100/50 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-600 rounded-xl font-black text-xs">
                          {cart.length + additionalItems.length + idx + 1}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">
                            Custom Item / Direct Sale
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-1 mx-4 justify-end items-center gap-2">
                        <div className="text-right">
                          <p className="font-bold text-[10px] text-slate-400">Qty × Rate</p>
                          <p className="font-bold text-slate-700">{item.quantity} × ₹{item.price}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-black text-slate-800 text-right">
                            ₹{(Number(item.price) * Number(item.quantity)).toLocaleString()}
                          </p>
                          <p className="text-[10px] text-emerald-600 font-bold text-right">
                            Profit: {item.profitPercent}%
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setCustomItems(
                              customItems.filter((_, i) => i !== idx),
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
              {/* Additional Charges Section (New) */}
              <div className="p-5 bg-amber-50 rounded-[2rem] border border-amber-100 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                  {t("billing.additional_charges")}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1 w-full space-y-1">
                    <label className="text-[9px] font-black text-amber-700 ml-1 uppercase tracking-widest">Charge Name</label>
                    <input
                      type="text"
                      placeholder={t("billing.charge_name_placeholder")}
                      className="w-full bg-white border border-amber-200 rounded-xl p-3 text-xs font-bold min-w-0 shadow-sm focus:border-amber-500 focus:ring-0"
                      value={newChargeName}
                      onChange={(e) => setNewChargeName(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 sm:w-auto w-full items-end">
                    <div className="flex-1 sm:w-24 space-y-1">
                      <label className="text-[9px] font-black text-amber-700 ml-1 uppercase tracking-widest">Amount</label>
                      <input
                        type="number"
                        placeholder="₹"
                        className="w-full bg-white border border-amber-200 rounded-xl p-3 text-xs font-bold shadow-sm focus:border-amber-500 focus:ring-0"
                        value={newChargePrice}
                        onChange={(e) => setNewChargePrice(e.target.value)}
                        onWheel={(e) => e.currentTarget.blur()}
                      />
                    </div>
                    <div className="flex-1 sm:w-28 space-y-1">
                      <label className="text-[9px] font-black text-amber-700 ml-1 uppercase tracking-widest">Add to Profit</label>
                      <div className="relative">
                        <input
                          type="number"
                          placeholder="%"
                          className="w-full bg-white border border-amber-200 rounded-xl p-3 text-xs font-bold pr-7 shadow-sm focus:border-amber-500 focus:ring-0"
                          value={newChargeProfitPercent}
                          onChange={(e) => setNewChargeProfitPercent(e.target.value)}
                          onWheel={(e) => e.currentTarget.blur()}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-amber-400">%</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (newChargeName && newChargePrice) {
                          setAdditionalItems((prev) => [
                            ...prev,
                            {
                              name: newChargeName,
                              price: newChargePrice,
                              profitPercent: newChargeProfitPercent || "0",
                            },
                          ]);
                          setNewChargeName("");
                          setNewChargePrice("");
                          setNewChargeProfitPercent("0");
                        }
                      }}
                      className="p-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 shadow-md hover:shadow-lg transition-all mb-0.5"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Direct Sale (Custom Items) Section (New) */}
              <div className="p-5 bg-blue-50 rounded-[2rem] border border-blue-100 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">
                  Direct Sale / Custom Item
                </p>
                <div className="flex flex-col md:flex-row gap-3 items-end">
                  <div className="flex-1 w-full space-y-1">
                    <label className="text-[9px] font-black text-blue-700 ml-1 uppercase tracking-widest">Item Name</label>
                    <input
                      type="text"
                      placeholder="E.g. Custom Pipe"
                      className="w-full bg-white border border-blue-200 rounded-xl p-3 text-xs font-bold min-w-0 shadow-sm focus:border-blue-500 focus:ring-0"
                      value={newCustomName}
                      onChange={(e) => setNewCustomName(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 w-full md:w-auto items-end flex-wrap sm:flex-nowrap">
                    <div className="flex-1 sm:w-20 space-y-1">
                      <label className="text-[9px] font-black text-blue-700 ml-1 uppercase tracking-widest">Qty</label>
                      <input
                        type="number"
                        placeholder="Qty"
                        className="w-full bg-white border border-blue-200 rounded-xl p-3 text-xs font-bold shadow-sm focus:border-blue-500 focus:ring-0"
                        value={newCustomQuantity}
                        onChange={(e) => setNewCustomQuantity(e.target.value)}
                        onWheel={(e) => e.currentTarget.blur()}
                      />
                    </div>
                    <div className="flex-1 sm:w-24 space-y-1">
                      <label className="text-[9px] font-black text-blue-700 ml-1 uppercase tracking-widest">Rate</label>
                      <input
                        type="number"
                        placeholder="₹"
                        className="w-full bg-white border border-blue-200 rounded-xl p-3 text-xs font-bold shadow-sm focus:border-blue-500 focus:ring-0"
                        value={newCustomPrice}
                        onChange={(e) => setNewCustomPrice(e.target.value)}
                        onWheel={(e) => e.currentTarget.blur()}
                      />
                    </div>
                    <div className="flex-1 sm:w-24 space-y-1">
                      <label className="text-[9px] font-black text-blue-700 ml-1 uppercase tracking-widest">Profit %</label>
                      <div className="relative">
                        <input
                          type="number"
                          placeholder="%"
                          className="w-full bg-white border border-blue-200 rounded-xl p-3 text-xs font-bold pr-7 shadow-sm focus:border-blue-500 focus:ring-0"
                          value={newCustomProfitPercent}
                          onChange={(e) => setNewCustomProfitPercent(e.target.value)}
                          onWheel={(e) => e.currentTarget.blur()}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-blue-400">%</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (newCustomName && newCustomPrice) {
                          setCustomItems((prev) => [
                            ...prev,
                            {
                              name: newCustomName,
                              price: newCustomPrice,
                              quantity: newCustomQuantity || "1",
                              profitPercent: newCustomProfitPercent || "0",
                            },
                          ]);
                          setNewCustomName("");
                          setNewCustomPrice("");
                          setNewCustomQuantity("1");
                          setNewCustomProfitPercent("0");
                        }
                      }}
                      className="p-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 shadow-md hover:shadow-lg transition-all mb-0.5"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              </div>
              {/* Payment & totals Section */}
              <div className="space-y-4 p-5 bg-slate-50 rounded-3xl">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={paymentMode === "cash"}
                      onChange={(e) => {
                        const isPaid = e.target.checked;
                        setPaymentMode(isPaid ? "cash" : "credit");
                        if (isPaid) {
                          setAmountReceived(grandTotal.toString());
                        } else {
                          setAmountReceived("0");
                        }
                      }}
                      className="w-4 h-4 rounded-lg border-slate-300 text-emerald-600 focus:ring-emerald-500 transition-all cursor-pointer"
                    />
                    <span className="text-xs font-black uppercase tracking-widest text-slate-700 group-hover:text-emerald-600 transition-colors">
                      {t("billing.paid")}
                    </span>
                  </label>
                  {paymentMode === "credit" && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100">
                      {t("billing.credit")}
                    </span>
                  )}
                  {paymentMode === "cash" && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                      {t("billing.cash")}
                    </span>
                  )}
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
                      {/* Need better key? Using total items for now or adding roundoff */}
                      Round Off
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
                      {t("inventory.auto_generate")}
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showQRCode}
                      onChange={(e) => setShowQRCode(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                      {t("billing.show_qr_code")}
                    </span>
                  </label>
                </div>

                {/* Grand Total */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {t("billing.total")}
                  </p>
                  <p className="text-3xl font-black text-primary-600 tracking-tighter">
                    ₹{grandTotal.toLocaleString()}
                  </p>
                </div>

                {/* Amount Received / Change Calculator */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {t("billing.amount_received")}
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="number"
                      placeholder="e.g. 500"
                      className="flex-1 bg-white border border-slate-200 rounded-2xl p-3 text-sm font-bold focus:ring-2 focus:ring-primary-500 transition-all min-w-0"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                    <button
                      type="button"
                      onClick={() => setAmountReceived(grandTotal.toString())}
                      className="px-4 py-3 bg-primary-50 text-primary-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-100 transition-all border border-primary-200 whitespace-nowrap"
                    >
                      {t("billing.exact_amount")}
                    </button>
                  </div>
                  {changeAmount !== null && (
                    <div
                      className={`flex items-center justify-between p-3 rounded-2xl ${changeAmount >= 0 ? "bg-emerald-50 border border-emerald-100" : "bg-rose-50 border border-rose-100"}`}
                    >
                      <p
                        className={`text-xs font-black uppercase tracking-widest ${changeAmount >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                      >
                        {changeAmount >= 0
                          ? t("billing.change_to_return")
                          : t("billing.balance_due")}
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
                  disabled={createSaleMutation.isPending || updateSaleMutation.isPending}
                  className="w-full py-4 bg-primary-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                >
                  {createSaleMutation.isPending ? (
                    <>
                      <Loader2 size={24} className="animate-spin" />{" "}
                      Processing...
                    </>
                  ) : (
                    <>
                      <Receipt size={20} />{" "}
                      {selectedSaleForEdit
                        ? "Update Sale"
                        : t("billing.complete_sale")}{" "}
                      (₹
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-0 md:p-10 animate-in fade-in duration-300 print:static print:bg-white print:p-0 print:m-0 print:h-auto print:w-auto">
          <div className="bg-white w-full max-w-5xl h-full md:h-[90vh] md:rounded-[3rem] shadow-2xl flex flex-col md:flex-row overflow-hidden border border-white/20 relative print:shadow-none print:border-none print:h-auto print:w-auto print:overflow-visible print:block">
            <button
              onClick={() => setPrintData(null)}
              className="absolute top-6 print:hidden right-6 p-3 bg-white/80 backdrop-blur-md rounded-full shadow-xl text-slate-400 hover:text-rose-500 hover:scale-110 transition-all z-[110] hidden md:flex items-center justify-center border border-slate-100"
            >
              <X size={24} />
            </button>

            {/* Preview Area */}
            <div className="flex-1 bg-slate-50 p-4 md:p-8 overflow-y-auto custom-scrollbar flex flex-col items-center print:p-0 print:m-0 print:bg-white print:overflow-visible print:h-auto">
              <div className="md:hidden flex justify-between items-center w-full mb-4 px-2 print:hidden">
                <h3 className="font-black text-slate-800 uppercase tracking-tighter text-lg">
                  Invoice Preview
                </h3>
                <button
                  onClick={() => setPrintData(null)}
                  className="p-2 bg-white rounded-full print:hidden shadow-sm text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              <div
                className={`bg-white shadow-2xl transition-all duration-500 overflow-visible print:shadow-none print:p-0 print:m-0 print:scale-100 print:w-auto print:max-w-none print:mb-0 print:origin-top-left ${invoiceFormat === "thermal" ? "rounded-2xl md:rounded-[2rem] p-6 md:p-10 max-w-[85mm] w-full" : "w-[210mm] min-h-[297mm] scale-[0.45] md:scale-[0.55] lg:scale-[0.75] origin-top mb-[-120px] md:mb-[-150px] lg:mb-[-100px]"}`}
              >
                {invoiceFormat === "thermal" ? (
                  <PrintableInvoice
                    sale={printData || {
                      customerName: customerName || "Cash Sale",
                      customerPhone,
                      customerAddress,
                      customerGSTIN,
                      customerState,
                      customerStateCode,
                      items: cart.map(i => ({
                        ...i,
                        taxRate: i.gstRate,
                        taxAmount: i.gstRate ? (i.quantity * i.sellingPrice * i.gstRate) / (100 + i.gstRate) : 0
                      })),
                      additionalItems,
                      totalAmount: grandTotal,
                      amountPaid: Number(amountReceived) || 0,
                      balanceDue: grandTotal - (Number(amountReceived) || 0),
                      roundOffAmount: roundOffAmount,
                      paymentMode,
                      date: date || new Date().toISOString(),
                      invoiceNumber: "PREVIEW",
                    }}
                    businessName={user?.companyName || "BuildMate ERP"}
                    ownerName={user?.name}
                    companyLogo={user?.logoUrl || (user?.tenantId as any)?.logoUrl}
                    companyEmail={user?.billingEmail || (user?.tenantId as any)?.billingEmail}
                    companyAddress={user?.billingAddress || (user?.tenantId as any)?.billingAddress}
                    companyPhone={user?.phone || (user?.tenantId as any)?.phone}
                    signature={user?.signature || (user?.tenantId as any)?.signature}
                    upiId={showQRCode ? (user?.upiId || (user?.tenantId as any)?.upiId) : undefined}
                    changeAmount={changeAmount !== null && changeAmount > 0 ? changeAmount : undefined}
                    roundOffAmount={printData?.roundOffAmount ?? roundOffAmount}
                    isPreview={true}
                  />
                ) : invoiceFormat === "gst" ? (
                  <GSTInvoice
                    sale={printData || {
                      customerName: customerName || "Cash Sale",
                      customerPhone,
                      customerAddress,
                      customerGSTIN,
                      customerState,
                      customerStateCode,
                      items: cart.map(i => ({
                        ...i,
                        taxRate: i.gstRate,
                        taxAmount: i.gstRate ? (i.quantity * i.sellingPrice * i.gstRate) / (100 + i.gstRate) : 0
                      })),
                      additionalItems,
                      totalAmount: grandTotal,
                      amountPaid: Number(amountReceived) || 0,
                      balanceDue: grandTotal - (Number(amountReceived) || 0),
                      roundOffAmount: roundOffAmount,
                      paymentMode,
                      date: date || new Date().toISOString(),
                      invoiceNumber: "PREVIEW",
                    }}
                    businessName={user?.companyName || "BuildMate ERP"}
                    ownerName={user?.name ?? ""}
                    companyLogo={user?.logoUrl || (user?.tenantId as any)?.logoUrl}
                    companyEmail={user?.billingEmail || (user?.tenantId as any)?.billingEmail}
                    companyAddress={user?.billingAddress || (user?.tenantId as any)?.billingAddress}
                    companyPhone={user?.phone || (user?.tenantId as any)?.phone}
                    signature={user?.signature || (user?.tenantId as any)?.signature}
                    upiId={showQRCode ? (user?.upiId || (user?.tenantId as any)?.upiId) : undefined}
                    gstin={user?.gstin || (user?.tenantId as any)?.gstin}
                    pan={user?.pan || (user?.tenantId as any)?.pan}
                    stateName={user?.stateName || (user?.tenantId as any)?.stateName}
                    stateCode={user?.stateCode || (user?.tenantId as any)?.stateCode}
                    isPreview={true}
                  />
                ) : (
                  <A4Invoice
                    sale={printData || {
                      customerName: customerName || "Cash Sale",
                      customerPhone,
                      customerAddress,
                      customerGSTIN,
                      customerState,
                      customerStateCode,
                      items: cart.map(i => ({
                        ...i,
                        taxRate: i.gstRate,
                        taxAmount: i.gstRate ? (i.quantity * i.sellingPrice * i.gstRate) / (100 + i.gstRate) : 0
                      })),
                      additionalItems,
                      totalAmount: grandTotal,
                      amountPaid: Number(amountReceived) || 0,
                      balanceDue: grandTotal - (Number(amountReceived) || 0),
                      roundOffAmount: roundOffAmount,
                      paymentMode,
                      date: date || new Date().toISOString(),
                      invoiceNumber: "PREVIEW",
                    }}
                    businessName={user?.companyName || "BuildMate ERP"}
                    ownerName={user?.name ?? ""}
                    companyLogo={user?.logoUrl || (user?.tenantId as any)?.logoUrl}
                    companyEmail={user?.billingEmail || (user?.tenantId as any)?.billingEmail}
                    companyAddress={user?.billingAddress || (user?.tenantId as any)?.billingAddress}
                    companyPhone={user?.phone || (user?.tenantId as any)?.phone}
                    signature={user?.signature || (user?.tenantId as any)?.signature}
                    upiId={showQRCode ? (user?.upiId || (user?.tenantId as any)?.upiId) : undefined}
                    gstin={user?.gstin || (user?.tenantId as any)?.gstin}
                    pan={user?.pan || (user?.tenantId as any)?.pan}
                    stateName={user?.stateName || (user?.tenantId as any)?.stateName}
                    stateCode={user?.stateCode || (user?.tenantId as any)?.stateCode}
                    isPreview={true}
                  />
                )}
              </div>
              <style>{`
                @media print {
                    @page { 
                      ${invoiceFormat === "thermal" ? "margin: 0 !important;" : "size: A4; margin: 0 !important;"}
                    }
                    html, body {
                      height: auto !important;
                      overflow: visible !important;
                      margin: 0 !important;
                      padding: 0 !important;
                      background: white !important;
                    }
                    body { 
                      -webkit-print-color-adjust: exact !important; 
                      print-color-adjust: exact !important;
                      image-rendering: crisp-edges;
                      text-rendering: optimizeLegibility;
                    }
                    .no-print { display: none !important; }
                }
              `}</style>
            </div>

            {/* Actions Side/Bottom Panel */}
            <div className="w-full md:w-[400px] bg-white p-8 md:p-12 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-100 print:hidden">
              <div className="hidden md:block">
                <div className="w-16 h-16 bg-primary-50 text-primary-600 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                  <Receipt size={32} />
                </div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-1">
                  {t("billing.invoice_actions")}
                </h3>
                <p className="text-slate-400 font-medium mb-8 text-sm">
                  Managing Invoice #{printData.invoiceNumber}
                </p>
              </div>

              <div className="space-y-6">
                {/* Format Switcher */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">
                    Print Format
                  </label>
                  <div className="bg-slate-50 p-1.5 rounded-2xl flex gap-1.5">
                    <button
                      onClick={() => setInvoiceFormat("thermal")}
                      className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${invoiceFormat === "thermal" ? "bg-white text-primary-600 shadow-md" : "text-slate-400 hover:text-slate-600"}`}
                    >
                      {t("billing.thermal_format")}
                    </button>
                    <button
                      onClick={() => setInvoiceFormat("modern")}
                      className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${invoiceFormat === "modern" ? "bg-white text-primary-600 shadow-md" : "text-slate-400 hover:text-slate-600"}`}
                    >
                      {t("billing.a4_format")}
                    </button>
                    <button
                      onClick={() => setInvoiceFormat("gst")}
                      className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${invoiceFormat === "gst" ? "bg-white text-primary-600 shadow-md" : "text-slate-400 hover:text-slate-600"}`}
                    >
                      GST (A4)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      handleEdit(printData);
                      setPrintData(null);
                    }}
                    className="w-full py-4 bg-amber-50 text-amber-600 rounded-[1.5rem] font-black uppercase tracking-widest text-xs hover:bg-amber-100 transition-all flex items-center justify-center gap-3 border border-amber-200 shadow-sm"
                  >
                    <Edit size={18} /> {t("common.edit")} Bill
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      const btn = e.currentTarget;
                      btn.disabled = true;
                      window.print();
                      setTimeout(() => btn.disabled = false, 2000);
                    }}
                    className="w-full py-4 bg-primary-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-primary-100 hover:bg-primary-700 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                  >
                    <Printer size={18} /> {t("billing.print_now")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleWhatsAppShare(printData)}
                    className="w-full py-4 bg-emerald-500 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-100 hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 active:scale-95"
                  >
                    <MessageCircle size={18} fill="currentColor" />{" "}
                    {t("billing.whatsapp_share")}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      generateInvoice(
                        printData,
                        user?.companyName || "Business",
                        user?.name || "Admin",
                        user?.logoUrl || (user?.tenantId as any)?.logoUrl,
                        user?.billingAddress || (user?.tenantId as any)?.billingAddress,
                        user?.phone || (user?.tenantId as any)?.phone,
                        user?.billingEmail || (user?.tenantId as any)?.billingEmail,
                        user?.signature || (user?.tenantId as any)?.signature,
                        showQRCode ? (user?.upiId || (user?.tenantId as any)?.upiId) : undefined,
                        user?.gstin || (user?.tenantId as any)?.gstin,
                        user?.pan || (user?.tenantId as any)?.pan,
                        user?.stateName || (user?.tenantId as any)?.stateName,
                        user?.stateCode || (user?.tenantId as any)?.stateCode
                      )
                    }
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
      {itemsModalMode !== null && (
        <div className="fixed inset-0 bg-slate-900/55 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div
            className="bg-white w-full max-w-6xl rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col"
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleScan(itemSearch);
                    }
                  }}
                  autoFocus
                />
                {itemSearch && (
                  <button
                    onClick={() => setItemSearch("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 bg-slate-200 text-slate-600 rounded-full hover:bg-slate-300 transition-all z-20"
                    type="button"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10 bg-white border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest w-[400px]">
                      Item Name
                    </th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      Stock
                    </th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      MRP
                    </th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest w-[110px]">
                      Unit
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
                  {products.map((p, index) => {
                    const isLastProduct = index === products.length - 1;
                    return (
                      <tr
                        key={p._id}
                        ref={isLastProduct ? lastProductElementRef : null}
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
                          {p.hasSubUnit && p.subUnitValue ? (
                            <>
                              {Math.floor(Number(p.stock))} <span className="text-[10px] font-bold text-slate-400">{p.unit}</span>
                              {Math.round((Number(p.stock) - Math.floor(Number(p.stock))) * p.subUnitValue) > 0 && (
                                <>
                                  <br/>
                                  {Math.round((Number(p.stock) - Math.floor(Number(p.stock))) * p.subUnitValue)} <span className="text-[10px] font-bold text-slate-400">{p.subUnitName}</span>
                                </>
                              )}
                              <br/>
                              <span className="text-[9px] font-bold text-indigo-400 opacity-80 uppercase tracking-wider">
                                (1 {p.unit} = {p.subUnitValue} {p.subUnitName})
                              </span>
                            </>
                          ) : (
                            Number(p.stock).toFixed(2)
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-slate-500">
                          ₹{itemUnitMap[p._id!] === 'subunit' ? getSubUnitMrp(p) : (p.mrp || 0)}
                        </td>
                        <td className="px-4 py-3">
                          {p.hasSubUnit && p.subUnitValue ? (
                            <select
                              value={itemUnitMap[p._id!] || 'unit'}
                              onChange={(e) => {
                                const val = e.target.value as 'unit' | 'subunit';
                                setItemUnitMap(prev => ({ ...prev, [p._id!]: val }));
                                // Clear custom price so it defaults to the selected unit's price
                                setItemPriceMap(prev => {
                                  const next = { ...prev };
                                  delete next[p._id!];
                                  return next;
                                });
                              }}
                              className="text-[10px] text-indigo-600 font-black uppercase tracking-widest bg-indigo-50 border-none rounded-lg focus:ring-0 px-2 py-1.5 cursor-pointer w-full"
                            >
                              <option value="unit">{p.unit}</option>
                              <option value="subunit">{p.subUnitName}</option>
                            </select>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{p.unit}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            className="w-24 bg-white border border-slate-200 rounded-xl p-2 text-sm font-bold focus:ring-2 focus:ring-primary-500"
                            placeholder={itemUnitMap[p._id!] === 'subunit' ? (p.subUnitSalePrice || (p.pricePerUnit / (p.subUnitValue || 1))).toString() : p.pricePerUnit.toString()}
                            value={itemPriceMap[p._id!] || ""}
                            onChange={(e) =>
                              setItemPriceMap((prev) => ({
                                ...prev,
                                [p._id!]: e.target.value,
                              }))
                            }
                            onWheel={(e) => e.currentTarget.blur()}
                          />
                        </td>
                        <td className="px-4 py-3">
                          {!itemQtyMap[p._id!] ||
                          Number(itemQtyMap[p._id!]) === 0 ? (
                            <button
                              onClick={() => {
                                setItemQtyMap((prev) => ({
                                  ...prev,
                                  [p._id!]: "1",
                                }));
                                const isSub = itemUnitMap[p._id!] === 'subunit';
                                setItemPriceMap((prev) => ({
                                  ...prev,
                                  [p._id!]: isSub ? (p.subUnitSalePrice || p.pricePerUnit).toString() : p.pricePerUnit.toString(),
                                }));
                                setSelectedProducts((prev) => ({
                                  ...prev,
                                  [p._id!]: p,
                                }));
                              }}
                              className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary-700 shadow-lg shadow-primary-100 transition-all active:scale-95"
                            >
                              <Plus size={14} /> Add
                            </button>
                          ) : (
                            <div className="flex items-center bg-emerald-50 rounded-xl p-1 border border-emerald-100 w-fit">
                              <button
                                onClick={() =>
                                  setItemQtyMap((prev) => ({
                                    ...prev,
                                    [p._id!]: Math.max(
                                      0,
                                      Number(prev[p._id!]) - 1,
                                    ).toString(),
                                  }))
                                }
                                className="w-8 h-8 flex items-center justify-center bg-white text-emerald-600 rounded-lg shadow-sm hover:bg-emerald-100 transition-all"
                              >
                                -
                              </button>
                              <input
                                  type="number"
                                  step="any"
                                  value={itemQtyMap[p._id!]}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setItemQtyMap((prev) => ({
                                      ...prev,
                                      [p._id!]: val,
                                    }));
                                  }}
                                  onWheel={(e) => e.currentTarget.blur()}
                                  className="w-12 text-center font-black text-emerald-700 text-sm bg-transparent border-none focus:ring-0 p-0"
                                />
                              <button
                                onClick={() => {
                                  const current = Number(itemQtyMap[p._id!]);
                                  if (current < p.stock) {
                                    setItemQtyMap((prev) => ({
                                      ...prev,
                                      [p._id!]: (current + 1).toString(),
                                    }));
                                  } else {
                                    showToast(
                                      `Max stock reached: ${p.stock}`,
                                      "error",
                                    );
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
                    );
                  })}
                </tbody>
              </table>
              {isFetchingNextProductsPage && (
                <div className="flex justify-center p-6">
                  <Loader2
                    className="animate-spin text-primary-600"
                    size={24}
                  />
                </div>
              )}
              {products.length === 0 && !productsLoading && (
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
                  Mobile Number (Optional)
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
                onClick={() => {
                  if (!customerName) {
                    showToast("Customer name is required", "error");
                    return;
                  }

                  // Set local state is already done via inputs
                  // Close modal immediately like before
                  setIsNewCustomerModalOpen(false);

                  // Save to DB in background
                  createCustomerMutation.mutate({
                    name: customerName,
                    phone: customerPhone.trim() || "",
                    address: customerAddress.trim() || "",
                  });
                }}
                className="w-full py-5 bg-primary-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all mt-4 flex items-center justify-center gap-2"
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
                    const isSubUnitScan = Boolean(p.hasSubUnit && p.subUnitBarcode === hwScannerInput);
                    
                    const mrp = isSubUnitScan ? getSubUnitMrp(p) : (p.mrp || 0);
                    const sale = isSubUnitScan ? getSubUnitSalePrice(p) : (p.pricePerUnit || 0);
                    const cost = isSubUnitScan ? getSubUnitPurchasePrice(p) : (p.purchasePrice || 0);

                    setCart((prev) => [
                      ...prev,
                      {
                        productId: p._id!,
                        name: p.name,
                        quantity: 1,
                        sellingPrice: sale,
                        originalSellingPrice: sale,
                        discountPercent: (mrp > 0 && sale > 0 && mrp >= sale) ? parseFloat(((1 - sale / mrp) * 100).toFixed(2)) : 0,
                        purchasePrice: cost,
                        mrp: mrp,
                        unit: isSubUnitScan ? (p.subUnitName || 'SubUnit') : p.unit,
                        conversionFactor: isSubUnitScan ? (p.subUnitValue || 1) : 1,
                        hsnCode: p.hsnCode,
                        gstRate: p.gstRate,
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
                      Stock: {p.hasSubUnit && p.subUnitValue ? (
                        <>
                          {Math.floor(Number(p.stock))} {p.unit}
                          {Math.round((Number(p.stock) - Math.floor(Number(p.stock))) * p.subUnitValue) > 0 && (
                            <>, {Math.round((Number(p.stock) - Math.floor(Number(p.stock))) * p.subUnitValue)} {p.subUnitName}</>
                          )}
                          <span className="ml-1 text-indigo-400 opacity-80">
                            (1 {p.unit} = {p.subUnitValue} {p.subUnitName})
                          </span>
                        </>
                      ) : (
                        `${Number(p.stock).toFixed(2)} ${p.unit}`
                      )}
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
    </div>
  );
};

export default Sales;
