import React, { useState, useEffect } from 'react';
import {
  X,
  Wifi,
  WifiOff,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Printer,
  Trash2,
  RefreshCw,
  Clock,
  Layers,
} from 'lucide-react';
import {
  getAllOfflineSales,
  deleteOfflineSale,
  clearSyncedOfflineSales,
  type OfflineSaleRecord,
} from '../utils/offlineDb';
import type { Sale } from '../types';

interface OfflineSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  isSyncing: boolean;
  onSyncAll: () => Promise<void>;
  onPrintSale: (sale: Sale) => void;
  onRefreshStats?: () => void;
}

const OfflineSyncModal: React.FC<OfflineSyncModalProps> = ({
  isOpen,
  onClose,
  isOnline,
  isSyncing,
  onSyncAll,
  onPrintSale,
  onRefreshStats,
}) => {
  const [records, setRecords] = useState<OfflineSaleRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await getAllOfflineSales();
      setRecords(data);
    } catch (err) {
      console.error('Failed to load offline records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRecords();
    }
  }, [isOpen, isSyncing]);

  if (!isOpen) return null;

  const pendingCount = records.filter(
    (r) => r.syncStatus === 'pending' || r.syncStatus === 'failed'
  ).length;
  const syncedCount = records.filter((r) => r.syncStatus === 'synced').length;

  const handleDelete = async (localId: string) => {
    if (window.confirm('Are you sure you want to delete this offline bill record?')) {
      await deleteOfflineSale(localId);
      await loadRecords();
      if (onRefreshStats) onRefreshStats();
    }
  };

  const handleClearSynced = async () => {
    await clearSyncedOfflineSales();
    await loadRecords();
    if (onRefreshStats) onRefreshStats();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 border border-slate-100">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
              <UploadCloud size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-slate-850">Offline Bills & Cloud Sync</h3>
                {isOnline ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                    <Wifi size={12} className="text-emerald-600" /> Online
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-rose-800">
                    <WifiOff size={12} className="text-rose-600" /> Offline
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Bills created without internet are safely stored on this device.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Stats & Actions Bar */}
        <div className="px-6 py-4 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
              <Clock size={14} />
              <span>Pending Sync: <strong>{pendingCount}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              <CheckCircle2 size={14} />
              <span>Synced: <strong>{syncedCount}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {syncedCount > 0 && (
              <button
                onClick={handleClearSynced}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
              >
                Clear Synced
              </button>
            )}
            <button
              onClick={onSyncAll}
              disabled={!isOnline || pendingCount === 0 || isSyncing}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl shadow-sm transition-all ${
                !isOnline || pendingCount === 0 || isSyncing
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
              }`}
            >
              {isSyncing ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Syncing Bills...
                </>
              ) : (
                <>
                  <RefreshCw size={14} />
                  Sync All Now ({pendingCount})
                </>
              )}
            </button>
          </div>
        </div>

        {/* Bills List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading ? (
            <div className="py-16 text-center">
              <Loader2 size={32} className="animate-spin text-indigo-500 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Loading offline records...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Layers size={28} />
              </div>
              <h4 className="text-sm font-bold text-slate-700">No Offline Bills</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Any bills you create when internet is disconnected will appear here for automatic cloud syncing.
              </p>
            </div>
          ) : (
            records.map((record) => {
              const sale = record.displaySale;
              const isSynced = record.syncStatus === 'synced';
              const isFailed = record.syncStatus === 'failed';
              const isSyncingRecord = record.syncStatus === 'syncing';

              return (
                <div
                  key={record.localId}
                  className={`p-4 rounded-2xl border transition-all ${
                    isSynced
                      ? 'bg-emerald-50/30 border-emerald-100'
                      : isFailed
                      ? 'bg-rose-50/40 border-rose-200'
                      : 'bg-amber-50/30 border-amber-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-sm text-slate-900">
                          {record.offlineInvoiceNumber}
                        </span>
                        {isSynced && record.cloudInvoiceNumber && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                            → Cloud: {record.cloudInvoiceNumber}
                          </span>
                        )}
                        {isSynced ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            <CheckCircle2 size={12} /> Synced
                          </span>
                        ) : isSyncingRecord ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                            <Loader2 size={12} className="animate-spin" /> Syncing...
                          </span>
                        ) : isFailed ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                            <AlertCircle size={12} /> Failed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                            <Clock size={12} /> Pending Sync
                          </span>
                        )}
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                        <span>Customer: <strong>{sale.customerName || 'Cash Sale'}</strong></span>
                        {sale.customerPhone && <span>Phone: {sale.customerPhone}</span>}
                        <span>Items: {sale.items?.length || 0}</span>
                        <span>Date: {new Date(record.createdAt).toLocaleString()}</span>
                      </div>

                      {isFailed && record.syncError && (
                        <p className="mt-2 text-xs text-rose-600 bg-rose-100/70 p-2 rounded-lg font-mono">
                          Error: {record.syncError}
                        </p>
                      )}
                    </div>

                    <div className="text-right flex flex-col items-end gap-2">
                      <div className="text-base font-black text-slate-900">
                        ₹{Number(sale.totalAmount || 0).toLocaleString()}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onPrintSale(sale)}
                          title="Reprint Bill Receipt"
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-white rounded-lg border border-slate-200 transition-colors shadow-sm"
                        >
                          <Printer size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(record.localId)}
                          title="Delete Record"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg border border-slate-200 transition-colors shadow-sm"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>💡 Offline bills maintain original timestamps and accurately sync customer balances & inventory stock.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default OfflineSyncModal;
