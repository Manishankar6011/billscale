import { Document, Types } from "mongoose";

export interface ITenant extends Document {
  companyName: string;
  businessType?: string;
  planType?: "free" | "business" | "enterprise";
  address?: string;
  phone?: string;
  email: string;
  subscriptionStatus: "active" | "inactive" | "trial";
  createdAt: Date;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "super-admin" | "owner" | "accountant";
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
  createdAt: Date;
}

export interface ICustomer extends Document {
  tenantId: Types.ObjectId;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  createdAt: Date;
}

export interface IPurchase extends Document {
  tenantId: Types.ObjectId;
  supplierName: string;
  productId: Types.ObjectId;
  quantity: number;
  purchasePrice: number;
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
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  items: {
    productId: Types.ObjectId;
    quantity: number;
    unit: string;
    conversionFactor: number;
    sellingPrice: number;
    purchasePriceAtTime: number; // For historic profit tracking
    mrpAtTime: number;
  }[];
  totalAmount: number;
  totalProfit: number;
  taxAmount?: number;
  discount?: number;
  paymentMode: "cash" | "credit" | "upi" | "card" | "bank_transfer";
  status: "paid" | "pending";
  additionalItems?: { name: string, price: number }[];
  invoiceNumber: string;
  date: Date;
  createdAt: Date;
}

export interface IStaff extends Document {
  tenantId: Types.ObjectId;
  name: string;
  phone: string;
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
