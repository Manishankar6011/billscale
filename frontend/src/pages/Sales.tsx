import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Receipt, Search, Filter, ArrowUpRight } from 'lucide-react';
import axios from 'axios';
import type { Sale, Product } from '../types';
import { useAuth } from '../context/AuthContext';
import Skeleton from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import { format } from 'date-fns';
import { generateInvoice } from '../utils/invoiceGenerator';

const Sales = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { showToast } = useToast();
    const [sales, setSales] = useState<Sale[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [customerName, setCustomerName] = useState('');
    const [paymentMode, setPaymentMode] = useState<'cash' | 'credit'>('cash');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    // Cart State
    const [cart, setCart] = useState<{ productId: string, name: string, quantity: number, sellingPrice: number, unit: string }[]>([]);
    const [currentItem, setCurrentItem] = useState({ productId: '', quantity: '', sellingPrice: '' });

    const addToCart = () => {
        if (!currentItem.productId || !currentItem.quantity || !currentItem.sellingPrice) {
            showToast('Please fill all item details', 'error');
            return;
        }
        const product = products.find(p => p._id === currentItem.productId);
        if (product) {
            setCart([...cart, {
                productId: product._id!,
                name: product.name,
                quantity: Number(currentItem.quantity),
                sellingPrice: Number(currentItem.sellingPrice),
                unit: product.unit
            }]);
            setCurrentItem({ productId: '', quantity: '', sellingPrice: '' });
        }
    };

    const removeFromCart = (index: number) => {
        setCart(cart.filter((_, i) => i !== index));
    };

    const grandTotal = cart.reduce((acc, item) => acc + (item.quantity * item.sellingPrice), 0);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [salesRes, productsRes] = await Promise.all([
                axios.get('/api/transactions/sales', { headers: { Authorization: `Bearer ${user?.token}` } }),
                axios.get('/api/inventory', { headers: { Authorization: `Bearer ${user?.token}` } })
            ]);
            setSales(salesRes.data);
            setProducts(productsRes.data);
        } catch (err) {
            showToast('Error loading data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cart.length === 0) {
            showToast('Add at least one item to cart', 'error');
            return;
        }

        try {
            await axios.post('/api/transactions/sales', {
                customerName,
                items: cart.map(i => ({ productId: i.productId, quantity: i.quantity, sellingPrice: i.sellingPrice })),
                paymentMode,
                date,
                status: paymentMode === 'cash' ? 'paid' : 'pending'
            }, {
                headers: { Authorization: `Bearer ${user?.token}` }
            });

            showToast('Sale recorded successfully!', 'success');
            setIsModalOpen(false);
            fetchData();
            setCustomerName('');
            setCart([]);
            setPaymentMode('cash');
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Error processing sale', 'error');
        }
    };

    if (loading) return <Skeleton count={5} />;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{t('billing.sale_title')}</h1>
                    <p className="text-slate-500">Track and generate invoices for product sales</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus size={20} />
                    New Sale
                </button>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">{t('common.date')}</th>
                                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">{t('billing.customer')}</th>
                                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">{t('common.products')}</th>
                                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">{t('common.qty')}</th>
                                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">{t('common.total')}</th>
                                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">{t('billing.mode')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {sales.map((sale) => (
                                <tr key={sale._id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {format(new Date(sale.date), 'dd MMM yyyy')}
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-slate-800">{sale.customerName}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            {sale.items.slice(0, 2).map((item: any, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                                                    <span className="text-xs font-bold text-slate-600">{item.productId?.name}</span>
                                                </div>
                                            ))}
                                            {sale.items.length > 2 && (
                                                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                                                    + {sale.items.length - 2} more items
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-black text-slate-800">
                                        {sale.items.length} <span className="text-slate-400 text-xs font-medium">items</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-black text-primary-600">₹{sale.totalAmount.toLocaleString()}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-between gap-4">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                                sale.paymentMode === 'cash' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                            }`}>
                                                {sale.paymentMode}
                                            </span>
                                            <button 
                                                onClick={() => generateInvoice(sale, user?.companyName, user?.name)}
                                                className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                                                title="Download Invoice"
                                            >
                                                <ArrowUpRight size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Sale Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-slate-800 tracking-tighter">Record New Sale</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all">&times;</button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">{t('billing.customer')}</label>
                                    <input 
                                        required
                                        type="text" 
                                        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-800 focus:ring-2 focus:ring-primary-500 transition-all font-bold placeholder:font-medium text-sm"
                                        placeholder="Customer Name"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Invoice Date</label>
                                    <input 
                                        type="date" 
                                        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-800 focus:ring-2 focus:ring-primary-500 transition-all font-bold text-sm"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-primary-50/50 rounded-2xl space-y-4 border border-primary-100">
                                <p className="text-[10px] font-black uppercase tracking-widest text-primary-600">Quick Add Item</p>
                                <div className="grid grid-cols-12 gap-2">
                                    <div className="col-span-5">
                                        <select 
                                            className="w-full bg-white border-none rounded-xl p-3 text-slate-800 text-sm font-bold"
                                            value={currentItem.productId}
                                            onChange={(e) => {
                                                const p = products.find(x => x._id === e.target.value);
                                                setCurrentItem({...currentItem, productId: e.target.value, sellingPrice: p ? p.pricePerUnit.toString() : ''});
                                            }}
                                        >
                                            <option value="">Select Item</option>
                                            {products.map(p => (
                                                <option key={p._id} value={p._id}>{p.name} ({p.stock} {p.unit})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-3">
                                        <input 
                                            type="number" 
                                            className="w-full bg-white border-none rounded-xl p-3 text-slate-800 text-sm font-bold"
                                            placeholder="Qty"
                                            value={currentItem.quantity}
                                            onChange={(e) => setCurrentItem({...currentItem, quantity: e.target.value})}
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <input 
                                            type="number" 
                                            className="w-full bg-white border-none rounded-xl p-3 text-slate-800 text-sm font-bold"
                                            placeholder="Price"
                                            value={currentItem.sellingPrice}
                                            onChange={(e) => setCurrentItem({...currentItem, sellingPrice: e.target.value})}
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <button 
                                            type="button"
                                            onClick={addToCart}
                                            className="w-full h-full bg-primary-600 text-white rounded-xl flex items-center justify-center hover:bg-primary-700 transition-all font-bold text-xl"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Cart List */}
                            {cart.length > 0 && (
                                <div className="max-h-40 overflow-y-auto space-y-2 border-y border-slate-100 py-4">
                                    {cart.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-sm bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <div>
                                                <p className="font-bold text-slate-700">{item.name}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">{item.quantity} {item.unit} x ₹{item.sellingPrice}</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <p className="font-black text-slate-800">₹{(item.quantity * item.sellingPrice).toLocaleString()}</p>
                                                <button onClick={() => removeFromCart(idx)} className="text-rose-500 hover:text-rose-700 font-bold px-2">×</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center justify-between px-2">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Payment</label>
                                    <select 
                                        className="bg-slate-100 border-none rounded-xl p-2 text-xs font-black uppercase text-slate-700"
                                        value={paymentMode}
                                        onChange={(e) => setPaymentMode(e.target.value as any)}
                                    >
                                        <option value="cash">Cash</option>
                                        <option value="credit">Credit</option>
                                    </select>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Grand Total</p>
                                    <p className="text-3xl font-black text-primary-600 tracking-tighter">₹{grandTotal.toLocaleString()}</p>
                                </div>
                            </div>

                            <button type="submit" className="btn-primary w-full py-5 text-lg shadow-xl shadow-primary-100 flex items-center justify-center gap-2 font-bold uppercase tracking-widest text-sm">
                                <Receipt size={20} /> Generate Invoice Task
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sales;
