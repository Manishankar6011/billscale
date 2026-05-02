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
    imageUrl: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Indices for faster searching and multi-tenancy
productSchema.index({ tenantId: 1, name: 1 });
productSchema.index({ tenantId: 1, barcode: 1 });
productSchema.index({ tenantId: 1, category: 1 });

export default mongoose.model<IProduct>('Product', productSchema);
