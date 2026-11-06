import type { Product, Customer, Sale } from '../types';

const DB_NAME = 'BuildMate_POS_DB';
const DB_VERSION = 1;

export interface OfflineSaleRecord {
  localId: string;
  offlineInvoiceNumber: string;
  payload: any;
  displaySale: Sale;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
  cloudInvoiceNumber?: string;
  cloudId?: string;
  syncError?: string;
  createdAt: string;
  syncedAt?: string;
}

let dbInstance: IDBDatabase | null = null;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      return resolve(dbInstance);
    }

    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported on this browser/platform.'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Products store for offline barcode scanning & inventory lookup
      if (!db.objectStoreNames.contains('products')) {
        const prodStore = db.createObjectStore('products', { keyPath: '_id' });
        prodStore.createIndex('barcode', 'barcode', { unique: false });
        prodStore.createIndex('subUnitBarcode', 'subUnitBarcode', { unique: false });
        prodStore.createIndex('name', 'name', { unique: false });
      }

      // Customers store for offline search & auto-complete
      if (!db.objectStoreNames.contains('customers')) {
        const custStore = db.createObjectStore('customers', { keyPath: '_id' });
        custStore.createIndex('phone', 'phone', { unique: false });
        custStore.createIndex('name', 'name', { unique: false });
      }

      // Offline bills queue
      if (!db.objectStoreNames.contains('offline_sales')) {
        const salesStore = db.createObjectStore('offline_sales', { keyPath: 'localId' });
        salesStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        salesStore.createIndex('createdAt', 'createdAt', { unique: false });
        salesStore.createIndex('offlineInvoiceNumber', 'offlineInvoiceNumber', { unique: false });
      }

      // Metadata for sequence counters & sync states
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };

    request.onsuccess = (event: Event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event: Event) => {
      console.error('Failed to open IndexedDB:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

// ---------------- PRODUCTS ----------------

export const saveProductsOffline = async (products: Product[]): Promise<void> => {
  if (!products || products.length === 0) return;
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('products', 'readwrite');
    const store = tx.objectStore('products');

    for (const p of products) {
      if (p._id) {
        store.put(p);
      }
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getProductsOffline = async (): Promise<Product[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('products', 'readonly');
    const store = tx.objectStore('products');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

export const findProductByBarcodeOffline = async (code: string): Promise<Product | null> => {
  if (!code) return null;
  const trimmed = code.trim();
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction('products', 'readonly');
    const store = tx.objectStore('products');

    // 1. Try barcode index
    const barcodeIndex = store.index('barcode');
    const req1 = barcodeIndex.get(trimmed);

    req1.onsuccess = () => {
      if (req1.result) {
        return resolve(req1.result);
      }

      // 2. Try subUnitBarcode index
      const subUnitIndex = store.index('subUnitBarcode');
      const req2 = subUnitIndex.get(trimmed);

      req2.onsuccess = () => {
        if (req2.result) {
          return resolve(req2.result);
        }

        // 3. Fallback scan all for case-insensitive or partial match
        const getAllReq = store.getAll();
        getAllReq.onsuccess = () => {
          const all = getAllReq.result || [];
          const lower = trimmed.toLowerCase();
          const found = all.find(
            (p: Product) =>
              (p.barcode && p.barcode.trim().toLowerCase() === lower) ||
              (p.subUnitBarcode && p.subUnitBarcode.trim().toLowerCase() === lower) ||
              (p.name && p.name.trim().toLowerCase() === lower)
          );
          resolve(found || null);
        };
        getAllReq.onerror = () => reject(getAllReq.error);
      };
      req2.onerror = () => reject(req2.error);
    };
    req1.onerror = () => reject(req1.error);
  });
};

// ---------------- CUSTOMERS ----------------

export const saveCustomersOffline = async (customers: Customer[]): Promise<void> => {
  if (!customers || customers.length === 0) return;
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('customers', 'readwrite');
    const store = tx.objectStore('customers');

    for (const c of customers) {
      if (c._id) {
        store.put(c);
      }
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getCustomersOffline = async (search?: string): Promise<Customer[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('customers', 'readonly');
    const store = tx.objectStore('customers');
    const request = store.getAll();

    request.onsuccess = () => {
      const all: Customer[] = request.result || [];
      if (!search || !search.trim()) {
        return resolve(all.slice(0, 50));
      }
      const q = search.trim().toLowerCase();
      const filtered = all.filter(
        (c) =>
          (c.name && c.name.toLowerCase().includes(q)) ||
          (c.phone && c.phone.includes(q))
      );
      resolve(filtered.slice(0, 50));
    };
    request.onerror = () => reject(request.error);
  });
};

// ---------------- METADATA & INVOICE NUMBERING ----------------

export const getNextOfflineInvoiceNumber = async (): Promise<string> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('meta', 'readwrite');
    const store = tx.objectStore('meta');
    const req = store.get('offline_invoice_seq');

    req.onsuccess = () => {
      let currentSeq = req.result ? Number(req.result.value) || 0 : 0;
      currentSeq += 1;
      store.put({ key: 'offline_invoice_seq', value: currentSeq });

      const padded = String(currentSeq).padStart(3, '0');
      resolve(`OFF-${padded}`);
    };

    req.onerror = () => reject(req.error);
  });
};

