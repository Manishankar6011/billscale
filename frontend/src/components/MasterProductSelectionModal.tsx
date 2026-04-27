import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { X, Search, Check, ShoppingBag, Loader2, Filter, Layers } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useInfiniteQuery } from '@tanstack/react-query';

interface MasterProduct {
    _id: string;
    name: string;
    category: string;
    unit: string;
    mrp: number;
    pricePerUnit: number;
    purchasePrice: number;
    barcode?: string;
}

interface MasterProductSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (products: MasterProduct[], batchType: string) => void;
}

const MasterProductSelectionModal: React.FC<MasterProductSelectionModalProps> = ({ isOpen, onClose, onSelect }) => {
    const { user } = useAuth();
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProducts, setSelectedProducts] = useState<Map<string, MasterProduct>>(new Map());
    const [batchType, setBatchType] = useState<string>('Retail');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        refetch
    } = useInfiniteQuery({
        queryKey: ['master-products', debouncedSearch, selectedCategory],
        queryFn: async ({ pageParam = 1 }) => {
            const res = await axios.get('/api/master-products', {
                params: {
                    search: debouncedSearch,
                    category: selectedCategory,
                    page: pageParam,
                    limit: 24
                },
                headers: { Authorization: `Bearer ${user?.token}` }
            });
            return res.data;
        },
        getNextPageParam: (lastPage) => {
            if (lastPage.pagination.currentPage < lastPage.pagination.totalPages) {
                return lastPage.pagination.currentPage + 1;
            }
            return undefined;
        },
        initialPageParam: 1,
        enabled: isOpen && !!user?.token
    });

    const products = useMemo(() => {
        return data?.pages.flatMap(page => page.products) || [];
    }, [data]);

    const observer = useRef<IntersectionObserver | null>(null);
    const lastElementRef = useCallback((node: HTMLDivElement) => {
        if (isLoading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
            }
        });
        if (node) observer.current.observe(node);
    }, [isLoading, hasNextPage, isFetchingNextPage, fetchNextPage]);

    useEffect(() => {
        if (isOpen) {
            fetchCategories();
        }
    }, [isOpen]);

    const fetchCategories = async () => {
        try {
            const res = await axios.get('/api/master-products/categories', {
                headers: { Authorization: `Bearer ${user?.token}` }
            });
            setCategories(res.data);
        } catch (err) {
            console.error('Error fetching categories:', err);
        }
    };

    const filteredProducts = products;

    const toggleSelect = (product: MasterProduct) => {
        setSelectedProducts(prev => {
            const newMap = new Map(prev);
            if (newMap.has(product._id)) {
                newMap.delete(product._id);
            } else {
                newMap.set(product._id, product);
            }
            return newMap;
        });
    };

    const toggleSelectAll = () => {
        const allCurrentSelected = filteredProducts.length > 0 && filteredProducts.every(p => selectedProducts.has(p._id));
        
        setSelectedProducts(prev => {
            const newMap = new Map(prev);
            if (allCurrentSelected) {
                filteredProducts.forEach(p => newMap.delete(p._id));
            } else {
                filteredProducts.forEach(p => newMap.set(p._id, p));
            }
            return newMap;
        });
    };

    const handleConfirm = () => {
        onSelect(Array.from(selectedProducts.values()), batchType);
        onClose();
        setSelectedProducts(new Map());
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[150] flex items-center justify-center p-2 sm:p-4">
            <div className="bg-white w-full max-w-[1400px] h-[95vh] md:h-[90vh] rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="px-4 md:px-8 py-4 md:py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-primary-50 text-primary-600 rounded-xl md:rounded-2xl flex items-center justify-center shadow-inner shrink-0">
                            <ShoppingBag size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg md:text-2xl font-black text-slate-800 tracking-tight leading-tight">Smart Product Library</h2>
                            <p className="text-slate-500 text-xs md:text-sm font-medium line-clamp-1">Select products to quickly add them to your store.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-slate-200 rounded-2xl transition-all text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                {/* Filters */}
                <div className="px-4 md:px-8 py-4 bg-white border-b border-slate-50 flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <div className="w-full md:w-96 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text"
                                placeholder="Search 6000+ products..."
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-primary-500 transition-all font-bold text-slate-700 placeholder:text-slate-400"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto no-scrollbar custom-horizontal-scrollbar">
                            <button 
                                onClick={() => setSelectedCategory('All')}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedCategory === 'All' ? 'bg-primary-600 text-white shadow-lg shadow-primary-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            >
                                All
                            </button>
                            {categories.map(cat => (
                                <button 
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedCategory === cat ? 'bg-primary-600 text-white shadow-lg shadow-primary-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Product List */}
                <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
                    {isLoading && products.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4">
                            <Loader2 className="animate-spin text-primary-600" size={40} />
                            <p className="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">Loading library...</p>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center mb-4">
                                <Search size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">No products found</h3>
                            <p className="text-slate-500">Try adjusting your search or category filter.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                            {filteredProducts.map((product, index) => (
                                <div 
                                    key={product._id}
                                    ref={index === filteredProducts.length - 1 ? lastElementRef : null}
                                    onClick={() => toggleSelect(product)}
                                    className={`p-5 rounded-3xl border-2 transition-all cursor-pointer group flex flex-col justify-between ${selectedProducts.has(product._id) ? 'bg-primary-50/50 border-primary-500 shadow-xl shadow-primary-100/50' : 'bg-white border-slate-100 hover:border-primary-200 hover:shadow-lg hover:shadow-slate-200/50'}`}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[10px] font-black uppercase tracking-tighter">
                                                    {product.category}
                                                </span>
                                                <span className="px-2 py-0.5 bg-blue-50 text-blue-500 rounded-md text-[10px] font-black uppercase tracking-tighter">
                                                    {product.unit}
                                                </span>
                                            </div>
                                            <h4 className={`font-black leading-tight transition-colors ${selectedProducts.has(product._id) ? 'text-primary-700' : 'text-slate-800'}`}>
                                                {product.name}
                                            </h4>
                                        </div>
                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${selectedProducts.has(product._id) ? 'bg-primary-600 text-white' : 'bg-slate-100 text-transparent group-hover:text-slate-300'}`}>
                                            <Check size={14} strokeWidth={4} />
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between pt-4 border-t border-slate-100/50 mt-auto">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Selling Price</p>
                                            <p className="text-lg font-black text-slate-700">₹{product.pricePerUnit}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">MRP</p>
                                            <p className="text-sm font-bold text-slate-400 line-through decoration-rose-500/30">₹{product.mrp}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 md:p-8 bg-white border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <button 
                            onClick={toggleSelectAll}
                            className="flex-1 md:flex-none px-6 py-4 rounded-2xl border-2 border-slate-100 text-slate-600 font-bold hover:bg-slate-50 transition-all text-sm whitespace-nowrap"
                        >
                            {filteredProducts.length > 0 && filteredProducts.every(p => selectedProducts.has(p._id)) ? 'Deselect All on Page' : 'Select All on Page'}
                        </button>
                    </div>

                    <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full md:w-auto order-first md:order-none">
                        {['Retail', 'Wholesale'].map((type) => (
                            <button
                                key={type}
                                onClick={() => setBatchType(type)}
                                className={`flex-1 px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${batchType === type ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {type === 'Retail' ? 'Retail (Khudra)' : 'Wholesale'}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="hidden xl:block text-right">
                            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Selected</p>
                            <p className="text-primary-600 font-black text-lg">{selectedProducts.size} Items</p>
                        </div>
                        <button 
                            onClick={handleConfirm}
                            disabled={selectedProducts.size === 0}
                            className="flex-1 md:flex-none px-12 py-4 bg-primary-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-sm shadow-xl shadow-primary-200 hover:bg-primary-700 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-3 active:scale-95"
                        >
                            Add to Store
                            <Check size={20} strokeWidth={3} />
                        </button>
                    </div>
                </div>

                {isFetchingNextPage && (
                    <div className="py-4 flex justify-center bg-white border-t border-slate-50">
                        <Loader2 className="animate-spin text-primary-600" size={20} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default MasterProductSelectionModal;
