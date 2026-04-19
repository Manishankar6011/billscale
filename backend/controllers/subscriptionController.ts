import { Response } from 'express';
import crypto from 'crypto';
const Razorpay = require('razorpay');
import { AuthRequest } from '../middleware/auth';
import Tenant from '../models/Tenant';
import { sendSubscriptionEmail } from '../utils/emailService';

// Initialize Razorpay lazily to avoid crash if keys are missing in .env
const getRazorpayInstance = () => {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
        console.error('CRITICAL: Razorpay keys are missing in .env file');
        return null;
    }

    return new Razorpay({ key_id, key_secret });
};

export const createOrder = async (req: AuthRequest, res: Response) => {
    try {
        const { planType, amount, billingCycle } = req.body;
        
        const options = {
            amount: amount * 100, // Amount in paise
            currency: 'INR',
            receipt: `receipt_${Date.now()}`,
            notes: {
                planType,
                billingCycle: billingCycle || 'yearly',
                tenantId: req.tenantId
            }
        };

        const razorpay = getRazorpayInstance();
        if (!razorpay) {
            return res.status(500).json({ message: 'Razorpay is not configured' });
        }

        const order = await razorpay.orders.create(options);
        console.log('Razorpay Order Created:', order.id);

        // Save order ID to tenant for verification later
        await Tenant.findByIdAndUpdate(req.tenantId, { razorpayOrderId: order.id });

        res.status(200).json(order);
    } catch (error: any) {
        console.error('RAZORPAY ERROR details:', error);
        res.status(500).json({ 
            message: 'Error creating Razorpay order',
            error: error.message || error 
        });
    }
};

export const verifyPayment = async (req: AuthRequest, res: Response) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planType, billingCycle } = req.body;

        const tenant = await Tenant.findById(req.tenantId);
        if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

        const razorpay = getRazorpayInstance();
        if (!razorpay) {
            return res.status(500).json({ message: 'Razorpay is not configured' });
        }

        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || '')
            .update(sign.toString())
            .digest("hex");

        if (razorpay_signature === expectedSign) {
            // Payment verified
            const expiryDate = new Date();
            if (billingCycle === 'monthly') {
                expiryDate.setDate(expiryDate.getDate() + 30);
            } else {
                expiryDate.setFullYear(expiryDate.getFullYear() + 1);
            }

            (tenant as any).planType = planType;
            (tenant as any).subscriptionStatus = 'active';
            (tenant as any).subscriptionExpiryDate = expiryDate;
            (tenant as any).razorpayPaymentId = razorpay_payment_id;
            await tenant.save();

            // Send Email
            await sendSubscriptionEmail(tenant.email, tenant.companyName, planType, expiryDate);

            res.status(200).json({ message: 'Payment verified successfully', plan: planType });
        } else {
            res.status(400).json({ message: 'Invalid signature sent!' });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getSubscriptionStatus = async (req: AuthRequest, res: Response) => {
    try {
        const tenant = await Tenant.findById(req.tenantId);
        if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

        res.status(200).json({
            planType: (tenant as any).planType,
            status: (tenant as any).subscriptionStatus,
            expiryDate: (tenant as any).subscriptionExpiryDate
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const incrementAIUsage = async (req: AuthRequest, res: Response) => {
    try {
        const tenant = await Tenant.findById(req.tenantId);
        if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

        (tenant as any).aiUsageCount = ((tenant as any).aiUsageCount || 0) + 1;
        await tenant.save();

        res.status(200).json({ aiUsageCount: (tenant as any).aiUsageCount });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
