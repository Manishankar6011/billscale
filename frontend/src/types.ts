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
}

export interface User {
  _id?: string;
  name: string;
  email: string;
  role: "super-admin" | "owner" | "accountant";
  tenantId: Tenant | string | null;
  companyName: string;
  businessType: string;
  planType?: "free" | "basic" | "business" | "premium";
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
}

export interface Product {
  _id?: string;
  name: string;
  unit: string;
  stock: number;
  minStockAlert: number;
  pricePerUnit: number;
  purchasePrice: number;
  mrp: number;
  barcode?: string;
  batchNumber?: string;
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
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  items: {
    productId: Product | string;
    quantity: number;
    unit: string;
    conversionFactor: number;
    sellingPrice: number;
    purchasePriceAtTime: number;
    mrpAtTime: number;
  }[];
  totalAmount: number;
  totalProfit: number;
  amountPaid: number;
  balanceDue: number;
  roundOffAmount: number;
  paymentMode: "cash" | "credit";
  status: "paid" | "pending" | "partial";
  additionalItems?: { name: string; price: number }[];
  invoiceNumber: string;
  date: string;
}

export interface Purchase {
  _id?: string;
  supplierName: string;
  productId: Product | string;
  quantity: number;
  purchasePrice: number;
  sellingPrice?: number;
  mrp?: number;
  totalAmount: number;
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
