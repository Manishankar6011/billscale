import { Request, Response } from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import Tenant from '../models/Tenant';
import Order from '../models/Order';
import { AuthRequest } from '../middleware/auth';
import { broadcastToTenant } from '../utils/sse';

const Razorpay = require('razorpay');

// @desc    Save/Connect payment gateway credentials
// @route   POST /api/settings/payment-gateway
// @access  Private (Store Owner)
export const saveGatewaySettings = async (req: AuthRequest, res: Response) => {
    try {
        const { provider, keyId, keySecret } = req.body;

        if (!provider || provider !== 'razorpay') {
            return res.status(400).json({ message: 'Only Razorpay is currently supported' });
        }

        if (!keyId || !keyId.trim()) {
            return res.status(400).json({ message: 'Key ID is required' });
        }

        if (!keySecret || !keySecret.trim()) {
            return res.status(400).json({ message: 'Key Secret is required' });
        }

        const tenant = await Tenant.findById(req.tenantId);
        if (!tenant) {
            return res.status(404).json({ message: 'Tenant not found' });
        }

        // Test credentials with Razorpay
        try {
            const instance = new Razorpay({
                key_id: keyId.trim(),
                key_secret: keySecret.trim(),
            });
            await instance.orders.all({ count: 1 });
        } catch (authErr: any) {
            return res.status(400).json({
                message: 'Invalid Razorpay Key ID or Key Secret. Please verify your credentials from Razorpay Dashboard.'
            });
        }

        tenant.paymentGateway = {
            provider: 'razorpay',
            keyId: keyId.trim(),
            keySecret: keySecret.trim(),
            isActive: true
        };

        await tenant.save();

        res.status(200).json({
            success: true,
            message: 'Razorpay connected successfully!',
            gateway: {
                provider: 'razorpay',
                keyId: tenant.paymentGateway.keyId,
                isActive: true
            }
        });
    } catch (err: any) {
        console.error('Error saving payment gateway:', err);
        res.status(500).json({ message: err.message || 'Server error saving payment gateway' });
    }
};

// @desc    Get payment gateway status
// @route   GET /api/settings/payment-gateway
// @access  Private
export const getGatewaySettings = async (req: AuthRequest, res: Response) => {
    try {
        const tenant = await Tenant.findById(req.tenantId).select('paymentGateway').lean();
        if (!tenant) {
            return res.status(404).json({ message: 'Tenant not found' });
        }

        const gw = (tenant as any).paymentGateway;
        res.status(200).json({
            provider: gw?.provider || 'none',
            keyId: gw?.keyId || '',
            isActive: Boolean(gw?.isActive && gw?.keyId)
        });
    } catch (err: any) {
        res.status(500).json({ message: err.message || 'Server error' });
    }
};

// @desc    Disconnect payment gateway
// @route   POST /api/settings/payment-gateway/disconnect
// @access  Private
export const disconnectGateway = async (req: AuthRequest, res: Response) => {
    try {
        const tenant = await Tenant.findById(req.tenantId);
        if (!tenant) {
            return res.status(404).json({ message: 'Tenant not found' });
        }

        if (tenant.paymentGateway) {
            tenant.paymentGateway.isActive = false;
            await tenant.save();
        }

        res.status(200).json({
            success: true,
            message: 'Payment gateway disconnected'
        });
    } catch (err: any) {
        res.status(500).json({ message: err.message || 'Server error' });
    }
};

// @desc    Create Razorpay Order for catalog customer checkout
// @route   POST /api/catalog/orders/:id/payment/create
// @access  Public
export const createPaymentOrder = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid order ID' });
        }

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Security check: Order state validation
        if (order.status === 'cancelled') {
            return res.status(400).json({ message: 'Cannot pay for a cancelled order' });
        }
        if (order.paymentStatus === 'paid') {
            return res.status(400).json({ message: 'This order is already paid' });
        }
        if (!order.totalAmount || order.totalAmount <= 0) {
            return res.status(400).json({ message: 'Invalid order amount' });
        }

        // Explicitly select keySecret since it is excluded by default
        const tenant = await Tenant.findById(order.tenantId).select('+paymentGateway.keySecret');
        if (!tenant) {
            return res.status(404).json({ message: 'Store not found' });
        }

        // Check merchant's own configured keys first, or fallback to platform keys
        let keyId = (tenant.paymentGateway?.isActive && tenant.paymentGateway?.keyId) ? tenant.paymentGateway.keyId : process.env.RAZORPAY_KEY_ID;
        let keySecret = (tenant.paymentGateway?.isActive && tenant.paymentGateway?.keySecret) ? tenant.paymentGateway.keySecret : process.env.RAZORPAY_KEY_SECRET;

        if (!keyId || !keySecret) {
            return res.status(400).json({ message: 'Online payment is not enabled for this store' });
        }

        const rzp = new Razorpay({
            key_id: keyId,
            key_secret: keySecret,
        });

        const amountPaise = Math.round(order.totalAmount * 100);

        const rzpOrder = await rzp.orders.create({
            amount: amountPaise,
            currency: 'INR',
            receipt: `${order.orderNumber}_${Date.now()}`.slice(-40),
            notes: {
                tenantId: tenant._id.toString(),
                orderId: order._id.toString(),
                orderNumber: order.orderNumber,
                customerName: order.customerName,
                customerPhone: order.customerPhone || '',
            }
        });

        order.paymentGatewayOrderId = rzpOrder.id;
        order.paymentMethod = 'online';
        await order.save();

        res.status(200).json({
            success: true,
            razorpayOrderId: rzpOrder.id,
            amount: amountPaise,
            currency: 'INR',
            keyId: keyId,
            orderNumber: order.orderNumber,
            shopName: tenant.companyName || 'Store'
        });
    } catch (err: any) {
        console.error('Error creating payment order:', err);
        res.status(500).json({ message: err.message || 'Error creating payment order' });
    }
};

