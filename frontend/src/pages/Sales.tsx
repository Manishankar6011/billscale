import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
    MessageCircle
} from 'lucide-react';
import BarcodeScanner from '../components/BarcodeScanner';
import CustomerSearch from '../components/CustomerSearch';
import axios from 'axios';
import type { Sale, Product, Customer } from '../types';
import { useAuth } from '../context/AuthContext';
import Skeleton from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import { format } from 'date-fns';
import PrintableInvoice from '../components/PrintableInvoice';
import { generateInvoice } from '../utils/invoiceGenerator';

const UNIT_GROUPS: Record<string, string[]> = {
    weight: ['kg', 'gm', 'ton', 'bag', 'bundle', 'pack'],
    volume: ['litre', 'ml'],
    count: ['nos', 'piece', 'box', 'dozen', 'unit'],
    length: ['meter', 'ft', 'inch'],
    area: ['sqft', 'sqmtr']
};

const ALL_UNITS = Object.values(UNIT_GROUPS).flat();

const getUnitGroup = (unit: string) => {
    return Object.keys(UNIT_GROUPS).find(group => UNIT_GROUPS[group]?.includes(unit.toLowerCase())) || 'other';
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
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    const [paymentMode, setPaymentMode] = useState<'cash' | 'credit'>('cash');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    // Cart State
    const [cart, setCart] = useState<{ productId: string, name: string, quantity: number, sellingPrice: number, unit: string, conversionFactor: number }[]>([]);
    const [currentItem, setCurrentItem] = useState({ productId: '', quantity: '', sellingPrice: '', unit: '', conversionFactor: '1' });
    const [additionalItems, setAdditionalItems] = useState<{ name: string, price: string }[]>([]);
    
    // UI Logic State
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isAddingAdditional, setIsAddingAdditional] = useState(false);
    const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
    const [newAdditional, setNewAdditional] = useState({ name: '', price: '' });
    const [matchingProducts, setMatchingProducts] = useState<Product[]>([]);
    const [hwScannerInput, setHwScannerInput] = useState('');
    const [autoPrint, setAutoPrint] = useState(true);
    const [printData, setPrintData] = useState<any>(null);
    const scannerInputRef = React.useRef<HTMLInputElement>(null);

    // Filter State
    const [filterSearch, setFilterSearch] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Auto-calculate suggested price when conversion factor changes
    useEffect(() => {
        if (currentItem.productId && Number(currentItem.conversionFactor) > 0) {
            const product = products.find(p => p._id === currentItem.productId);
            if (product) {
                const basePrice = product.pricePerUnit;
                const factor = Number(currentItem.conversionFactor);
                const suggestedPrice = (basePrice / factor).toFixed(2);
                
                // Only auto-update if product just changed or factor changed
                setCurrentItem(prev => ({ ...prev, sellingPrice: suggestedPrice }));
            }
        }
    }, [currentItem.productId, currentItem.conversionFactor, products]);

    const addToCart = () => {
        if (!currentItem.productId || !currentItem.quantity || !currentItem.sellingPrice) {
            showToast('Please fill all item details', 'error');
            return;
        }
        const product = products.find(p => p._id === currentItem.productId);
        if (product) {
            const saleUnit = currentItem.unit || product.unit;
            const baseUnitGroup = getUnitGroup(product.unit);
            const saleUnitGroup = getUnitGroup(saleUnit);

            if (baseUnitGroup !== 'other' && saleUnitGroup !== 'other' && baseUnitGroup !== saleUnitGroup) {
                showToast(`Incompatible units: Cannot convert ${saleUnit} to ${product.unit}`, 'error');
                return;
            }

            const factor = Number(currentItem.conversionFactor);
            if (saleUnit !== product.unit && (!factor || factor <= 0)) {
                showToast(`Please enter a valid conversion factor for ${saleUnit}`, 'error');
                return;
            }

            setCart([...cart, {
                productId: product._id!,
                name: product.name,
                quantity: Number(currentItem.quantity),
                sellingPrice: Number(currentItem.sellingPrice),
                unit: saleUnit,
                conversionFactor: factor || 1
            }]);
            setCurrentItem({ productId: '', quantity: '', sellingPrice: '', unit: '', conversionFactor: '1' });
        }
    };

    const removeFromCart = (index: number) => {
        setCart(cart.filter((_, i) => i !== index));
    };

    const grandTotal = cart.reduce((acc, item) => acc + (item.quantity * item.sellingPrice), 0) + 
                       additionalItems.reduce((acc, item) => acc + (Number(item.price) || 0), 0);

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

    const handleWhatsAppShare = (sale: any) => {
        if (!sale) return;
        const customerName = sale.customerName || 'Customer';
        const storeName = user?.companyName || 'BuildMate ERP';
        const total = (sale.totalAmount || 0).toLocaleString();
        const invoiceNo = sale.invoiceNumber || 'N/A';
        const publicLink = `${window.location.origin}/public-invoice/${sale._id}`;
        
        const message = `Hello ${customerName}, thank you for shopping at *${storeName}*! Your invoice ${invoiceNo} for *₹${total}* is ready. View it here: ${publicLink}`;
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${sale.customerPhone ? sale.customerPhone.replace(/\D/g, '') : ''}?text=${encodedMessage}`;
        
        window.open(whatsappUrl, '_blank');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cart.length === 0) {
            showToast('Add at least one item to cart', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await axios.post('/api/transactions/sales', {
                customerName,
                customerPhone,
                customerAddress,
                items: cart.map(i => ({ 
                    productId: i.productId, 
                    quantity: i.quantity, 
                    unit: i.unit,
                    conversionFactor: i.conversionFactor,
                    sellingPrice: i.sellingPrice 
                })),
                additionalItems: additionalItems.map(i => ({ name: i.name, price: Number(i.price) })),
                paymentMode,
                date,
                status: paymentMode === 'cash' ? 'paid' : 'pending'
            }, {
                headers: { Authorization: `Bearer ${user?.token}` }
            });

            const newSale = response.data.sale;
            showToast('Sale recorded successfully!', 'success');
            
            if (autoPrint && newSale) {
                setPrintData(newSale);
                setTimeout(() => {
                    window.print();
                }, 500);
            }

            setIsModalOpen(false);
            fetchData();
            setCustomerName('');
            setCustomerPhone('');
            setCustomerAddress('');
            setCart([]);
            setAdditionalItems([]);
            setPaymentMode('cash');
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Error processing sale', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleScan = React.useCallback((code: string) => {
        const trimmedCode = code.trim();
        if (!trimmedCode) return;

        const matches = products.filter(p => p.barcode === trimmedCode);
        
        if (matches.length === 0) {
            showToast(`Product with barcode ${trimmedCode} not found`, 'error');
            return;
        }

        if (matches.length === 1) {
            const product = matches[0]!;
            setCart(prev => [...prev, {
                productId: product._id!,
                name: product.name,
                quantity: 1,
                sellingPrice: product.pricePerUnit,
                unit: product.unit,
                conversionFactor: 1
            }]);
            showToast(`${product.name} added to bill`, 'success');
            setIsScannerOpen(false);
            setHwScannerInput('');
        } else {
            setMatchingProducts(matches);
            setIsScannerOpen(false);
        }
    }, [products, showToast]);

    // Filtered Sales Logic
    const filteredSales = sales.filter(sale => {
        const matchesSearch = 
            sale.customerName.toLowerCase().includes(filterSearch.toLowerCase()) ||
            sale.invoiceNumber.toLowerCase().includes(filterSearch.toLowerCase()) ||
            (sale.customerPhone && sale.customerPhone.includes(filterSearch));
        
        const saleDate = new Date(sale.date).setHours(0,0,0,0);
        const start = startDate ? new Date(startDate).setHours(0,0,0,0) : null;
        const end = endDate ? new Date(endDate).setHours(0,0,0,0) : null;
        
        const matchesDate = (!start || saleDate >= start) && (!end || saleDate <= end);
        
        return matchesSearch && matchesDate;
    });

    const handleCustomerSelect = (customer: Customer) => {
        setCustomerName(customer.name);
        setCustomerPhone(customer.phone);
        setCustomerAddress(customer.address || '');
    };

    const handleAddNewCustomer = (query: string) => {
        // If query looks like a phone number, pre-fill phone
        if (/^\d{10}$/.test(query)) {
            setCustomerPhone(query);
            setCustomerName('');
        } else {
            setCustomerName(query);
            setCustomerPhone('');
        }
        setCustomerAddress('');
        setIsNewCustomerModalOpen(true);
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

            {/* Filters Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div className="md:col-span-1">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Search Invoice / Customer</label>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
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
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">From Date</label>
                    <input 
                        type="date" 
                        className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-primary-500 transition-all"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">To Date</label>
                    <input 
                        type="date" 
                        className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-primary-500 transition-all"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">{t('common.date')}</th>
                                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">{t('billing.customer')}</th>
                                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">Total MRP</th>
                                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">Sale Price</th>
                                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">Cost Price</th>
                                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">Profit</th>
                                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">Margin %</th>
                                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 tracking-widest">Items</th>
                                <th className="px-6 py-4 text-right pr-10 text-xs font-black uppercase text-slate-400 tracking-widest">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredSales.map((sale) => {
                                const totalMrp = (sale.items || []).reduce((acc, item) => {
                                    const factor = item.conversionFactor || 1;
                                    const proportionalQty = item.quantity / factor;
                                    return acc + (item.mrpAtTime * proportionalQty);
                                }, 0);

                                const totalCost = (sale.items || []).reduce((acc, item) => {
                                    const factor = item.conversionFactor || 1;
                                    const proportionalQty = item.quantity / factor;
                                    return acc + (item.purchasePriceAtTime * proportionalQty);
                                }, 0);

                                const profit = (sale.totalAmount || 0) - totalCost;
                                const profitPerc = (sale.totalAmount || 0) > 0 ? (profit / sale.totalAmount) * 100 : 0;

                                return (
                                <tr key={sale._id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {format(new Date(sale.date), 'dd MMM yyyy')}
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">#{sale.invoiceNumber}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-slate-800">{sale.customerName}</p>
                                        {sale.customerPhone && (
                                            <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                                <Phone size={10} /> {sale.customerPhone}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-slate-800">₹{(totalMrp || 0).toLocaleString()}</p>
                                        <p className="text-[10px] text-slate-400 font-medium">Total MRP</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-black text-primary-700">₹{(sale.totalAmount || 0).toLocaleString()}</p>
                                        <p className="text-[10px] text-slate-400 font-medium">Sale Price</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-slate-600">₹{(totalCost || 0).toLocaleString()}</p>
                                        <p className="text-[10px] text-slate-400 font-medium">Cost Price</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className={`flex items-center gap-1 font-black ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {profit >= 0 ? '+' : ''}₹{Math.abs(profit).toLocaleString()}
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-medium">Net Profit</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className={`font-black uppercase tracking-widest text-xs ${profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {profitPerc.toFixed(1)}%
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-medium">Margin</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                                                <Barcode size={14} />
                                            </div>
                                            <p className="font-black text-slate-800 tracking-tight">
                                                {(sale.items?.length || 0) + (sale.additionalItems?.length || 0)}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right pr-6">
                                        <div className="flex items-center justify-end gap-2">
                                            <button 
                                                onClick={() => handleWhatsAppShare(sale)}
                                                className="p-3 bg-emerald-500 text-white hover:bg-emerald-600 rounded-2xl transition-all shadow-lg shadow-emerald-100 flex items-center justify-center transform hover:scale-105 active:scale-95"
                                                title="Share on WhatsApp"
                                            >
                                                <MessageCircle size={18} fill="currentColor" />
                                            </button>
                                            <button 
                                                onClick={() => generateInvoice(sale, user?.companyName || 'Business', user?.name || 'Admin')}
                                                className="p-3 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-2xl transition-all"
                                                title="Download Invoice"
                                            >
                                                <ArrowUpRight size={20} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Sale Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 animate-in fade-in zoom-in duration-200 h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center mb-6 shrink-0">
                            <h2 className="text-2xl font-black text-slate-800 tracking-tighter">Record New Sale</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all">&times;</button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            <div className="space-y-4">
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-xs font-black uppercase tracking-widest text-slate-400">{t('billing.customer')}</label>
                                        <button 
                                            type="button" 
                                            onClick={() => setIsNewCustomerModalOpen(true)}
                                            className="text-[10px] font-black uppercase tracking-widest text-primary-600 hover:text-primary-700 flex items-center gap-1"
                                        >
                                            <UserPlus size={12} />
                                            Quick Add
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
                                                    <p className="text-xs font-bold text-slate-800">{customerName}</p>
                                                    <p className="text-[10px] font-medium text-slate-400">{customerPhone}</p>
                                                </div>
                                            </div>
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    setCustomerName('');
                                                    setCustomerPhone('');
                                                    setCustomerAddress('');
                                                }}
                                                className="text-slate-300 hover:text-rose-500 transition-colors"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    )}
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

                            <div className="p-5 bg-gradient-to-br from-primary-50 to-white rounded-[2rem] space-y-4 border border-primary-100 shadow-sm relative overflow-hidden group">
                                <div className="flex items-center justify-between relative z-10">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-primary-600">Barcode Scanner (Machine)</p>
                                    <button 
                                        type="button"
                                        onClick={() => setIsScannerOpen(true)}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-primary-600/10 text-primary-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-600 hover:text-white transition-all border border-primary-200"
                                    >
                                        <Scan size={14} />
                                        Use Camera
                                    </button>
                                </div>
                                <div className="relative z-10">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-400">
                                        <Barcode size={20} />
                                    </div>
                                    <input 
                                        ref={scannerInputRef}
                                        type="text"
                                        placeholder="Scan barcode with machine..."
                                        className="w-full bg-white border-2 border-primary-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all placeholder:font-medium"
                                        value={hwScannerInput}
                                        onChange={(e) => setHwScannerInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleScan(hwScannerInput);
                                            }
                                        }}
                                    />
                                </div>
                                
                                <div className="flex items-center gap-4 py-2">
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary-100 to-transparent"></div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Or Manual Add</p>
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary-100 to-transparent"></div>
                                </div>

                                <div className="space-y-3 relative z-10">
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-3">
                                        <div className="col-span-1 md:col-span-5">
                                            <p className="text-[8px] font-black uppercase text-slate-400 mb-1 ml-1">Product</p>
                                            <select 
                                                className="w-full bg-white border-none rounded-xl p-3 text-slate-800 text-sm font-bold"
                                                value={currentItem.productId}
                                                onChange={(e) => {
                                                    const p = products.find(x => x._id === e.target.value);
                                                    setCurrentItem({
                                                        ...currentItem, 
                                                        productId: e.target.value, 
                                                        sellingPrice: p ? p.pricePerUnit.toString() : '',
                                                        unit: p ? p.unit : '',
                                                        conversionFactor: '1'
                                                    });
                                                }}
                                            >
                                                <option value="">Select Item</option>
                                                {products.map(p => (
                                                    <option key={p._id} value={p._id}>{p.name} (MRP: ₹{p.mrp || 0})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-span-1 md:col-span-3">
                                            <p className="text-[8px] font-black uppercase text-slate-400 mb-1 ml-1">Sell Unit</p>
                                            <select 
                                                className="w-full bg-white border-none rounded-xl p-3 text-slate-800 text-sm font-bold"
                                                value={currentItem.unit}
                                                onChange={(e) => setCurrentItem({...currentItem, unit: e.target.value})}
                                            >
                                                <option value="">Select Unit</option>
                                                {ALL_UNITS.map(u => (
                                                    <option key={u} value={u}>{u.toUpperCase()}</option>
                                                ))}
                                                {currentItem.unit && !ALL_UNITS.includes(currentItem.unit) && (
                                                    <option value={currentItem.unit}>{currentItem.unit.toUpperCase()}</option>
                                                )}
                                            </select>
                                        </div>
                                        <div className="col-span-1 md:col-span-3">
                                            <p className="text-[8px] font-black uppercase text-slate-400 mb-1 ml-1">Price / {currentItem.unit || 'Unit'}</p>
                                            <input 
                                                type="number" 
                                                className="w-full bg-white border-none rounded-xl p-3 text-slate-800 text-sm font-bold"
                                                placeholder="Price"
                                                value={currentItem.sellingPrice}
                                                onChange={(e) => setCurrentItem({...currentItem, sellingPrice: e.target.value})}
                                            />
                                        </div>
                                        <div className="col-span-1">
                                            <div className="hidden md:block h-6"></div>
                                            <button 
                                                type="button"
                                                onClick={addToCart}
                                                className="w-full h-12 md:h-auto md:aspect-square bg-primary-600 text-white rounded-xl flex items-center justify-center hover:bg-primary-700 transition-all font-bold text-xl"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                        <div className="col-span-1 md:col-span-4">
                                            <p className="text-[8px] font-black uppercase text-slate-400 mb-1 ml-1">Quantity</p>
                                            <input 
                                                type="number" 
                                                className="w-full bg-white border-none rounded-xl p-3 text-slate-800 text-sm font-bold"
                                                placeholder="Qty"
                                                value={currentItem.quantity}
                                                onChange={(e) => setCurrentItem({...currentItem, quantity: e.target.value})}
                                            />
                                        </div>
                                        {currentItem.productId && currentItem.unit && products.find(p => p._id === currentItem.productId)?.unit !== currentItem.unit && (
                                            <div className="col-span-1 md:col-span-8 animate-in slide-in-from-left-2 duration-300">
                                                <p className="text-[8px] font-black uppercase text-slate-400 mb-1 ml-1">
                                                    Conversion: How many {currentItem.unit} in 1 {products.find(p => p._id === currentItem.productId)?.unit}?
                                                </p>
                                                <div className="relative">
                                                    <input 
                                                        type="number" 
                                                        className="w-full bg-primary-600/5 border-2 border-primary-200 rounded-xl p-3 text-primary-700 text-sm font-black"
                                                        placeholder="e.g. 1000 for Gram to Kg"
                                                        value={currentItem.conversionFactor}
                                                        onChange={(e) => setCurrentItem({...currentItem, conversionFactor: e.target.value})}
                                                    />
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                        <span className="text-[10px] font-black text-primary-400 uppercase tracking-tighter">
                                                            Factor
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Cart List */}
                            {(cart.length > 0 || additionalItems.length > 0) && (
                                <div className="space-y-2 border-y border-slate-100 py-4">
                                    {cart.map((item, idx) => (
                                        <div key={`cart-${idx}`} className="flex items-center justify-between text-sm bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-primary-50 text-primary-600 rounded-xl">
                                                    <Barcode size={16} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 tracking-tight">{item.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{item.quantity} {item.unit} x ₹{item.sellingPrice.toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <p className="font-black text-slate-800">₹{(item.quantity * item.sellingPrice).toLocaleString()}</p>
                                                <button 
                                                    type="button"
                                                    onClick={() => removeFromCart(idx)} 
                                                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {additionalItems.map((item, idx) => (
                                        <div key={`add-${idx}`} className="flex items-center justify-between text-sm bg-amber-50/30 p-4 rounded-2xl border border-amber-100/50 shadow-sm hover:shadow-md transition-all group">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                                                    <IndianRupee size={16} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 tracking-tight">{item.name}</p>
                                                    <p className="text-[10px] text-amber-600 font-black uppercase tracking-widest">Additional Charge</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <p className="font-black text-slate-800">₹{Number(item.price).toLocaleString()}</p>
                                                <button 
                                                    type="button"
                                                    onClick={() => setAdditionalItems(additionalItems.filter((_, i) => i !== idx))} 
                                                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center justify-between px-2 pt-4">
                                <div className="flex flex-col gap-3">
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
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="checkbox" 
                                            id="auto-print" 
                                            checked={autoPrint} 
                                            onChange={(e) => setAutoPrint(e.target.checked)}
                                            className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                        />
                                        <label htmlFor="auto-print" className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1 cursor-pointer">
                                            <Printer size={10} /> Auto-Print Bill
                                        </label>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Grand Total</p>
                                    <p className="text-3xl font-black text-primary-600 tracking-tighter">₹{grandTotal.toLocaleString()}</p>
                                </div>
                            </div>

                                {printData ? (
                                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
                                        <div className="bg-white w-full max-w-5xl h-full max-h-[90vh] rounded-[3.5rem] shadow-2xl flex flex-col md:flex-row overflow-hidden border border-white/20">
                                            {/* Receipt Preview Area */}
                                            <div className="flex-1 bg-slate-50/50 p-6 md:p-10 overflow-y-auto custom-scrollbar flex justify-center border-r border-slate-100">
                                                <div className="bg-white shadow-2xl rounded-[2rem] p-6 md:p-10 w-full max-w-[80mm] h-fit">
                                                    <PrintableInvoice 
                                                        sale={printData} 
                                                        businessName={user?.companyName || 'BuildMate ERP'} 
                                                        ownerName={user?.name}
                                                    />
                                                    {/* In this modal we force it visible via local class or inline style if needed, 
                                                        but PrintableInvoice already has print:block. We need it visible on screen too. */}
                                                    <style>{`
                                                        #printable-invoice { display: block !important; visibility: visible !important; }
                                                    `}</style>
                                                </div>
                                            </div>

                                            {/* Actions Panel */}
                                            <div className="w-full md:w-[350px] bg-white p-8 md:p-12 flex flex-col justify-between">
                                                <div>
                                                    <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-[2rem] flex items-center justify-center mb-8 shadow-inner">
                                                        <Receipt size={40} className="animate-bounce" />
                                                    </div>
                                                    <h3 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Sale Recorded!</h3>
                                                    <p className="text-slate-400 font-medium mb-8">Invoice #{printData.invoiceNumber} is ready.</p>
                                                    
                                                    <div className="space-y-4">
                                                        <button 
                                                            type="button"
                                                            onClick={() => window.print()}
                                                            className="w-full py-5 bg-primary-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all flex items-center justify-center gap-3"
                                                        >
                                                            <Printer size={18} /> Print Invoice
                                                        </button>
                                                        <button 
                                                            type="button"
                                                            onClick={() => handleWhatsAppShare(printData)}
                                                            className="w-full py-5 bg-emerald-500 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-200 hover:bg-emerald-600 transition-all flex items-center justify-center gap-3"
                                                        >
                                                            <MessageCircle size={18} fill="currentColor" /> Share WhatsApp
                                                        </button>
                                                        <button 
                                                            type="button"
                                                            onClick={() => generateInvoice(printData, user?.companyName || 'Business', user?.name || 'Admin')}
                                                            className="w-full py-5 bg-white border-2 border-slate-100 text-slate-600 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-slate-50 transition-all flex items-center justify-center gap-3"
                                                        >
                                                            <ArrowUpRight size={18} /> Download PDF
                                                        </button>
                                                    </div>
                                                </div>

                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        setIsModalOpen(false);
                                                        setPrintData(null);
                                                    }}
                                                    className="w-full py-4 text-slate-300 hover:text-rose-500 font-black uppercase tracking-[0.2em] text-[10px] transition-all"
                                                >
                                                    Close & New Sale
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={handleSubmit} 
                                        disabled={isSubmitting}
                                        className="w-full py-5 bg-primary-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 size={24} className="animate-spin" />
                                                Processing Sale...
                                            </>
                                        ) : (
                                            <>
                                                <Receipt size={20} /> Complete Sale (₹{grandTotal.toLocaleString()})
                                            </>
                                        )}
                                    </button>
                                )}
                        </form>
                    </div>
                </div>
            )}

            {/* Quick Add Customer Modal (Bottom Drawer Style) */}
            {isNewCustomerModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-end justify-center sm:items-center p-0 sm:p-4">
                    <div className="bg-white w-full max-w-md rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl p-8 animate-in slide-in-from-bottom duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center">
                                    <UserPlus size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 tracking-tight">New Customer</h3>
                                    <p className="text-slate-500 text-xs font-medium">Add to your business contacts</p>
                                </div>
                            </div>
                            <button onClick={() => setIsNewCustomerModalOpen(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-rose-50 hover:text-rose-600 transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 px-1">Full Name</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                                        <User size={18} />
                                    </div>
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
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 px-1">Mobile Number</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                                        <Phone size={18} />
                                    </div>
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
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 px-1">Address (Optional)</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-4 text-slate-300">
                                        <MapPin size={18} />
                                    </div>
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
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">Select Batch</h3>
                            <p className="text-slate-500 text-sm font-medium">Multiple batches found for this barcode</p>
                        </div>

                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                            {matchingProducts.map((p) => (
                                <button
                                    key={p._id}
                                    type="button"
                                    onClick={() => {
                                        setCart(prev => [...prev, {
                                            productId: p._id!,
                                            name: p.name,
                                            quantity: 1,
                                            sellingPrice: p.pricePerUnit,
                                            unit: p.unit,
                                            conversionFactor: 1
                                        }]);
                                        showToast(`${p.name} added to bill`, 'success');
                                        setMatchingProducts([]);
                                        setHwScannerInput('');
                                    }}
                                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-primary-50 hover:border-primary-200 border-2 border-transparent transition-all group"
                                >
                                    <div className="text-left">
                                        <p className="font-bold text-slate-800 group-hover:text-primary-700">{p.name}</p>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Batch: {p.batchNumber || 'Default'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-primary-600">₹{p.pricePerUnit.toLocaleString()}</p>
                                        <p className="text-[10px] text-slate-400 font-medium">Stock: {Number(p.stock).toFixed(2)} {p.unit}</p>
                                    </div>
                                </button>
                            ))}
                        </div>

                        <button 
                            type="button"
                            onClick={() => setMatchingProducts([])}
                            className="w-full mt-6 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all font-bold"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
           
            <PrintableInvoice 
                sale={printData} 
                businessName={user?.companyName || 'BuildMate ERP'} 
                ownerName={user?.name}
            />
        </div>
    );
};

export default Sales;
