import React, { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, Phone, User } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import type { Customer } from '../types';

interface CustomerSearchProps {
    onSelect: (customer: Customer) => void;
    onAddNew: (searchQuery: string) => void;
    initialValue?: string;
}

const CustomerSearch: React.FC<CustomerSearchProps> = ({ onSelect, onAddNew, initialValue = '' }) => {
    const { user } = useAuth();
    const [query, setQuery] = useState(initialValue);
    const [results, setResults] = useState<Customer[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const searchTimeout = setTimeout(async () => {
            // Fetch if query is 2+ chars OR if query is empty (to get recent)
            if (query.length >= 2 || query === '') {
                setLoading(true);
                try {
                    const res = await axios.get(`/api/customers/search?query=${query}`, {
                        headers: { Authorization: `Bearer ${user?.token}` }
                    });
                    setResults(res.data);
                } catch (err) {
                    console.error('Customer search error:', err);
                } finally {
                    setLoading(false);
                }
            } else {
                setResults([]);
            }
        }, 300);

        return () => clearTimeout(searchTimeout);
    }, [query, user?.token]);

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors">
                    <Search size={18} />
                </div>
                <input
                    type="text"
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-slate-800 focus:ring-2 focus:ring-primary-500 transition-all font-bold placeholder:font-medium text-sm"
                    placeholder="Search Name or Mobile Number..."
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                />
            </div>

            {isOpen && (
                <div className="absolute z-[100] w-full mt-2 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {query === '' && results.length > 0 && (
                            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Recent Customers</p>
                            </div>
                        )}
                        {loading ? (
                            <div className="p-4 text-center text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse">
                                Searching...
                            </div>
                        ) : results.length > 0 ? (
                            results.map((customer) => (
                                <button
                                    key={customer._id}
                                    type="button"
                                    onClick={() => {
                                        onSelect(customer);
                                        setQuery(customer.name);
                                        setIsOpen(false);
                                    }}
                                    className="w-full flex items-center justify-between p-4 hover:bg-primary-50 transition-all text-left group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center group-hover:bg-primary-100 group-hover:text-primary-600 transition-colors">
                                            <User size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 tracking-tight">{customer.name}</p>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                                                <Phone size={10} /> {customer.phone}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="px-3 py-1 bg-primary-600 text-white text-[10px] font-black uppercase rounded-lg">Select</div>
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div className="p-6 text-center">
                                <p className="text-slate-400 text-sm font-medium mb-3">No customers found matching "{query}"</p>
                            </div>
                        )}
                        
                        {/* Always show Add New button if there's a search query */}
                        <button
                            type="button"
                            onClick={() => {
                                onAddNew(query);
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center gap-3 p-4 bg-primary-600 text-white hover:bg-primary-700 transition-all text-left"
                        >
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <UserPlus size={20} />
                            </div>
                            <div>
                                <p className="font-bold tracking-tight">Create New Customer</p>
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/70">Add "{query}" to database</p>
                            </div>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerSearch;
