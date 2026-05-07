import { Document, Types } from "mongoose";

export interface ITenant extends Document {
  companyName: string;
  businessType?: string;
  planType: "free" | "basic" | "business";
  address?: string;
  phone?: string;
  email: string;
  subscriptionStatus: "active" | "inactive" | "trial";
  subscriptionExpiryDate: Date;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  logoUrl?: string;
  billingEmail?: string;
  billingAddress?: string;
  signature?: string;
  aiUsageCount: number;
  referralCode: string;
  referredBy?: Types.ObjectId;
  referralRewardClaimed: boolean;
  nextInvoiceNumber: number;
  upiId?: string;
  slug: string;
  gstin?: string;
  pan?: string;
  stateName?: string;
  stateCode?: string;
  invoiceFormat?: 'thermal' | 'modern' | 'gst';
  createdAt: Date;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "super-admin" | "owner" | "accountant" | "staff";
  tenantId: Types.ObjectId | null;
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  createdAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface IProduct extends Document {
  tenantId: Types.ObjectId;
  name: string;
  category?: string;
  unit: string;
  stock: number;
  minStockAlert: number;
  pricePerUnit: number;
  purchasePrice: number;
  mrp: number;
  barcode?: string;
  batchNumber?: string;
  imageUrl?: string;
  hsnCode?: string;
  gstRate?: number;
  createdAt: Date;
}

export interface ICustomer extends Document {
  tenantId: Types.ObjectId;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
  state?: string;
  stateCode?: string;
  createdAt: Date;
}

export interface IPurchase extends Document {
  tenantId: Types.ObjectId;
  supplierName: string;
  supplierGSTIN?: string;
  supplierPhone?: string;
  supplierAddress?: string;
  billNumber?: string;
  items: {
    productId: Types.ObjectId;
    name: string;
    quantity: number;
    unit: string;
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
  date: Date;
  createdAt: Date;
}

export interface ISale extends Document {
  tenantId: Types.ObjectId;
  customerId?: Types.ObjectId;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  customerGSTIN?: string;
  customerState?: string;
  customerStateCode?: string;
  createdBy?: Types.ObjectId;
  items: {
    productId: Types.ObjectId;
    quantity: number;
    unit: string;
    conversionFactor: number;
    sellingPrice: number;
    purchasePriceAtTime: number; // For historic profit tracking
    mrpAtTime: number;
    taxRate?: number;
    taxAmount?: number;
    hsnCode?: string;
  }[];
  totalAmount: number;
  totalProfit: number;
  amountPaid: number;
  downPayment?: number;
  balanceDue: number;
  roundOffAmount: number;
  taxAmount?: number;
  discount?: number;
  paymentMode: "cash" | "credit" | "upi" | "card" | "bank_transfer";
  status: "paid" | "pending" | "partial";
  additionalItems?: { name: string, price: number, profitPercent?: number }[];
  invoiceNumber: string;
  date: Date;
  showQRCode?: boolean;
  createdAt: Date;
}

export interface IStaff extends Document {
  tenantId: Types.ObjectId;
  name: string;
  phone?: string;
  role: string;
  salaryType: "monthly" | "daily";
  salaryAmount: number;
  status: "active" | "inactive";
  createdAt: Date;
}

export interface IAttendance extends Document {
  tenantId: Types.ObjectId;
  staffId: Types.ObjectId;
  date: Date;
  status: "full-day" | "half-day" | "absent";
  createdAt: Date;
}

export interface ISalaryPayment extends Document {
  tenantId: Types.ObjectId;
  staffId: Types.ObjectId;
  amount: number;
  date: Date;
  note?: string;
  createdAt: Date;
}

export interface IPayment extends Document {
  tenantId: Types.ObjectId;
  labourId: Types.ObjectId;
  amount: number;
  paymentDate: Date;
  type: 'advance' | 'full-settlement' | 'partial';
  note?: string;
  method: 'cash' | 'bank-transfer' | 'upi';
  createdAt: Date;
}

export interface ICustomerPayment extends Document {
  tenantId: Types.ObjectId;
  customerId: Types.ObjectId;
  amount: number;
  paymentDate: Date;
  paymentMode: 'cash' | 'upi' | 'bank_transfer' | 'card';
  notes?: string;
  createdAt: Date;
}
