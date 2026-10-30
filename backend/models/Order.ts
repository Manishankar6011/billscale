import mongoose, { Schema } from 'mongoose';
import { IOrder } from '../types';

const orderItemSchema: Schema = new mongoose.Schema({
    productId: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    price: {
        type: Number,
        required: true
    },
    unit: {
        type: String,
        default: 'piece'
    },
    mrp: {
        type: Number,
        default: 0
    },
    imageUrl: {
        type: String,
        default: ''
    }
});

const orderSchema: Schema = new mongoose.Schema({
    tenantId: {
        type: Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true
    },
    orderNumber: {
        type: String,
        required: true
    },
    customerName: {
        type: String,
        required: true,
        trim: true
    },
    customerPhone: {
        type: String,
        trim: true,
        default: ''
    },
    customerAddress: {
        type: String,
        trim: true,
        default: ''
    },
    items: [orderItemSchema],
    totalAmount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'billed', 'cancelled'],
        default: 'pending'
    },
    paymentStatus: {
        type: String,
        enum: ['unpaid', 'paid'],
        default: 'unpaid'
    },
    paymentMethod: {
        type: String,
        enum: ['cod', 'online'],
        default: 'cod'
    },
    paymentGatewayOrderId: {
        type: String,
        default: ''
    },
    paymentGatewayPaymentId: {
        type: String,
        default: ''
    },
    notes: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

orderSchema.index({ tenantId: 1, createdAt: -1 });
orderSchema.index({ tenantId: 1, status: 1 });

export default mongoose.model<IOrder>('Order', orderSchema);

