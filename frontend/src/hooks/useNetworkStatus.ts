import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  getPendingOfflineSales,
  updateOfflineSaleStatus,
  initDB,
  type OfflineSaleRecord
} from '../utils/offlineDb';

export interface SyncResult {
  total: number;
  synced: number;
  failed: number;
}

export const useNetworkStatus = (authToken?: string) => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const isSyncingRef = useRef<boolean>(false);

  // Refresh pending sales count from IndexedDB
  const refreshPendingCount = useCallback(async () => {
    try {
      await initDB();
      const pending = await getPendingOfflineSales();
      setPendingCount(pending.length);
      return pending.length;
    } catch (err) {
      console.warn('[OfflineDB] Could not count pending sales:', err);
      return 0;
    }
  }, []);

  // Main sync function: push all pending offline sales to cloud
  const syncOfflineSales = useCallback(
    async (token?: string, onSaleSynced?: (record: OfflineSaleRecord, cloudSale: any) => void): Promise<SyncResult> => {
      const activeToken = token || authToken;
      if (!activeToken) {
        return { total: 0, synced: 0, failed: 0 };
      }

      if (isSyncingRef.current) {
        return { total: 0, synced: 0, failed: 0 };
      }

      const pendingSales = await getPendingOfflineSales();
      if (pendingSales.length === 0) {
        setPendingCount(0);
        return { total: 0, synced: 0, failed: 0 };
      }

      isSyncingRef.current = true;
      setIsSyncing(true);

      let synced = 0;
      let failed = 0;

      for (const record of pendingSales) {
        try {
          await updateOfflineSaleStatus(record.localId, 'syncing');

          // Ensure offlineInvoiceNumber is passed in payload
          const syncPayload = {
            ...record.payload,
            offlineInvoiceNumber: record.offlineInvoiceNumber,
            date: record.createdAt,
          };

          const res = await axios.post('/api/transactions/sales', syncPayload, {
            headers: { Authorization: `Bearer ${activeToken}` },
            timeout: 15000,
          });

          const cloudSale = res.data;
          await updateOfflineSaleStatus(
            record.localId,
            'synced',
            cloudSale.invoiceNumber,
            cloudSale._id
          );
          synced++;

          if (onSaleSynced) {
            onSaleSynced(record, cloudSale);
          }
        } catch (err: any) {
          console.error(`[OfflineSync] Failed to sync ${record.offlineInvoiceNumber}:`, err);
          const errorMsg =
            err.response?.data?.message || err.message || 'Network error during sync';
          await updateOfflineSaleStatus(
            record.localId,
            'failed',
            undefined,
            undefined,
            errorMsg
          );
          failed++;
        }
      }

      isSyncingRef.current = false;
      setIsSyncing(false);
      await refreshPendingCount();

      return { total: pendingSales.length, synced, failed };
    },
    [authToken, refreshPendingCount]
  );

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when reconnecting to internet
      if (authToken) {
        syncOfflineSales(authToken).catch(console.error);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    refreshPendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [authToken, refreshPendingCount, syncOfflineSales]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    refreshPendingCount,
    syncOfflineSales,
  };
};
