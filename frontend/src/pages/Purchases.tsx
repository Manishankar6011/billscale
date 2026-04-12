import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, ShoppingCart, Search, ArrowDownLeft, Trash2 } from 'lucide-react';
import axios from 'axios';
import type { Purchase, Product } from '../types';
import { useAuth } from '../context/AuthContext';
import Skeleton from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import { format } from 'date-fns';

const Purchases = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { showToast } = useToast();
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        supplierName: '',
        productId: '',
        quantity: '',
        purchasePrice: '',
        paymentStatus: 'pending',
        date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [purchasesRes, productsRes] = await Promise.all([
                axios.get('/api/transactions/purchases', { headers: { Authorization: `Bearer ${user?.token}` } }),
                axios.get('/api/inventory', { headers: { Authorization: `Bearer ${user?.token}` } })
            ]);
            setPurchases(purchasesRes.data);
            setProducts(productsRes.data);
        } catch (err) {
            showToast('Error loading data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (purchase: Purchase) => {
        setEditingId(purchase._id!);
        setFormData({
            supplierName: purchase.supplierName,
            productId: (purchase.productId as any)?._id || (purchase.productId as unknown as string),
            quantity: purchase.quantity.toString(),
            purchasePrice: purchase.purchasePrice.toString(),
            paymentStatus: purchase.paymentStatus,
            date: new Date(purchase.date).toISOString().split('T')[0]
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this purchase record? The product stock will be automatically reverted.')) return;
        try {
            await axios.delete(`/api/transactions/purchases/${id}`, {
                headers: { Authorization: `Bearer ${user?.token}` }
            });
            showToast('Purchase deleted and stock reverted', 'success');
            fetchData();
        } catch (err) {
            showToast('Error deleting purchase', 'error');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await axios.put(`/api/transactions/purchases/${editingId}`, formData, {
                    headers: { Authorization: `Bearer ${user?.token}` }
                });
                showToast('Purchase updated successfully!', 'success');
            } else {
                await axios.post('/api/transactions/purchases', formData, {
                    headers: { Authorization: `Bearer ${user?.token}` }
                });
                showToast('Purchase recorded successfully!', 'success');
            }
            setIsModalOpen(false);
            setEditingId(null);
            fetchData();
            setFormData({
                supplierName: '',
                productId: '',
                quantity: '',
                purchasePrice: '',
                paymentStatus: 'pending',
                date: new Date().toISOString().split('T')[0]
            });
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Error processing purchase', 'error');
        }
    };

    if (loading) return <Skeleton count={5} />;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{t('billing.purchase_title')}</h1>
                    <p className="text-slate-500">Record inventory purchases and track supplier payments</p>
                </div>
                <button 
                    onClick={() => {
                        setEditingId(null);
                        setFormData({
                            supplierName: '',
                            productId: '',
                            quantity: '',
                            purchasePrice: '',
                            paymentStatus: 'pending',
                            date: new Date().toISOString().split('T')[0]
                        });
                        setIsModalOpen(true);
                    }}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus size={20} />
                    New Purchase
                </button>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">Date</th>
                                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">Supplier</th>
                                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">Item</th>
                                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">Qty</th>
                                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">Total</th>
                                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">Status</th>
                                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {purchases.map((purchase) => (
                                <tr key={purchase._id} className="hover:bg-slate-50/50 transition-colors">
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
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                            purchase.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                        }`}>
                                            {purchase.paymentStatus}
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
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Purchase Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-slate-800 tracking-tighter">
                                {editingId ? 'Edit Purchase Entry' : 'New Purchase Entry'}
                            </h2>
                            <button onClick={() => {
                                setIsModalOpen(false);
                                setEditingId(null);
                            }} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all">&times;</button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Supplier Name</label>
                                <input 
                                    required
                                    type="text" 
                                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-800 focus:ring-2 transition-all font-bold placeholder:font-medium"
                                    placeholder="Enter supplier name..."
                                    value={formData.supplierName}
                                    onChange={(e) => setFormData({...formData, supplierName: e.target.value})}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Item</label>
                                    <select 
                                        required
                                        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-800 focus:ring-2 transition-all font-bold"
                                        value={formData.productId}
                                        onChange={(e) => setFormData({...formData, productId: e.target.value})}
                                    >
                                        <option value="" className="font-medium">Select Material</option>
                                        {products.map(p => (
                                            <option key={p._id} value={p._id} className="font-bold">{p.name} ({p.unit})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Quantity</label>
                                    <input 
                                        required
                                        type="number" 
                                        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-800 focus:ring-2 transition-all font-bold"
                                        placeholder="0"
                                        value={formData.quantity}
                                        onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Purchase Price</label>
                                    <input 
                                        required
                                        type="number" 
                                        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-800 focus:ring-2 transition-all font-bold"
                                        placeholder="0"
                                        value={formData.purchasePrice}
                                        onChange={(e) => setFormData({...formData, purchasePrice: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Status</label>
                                    <select 
                                        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-800 focus:ring-2 transition-all font-bold"
                                        value={formData.paymentStatus}
                                        onChange={(e) => setFormData({...formData, paymentStatus: e.target.value})}
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="paid">Paid</option>
                                    </select>
                                </div>
                            </div>

                            <button type="submit" className="btn-primary w-full py-5 text-lg shadow-xl shadow-emerald-100 flex items-center justify-center gap-2 font-bold">
                                {editingId ? 'Update Purchase' : 'Record Purchase'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Purchases;
