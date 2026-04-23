import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Plus,
  ShoppingCart,
  Trash2,
  Loader2,
  Search,
  ArrowLeft,
} from "lucide-react";
import axios from "axios";
import type {
  Purchase,
  Product,
  PaginatedResponse,
  PaginatedPurchasesResponse,
} from "../types";
import { useAuth } from '../context/AuthContext';
import { TableSkeleton } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import { format } from 'date-fns';

const Purchases = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // State Declarations
  const [filterSearch, setFilterSearch] = useState("");
  const [debouncedFilterSearch, setDebouncedFilterSearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [debouncedItemSearch, setDebouncedItemSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isItemSelectModalOpen, setIsItemSelectModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    supplierName: '',
    productId: '',
    quantity: '',
    purchasePrice: '',
    sellingPrice: '',
    mrp: '',
    paymentStatus: 'pending',
    date: new Date().toISOString().split('T')[0]
  });

  // Debounce search terms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedFilterSearch(filterSearch), 500);
    return () => clearTimeout(timer);
  }, [filterSearch]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedItemSearch(itemSearch), 500);
    return () => clearTimeout(timer);
  }, [itemSearch]);

  // Infinite Query for Purchases
  const {
    data: purchasesData,
    isLoading: purchasesLoading,
    fetchNextPage: fetchNextPurchasesPage,
    hasNextPage: hasNextPurchasesPage,
    isFetchingNextPage: isFetchingNextPurchasesPage,
  } = useInfiniteQuery<PaginatedPurchasesResponse>({
    queryKey: ["purchases", debouncedFilterSearch],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await axios.get<PaginatedPurchasesResponse>(
        "/api/transactions/purchases",
        {
          params: {
            page: pageParam,
            limit: 20,
            search: debouncedFilterSearch,
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

  const purchases = useMemo(() => {
    return purchasesData?.pages.flatMap((page) => page.purchases) || [];
  }, [purchasesData]);

  // Infinite Query for Products (Inventory)
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
    return productsData?.pages.flatMap((page) => page.products) || [];
  }, [productsData]);

  // Infinite Scroll Observers
  const purchasesObserver = useRef<IntersectionObserver | null>(null);
  const lastPurchaseElementRef = useCallback(
    (node: HTMLTableRowElement) => {
      if (purchasesLoading) return;
      if (purchasesObserver.current) purchasesObserver.current.disconnect();
      purchasesObserver.current = new IntersectionObserver((entries) => {
        if (
          entries[0]?.isIntersecting &&
          hasNextPurchasesPage &&
          !isFetchingNextPurchasesPage
        ) {
          fetchNextPurchasesPage();
        }
      });
      if (node) purchasesObserver.current.observe(node);
    },
    [
      purchasesLoading,
      hasNextPurchasesPage,
      isFetchingNextPurchasesPage,
      fetchNextPurchasesPage,
    ],
  );

  const productsObserver = useRef<IntersectionObserver | null>(null);
  const lastProductElementRef = useCallback(
    (node: HTMLTableRowElement) => {
      if (productsLoading) return;
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
    ],
  );

  const loading =
    (purchasesLoading || productsLoading) &&
    purchases.length === 0 &&
    products.length === 0;

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Purchase>) => {
      if (editingId) {
        return axios.put<Purchase>(`/api/transactions/purchases/${editingId}`, data, {
          headers: { Authorization: `Bearer ${user?.token}` }
        });
      } else {
        return axios.post<Purchase>('/api/transactions/purchases', data, {
          headers: { Authorization: `Bearer ${user?.token}` }
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      showToast(editingId ? t('billing.purchase_updated') : t('billing.purchase_recorded'), 'success');
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({
        supplierName: '',
        productId: '',
        quantity: '',
        purchasePrice: '',
        sellingPrice: '',
        mrp: '',
        paymentStatus: 'pending',
        date: new Date().toISOString().split('T')[0]
      });
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || t('common.error'), 'error');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return axios.delete(`/api/transactions/purchases/${id}`, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      showToast(t('billing.purchase_deleted'), 'success');
    },
    onError: () => {
      showToast(t('common.error'), 'error');
    }
  });

  const handleEdit = (purchase: Purchase) => {
    setEditingId(purchase._id!);
    setFormData({
      supplierName: purchase.supplierName,
      productId: (purchase.productId as any)?._id || (purchase.productId as unknown as string),
      quantity: purchase.quantity.toString(),
      purchasePrice: purchase.purchasePrice.toString(),
      sellingPrice: (purchase.productId as any)?.pricePerUnit?.toString() || '',
      mrp: (purchase.productId as any)?.mrp?.toString() || '',
      paymentStatus: purchase.paymentStatus,
      date: new Date(purchase.date).toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('common.confirm_delete_purchase'))) return;
    deleteMutation.mutate(id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: Partial<Purchase> = {
      ...formData,
      quantity: Number(formData.quantity),
      purchasePrice: Number(formData.purchasePrice),
      sellingPrice: Number(formData.sellingPrice),
      mrp: Number(formData.mrp),
      paymentStatus: formData.paymentStatus as 'pending' | 'paid',
      date: (formData.date || new Date().toISOString().split('T')[0]) as string
    };
    saveMutation.mutate(data);
  };

  if (loading) return <TableSkeleton rows={10} />;

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{t('billing.purchase_title')}</h1>
            <p className="text-slate-500">{t('billing.purchase_subtitle')}</p>
          </div>
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({
                supplierName: '',
                productId: '',
                quantity: '',
                purchasePrice: '',
                sellingPrice: '',
                mrp: '',
                paymentStatus: 'pending',
                date: new Date().toISOString().split('T')[0]
              });
              setIsModalOpen(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            {t('billing.new_purchase')}
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input
              type="text"
              className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-primary-500 transition-all"
              placeholder={t('billing.search_purchases_placeholder')}
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">{t('common.date')}</th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">{t('billing.supplier')}</th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">{t('common.products')}</th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">{t('common.qty')}</th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">{t('common.total')}</th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">{t('common.status')}</th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {purchases.map((purchase, index) => {
                  const isLast = index === purchases.length - 1;
                  return (
                    <tr
                      key={purchase._id}
                      ref={isLast ? lastPurchaseElementRef : null}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {format(new Date(purchase.date), 'dd MMM yyyy')}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800">{purchase.supplierName}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                            <ShoppingCart size={14} />
                          </div>
                          <span className="text-sm font-medium text-slate-700">{(purchase.productId as any)?.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-black text-slate-800">
                        {purchase.quantity} <span className="text-slate-400 text-xs font-medium">{(purchase.productId as any)?.unit}</span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-black text-emerald-600">₹{purchase.totalAmount.toLocaleString()}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${purchase.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                          }`}>
                          {purchase.paymentStatus === 'paid' ? t('billing.paid') : t('billing.pending')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(purchase)}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                          title="Edit Purchase"
                        >
                          <ShoppingCart size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(purchase._id!)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="Delete Purchase"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {isFetchingNextPurchasesPage && (
              <div className="p-4 flex justify-center">
                <Loader2 className="animate-spin text-primary-600" size={24} />
              </div>
            )}
            {purchases.length === 0 && !purchasesLoading && (
              <div className="text-center py-20 bg-white">
                <ShoppingCart className="mx-auto text-slate-200 mb-4" size={64} />
                <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">{t('billing.no_purchases')}</h3>
                <p className="text-slate-400 mt-1">{t('billing.no_purchases_found')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Purchase Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-slate-800 tracking-tighter">
                  {editingId ? t('billing.update_purchase') : t('billing.new_purchase')}
                </h2>
                <button onClick={() => {
                  setIsModalOpen(false);
                  setEditingId(null);
                }} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all">&times;</button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-2">
                  <p className="text-[11px] font-black text-amber-700 uppercase tracking-widest leading-relaxed">
                    ⚠️ Please enter the Per Unit Price, not the total amount.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">{t('billing.supplier_name')}</label>
                  <input
                    required
                    type="text"
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-800 focus:ring-2 transition-all font-bold placeholder:font-medium"
                    placeholder={t('billing.supplier_name')}
                    value={formData.supplierName}
                    onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">{t('common.products')}</label>
                    <button
                      type="button"
                      onClick={() => setIsItemSelectModalOpen(true)}
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-800 focus:ring-2 transition-all font-bold flex items-center justify-between group hover:bg-slate-100"
                    >
                      <span className={formData.productId ? 'text-slate-800' : 'text-slate-400 font-medium'}>
                        {formData.productId
                          ? products.find(p => p._id === formData.productId)?.name
                          : t('inventory.select_product')}
                      </span>
                      <Search size={18} className="text-slate-300 group-hover:text-primary-500 transition-colors" />
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">{t('common.qty')}</label>
                    <input
                      required
                      type="number"
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-800 focus:ring-2 transition-all font-bold"
                      placeholder="0"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">{t('inventory.cost_price')} (Unit)</label>
                    <input
                      required
                      type="number"
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-800 focus:ring-2 transition-all font-bold"
                      placeholder="0"
                      value={formData.purchasePrice}
                      onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">{t('inventory.selling_price')} (Unit)</label>
                    <input
                      required
                      type="number"
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-800 focus:ring-2 transition-all font-bold border-2 border-emerald-100/50"
                      placeholder="0"
                      value={formData.sellingPrice}
                      onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">{t('inventory.mrp')} (Unit)</label>
                    <input
                      required
                      type="number"
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-800 focus:ring-2 transition-all font-bold border-2 border-blue-100/50"
                      placeholder="0"
                      value={formData.mrp}
                      onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">{t('common.status')}</label>
                    <select
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-800 focus:ring-2 transition-all font-bold"
                      value={formData.paymentStatus}
                      onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                    >
                      <option value="pending">{t('billing.pending')}</option>
                      <option value="paid">{t('billing.paid')}</option>
                    </select>
                  </div>
                </div>

                <button type="submit" disabled={saveMutation.isPending} className="btn-primary w-full py-5 text-lg shadow-xl shadow-emerald-100 flex items-center justify-center gap-2 font-bold">
                  {saveMutation.isPending ? <Loader2 className="animate-spin" /> : (editingId ? t('billing.update_purchase') : t('billing.record_purchase'))}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Item Selection Modal */}
      {isItemSelectModalOpen && (
        <div className="fixed inset-0 bg-slate-900/55 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsItemSelectModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all"
                >
                  <ArrowLeft size={20} />
                </button>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">
                  {t('inventory.select_product')}
                </h3>
              </div>
            </div>

            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder={t('inventory.search_placeholder')}
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
                    <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('common.name')}</th>
                    <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('inventory.stock')}</th>
                    <th className="px-6 py-3 text-right pr-10 text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {products.map((p, index) => {
                    const isLastProduct = index === products.length - 1;
                    return (
                      <tr
                        key={p._id}
                        ref={isLastProduct ? lastProductElementRef : null}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-800">{p.name}</p>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{p.unit} · {p.batchNumber || 'No Batch'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-sm font-black ${p.stock <= p.minStockAlert ? 'text-rose-500' : 'text-slate-600'}`}>
                            {p.stock} <span className="text-[10px] text-slate-400 font-medium uppercase">{p.unit}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right pr-6">
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                productId: p._id!,
                                purchasePrice: p.purchasePrice.toString(),
                                sellingPrice: p.pricePerUnit.toString(),
                                mrp: (p.mrp || 0).toString()
                              });
                              setIsItemSelectModalOpen(false);
                            }}
                            className="px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary-700 transition-all shadow-lg shadow-primary-100"
                          >
                            {t('common.select')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {isFetchingNextProductsPage && (
                <div className="p-4 flex justify-center">
                  <Loader2 className="animate-spin text-primary-600" size={24} />
                </div>
              )}
              {products.length === 0 && !productsLoading && (
                <div className="text-center py-12">
                  <Search className="mx-auto text-slate-200 mb-2" size={40} />
                  <p className="text-slate-400 font-medium">{t('inventory.no_products')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Purchases;
