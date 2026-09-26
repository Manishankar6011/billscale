export interface Tenant {
  _id?: string;
  companyName: string;
  email: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
  billingEmail?: string;
  billingAddress?: string;
  signature?: string;
  planType: "free" | "basic" | "business" | "premium";
  subscriptionStatus: "active" | "inactive" | "trial";
  subscriptionExpiryDate?: string;
  aiUsageCount: number;
  referralCode?: string;
  upiId?: string;
  slug?: string;
  gstin?: string;
  pan?: string;
  stateName?: string;
  stateCode?: string;
  invoiceFormat?: 'thermal' | 'modern' | 'gst';
  businessType?: string;
  enableInventoryImageUpload?: boolean;
}

export interface User {
  _id?: string;
  name: string;
  email: string;
  role: "super-admin" | "owner" | "accountant" | "staff";
  tenantId: Tenant | string | null;
  companyName: string;
  businessType: string;
  planType?: "free" | "basic" | "business";
  subscriptionStatus: "active" | "inactive" | "trial";
  subscriptionExpiryDate?: string;
  aiUsageCount: number;
  token: string;
  referralCode?: string;
  logoUrl?: string;
  billingEmail?: string;
  billingAddress?: string;
  phone?: string;
  signature?: string;
  upiId?: string;
  gstin?: string;
  pan?: string;
  stateName?: string;
  stateCode?: string;
  invoiceFormat?: 'thermal' | 'modern' | 'gst';
  enableInventoryImageUpload?: boolean;
  permissions?: Record<string, Record<string, boolean>>;
}

export interface StaffPermissions {
  dashboard?: { view?: boolean };
  inventory?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
  sales?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean; viewProfit?: boolean };
  purchases?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
  customers?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
  staff?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
  attendance?: { view?: boolean; edit?: boolean };
  salary?: { view?: boolean; pay?: boolean };
  ledger?: { view?: boolean };
  reports?: { view?: boolean };
  settings?: { view?: boolean };
  [key: string]: Record<string, boolean | undefined> | undefined;
}

export const DEFAULT_STAFF_PERMISSIONS: StaffPermissions = {
  dashboard: { view: true },
  inventory: { view: true, create: true, edit: true, delete: false },
  sales: { view: true, create: true, edit: false, delete: false, viewProfit: false },
  purchases: { view: true, create: true, edit: false, delete: false },
  customers: { view: true, create: true, edit: true, delete: false },
  staff: { view: false, create: false, edit: false, delete: false },
  attendance: { view: false, edit: false },
  salary: { view: false, pay: false },
  ledger: { view: false },
  reports: { view: false },
  settings: { view: false },
};

export interface Product {
  _id?: string;
  name: string;
  unit: string;
  stock: number;
  minStockAlert: number;
  pricePerUnit: number;
  purchasePrice: number;
  mrp: number;
  barcode?: string | undefined;
  batchNumber?: string | undefined;
  imageUrl?: string | undefined;
  hsnCode?: string | undefined;
  gstRate?: number | undefined;
  category?: string;
  // Medical fields
  genericName?: string;
  manufacturer?: string;
  drugSchedule?: string;
  rackLocation?: string;
  expiryDate?: string | undefined;
  // Subunit fields
  hasSubUnit?: boolean;
  subUnitName?: string;
  subUnitValue?: number;
  subUnitMrp?: number;
  subUnitSalePrice?: number;
  subUnitPurchasePrice?: number;
  subUnitBarcode?: string;
  subUnitDiscount?: number;
}

export interface PaginatedResponse<T> {
  products: T[];
  pagination: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    limit: number;
  };
  totalStockValue: number;
  totalSellingValue: number;
  totalPurchaseValue: number;
}

export interface PaginatedSalesResponse {
  sales: Sale[];
  pagination: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    limit: number;
  };
  summary: {
    totalAmount: number;
    totalPaid: number;
    totalUnpaid: number;
    totalProfit: number;
    totalAdditionalCharges: number;
    totalRoundOff: number;
    paidCount: number;
    pendingCount: number;
  };
}

export interface PaginatedPurchasesResponse {
  purchases: Purchase[];
  pagination: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    limit: number;
  };
}




export interface Customer {
  _id?: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
  state?: string;
  stateCode?: string;
}

export interface Staff {
  _id?: string;
  name: string;
  phone?: string;
  role: string;
  salaryType: "monthly" | "daily";
  salaryAmount: number;
  status: "active" | "inactive";
}

export interface Sale {
  _id?: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  customerGSTIN?: string;
  customerState?: string;
  customerStateCode?: string;
  items: {
    productId: Product | string;
    quantity: number;
    unit: string;
    conversionFactor: number;
    sellingPrice: number;
    purchasePriceAtTime: number;
    mrpAtTime: number;
    taxRate?: number | undefined;
    taxAmount?: number | undefined;
    hsnCode?: string | undefined;
    batchNumber?: string | undefined;
    expiryDate?: string | undefined;
  }[];
  doctorName?: string;
  totalAmount: number;
  totalProfit: number;
  amountPaid: number;
  balanceDue: number;
  roundOffAmount: number;
  paymentMode: "cash" | "credit";
  status: "paid" | "pending" | "partial";
  additionalItems?: { name: string; price: number; profitPercent?: number; mrp?: number; purchasePrice?: number; profitAmount?: number }[];
  customItems?: { name: string; price: number; quantity: number; profitPercent?: number; mrp?: number; purchasePrice?: number; profitAmount?: number }[];
  invoiceNumber: string;
  date: string;
  showQRCode?: boolean;
  createdBy?: string | { _id: string; name: string; role?: string };
}

export interface Purchase {
  _id?: string;
  supplierName: string;
  supplierGSTIN?: string;
  supplierPhone?: string;
  supplierAddress?: string;
  billNumber?: string;
  items: {
    productId: string | Product;
    name: string;
    quantity: number;
    unit: string;
    conversionFactor?: number;
    purchasePrice: number;
    taxRate?: number;
    taxAmount?: number;
    hsnCode?: string;
  }[];
  totalAmount: number;
  taxAmount?: number;
  discount?: number;
  paymentMode?: "cash" | "credit" | "upi" | "card" | "bank_transfer";
  paymentStatus: "paid" | "pending";
  date: string;
}

export interface AttendanceRecord {
  _id?: string;
  staffId: Staff | string;
  date: string;
  status: "full-day" | "half-day" | "absent";
}

export interface SalaryPayment {
  _id?: string;
  staffId: string;
  amount: number;
  date: string;
  note?: string;
}

export interface StaffSummary {
  staff: Staff;
  workingDays: number;
  totalEarned: number;
  totalPaid: number;
  balance: number;
}
