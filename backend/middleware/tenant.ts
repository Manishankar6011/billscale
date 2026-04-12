import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

const tenantMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user && req.user.role === 'super-admin') {
        req.tenantId = (req.headers['x-tenant-id'] as string) || undefined;
        return next();
    }

    if (req.user && req.user.tenantId) {
        req.tenantId = req.user.tenantId.toString();
        next();
    } else {
        return res.status(403).json({ message: 'Tenant context missing or unauthorized' });
    }
};

export default tenantMiddleware;
