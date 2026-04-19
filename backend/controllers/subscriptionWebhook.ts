import { Request, Response } from 'express';
import crypto from 'crypto';
import Tenant from '../models/Tenant';
import { sendSubscriptionEmail } from '../utils/emailService';

export const handleRazorpayWebhook = async (req: any, res: Response) => {
    try {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!secret) {
            console.error('RAZORPAY_WEBHOOK_SECRET is not set');
            return res.status(500).json({ message: 'Webhook secret is missing' });
        }

        const signature = req.headers['x-razorpay-signature'];
        const shasum = crypto.createHmac('sha256', secret);
        shasum.update(req.rawBody);
        const digest = shasum.digest('hex');

        if (signature !== digest) {
            console.error('Invalid signature for Razorpay Webhook');
            return res.status(400).json({ message: 'Invalid signature' });
        }

        // Signature is valid, handle event
        const event = req.body.event;
        const payload = req.body.payload;

        if (event === 'payment.captured' || event === 'order.paid') {
            const payment = payload.payment ? payload.payment.entity : null;
            const order_id = payment ? payment.order_id : null;
            const notes = payment ? payment.notes : null;

            if (!order_id || !notes) {
                return res.status(200).json({ status: 'ok', info: 'No order_id or notes found' });
            }

            const { planType, billingCycle, tenantId } = notes;

            const tenant = await Tenant.findById(tenantId);
            if (!tenant) {
                console.error(`Tenant ${tenantId} not found in webhook`);
                return res.status(200).json({ status: 'ok', info: 'Tenant not found' });
            }

            // Avoid double activation if frontend already did it
            if ((tenant as any).razorpayPaymentId === payment.id) {
                return res.status(200).json({ status: 'ok', info: 'Already processed' });
            }

            const expiryDate = new Date();
            if (billingCycle === 'monthly') {
                expiryDate.setDate(expiryDate.getDate() + 30);
            } else {
                expiryDate.setFullYear(expiryDate.getFullYear() + 1);
            }

            (tenant as any).planType = planType;
            (tenant as any).subscriptionStatus = 'active';
            (tenant as any).subscriptionExpiryDate = expiryDate;
            (tenant as any).razorpayPaymentId = payment.id;
            await tenant.save();

            // Send Email
            await sendSubscriptionEmail(tenant.email, tenant.companyName, planType, expiryDate);

            console.log(`Successfully activated ${planType} plan for ${tenant.companyName} via Webhook`);
        }

        res.status(200).json({ status: 'ok' });
    } catch (error: any) {
        console.error('Webhook Error:', error.message);
        res.status(500).json({ message: error.message });
    }
};
