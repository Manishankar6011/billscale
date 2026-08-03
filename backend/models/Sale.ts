import mongoose, { Schema } from 'mongoose';
import { ISale } from '../types';

const saleSchema: Schema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    customerName: {
        type: String,
        required: true,
        trim: true
    },
    customerPhone: {
        type: String,
        trim: true
    },
    customerAddress: {
        type: String,
        trim: true
    },
    customerGSTIN: {
        type: String,
        trim: true,
        default: ''
    },
    customerState: {
        type: String,
        trim: true,
        default: ''
    },
    customerStateCode: {
        type: String,
        trim: true,
        default: ''
    },
    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        unit: {
            type: String,
            required: true
        },
        conversionFactor: {
            type: Number,
            default: 1
        },
        sellingPrice: {
            type: Number,
            required: true
        },
        purchasePriceAtTime: {
            type: Number,
            required: true
        },
        mrpAtTime: {
            type: Number,
            required: true
        },
        taxRate: {
            type: Number,
            default: 0
        },
        taxAmount: {
            type: Number,
            default: 0
        },
        hsnCode: {
            type: String,
            trim: true,
            default: ''
        },
        batchNumber: {
            type: String,
            trim: true
        },
        expiryDate: {
            type: Date
        }
    }],
    doctorName: {
        type: String,
        trim: true,
        default: ''
    },
    totalAmount: {
        type: Number,
        required: true
    },
    totalProfit: {
        type: Number,
        required: true
    },
    amountPaid: {
        type: Number,
        default: 0
    },
    downPayment: {
        type: Number
    },
    balanceDue: {
        type: Number,
        default: 0
    },
    roundOffAmount: {
        type: Number,
        default: 0
    },
    taxAmount: {
        type: Number,
        default: 0
    },
    discount: {
        type: Number,
        default: 0
    },
    paymentMode: {
        type: String,
        enum: ['cash', 'credit', 'upi', 'card', 'bank_transfer'],
        default: 'cash'
    },
    status: {
        type: String,
        enum: ['paid', 'pending', 'partial'],
        default: 'paid'
    },
    additionalItems: [{
        name: { type: String, required: true },
        price: { type: Number, required: true },
        profitPercent: { type: Number, default: 0 }
    }],
    invoiceNumber: {
        type: String,
    },
    date: {
        type: Date,
        default: Date.now
    },
    showQRCode: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Indices for performance and uniqueness
saleSchema.index({ tenantId: 1, invoiceNumber: 1 }, { unique: true });
saleSchema.index({ tenantId: 1, date: -1 });
saleSchema.index({ tenantId: 1, status: 1 });
saleSchema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.model<ISale>('Sale', saleSchema);
