import mongoose, { Schema } from 'mongoose';
import { ICustomer } from '../types';

const customerSchema: Schema = new mongoose.Schema({
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
        required: false,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    address: {
        type: String,
        trim: true
    },
    gstin: {
        type: String,
        trim: true,
        default: ''
    },
    state: {
        type: String,
        trim: true,
        default: ''
    },
    stateCode: {
        type: String,
        trim: true,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index to ensure phone is unique per tenant, but only if phone is provided
customerSchema.index(
    { tenantId: 1, phone: 1 },
    { 
        unique: true, 
        partialFilterExpression: { phone: { $type: "string" } } 
    }
);

export default mongoose.model<ICustomer>('Customer', customerSchema);
