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
        enum: ['free', 'basic', 'business'],
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
    upiId: {
        type: String,
        trim: true,
        default: ''
    },
    slug: {
        type: String,
        unique: true,
        trim: true,
        lowercase: true,
        sparse: true // Allows nulls while enforcing uniqueness on non-nulls during migration
    },
    gstin: {
        type: String,
        trim: true,
        default: ''
    },
    pan: {
        type: String,
        trim: true,
        default: ''
    },
    stateName: {
        type: String,
        trim: true,
        default: ''
    },
    stateCode: {
        type: String,
        trim: true,
        default: ''
    },
    invoiceFormat: {
        type: String,
        enum: ['thermal', 'modern', 'gst'],
        default: 'modern'
    },
    customDomain: {
        type: String,
        trim: true,
        lowercase: true,
        sparse: true,
        unique: true,
        default: ''
    },
    customDomainStatus: {
        type: String,
        enum: ['pending', 'active', 'failed'],
        default: 'pending'
    },
    customDomainVerifiedAt: {
        type: Date
    },
    enableInventoryImageUpload: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model<ITenant>('Tenant', tenantSchema);
