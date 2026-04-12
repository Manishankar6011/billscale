import mongoose, { Schema } from 'mongoose';
import { ITenant } from '../types';

const tenantSchema: Schema = new mongoose.Schema({
    companyName: {
        type: String,
        required: true,
        trim: true
    },
    address: String,
    phone: String,
    email: {
        type: String,
        unique: true,
        required: true
    },
    businessType: {
        type: String,
        default: 'Retail',
        trim: true
    },
    planType: {
        type: String,
        enum: ['free', 'business', 'enterprise'],
        default: 'free'
    },
    subscriptionStatus: {
        type: String,
        enum: ['active', 'inactive', 'trial'],
        default: 'trial'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model<ITenant>('Tenant', tenantSchema);
