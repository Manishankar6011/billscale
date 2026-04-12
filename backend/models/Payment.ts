import mongoose, { Schema } from 'mongoose';
import { IPayment } from '../types';

const paymentSchema: Schema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    labourId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Labour',
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
    type: {
        type: String,
        enum: ['advance', 'full-settlement', 'partial'],
        default: 'partial'
    },
    note: String,
    method: {
        type: String,
        enum: ['cash', 'bank-transfer', 'upi'],
        default: 'cash'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model<IPayment>('Payment', paymentSchema);
