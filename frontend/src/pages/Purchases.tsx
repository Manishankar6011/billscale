import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import axios from "axios";
import {
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  Loader2,
  Calendar,
  User,
  PlusCircle,
  X,
  Package,
  IndianRupee,
  FileText,
  Edit2
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "../context/ToastContext";
import { TableSkeleton } from "../components/Skeleton";
import type { Purchase, Product } from "../types";
import { cn } from "../lib/utils";

const Purchases = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Form State
  const [supplierName, setSupplierName] = useState("");
  const [supplierGSTIN, setSupplierGSTIN] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [cart, setCart] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch Purchases with Infinite Query
  const { 
    data: purchasesData, 
    isLoading,
    fetchNextPage: fetchNextPurchasesPage,
    hasNextPage: hasNextPurchasesPage,
    isFetchingNextPage: isFetchingNextPurchasesPage
  } = useInfiniteQuery({
    queryKey: ["purchases"],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await axios.get(`/api/purchases?page=${pageParam}&limit=15`);
      return res.data;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.currentPage < lastPage.pagination.totalPages) {
        return lastPage.pagination.currentPage + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });

  const purchases = useMemo(() => {
    return purchasesData?.pages.flatMap((page) => page.purchases) || [];
  }, [purchasesData]);

  // Infinite Scroll Observer for Purchases
  const purchasesObserver = useRef<IntersectionObserver | null>(null);
  const lastPurchaseRef = useCallback(
    (node: HTMLTableRowElement) => {
      if (isLoading) return;
      if (purchasesObserver.current) purchasesObserver.current.disconnect();
      purchasesObserver.current = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting && hasNextPurchasesPage && !isFetchingNextPurchasesPage) {
          fetchNextPurchasesPage();
        }
      });
      if (node) purchasesObserver.current.observe(node);
    },
    [isLoading, hasNextPurchasesPage, isFetchingNextPurchasesPage, fetchNextPurchasesPage],
  );

  // Fetch Products for selection with Infinite Query
  const { 
    data: searchData, 
    isLoading: searching,
    fetchNextPage: fetchNextProductsPage,
    hasNextPage: hasNextProductsPage,
    isFetchingNextPage: isFetchingNextProductsPage
  } = useInfiniteQuery({
    queryKey: ["products-search", debouncedSearchTerm],
    queryFn: async ({ pageParam = 1 }) => {
      if (!debouncedSearchTerm) return { products: [], pagination: { totalPages: 0, currentPage: 1 } };
      const res = await axios.get(`/api/inventory?limit=10&search=${debouncedSearchTerm}&page=${pageParam}`);
      return res.data;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.currentPage < lastPage.pagination.totalPages) {
        return lastPage.pagination.currentPage + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: debouncedSearchTerm.length > 1
  });

  const searchResults = useMemo(() => {
    return searchData?.pages.flatMap((page) => page.products) || [];
  }, [searchData]);

  // Infinite Scroll Observer for Product Search
  const productsObserver = useRef<IntersectionObserver | null>(null);
  const lastProductRef = useCallback(
    (node: HTMLButtonElement) => {
      if (searching) return;
      if (productsObserver.current) productsObserver.current.disconnect();
      productsObserver.current = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting && hasNextProductsPage && !isFetchingNextProductsPage) {
          fetchNextProductsPage();
        }
      });
      if (node) productsObserver.current.observe(node);
    },
    [searching, hasNextProductsPage, isFetchingNextProductsPage, fetchNextProductsPage],
  );

  // Create Purchase Mutation
  const createMutation = useMutation({
    mutationFn: (newPurchase: any) => axios.post("/api/purchases", newPurchase),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["products-search"] });
      setIsModalOpen(false);
      resetForm();
      showToast("Purchase recorded and stock updated!", "success");
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || "Error saving purchase", "error");
    },
  });

  // Update Purchase Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => axios.put(`/api/purchases/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["products-search"] });
      setIsModalOpen(false);
      resetForm();
      showToast("Purchase updated and stock adjusted!", "success");
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || "Error updating purchase", "error");
    },
  });

  // Delete Purchase Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => axios.delete(`/api/purchases/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      showToast("Purchase deleted and stock rolled back", "success");
    },
  });

  const resetForm = () => {
    setSupplierName("");
    setSupplierGSTIN("");
    setBillNumber("");
    setCart([]);
    setDate(format(new Date(), "yyyy-MM-dd"));
    setIsEditing(false);
    setEditingId(null);
  };

  const handleEdit = (purchase: Purchase) => {
    setSupplierName(purchase.supplierName);
    setSupplierGSTIN(purchase.supplierGSTIN || "");
    setBillNumber(purchase.billNumber || "");
    setDate(format(new Date(purchase.date), "yyyy-MM-dd"));
    setCart(purchase.items.map(item => ({
      productId: typeof item.productId === 'string' ? item.productId : item.productId._id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      conversionFactor: item.conversionFactor || 1,
      purchasePrice: item.purchasePrice,
      taxRate: item.taxRate || 0,
      taxAmount: item.taxAmount || 0,
      hsnCode: item.hsnCode || "",
      isSubUnit: Boolean(item.conversionFactor && item.conversionFactor > 1),
      product: typeof item.productId === 'string' ? null : item.productId
    })));
    setIsEditing(true);
    setEditingId(purchase._id!);
    setIsModalOpen(true);
  };

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.productId === product._id);
    if (existing) return;

    setCart([...cart, {
      productId: product._id,
      name: product.name,
      quantity: 1,
      unit: product.unit,
      conversionFactor: 1,
      purchasePrice: product.purchasePrice || 0,
      taxRate: product.gstRate || 0,
      taxAmount: 0,
      hsnCode: product.hsnCode || "",
      isSubUnit: false,
      product: product
    }]);
  };

  const updateCartItem = (index: number, field: string, value: any) => {
    const newCart = [...cart];
    newCart[index][field] = value;
    
    // Calculate Tax Amount if price or qty or taxRate changes
    const item = newCart[index];
    const totalBeforeTax = item.quantity * item.purchasePrice;
    item.taxAmount = (totalBeforeTax * (item.taxRate / 100));
    
    setCart(newCart);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return cart.reduce((acc, item) => {
        const itemTotal = (item.quantity * item.purchasePrice);
        const tax = itemTotal * (item.taxRate / 100);
        return acc + itemTotal + tax;
    }, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      showToast("Please add at least one item", "error");
      return;
    }

    const totalAmount = calculateTotal();
    const totalTax = cart.reduce((acc, item) => acc + (item.quantity * item.purchasePrice * (item.taxRate / 100)), 0);

    const payload = {
      supplierName,
      supplierGSTIN,
      billNumber,
      date,
      items: cart,
      totalAmount,
      taxAmount: totalTax,
      paymentMode: "cash",
      paymentStatus: "paid"
    };

    if (isEditing && editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <ShoppingCart className="text-primary-600" />
            Purchase Management
          </h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-widest text-[10px]">Track inventory acquisitions and supplier bills</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary-200 hover:bg-primary-700 transition-all active:scale-95"
        >
          <Plus size={18} />
          Record New Purchase
        </button>
      </div>

      {/* List */}
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={5} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date & Bill</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Supplier</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Items</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Total Amount</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(purchases || []).map((purchase: Purchase, index: number) => (
                  <tr 
                    key={purchase._id} 
                    ref={index === purchases.length - 1 ? lastPurchaseRef : null}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-700">{format(new Date(purchase.date), "dd MMM yyyy")}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{purchase.billNumber || 'No Bill #'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-800">{purchase.supplierName}</span>
                        {purchase.supplierGSTIN && <span className="text-[9px] font-black text-primary-600 uppercase tracking-tighter">GSTIN: {purchase.supplierGSTIN}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {purchase.items.slice(0, 2).map((item, i) => (
                          <span key={i} className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full w-fit">
                            {item.name} x {item.quantity}
                          </span>
                        ))}
                        {purchase.items.length > 2 && <span className="text-[9px] font-bold text-slate-400">+{purchase.items.length - 2} more</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-black text-slate-900">₹{purchase.totalAmount.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(purchase)}
                          className="p-2 text-primary-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm("Are you sure? This will decrease the stock of these items.")) {
                              deleteMutation.mutate(purchase._id!);
                            }
                          }}
                          className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(purchases || []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-3xl flex items-center justify-center">
                          <ShoppingCart size={32} />
                        </div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No purchases recorded yet</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Purchase Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center">
                  <PlusCircle size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">{isEditing ? 'Edit Purchase Bill' : 'Record Purchase Bill'}</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isEditing ? 'Modify existing purchase records' : 'Update stock levels and track expenses'}</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-rose-50 hover:text-rose-600 transition-all">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 flex flex-col gap-8 custom-scrollbar">
              {/* Supplier Info */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Supplier Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      required
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      placeholder="e.g. Ramesh Distributors"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-100 focus:border-primary-400 outline-none transition-all font-bold text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Supplier GSTIN (Optional)</label>
                  <input
                    type="text"
                    value={supplierGSTIN}
                    onChange={(e) => setSupplierGSTIN(e.target.value.toUpperCase())}
                    placeholder="09AAAAA0000A1Z5"
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-100 focus:border-primary-400 outline-none transition-all font-bold text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Bill / Invoice #</label>
                  <div className="relative">
                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      value={billNumber}
                      onChange={(e) => setBillNumber(e.target.value)}
                      placeholder="INV-2024-001"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-100 focus:border-primary-400 outline-none transition-all font-bold text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Purchase Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-100 focus:border-primary-400 outline-none transition-all font-bold text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Product Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Add Items to Purchase</h3>
                  <span className="text-[10px] font-black text-primary-600 bg-primary-50 px-3 py-1 rounded-full uppercase tracking-widest">{cart.length} Items Selected</span>
                </div>
                
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search product to add..."
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-14 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-100 focus:border-primary-400 outline-none transition-all font-bold text-sm"
                  />
                  
                  {searchTerm && (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-100 rounded-3xl shadow-2xl z-50 max-h-60 overflow-y-auto p-2">
                      {searching ? (
                         <div className="p-4 text-center text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse">Searching...</div>
                      ) : (searchResults || []).length > 0 ? (
                        (searchResults || []).map((p: Product, index: number) => (
                          <button
                            key={p._id}
                            type="button"
                            ref={index === searchResults.length - 1 ? lastProductRef : null}
                            onClick={() => {
                              addToCart(p);
                              setSearchTerm("");
                            }}
                            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors text-left"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                                <Package size={20} />
                              </div>
                              <div>
                                <p className="text-sm font-black text-slate-800">{p.name}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                  Current Stock: {p.hasSubUnit && p.subUnitValue ? (
                                    <>
                                      {Math.floor(Number(p.stock))} {p.unit}, {Math.round((Number(p.stock) - Math.floor(Number(p.stock))) * p.subUnitValue)} {p.subUnitName}
                                    </>
                                  ) : (
                                    `${p.stock} ${p.unit}`
                                  )}
                                </p>
                              </div>
                            </div>
                            <Plus size={20} className="text-primary-500" />
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">No products found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Cart Items */}
              <div className="flex-1 min-h-[200px]">
                {cart.length > 0 ? (
                  <div className="border border-slate-100 rounded-3xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Item Name</th>
                          <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Qty</th>
                          <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Price (ea)</th>
                          <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">GST %</th>
                          <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Total</th>
                          <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {cart.map((item: any, index: number) => (
                          <tr key={item.productId} className="hover:bg-slate-50/30">
                            <td className="px-6 py-3">
                              <span className="text-sm font-black text-slate-800">{item.name}</span>
                            </td>
                            <td className="px-6 py-3 w-32">
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => updateCartItem(index, "quantity", Number(e.target.value))}
                                  className="w-16 px-2 py-2 bg-slate-50 border border-slate-100 rounded-xl font-bold text-sm outline-none"
                                />
                                {item.product?.hasSubUnit ? (
                                  <select
                                    value={item.isSubUnit ? 'subunit' : 'unit'}
                                    onChange={(e) => {
                                      const isSub = e.target.value === 'subunit';
                                      const p = item.product;
                                      const uName = isSub ? (p.subUnitName || 'SubUnit') : p.unit;
                                      const cFactor = isSub ? (p.subUnitValue || 1) : 1;
                                      const pPrice = isSub ? (p.subUnitPurchasePrice || p.purchasePrice) : p.purchasePrice;
                                      
                                      const newCart = [...cart];
                                      newCart[index] = {
                                        ...newCart[index],
                                        isSubUnit: isSub,
                                        unit: uName,
                                        conversionFactor: cFactor,
                                        purchasePrice: pPrice
                                      };
                                      // recalculate tax
                                      const totalBeforeTax = newCart[index].quantity * newCart[index].purchasePrice;
                                      newCart[index].taxAmount = (totalBeforeTax * (newCart[index].taxRate / 100));
                                      setCart(newCart);
                                    }}
                                    className="text-[10px] font-black text-indigo-600 uppercase bg-indigo-50 border-none rounded outline-none p-1 w-16"
                                  >
                                    <option value="unit">{item.product.unit}</option>
                                    <option value="subunit">{item.product.subUnitName || 'SubUnit'}</option>
                                  </select>
                                ) : (
                                  <span className="text-[10px] font-black text-slate-400 uppercase">{item.unit}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-3 w-40">
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                                <input
                                  type="number"
                                  value={item.purchasePrice}
                                  onChange={(e) => updateCartItem(index, "purchasePrice", Number(e.target.value))}
                                  className="w-full pl-6 pr-3 py-2 bg-slate-50 border border-slate-100 rounded-xl font-bold text-sm outline-none"
                                />
                              </div>
                            </td>
                            <td className="px-6 py-3 w-24">
                                <select
                                    value={item.taxRate}
                                    onChange={(e) => updateCartItem(index, "taxRate", Number(e.target.value))}
                                    className="w-full px-2 py-2 bg-slate-50 border border-slate-100 rounded-xl font-bold text-sm outline-none"
                                >
                                    {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                                </select>
                            </td>
                            <td className="px-6 py-3">
                              <span className="text-sm font-black text-slate-800">₹{((item.quantity * item.purchasePrice) * (1 + item.taxRate/100)).toFixed(2)}</span>
                            </td>
                            <td className="px-6 py-3 text-right">
                              <button onClick={() => removeFromCart(index)} className="p-2 text-slate-300 hover:text-rose-500 transition-all">
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-3xl p-10 opacity-50">
                    <ShoppingCart size={40} className="text-slate-200 mb-4" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Your purchase cart is empty.<br/>Search products above to add them.</p>
                  </div>
                )}
              </div>

              {/* Summary & Submit */}
              <div className="shrink-0 flex flex-col md:flex-row items-center justify-between gap-8 pt-8 border-t border-slate-100">
                <div className="flex items-center gap-8">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Subtotal</p>
                    <p className="text-lg font-black text-slate-600 tracking-tight">₹{cart.reduce((acc, item) => acc + (item.quantity * item.purchasePrice), 0).toLocaleString()}</p>
                  </div>
                  <div className="w-px h-10 bg-slate-100 hidden md:block"></div>
                  <div>
                    <p className="text-[10px] font-black text-primary-400 uppercase tracking-[0.2em] mb-1">Total Tax (GST)</p>
                    <p className="text-lg font-black text-primary-600 tracking-tight">₹{cart.reduce((acc, item) => acc + (item.quantity * item.purchasePrice * (item.taxRate / 100)), 0).toLocaleString()}</p>
                  </div>
                  <div className="w-px h-10 bg-slate-100 hidden md:block"></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Grand Total</p>
                    <p className="text-3xl font-black text-slate-900 tracking-tighter">₹{calculateTotal().toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="px-8 py-4 text-slate-400 font-black uppercase tracking-widest text-xs hover:text-slate-600 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={createMutation.isPending || updateMutation.isPending || cart.length === 0}
                        className="flex-1 md:flex-none flex items-center justify-center gap-3 px-12 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all disabled:opacity-50"
                    >
                        {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="animate-spin" /> : <><ShoppingCart size={18} /> {isEditing ? 'Update Purchase' : 'Save Purchase Bill'}</>}
                    </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Purchases;
