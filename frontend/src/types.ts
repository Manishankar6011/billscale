export interface Tenant {
  _id?: string;
  companyName: string;
  email: string;
}

export interface User {
  _id?: string;
  name: string;
  email: string;
  role: 'super-admin' | 'owner' | 'accountant';
  tenantId: string | null;
  companyName: string;
  businessType: string;
  planType?: 'free' | 'business' | 'enterprise';
  subscriptionStatus: 'active' | 'inactive' | 'trial';
  token: string;
}

export interface Product {
    _id?: string;
    name: string;
    unit: 'ton' | 'bag' | 'piece' | 'kg' | 'ft';
    stock: number;
    minStockAlert: number;
    pricePerUnit: number;
    purchasePrice: number;
}

export interface Staff {
    _id?: string;
    name: string;
    phone: string;
    role: string;
    salaryType: 'monthly' | 'daily';
    salaryAmount: number;
    status: 'active' | 'inactive';
}

export interface Sale {
    _id?: string;
    customerName: string;
    items: {
        productId: Product;
        quantity: number;
        sellingPrice: number;
        purchasePriceAtTime: number;
    }[];
    totalAmount: number;
    totalProfit: number;
    paymentMode: 'cash' | 'credit';
    status: 'paid' | 'pending';
    date: string;
}

export interface Purchase {
    _id?: string;
    supplierName: string;
    productId: Product;
    quantity: number;
    purchasePrice: number;
    totalAmount: number;
    paymentStatus: 'paid' | 'pending';
    date: string;
}

export interface AttendanceRecord {
    _id?: string;
    staffId: Staff | string;
    date: string;
    status: 'full-day' | 'half-day' | 'absent';
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
