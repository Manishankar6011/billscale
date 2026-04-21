import mongoose, { Schema } from 'mongoose';
import { IProduct } from '../types';

const productSchema: Schema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        default: 'General',
        trim: true
    },
    unit: {
        type: String,
        required: true,
        trim: true
    },
    stock: {
        type: Number,
        default: 0
    },
    minStockAlert: {
        type: Number,
        default: 1
    },
    pricePerUnit: {
        type: Number,
        required: true
    },
    purchasePrice: {
        type: Number,
        default: 0
    },
    mrp: {
        type: Number,
        default: 0
    },
    barcode: {
        type: String,
        trim: true
    },
    batchNumber: {
        type: String,
        trim: true,
        default: 'Default'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model<IProduct>('Product', productSchema);
