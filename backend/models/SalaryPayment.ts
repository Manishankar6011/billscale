import mongoose, { Schema } from 'mongoose';
import { ISalaryPayment } from '../types';

const salaryPaymentSchema: Schema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    staffId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Staff',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    note: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for performance
salaryPaymentSchema.index({ tenantId: 1, date: -1 });
salaryPaymentSchema.index({ tenantId: 1, staffId: 1 });

export default mongoose.model<ISalaryPayment>('SalaryPayment', salaryPaymentSchema);