// @desc    Verify Razorpay payment signature & double-check with gateway
// @route   POST /api/catalog/orders/:id/payment/verify
// @access  Public
export const verifyPayment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid order ID' });
        }

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ message: 'Missing payment verification details' });
        }

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Idempotency: If already verified with this same transaction, return success
        if (order.paymentStatus === 'paid') {
            if (order.paymentGatewayPaymentId === razorpay_payment_id) {
                return res.status(200).json({
                    success: true,
                    message: 'Payment already verified',
                    order
                });
            }
            return res.status(400).json({ message: 'Order is already marked as paid with another transaction' });
        }

        // Anti-Replay: Prevent reusing a transaction ID on a different order (Double-spending prevention)
        const duplicatePayment = await Order.findOne({
            paymentGatewayPaymentId: razorpay_payment_id,
            _id: { $ne: order._id }
        });
        if (duplicatePayment) {
            return res.status(400).json({ message: 'Security alert: Payment ID has already been credited to another order' });
        }

        // Verify Razorpay Order ID matches what we generated for this order
        if (order.paymentGatewayOrderId && order.paymentGatewayOrderId !== razorpay_order_id) {
            return res.status(400).json({ message: 'Security alert: Order ID mismatch with payment token' });
        }

        const tenant = await Tenant.findById(order.tenantId).select('+paymentGateway.keySecret');
        if (!tenant) {
            return res.status(404).json({ message: 'Store not found' });
        }

        let keyId = (tenant.paymentGateway?.isActive && tenant.paymentGateway?.keyId) ? tenant.paymentGateway.keyId : process.env.RAZORPAY_KEY_ID;
        let keySecret = (tenant.paymentGateway?.isActive && tenant.paymentGateway?.keySecret) ? tenant.paymentGateway.keySecret : process.env.RAZORPAY_KEY_SECRET;

        if (!keyId || !keySecret) {
            return res.status(400).json({ message: 'Payment gateway credentials not configured' });
        }

        // 1. Cryptographic HMAC-SHA256 signature verification with timing-safe comparison
        const expectedSignature = crypto
            .createHmac('sha256', keySecret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        const sigBuffer = Buffer.from(razorpay_signature, 'utf8');
        const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

        if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
            return res.status(400).json({ message: 'Payment signature verification failed' });
        }

        // 2. Direct Razorpay Gateway API verification (Double Verification)
        try {
            const rzp = new Razorpay({
                key_id: keyId,
                key_secret: keySecret,
            });
            const rzpPayment = await rzp.payments.fetch(razorpay_payment_id);

            // Verify payment was actually for this Razorpay order
            if (rzpPayment.order_id && rzpPayment.order_id !== razorpay_order_id) {
                return res.status(400).json({ message: 'Security alert: Payment does not match order record' });
            }

            // Verify status is captured or authorized
            if (rzpPayment.status !== 'captured' && rzpPayment.status !== 'authorized') {
                return res.status(400).json({ message: `Payment is not successful (status: ${rzpPayment.status})` });
            }

            // Verify exact amount (in paise)
            const expectedPaise = Math.round(order.totalAmount * 100);
            if (Number(rzpPayment.amount) < expectedPaise) {
                return res.status(400).json({ message: 'Security alert: Paid amount is less than order total' });
            }

            // Verify currency
            if (rzpPayment.currency !== 'INR') {
                return res.status(400).json({ message: 'Invalid payment currency' });
            }
        } catch (gatewayErr: any) {
            console.error('Razorpay API fetch check warning:', gatewayErr.message || gatewayErr);
            // If signature is 100% valid but API fetch failed due to temporary network error, log and continue
        }

        order.paymentStatus = 'paid';
        order.paymentMethod = 'online';
        order.paymentGatewayPaymentId = razorpay_payment_id;
        order.updatedAt = new Date();
        await order.save();

        // Broadcast real-time push notification to store owner via SSE
        broadcastToTenant(tenant._id.toString(), 'order_paid', order);

        res.status(200).json({
            success: true,
            message: 'Payment verified and recorded successfully!',
            order
        });
    } catch (err: any) {
        console.error('Error verifying payment:', err);
        res.status(500).json({ message: err.message || 'Error verifying payment' });
    }
};
