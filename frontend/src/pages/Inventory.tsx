import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Box, AlertTriangle, Edit2, Trash2, Barcode, Scan } from 'lucide-react';
import BarcodeScanner from '../components/BarcodeScanner';
import axios from 'axios';
import type { Product } from '../types';
import { useAuth } from '../context/AuthContext';
import Skeleton from '../components/Skeleton';
import { useToast } from '../context/ToastContext';

const UNIT_GROUPS = {
    weight: ['kg', 'gm', 'ton', 'bag', 'bundle', 'pack'],
    volume: ['litre', 'ml'],
    count: ['nos', 'piece', 'box', 'dozen', 'unit'],
    length: ['meter', 'ft', 'inch'],
    area: ['sqft', 'sqmtr']
};

const ALL_UNITS = Object.values(UNIT_GROUPS).flat();

const Inventory = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { showToast } = useToast();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
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
        barcode: string;
        batchNumber: string;
    }>({
        name: '',
        unit: 'bag',
        stock: '0',
        minStockAlert: '10',
        pricePerUnit: '',
        purchasePrice: '',
        mrp: '',
        barcode: '',
        batchNumber: ''
    });
    const [isScannerOpen, setIsScannerOpen] = useState(false);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await axios.get('/api/inventory', {
                headers: { Authorization: `Bearer ${user?.token}` }
            });
            setProducts(res.data);
        } catch (err) {
            showToast('Error fetching stock', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (product: Product) => {
        setEditingId(product._id!);
        setFormData({
            name: product.name,
            unit: product.unit,
            stock: product.stock.toString(),
            minStockAlert: product.minStockAlert.toString(),
            pricePerUnit: product.pricePerUnit.toString(),
            purchasePrice: product.purchasePrice.toString(),
            mrp: (product.mrp || 0).toString(),
            barcode: product.barcode || '',
            batchNumber: product.batchNumber || 'Default'
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this product?')) return;
        try {
            await axios.delete(`/api/inventory/${id}`, {
                headers: { Authorization: `Bearer ${user?.token}` }
            });
            showToast('Product deleted', 'success');
            fetchProducts();
        } catch (err) {
            showToast('Error deleting product', 'error');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = {
                ...formData,
                stock: Number(formData.stock),
                minStockAlert: Number(formData.minStockAlert),
                pricePerUnit: Number(formData.pricePerUnit),
                purchasePrice: Number(formData.purchasePrice),
                mrp: Number(formData.mrp),
                barcode: formData.barcode,
                batchNumber: formData.batchNumber
            };

            if (editingId) {
                await axios.put(`/api/inventory/${editingId}`, data, {
                    headers: { Authorization: `Bearer ${user?.token}` }
                });
                showToast('Product updated!', 'success');
            } else {
                await axios.post('/api/inventory', data, {
                    headers: { Authorization: `Bearer ${user?.token}` }
                });
                showToast('Product added successfully!', 'success');
            }
            
            setIsModalOpen(false);
            setEditingId(null);
            fetchProducts();
            setFormData({ name: '', unit: 'bag', stock: '0', minStockAlert: '10', pricePerUnit: '', purchasePrice: '', mrp: '', barcode: '', batchNumber: '' });
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Error saving product', 'error');
        }
    };

    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchTerm))
    );

    const handleScan = React.useCallback((code: string) => {
        setFormData(prev => ({ ...prev, barcode: code }));
        setIsScannerOpen(false);
        showToast(`Barcode ${code} scanned!`, 'success');
    }, [showToast]);

    if (loading) return <Skeleton count={5} />;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{t('inventory.title')}</h1>
                    <p className="text-slate-500">{t('inventory.subtitle')}</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus size={20} />
                   {t('inventory.add_product')}
                </button>
            </div>

            <div className="flex items-center relative bg-white rounded-2xl border border-slate-100 shadow-sm focus-within:ring-2 focus-within:ring-primary-500 transition-all">
                <Search className="absolute left-4 text-slate-400" size={20} />
                <input 
                    type="text" 
                    placeholder="Search products (Name, Category, etc.)..." 
                    className="w-full bg-transparent !border-none py-4 pl-12 pr-4 !outline-none !focus:ring-0 text-slate-800 font-bold placeholder:font-medium"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => {
                    const isLowStock = product.stock <= product.minStockAlert;
                    return (
                        <div key={product._id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex items-start justify-between mb-4">
                                <div className={`p-3 rounded-xl ${isLowStock ? 'bg-rose-50 text-rose-600' : 'bg-primary-50 text-primary-600'}`}>
                                    <Box size={24} />
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => handleEdit(product)}
                                        className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(product._id!)}
                                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            
                            <h3 className="text-lg font-bold text-slate-800 mb-1">{product.name}</h3>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm text-slate-500 uppercase font-black tracking-widest">{product.unit}</span>
                                {product.barcode && (
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-md">
                                            <Barcode size={12} className="text-slate-400" />
                                            <span className="text-[10px] font-bold text-slate-500">{product.barcode}</span>
                                        </div>
                                        <div className="px-2 py-0.5 bg-primary-50 rounded-md">
                                            <span className="text-[10px] font-black uppercase text-primary-600 tracking-tighter">Batch: {product.batchNumber || 'Default'}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="mt-6 flex items-end justify-between">
                                <div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Stock</p>
                                    <p className={`text-2xl font-black ${isLowStock ? 'text-rose-600' : 'text-slate-800'}`}>
                                        {Number(product.stock).toFixed(2)} <span className="text-sm font-medium text-slate-400">{product.unit}</span>
                                    </p>
                                </div>
                                <div className="text-right space-y-1">
                                    <div className="flex items-center justify-end gap-2">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">MRP</span>
                                        <span className="text-sm font-black text-slate-400 italic font-mono">₹{product.mrp || 0}</span>
                                    </div>
                                    <div className="flex items-center justify-end gap-2">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sell</span>
                                        <span className="text-sm font-black text-primary-600">₹{product.pricePerUnit}</span>
                                    </div>
                                    <div className="flex items-center justify-end gap-2">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cost</span>
                                        <span className="text-sm font-bold text-slate-500 font-mono">₹{product.purchasePrice}</span>
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
                    <h3 className="text-lg font-bold text-slate-800">No products found</h3>
                    <p className="text-slate-500">Add stock items to start tracking your business inventory.</p>
                </div>
            )}

            {/* Add Product Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-8">
                            {/* <h2 className="text-2xl font-black text-slate-800 tracking-tighter">
                                {editingId ? 'Edit Product' : 'Add New yyjtyfuuyg'}
                            </h2> */}
                            <button 
                                onClick={() => {
                                    setIsModalOpen(false);
                                    setEditingId(null);
                                    setFormData({ name: '', unit: 'bag', stock: '0', minStockAlert: '10', pricePerUnit: '', purchasePrice: '', mrp: '', barcode: '', batchNumber: '' });
                                }} 
                                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all font-bold"
                            >
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Product Name</label>
                                <input 
                                    required
                                    type="text" 
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-slate-800 focus:ring-2 focus:ring-primary-500 transition-all font-bold placeholder:font-medium"
                                    placeholder="e.g. Item Name, Stock Item"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Unit</label>
                                    <select 
                                        required
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-slate-800 focus:ring-2 focus:ring-primary-500 transition-all font-bold"
                                        value={ALL_UNITS.includes(formData.unit) ? formData.unit : 'custom'}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === 'custom') {
                                                setFormData({...formData, unit: ''});
                                            } else {
                                                setFormData({...formData, unit: val});
                                            }
                                        }}
                                    >
                                        {ALL_UNITS.map(u => (
                                            <option key={u} value={u}>{u.toUpperCase()}</option>
                                        ))}
                                        <option value="custom">+ Add Custom Unit</option>
                                    </select>
                                    {!ALL_UNITS.includes(formData.unit) && (
                                        <input 
                                            type="text" 
                                            className="mt-2 w-full bg-white border-2 border-primary-100 rounded-2xl p-3 text-sm font-bold animate-in fade-in slide-in-from-top-1 duration-200"
                                            placeholder="Enter unit name (e.g. Bucket)"
                                            value={formData.unit}
                                            onChange={(e) => setFormData({...formData, unit: e.target.value})}
                                            autoFocus
                                        />
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Initial Stock</label>
                                    <input 
                                        required
                                        type="number" 
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-slate-800 focus:ring-2 focus:ring-primary-500 transition-all font-bold"
                                        placeholder="0"
                                        value={formData.stock}
                                        onChange={(e) => setFormData({...formData, stock: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Price per Unit</label>
                                    <input 
                                        required
                                        type="number" 
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-slate-800 focus:ring-2 focus:ring-primary-500 transition-all font-bold"
                                        placeholder="0"
                                        value={formData.pricePerUnit}
                                        onChange={(e) => setFormData({...formData, pricePerUnit: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Purchase Price (Cost)</label>
                                    <input 
                                        required
                                        type="number" 
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-slate-800 focus:ring-2 focus:ring-primary-500 transition-all font-bold"
                                        placeholder="0"
                                        value={formData.purchasePrice}
                                        onChange={(e) => setFormData({...formData, purchasePrice: e.target.value})}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">MRP (Maximum Retail Price)</label>
                                    <input 
                                        required
                                        type="number" 
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-slate-800 focus:ring-2 focus:ring-primary-500 transition-all font-bold"
                                        placeholder="0"
                                        value={formData.mrp}
                                        onChange={(e) => setFormData({...formData, mrp: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Low Stock Alert at</label>
                                    <input 
                                        required
                                        type="number" 
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-slate-800 focus:ring-2 focus:ring-primary-500 transition-all font-bold"
                                        placeholder="10"
                                        value={formData.minStockAlert}
                                        onChange={(e) => setFormData({...formData, minStockAlert: e.target.value})}
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Batch # / Name</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-slate-800 focus:ring-2 focus:ring-primary-500 transition-all font-bold"
                                        placeholder="e.g. Batch 1"
                                        value={formData.batchNumber}
                                        onChange={(e) => setFormData({...formData, batchNumber: e.target.value})}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Barcode (Optional)</label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 pr-14 text-slate-800 focus:ring-2 focus:ring-primary-500 transition-all font-bold"
                                            placeholder="Scan or enter barcode"
                                            value={formData.barcode}
                                            onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setIsScannerOpen(true)}
                                            className="absolute right-2 top-2 bottom-2 px-3 bg-white border border-slate-200 rounded-xl text-primary-600 hover:bg-primary-50 transition-all flex items-center justify-center"
                                        >
                                            <Scan size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <button type="submit" className="btn-primary w-full py-5 text-lg shadow-xl shadow-primary-100 flex items-center justify-center gap-2 font-bold">
                                <Plus size={20} /> {editingId ? 'Update Product' : 'Create Product'}
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
        </div>
    );
};

export default Inventory;
