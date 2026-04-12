import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Tenant from '../models/Tenant';

export const getSubscriptionStatus = async (req: AuthRequest, res: Response) => {
    try {
        const tenant = await Tenant.findById(req.tenantId);
        if (!tenant) {
            return res.status(404).json({ message: 'Tenant not found' });
        }

        res.json({
            planType: tenant.planType,
            subscriptionStatus: tenant.subscriptionStatus,
            companyName: tenant.companyName,
            businessType: tenant.businessType
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const upgradePlan = async (req: AuthRequest, res: Response) => {
    try {
        const { planType } = req.body;

        if (!['free', 'business', 'enterprise'].includes(planType)) {
            return res.status(400).json({ message: 'Invalid plan type' });
        }

        const tenant = await Tenant.findById(req.tenantId);
        if (!tenant) {
            return res.status(404).json({ message: 'Tenant not found' });
        }

        tenant.planType = planType;
        // In a real app, subscriptionStatus would be pending until payment is confirmed
        tenant.subscriptionStatus = 'active'; 
        
        await tenant.save();

        res.json({
            message: `Successfully upgraded to ${planType} plan`,
            planType: tenant.planType,
            status: tenant.subscriptionStatus
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
