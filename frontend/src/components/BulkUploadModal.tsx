import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { X, Upload, Check, AlertCircle, Save, Loader2, Trash2, Plus, FileSpreadsheet } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface BulkUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface BulkItem {
    name: string;
    batchNumber: string;
    barcode: string;
    purchasePrice: string | number;
    pricePerUnit: string | number;
    stock: string | number;
    unit: string;
    errors?: Record<string, string>;
}

const BulkUploadModal: React.FC<BulkUploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [data, setData] = useState<BulkItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const validateData = (items: BulkItem[]) => {
        return items.map(item => {
            const errors: Record<string, string> = {};
            if (!item.name) errors.name = 'Name is required';
            if (!item.pricePerUnit || Number(item.pricePerUnit) <= 0) errors.pricePerUnit = 'Price required';
            if (!item.unit) errors.unit = 'Unit required';
            return { ...item, errors };
        });
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const bstr = event.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                if (!wsname) throw new Error('No sheets found in file');
                const ws = wb.Sheets[wsname];
                if (!ws) throw new Error('Sheet not found');
                const rawData = XLSX.utils.sheet_to_json(ws);

                const mappedData: BulkItem[] = rawData.map((row: any) => ({
                    name: (row['Product Name'] || row['name'] || '').toString(),
                    batchNumber: (row['Batch Number'] || row['batch'] || 'Default').toString(),
                    barcode: (row['Item Code'] || row['barcode'] || '').toString(),
                    purchasePrice: row['Purchase Price'] || row['cost_price'] || 0,
                    pricePerUnit: row['Selling Price'] || row['price'] || 0,
                    stock: row['Stock Quantity'] || row['stock'] || 0,
                    unit: row['Unit'] || row['unit'] || 'pc',
                }));

                setData(validateData(mappedData));
                showToast(`Loaded ${mappedData.length} items. Please verify and edit if needed.`, 'success');
            } catch (err) {
                showToast('Error parsing file. Please use a valid Excel or CSV.', 'error');
            } finally {
                setIsProcessing(false);
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleCellChange = (index: number, field: keyof BulkItem, value: any) => {
        const newData = [...data];
        (newData[index] as any)[field] = value;
        setData(validateData(newData));
    };

    const removeRow = (index: number) => {
        setData(data.filter((_, i) => i !== index));
    };

    const addNewRow = () => {
        const newItem: BulkItem = {
            name: '',
            batchNumber: 'Default',
            barcode: '',
            purchasePrice: 0,
            pricePerUnit: 0,
            stock: 0,
            unit: 'pc'
        };
        setData(validateData([...data, newItem]));
    };

    const handleSave = async () => {
        const hasErrors = data.some(item => Object.keys(item.errors || {}).length > 0);
        if (hasErrors) {
            showToast('Please fix errors in the table before saving.', 'error');
            return;
        }

        if (data.length === 0) {
            showToast('No data to save.', 'error');
            return;
        }

        setIsSaving(true);
        try {
            await axios.post('/api/inventory/bulk', data, {
                headers: { Authorization: `Bearer ${user?.token}` }
            });
            showToast('Bulk upload successful!', 'success');
            onSuccess();
            onClose();
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Error saving products', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-6xl h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Bulk Inventory Upload</h2>
                        <p className="text-slate-500 text-sm">Upload Excel/CSV and edit data before final submission.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl transition-all"><X size={20} /></button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col p-8">
                    {data.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center border-4 border-dashed border-slate-100 rounded-[2rem] bg-slate-50/30">
                            <div className="w-20 h-20 bg-primary-50 text-primary-600 rounded-3xl flex items-center justify-center mb-6">
                                <Upload size={40} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Select Inventory File</h3>
                            <p className="text-slate-400 mb-8 max-w-xs text-center">Supported formats: .xlsx, .xls, .csv. Columns: Name, Price, Stock, etc.</p>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept=".xlsx,.xls,.csv" 
                                onChange={handleFileUpload} 
                            />
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isProcessing}
                                className="px-8 py-4 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all flex items-center gap-3"
                            >
                                {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                                Browse Files
                            </button>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col min-h-0">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex gap-4">
                                    <div className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold border border-emerald-100 flex items-center gap-2">
                                        <Check size={14} /> {data.length} Items Loaded
                                    </div>
                                    <button 
                                        onClick={addNewRow}
                                        className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 flex items-center gap-2"
                                    >
                                        <Plus size={14} /> Add Row
                                    </button>
                                </div>
                                <div className="text-xs font-medium text-slate-400 flex items-center gap-2">
                                    <AlertCircle size={14} className="text-amber-500" /> Red cells require correction
                                </div>
                            </div>

                            <div className="flex-1 overflow-auto border border-slate-100 rounded-2xl shadow-inner bg-slate-50/50">
                                <table className="w-full border-collapse text-xs">
                                    <thead className="sticky top-0 bg-white shadow-sm z-10">
                                        <tr className="text-slate-400 font-black uppercase tracking-widest bg-slate-50">
                                            <th className="px-4 py-4 text-left">Product Name*</th>
                                            <th className="px-4 py-4 text-left">Batch</th>
                                            <th className="px-4 py-4 text-left">Item Code</th>
                                            <th className="px-4 py-4 text-left">PurchasePrice</th>
                                            <th className="px-4 py-4 text-left">SellingPrice*</th>
                                            <th className="px-4 py-4 text-left">Stock</th>
                                            <th className="px-4 py-4 text-left">Unit*</th>
                                            <th className="px-4 py-4 text-left">Stock Value</th>
                                            <th className="px-4 py-4 text-center w-12"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {data.map((item, idx) => {
                                            const stockValue = Number(item.stock) * Number(item.pricePerUnit);
                                            return (
                                                <tr key={idx} className="bg-white hover:bg-blue-50/30 transition-colors group">
                                                    <td className="p-1">
                                                        <input 
                                                            className={`w-full p-3 bg-transparent border-0 focus:ring-2 rounded-lg font-bold ${item.errors?.name ? 'bg-rose-50 text-rose-600 ring-rose-300' : 'text-slate-700 focus:ring-primary-500'}`}
                                                            value={item.name}
                                                            onChange={e => handleCellChange(idx, 'name', e.target.value)}
                                                            placeholder="Product Name"
                                                        />
                                                    </td>
                                                    <td className="p-1">
                                                        <input 
                                                            className="w-full p-3 bg-transparent border-0 focus:ring-2 focus:ring-primary-500 rounded-lg text-slate-500"
                                                            value={item.batchNumber}
                                                            onChange={e => handleCellChange(idx, 'batchNumber', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="p-1">
                                                        <input 
                                                            className="w-full p-3 bg-transparent border-0 focus:ring-2 focus:ring-primary-500 rounded-lg text-slate-500 font-mono"
                                                            value={item.barcode}
                                                            onChange={e => handleCellChange(idx, 'barcode', e.target.value)}
                                                            placeholder="SKU/Barcode"
                                                        />
                                                    </td>
                                                    <td className="p-1">
                                                        <input 
                                                            type="number"
                                                            className="w-full p-3 bg-transparent border-0 focus:ring-2 focus:ring-primary-500 rounded-lg text-slate-700 font-bold"
                                                            value={item.purchasePrice}
                                                            onChange={e => handleCellChange(idx, 'purchasePrice', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="p-1">
                                                        <input 
                                                            type="number"
                                                            className={`w-full p-3 bg-transparent border-0 focus:ring-2 rounded-lg font-black ${item.errors?.pricePerUnit ? 'bg-rose-50 text-rose-600 ring-rose-300' : 'text-primary-600 focus:ring-primary-500'}`}
                                                            value={item.pricePerUnit}
                                                            onChange={e => handleCellChange(idx, 'pricePerUnit', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="p-1">
                                                        <input 
                                                            type="number"
                                                            className="w-full p-3 bg-transparent border-0 focus:ring-2 focus:ring-primary-500 rounded-lg text-slate-700 font-bold"
                                                            value={item.stock}
                                                            onChange={e => handleCellChange(idx, 'stock', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="p-1">
                                                        <input 
                                                            className={`w-full p-3 bg-transparent border-0 focus:ring-2 rounded-lg font-bold uppercase tracking-widest ${item.errors?.unit ? 'bg-rose-50 text-rose-600 ring-rose-300' : 'text-slate-400 focus:ring-primary-500'}`}
                                                            value={item.unit}
                                                            onChange={e => handleCellChange(idx, 'unit', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-800 font-black bg-slate-50/50">
                                                        ₹{stockValue.toLocaleString()}
                                                    </td>
                                                    <td className="px-2 py-3 text-center">
                                                        <button 
                                                            onClick={() => removeRow(idx)}
                                                            className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {data.length > 0 && (
                    <div className="px-8 py-6 bg-slate-50 flex items-center justify-between border-t border-slate-100">
                        <button 
                            onClick={() => { setData([]); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                            className="text-slate-400 hover:text-slate-600 font-bold uppercase tracking-widest text-[10px]"
                        >
                            Reset Table
                        </button>
                        <div className="flex gap-4">
                            <button 
                                onClick={onClose}
                                className="px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-10 py-4 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all flex items-center gap-3 active:scale-95"
                            >
                                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                Confirm & Save Stock
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BulkUploadModal;
