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
    initialData?: BulkItem[];
}

interface BulkItem {
    name: string;
    batchNumber: string;
    barcode: string;
    purchasePrice: string | number;
    pricePerUnit: string | number;
    stock: string | number;
    mrp: string | number;
    stockValue?: string | number | undefined;
    unit: string;
    errors?: Record<string, string> | undefined;
}

const BulkUploadModal: React.FC<BulkUploadModalProps> = ({ isOpen, onClose, onSuccess, initialData }) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [data, setData] = useState<BulkItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (isOpen && initialData && initialData.length > 0) {
            setData(validateData(initialData));
        }
    }, [isOpen, initialData]);

    const downloadTemplate = () => {
        const headers = [['Product Name', 'Batch Number', 'Item Code', 'Purchase Price', 'Selling Price', 'MRP', 'Stock Quantity', 'Unit']];
        const sampleData = [
            ['Example Cement', 'B-101', 'CX-1002', 400, 450, 500, 100, 'piece'],
            ['Steel Rod 12mm', 'ST-22', 'BAR-12', 60, 75, 500, 'kg']
        ];
        const rows = [...headers, ...sampleData];
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "Inventory Template");
        XLSX.writeFile(wb, "Inventory_Template.xlsx");
    };

    const validateData = (items: BulkItem[]): BulkItem[] => {
        return items.map(item => {
            const errors: Record<string, string> = {};
            if (!item.name || item.name.trim() === '') errors.name = 'Name is required';
            
            const sp = parseFloat(String(item.pricePerUnit)) || 0;
            const pp = parseFloat(String(item.purchasePrice)) || 0;
            
            if (sp <= 0) errors.pricePerUnit = 'Price required';
            if (sp < pp) errors.pricePerUnit = 'Below Cost'; // Accuracy check: Selling below Purchase
            
            if (!item.unit || item.unit.trim() === '') errors.unit = 'Unit required';
            return { ...item, errors };
        });
    };

    const jumpToNextError = (currentRow: number, currentField: string) => {
        // Find the next error starting from the current cell
        const fields: (keyof BulkItem)[] = ['name', 'batchNumber', 'barcode', 'purchasePrice', 'pricePerUnit', 'stock', 'unit'];
        const startFieldIndex = fields.indexOf(currentField as keyof BulkItem);

        for (let r = currentRow; r < data.length; r++) {
            const startF = (r === currentRow) ? startFieldIndex + 1 : 0;
            const item = data[r];
            if (!item) continue;

            for (let f = startF; f < fields.length; f++) {
                const field = fields[f];
                if (!field) continue;
                
                if (item.errors && item.errors[field as string]) {
                    const nextInput = document.getElementById(`cell-${r}-${field}`);
                    if (nextInput) {
                        nextInput.focus();
                        return true;
                    }
                }
            }
        }
        return false;
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const arrayBuffer = event.target?.result;
                const wb = XLSX.read(arrayBuffer, { type: 'array' });
                const wsname = wb.SheetNames[0];
                if (!wsname) throw new Error('No sheets found in file');
                const ws = wb.Sheets[wsname];
                if (!ws) throw new Error('Sheet not found');
                const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
                if (rows.length === 0) {
                    showToast('The selected sheet is empty.', 'error');
                    return;
                }

                // 1. Find the real header row (skip company metadata/logos/summary lines)
                let headerRowIndex = -1;
                let maxMatches = 0;
                const headerKeywords = ['name', 'product', 'item', 'price', 'rate', 'stock', 'quantity', 'code', 'unit', 'batch', 'mrp', 'cost', 'value'];
                
                // Scan first 25 rows and pick the one with most keyword matches
                for (let i = 0; i < Math.min(rows.length, 25); i++) {
                    const row = rows[i];
                    if (!Array.isArray(row)) continue;
                    
                    const matchCount = row.filter(cell => 
                        typeof cell === 'string' && 
                        headerKeywords.some(kw => cell.toLowerCase().replace(/[^a-z0-9]/g, '').includes(kw))
                    ).length;
                    
                    if (matchCount > maxMatches && matchCount >= 2) {
                        maxMatches = matchCount;
                        headerRowIndex = i;
                    }
                }

                if (headerRowIndex === -1) {
                    console.warn('Could not detect header row clearly, falling back to first row');
                    headerRowIndex = 0;
                } else {
                    console.log(`Header Detection: Selected row ${headerRowIndex} with ${maxMatches} matches.`);
                }

                const headers = Array.from(rows[headerRowIndex] || []).map(h => String(h || '').trim());
                const dataRows = rows.slice(headerRowIndex + 1);

                // 2. Map data using detected headers
                const mappedData = dataRows.map((rowArr: any[]): BulkItem | null => {
                    if (!Array.isArray(rowArr) || rowArr.length === 0) return null;

                    const findValue = (keys: string[]) => {
                        const normalizedKeys = keys.map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ''));
                        const colIndex = headers.findIndex(h => {
                            if (!h || typeof h !== 'string') return false;
                            const normalizedH = h.toLowerCase().replace(/[^a-z0-9]/g, '');
                            return normalizedKeys.some(nk => 
                                normalizedH === nk || 
                                normalizedH.includes(nk) || 
                                nk.includes(normalizedH)
                            );
                        });
                        const rawVal = colIndex !== -1 ? rowArr[colIndex] : null;
                        return (rawVal === null || rawVal === undefined) ? '' : rawVal;
                    };

                    const nameVal = String(findValue(['Product Name', 'name', 'product', 'item'])).trim();
                    
                    // Skip if name is empty, null, or looks like a header repetition
                    if (!nameVal || nameVal === '' || nameVal.toLowerCase() === 'name' || nameVal.toLowerCase() === 'product name') return null;

                    return {
                        name: nameVal,
                        batchNumber: String(findValue(['Batch Number', 'batch', 'batchno', 'Batch No', 'batch_no', 'batch_no.']) || 'Default'),
                        barcode: String(findValue(['Item Code', 'barcode', 'sku', 'code', 'itemcode']) || ''),
                        purchasePrice: findValue(['Purchase Price', 'purchaseprice', 'costprice', 'cost', 'buy']),
                        pricePerUnit: findValue(['Selling Price', 'sellingprice', 'price', 'rate', 'sell']),
                        mrp: findValue(['MRP', 'mrp', 'markedprice', 'maxprice']),
                        stock: String(findValue(['Stock Quantity', 'stock', 'qty', 'quantity', 'initialstock']) || '0'),
                        stockValue: String(findValue(['Stock Value', 'stock_value', 'total_value', 'value']) || ''),
                        unit: String(findValue(['Unit', 'unit', 'uom']) || 'piece').toLowerCase(),
                    };
                }).filter((item): item is BulkItem => item !== null);

                setData(validateData(mappedData));
                showToast(`Successfully detected headers and loaded ${mappedData.length} items.`, 'success');
            } catch (err) {
                console.error('XLSX High Confidence Parsing Error:', err);
                showToast('Error parsing file. Please use the provided template.', 'error');
            } finally {
                setIsProcessing(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleCellChange = (index: number, field: keyof BulkItem, value: any) => {
        setData(prev => {
            const newData = [...prev];
            const item = newData[index];
            if (!item) return prev;
            
            const updatedItem = { ...item, [field]: value };
            
            // Re-validate only the affected row for performance
            const validated = validateData([updatedItem])[0];
            if (!validated) return prev;
            
            newData[index] = validated;
            return newData;
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent, rowIdx: number, field: keyof BulkItem) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const item = data[rowIdx];
            if (!item) return;

            // Short delay to allow state update to finish
            setTimeout(() => {
                const updatedItem = data[rowIdx];
                if (!updatedItem || !updatedItem.errors) return;
                
                const isStillError = !!updatedItem.errors[field as string];
                if (!isStillError) {
                    const jumped = jumpToNextError(rowIdx, field as string);
                    if (!jumped) {
                        // If no more errors, try to go to next row name
                        const nextRowName = document.getElementById(`cell-${rowIdx + 1}-name`);
                        nextRowName?.focus();
                    }
                }
            }, 50);
        }
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
            mrp: 0,
            stock: 0,
            unit: 'piece'
        };
        setData(validateData([...data, newItem]));
    };

    const setAllBatches = (batchName: string) => {
        setData(prev => {
            const newData = prev.map(item => ({ ...item, batchNumber: batchName }));
            return validateData(newData);
        });
        showToast(`All items set to ${batchName} batch`, 'success');
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
        const payload = data.map(item => ({
            ...item,
            purchasePrice: Number(item.purchasePrice) || 0,
            pricePerUnit: Number(item.pricePerUnit) || 0,
            mrp: Number(item.mrp) || 0,
            stock: parseFloat(String(item.stock).replace(/[^\d.]/g, '')) || 0 // Extract numeric part for DB
        }));

        try {
            await axios.post('/api/inventory/bulk', payload, {
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
            <div className="bg-white w-full max-w-6xl h-[95vh] md:h-[90vh] rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="px-4 md:px-8 py-4 md:py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h2 className="text-lg md:text-2xl font-black text-slate-800 tracking-tight">Bulk Inventory Upload</h2>
                        <p className="text-slate-500 text-[10px] md:text-sm line-clamp-1">Upload Excel/CSV and edit data before final submission.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl transition-all shrink-0"><X size={20} /></button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col p-4 md:p-8">
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

                            <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col items-center">
                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-4">New to bulk upload?</p>
                                <button 
                                    onClick={downloadTemplate}
                                    className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-bold transition-all group"
                                >
                                    <FileSpreadsheet size={18} className="group-hover:scale-110 transition-transform" />
                                    Download Sample Template
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col min-h-0">
                            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-4">
                                <div className="flex flex-wrap items-center gap-3 md:gap-4">
                                    <div className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] md:text-xs font-bold border border-emerald-100 flex items-center gap-2">
                                        <Check size={14} /> {data.length} Items Loaded
                                    </div>
                                    <button 
                                        onClick={addNewRow}
                                        className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-[10px] md:text-xs font-bold hover:bg-slate-200 flex items-center gap-2"
                                    >
                                        <Plus size={14} /> Add Row
                                    </button>
                                    <div className="hidden md:block h-6 w-px bg-slate-200 mx-1"></div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-tighter mr-1">Set All Batch:</span>
                                        <button 
                                            onClick={() => setAllBatches('Retail')}
                                            className="px-2 py-1 md:px-3 md:py-1.5 bg-amber-50 text-amber-700 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all border border-amber-200/50"
                                        >
                                            Retail
                                        </button>
                                        <button 
                                            onClick={() => setAllBatches('Wholesale')}
                                            className="px-2 py-1 md:px-3 md:py-1.5 bg-blue-50 text-blue-700 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all border border-blue-200/50"
                                        >
                                            Wholesale
                                        </button>
                                    </div>
                                </div>
                                <div className="text-[10px] md:text-xs font-medium text-slate-400 flex items-center gap-2">
                                    <AlertCircle size={14} className="text-amber-500" /> <span className="hidden sm:inline">Red cells require correction</span><span className="sm:hidden">Fix errors</span>
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
                                            <th className="px-4 py-4 text-left">MRP</th>
                                            <th className="px-4 py-4 text-left">Stock</th>
                                            <th className="px-4 py-4 text-left">Unit*</th>
                                            <th className="px-4 py-4 text-left text-blue-600">Total Cost</th>
                                            <th className="px-4 py-4 text-left text-emerald-600">Total Sale</th>
                                            <th className="px-4 py-4 text-center w-12"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                         {data.map((item, idx) => {
                                            const numericStock = parseFloat(String(item.stock).replace(/[^\d.]/g, '')) || 0;
                                            const totalCost = numericStock * Number(item.purchasePrice);
                                            // Prefer raw stock value from excel if present, otherwise calc
                                            const displayStockValue = item.stockValue || (numericStock * Number(item.pricePerUnit)).toLocaleString();
                                            
                                            return (
                                                <tr key={idx} className="bg-white hover:bg-blue-50/30 transition-colors group">
                                                    <td className="p-1">
                                                        <input 
                                                            id={`cell-${idx}-name`}
                                                            className={`w-full p-2.5 bg-transparent border-0 ring-1 focus:ring-2 rounded-xl font-bold transition-all ${item.errors?.name ? 'bg-rose-50/50 text-rose-600 ring-rose-400/50 focus:ring-rose-500' : 'text-slate-700 ring-transparent focus:ring-primary-500'}`}
                                                            value={item.name}
                                                            onChange={e => handleCellChange(idx, 'name', e.target.value)}
                                                            onKeyDown={e => handleKeyDown(e, idx, 'name')}
                                                            placeholder="Product Name"
                                                        />
                                                    </td>
                                                    <td className="p-1">
                                                        <input 
                                                            id={`cell-${idx}-batchNumber`}
                                                            className={`w-full p-2.5 bg-transparent border-0 ring-1 focus:ring-2 rounded-xl text-slate-500 transition-all ${item.errors?.batchNumber ? 'bg-rose-50/50 ring-rose-400/50 focus:ring-rose-500' : 'ring-transparent focus:ring-primary-500'}`}
                                                            value={item.batchNumber}
                                                            onChange={e => handleCellChange(idx, 'batchNumber', e.target.value)}
                                                            onKeyDown={e => handleKeyDown(e, idx, 'batchNumber')}
                                                        />
                                                    </td>
                                                    <td className="p-1">
                                                        <input 
                                                            id={`cell-${idx}-barcode`}
                                                            className={`w-full p-2.5 bg-transparent border-0 ring-1 focus:ring-2 rounded-xl text-slate-500 font-mono transition-all ${item.errors?.barcode ? 'bg-rose-50/50 ring-rose-400/50 focus:ring-rose-500' : 'ring-transparent focus:ring-primary-500'}`}
                                                            value={item.barcode}
                                                            onChange={e => handleCellChange(idx, 'barcode', e.target.value)}
                                                            onKeyDown={e => handleKeyDown(e, idx, 'barcode')}
                                                            placeholder="SKU/Barcode"
                                                        />
                                                    </td>
                                                    <td className="p-1">
                                                        <input 
                                                            id={`cell-${idx}-purchasePrice`}
                                                            type="number"
                                                            className={`w-full p-2.5 bg-transparent border-0 ring-1 focus:ring-2 rounded-xl text-slate-700 font-bold transition-all ${item.errors?.purchasePrice ? 'bg-rose-50/50 ring-rose-400/50 focus:ring-rose-500' : 'ring-transparent focus:ring-primary-500'}`}
                                                            value={item.purchasePrice}
                                                            onChange={e => handleCellChange(idx, 'purchasePrice', e.target.value)}
                                                            onKeyDown={e => handleKeyDown(e, idx, 'purchasePrice')}
                                                            onWheel={(e) => e.currentTarget.blur()}
                                                        />
                                                    </td>
                                                    <td className="p-1">
                                                        <input 
                                                            id={`cell-${idx}-pricePerUnit`}
                                                            type="number"
                                                            className={`w-full p-2.5 bg-transparent border-0 ring-1 focus:ring-2 rounded-xl font-black transition-all ${item.errors?.pricePerUnit ? 'bg-rose-50/50 text-rose-600 ring-rose-400 focus:ring-rose-500' : 'text-primary-600 ring-transparent focus:ring-primary-500'}`}
                                                            value={item.pricePerUnit}
                                                            onChange={e => handleCellChange(idx, 'pricePerUnit', e.target.value)}
                                                            onKeyDown={e => handleKeyDown(e, idx, 'pricePerUnit')}
                                                            onWheel={(e) => e.currentTarget.blur()}
                                                        />
                                                    </td>
                                                    <td className="p-1">
                                                        <input 
                                                            id={`cell-${idx}-mrp`}
                                                            type="number"
                                                            className={`w-full p-2.5 bg-transparent border-0 ring-1 focus:ring-2 rounded-xl text-slate-500 transition-all ${item.errors?.mrp ? 'bg-rose-50/50 ring-rose-400/50 focus:ring-rose-500' : 'ring-transparent focus:ring-primary-500'}`}
                                                            value={item.mrp}
                                                            onChange={e => handleCellChange(idx, 'mrp', e.target.value)}
                                                            onKeyDown={e => handleKeyDown(e, idx, 'mrp')}
                                                            onWheel={(e) => e.currentTarget.blur()}
                                                        />
                                                    </td>
                                                    <td className="p-1">
                                                        <input 
                                                            id={`cell-${idx}-stock`}
                                                            className={`w-full p-2.5 bg-transparent border-0 ring-1 focus:ring-2 rounded-xl text-slate-700 font-bold transition-all ${item.errors?.stock ? 'bg-rose-50/50 ring-rose-400/50 focus:ring-rose-500' : 'ring-transparent focus:ring-primary-500'}`}
                                                            value={item.stock}
                                                            onChange={e => handleCellChange(idx, 'stock', e.target.value)}
                                                            onKeyDown={e => handleKeyDown(e, idx, 'stock')}
                                                            placeholder="Qty"
                                                        />
                                                    </td>
                                                    <td className="p-1">
                                                        <input 
                                                            id={`cell-${idx}-unit`}
                                                            className={`w-full p-2.5 bg-transparent border-0 ring-1 focus:ring-2 rounded-xl font-bold uppercase tracking-widest transition-all ${item.errors?.unit ? 'bg-rose-50/50 text-rose-600 ring-rose-400/50 focus:ring-rose-500' : 'text-slate-400 ring-transparent focus:ring-primary-500'}`}
                                                            value={item.unit}
                                                            onChange={e => handleCellChange(idx, 'unit', e.target.value)}
                                                            onKeyDown={e => handleKeyDown(e, idx, 'unit')}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-blue-700 font-black bg-blue-50/20">
                                                        ₹{totalCost.toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3 text-emerald-700 font-black bg-emerald-50/20">
                                                        ₹{displayStockValue}
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
                    <div className="px-4 md:px-8 py-4 md:py-6 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-slate-100">
                        <button 
                            onClick={() => { setData([]); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                            className="text-slate-400 hover:text-slate-600 font-bold uppercase tracking-widest text-[9px] md:text-[10px] order-last md:order-first"
                        >
                            Reset Table
                        </button>
                        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                            <button 
                                onClick={onClose}
                                className="w-full md:w-auto px-6 py-3 md:py-4 bg-white border border-slate-200 text-slate-600 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={isSaving}
                                className="w-full md:w-auto px-10 py-3 md:py-4 bg-primary-600 text-white rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all flex items-center justify-center gap-3 active:scale-95"
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
