import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { IUser } from '../types';

import Tenant from '../models/Tenant';

export interface AuthRequest extends Request {
    user?: IUser;
    tenantId?: string;
    subscriptionStatus?: string;
    planType?: 'free' | 'basic' | 'business';
    companyName?: string;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };

            const user = await User.findById(decoded.id).select('-password');
            if (!user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            req.user = user;
            req.tenantId = user.tenantId?.toString();
            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

export const checkSubscription = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user || !req.user.tenantId) {
            return res.status(403).json({ message: 'No tenant associated with user' });
        }

        const tenant = await Tenant.findById(req.user.tenantId);
        if (!tenant) {
            return res.status(404).json({ message: 'Tenant not found' });
        }

        // Auto-expire check
        if (tenant.subscriptionExpiryDate && new Date(tenant.subscriptionExpiryDate) < new Date()) {
            if (tenant.subscriptionStatus !== 'inactive') {
                tenant.subscriptionStatus = 'inactive';
                await tenant.save();
            }
        }

        if (tenant.subscriptionStatus === 'inactive') {
            return res.status(403).json({ 
                message: 'Subscription expired. Please renew your subscription to perform this action.',
                status: 'inactive'
            });
        }

        req.subscriptionStatus = tenant.subscriptionStatus;
        req.planType = tenant.planType as any;
        req.companyName = tenant.companyName;
        next();
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const authorize = (...roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: `Role ${req.user?.role} is not authorized to access this route` });
        }
        next();
    };
};

export const checkPlan = (requiredPlan: 'basic' | 'business') => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.planType) {
            return res.status(403).json({ message: 'Plan information missing. Ensure checkSubscription is called first.' });
        }

        const planPriority = { 'free': 0, 'basic': 1, 'business': 2 };
        const userPriority = planPriority[req.planType as keyof typeof planPriority] ?? 0;
        const requiredPriority = planPriority[requiredPlan] ?? 1;

        if (userPriority < requiredPriority) {
            return res.status(403).json({ 
                message: `This feature is only available in ${requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)} and higher plans.` 
            });
        }
        next();
    };
};

export default protect;