// ---------------- OFFLINE SALES QUEUE ----------------

export const saveOfflineSale = async (
  offlineSale: Sale,
  payload: any
): Promise<OfflineSaleRecord> => {
  const db = await initDB();
  const record: OfflineSaleRecord = {
    localId: offlineSale._id || `off_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    offlineInvoiceNumber: offlineSale.offlineInvoiceNumber || offlineSale.invoiceNumber || 'OFF-000',
    payload,
    displaySale: offlineSale,
    syncStatus: 'pending',
    createdAt: offlineSale.date || new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(['offline_sales', 'products'], 'readwrite');
    const salesStore = tx.objectStore('offline_sales');
    const prodStore = tx.objectStore('products');

    salesStore.put(record);

    // Deduct stock in local IndexedDB products store so subsequent scans accurately reflect stock
    if (offlineSale.items && Array.isArray(offlineSale.items)) {
      for (const item of offlineSale.items) {
        const pid = typeof item.productId === 'object' ? item.productId?._id : item.productId;
        if (pid) {
          const factor = Number(item.conversionFactor) || 1;
          const qtyToDeduct = Number(item.quantity) / factor;

          const getProdReq = prodStore.get(pid);
          getProdReq.onsuccess = () => {
            if (getProdReq.result) {
              const prod = getProdReq.result;
              prod.stock = Math.max(0, (Number(prod.stock) || 0) - qtyToDeduct);
              prodStore.put(prod);
            }
          };
        }
      }
    }

    tx.oncomplete = () => resolve(record);
    tx.onerror = () => reject(tx.error);
  });
};

export const getPendingOfflineSales = async (): Promise<OfflineSaleRecord[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_sales', 'readonly');
    const store = tx.objectStore('offline_sales');
    const request = store.getAll();

    request.onsuccess = () => {
      const all: OfflineSaleRecord[] = request.result || [];
      const pending = all.filter((s) => s.syncStatus === 'pending' || s.syncStatus === 'failed');
      pending.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      resolve(pending);
    };

    request.onerror = () => reject(request.error);
  });
};

export const getAllOfflineSales = async (): Promise<OfflineSaleRecord[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_sales', 'readonly');
    const store = tx.objectStore('offline_sales');
    const request = store.getAll();

    request.onsuccess = () => {
      const all: OfflineSaleRecord[] = request.result || [];
      all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      resolve(all);
    };

    request.onerror = () => reject(request.error);
  });
};

export const updateOfflineSaleStatus = async (
  localId: string,
  status: 'pending' | 'syncing' | 'synced' | 'failed',
  cloudInvoiceNumber?: string,
  cloudId?: string,
  syncError?: string
): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_sales', 'readwrite');
    const store = tx.objectStore('offline_sales');
    const req = store.get(localId);

    req.onsuccess = () => {
      if (req.result) {
        const record: OfflineSaleRecord = req.result;
        record.syncStatus = status;
        if (cloudInvoiceNumber) record.cloudInvoiceNumber = cloudInvoiceNumber;
        if (cloudId) record.cloudId = cloudId;
        if (syncError !== undefined) record.syncError = syncError;
        if (status === 'synced') record.syncedAt = new Date().toISOString();
        store.put(record);
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const deleteOfflineSale = async (localId: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_sales', 'readwrite');
    const store = tx.objectStore('offline_sales');
    store.delete(localId);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const clearSyncedOfflineSales = async (): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_sales', 'readwrite');
    const store = tx.objectStore('offline_sales');
    const req = store.getAll();

    req.onsuccess = () => {
      const all: OfflineSaleRecord[] = req.result || [];
      for (const item of all) {
        if (item.syncStatus === 'synced') {
          store.delete(item.localId);
        }
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};
