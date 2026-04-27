import mongoose, { Schema, Document } from 'mongoose';

export interface IMasterProduct extends Document {
    name: string;
    category: string;
    unit: string;
    mrp: number;
    pricePerUnit: number;
    purchasePrice: number;
    barcode?: string;
}

const masterProductSchema: Schema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    category: {
        type: String,
        default: 'General',
        trim: true
    },
    unit: {
        type: String,
        required: true,
        default: 'piece',
        trim: true
    },
    mrp: {
        type: Number,
        default: 0
    },
    pricePerUnit: {
        type: Number,
        default: 0
    },
    purchasePrice: {
        type: Number,
        default: 0
    },
    barcode: {
        type: String,
        trim: true
    }
}, { timestamps: true });

// Performance Indexes
masterProductSchema.index({ name: 'text', category: 'text' });
masterProductSchema.index({ category: 1 });

export default mongoose.model<IMasterProduct>('MasterProduct', masterProductSchema);
