import mongoose, { Schema } from 'mongoose';
import { ISale } from '../types';

const saleSchema: Schema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    customerName: {
        type: String,
        required: true,
        trim: true
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
        sellingPrice: {
            type: Number,
            required: true
        },
        purchasePriceAtTime: {
            type: Number,
            required: true
        }
    }],
    totalAmount: {
        type: Number,
        required: true
    },
    totalProfit: {
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
    status: {
        type: String,
        enum: ['paid', 'pending'],
        default: 'paid'
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

export default mongoose.model<ISale>('Sale', saleSchema);
