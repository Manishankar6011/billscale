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
        enum: ['free', 'basic', 'business', 'premium'],
        default: 'free'
    },
    subscriptionStatus: {
        type: String,
        enum: ['active', 'inactive', 'trial'],
        default: 'trial'
    },
    subscriptionExpiryDate: {
        type: Date,
        default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days trial
    },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    logoUrl: { type: String, default: '' },
    billingEmail: { type: String, default: '' },
    billingAddress: { type: String, default: '' },
    signature: { type: String, default: '' },
    aiUsageCount: { type: Number, default: 0 },
    referralCode: {
        type: String,
        unique: true,
        immutable: true,
        default: () => Math.random().toString(36).substring(2, 8).toUpperCase()
    },
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant'
    },
    referralRewardClaimed: {
        type: Boolean,
        default: false
    },
    nextInvoiceNumber: {
        type: Number,
        default: 1
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model<ITenant>('Tenant', tenantSchema);
