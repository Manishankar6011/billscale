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
        default: 10
    },
    pricePerUnit: {
        type: Number,
        required: true
    },
    purchasePrice: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model<IProduct>('Product', productSchema);
