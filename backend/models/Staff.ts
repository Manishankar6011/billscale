import mongoose, { Schema } from 'mongoose';
import { IStaff } from '../types';

const staffSchema: Schema = new mongoose.Schema({
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
    phone: {
        type: String,
        required: true
    },
    role: {
        type: String,
        default: 'Worker'
    },
    salaryType: {
        type: String,
        enum: ['monthly', 'daily'],
        required: true
    },
    salaryAmount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for performance
staffSchema.index({ tenantId: 1 });

export default mongoose.model<IStaff>('Staff', staffSchema);
