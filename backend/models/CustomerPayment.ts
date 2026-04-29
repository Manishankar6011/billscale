import mongoose, { Schema } from 'mongoose';
import { ICustomerPayment } from '../types';

const customerPaymentSchema: Schema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    paymentDate: {
        type: Date,
        default: Date.now
    },
    paymentMode: {
        type: String,
        enum: ['cash', 'upi', 'bank_transfer', 'card'],
        default: 'cash'
    },
    notes: {
        type: String,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for efficient lookups
customerPaymentSchema.index({ tenantId: 1, customerId: 1, paymentDate: -1 });

export default mongoose.model<ICustomerPayment>('CustomerPayment', customerPaymentSchema);
