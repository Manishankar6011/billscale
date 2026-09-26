import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export const DEFAULT_STAFF_PERMISSIONS: Record<string, Record<string, boolean>> = {
    dashboard: { view: true },
    inventory: { view: true, create: true, edit: true, delete: false },
    sales: { view: true, create: true, edit: false, delete: false, viewProfit: false },
    purchases: { view: true, create: true, edit: false, delete: false },
    customers: { view: true, create: true, edit: true, delete: false },
    staff: { view: false, create: false, edit: false, delete: false },
    attendance: { view: false, edit: false },
    salary: { view: false, pay: false },
    ledger: { view: false },
    reports: { view: false },
    settings: { view: false },
};

/**
 * Middleware to check granular permission for a module and action.
 * Owners and super-admins automatically have full access to everything.
 * Staff permissions are checked against user.permissions, falling back to DEFAULT_STAFF_PERMISSIONS.
 */
export const checkPermission = (module: string, action: string = 'view') => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        // Owners and Super-admins have unrestricted access
        if (user.role === 'owner' || user.role === 'super-admin') {
            return next();
        }

        // Accountants have access to financial, billing, inventory and reporting modules
        if (user.role === 'accountant') {
            if (['dashboard', 'sales', 'inventory', 'purchases', 'customers', 'reports', 'ledger', 'gst-reports'].includes(module)) {
                return next();
            }
        }

        // Staff Access Control
        if (user.role === 'staff') {
            const userPermissions = user.permissions && Object.keys(user.permissions).length > 0
                ? user.permissions
                : DEFAULT_STAFF_PERMISSIONS;

            const modulePerms = userPermissions[module];
            if (modulePerms && modulePerms[action] === true) {
                return next();
            }

            return res.status(403).json({
                message: `Access denied. You do not have permission to ${action} ${module}.`,
                module,
                action
            });
        }

        return res.status(403).json({ message: 'Role not authorized for this operation' });
    };
};
