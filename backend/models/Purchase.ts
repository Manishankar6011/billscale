import mongoose, { Schema } from 'mongoose';
import { IPurchase } from '../types';

const purchaseSchema: Schema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    supplierName: {
        type: String,
        required: true,
        trim: true
    },
    supplierGSTIN: {
        type: String,
        trim: true,
        default: ''
    },
    supplierPhone: {
        type: String,
        trim: true,
        default: ''
    },
    supplierAddress: {
        type: String,
        trim: true,
        default: ''
    },
    billNumber: {
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
        name: {
            type: String,
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
        purchasePrice: {
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
        }
    }],
    totalAmount: {
        type: Number,
        required: true
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
    paymentStatus: {
        type: String,
        enum: ['paid', 'pending'],
        default: 'pending'
    },
    date: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Performance index
purchaseSchema.index({ tenantId: 1, date: -1 });
purchaseSchema.index({ tenantId: 1, paymentStatus: 1 });

export default mongoose.model<IPurchase>('Purchase', purchaseSchema);
