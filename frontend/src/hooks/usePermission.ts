import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_STAFF_PERMISSIONS } from '../types';

export const usePermission = () => {
  const { user } = useAuth();

  const isOwner = useMemo(() => {
    return user?.role === 'owner' || user?.role === 'super-admin';
  }, [user?.role]);

  const isAccountant = useMemo(() => {
    return user?.role === 'accountant';
  }, [user?.role]);

  const isStaff = useMemo(() => {
    return user?.role === 'staff';
  }, [user?.role]);

  /**
   * Check if the current user has permission for a specific module and action.
   * @param module The module name (e.g. 'inventory', 'sales', 'reports', etc.)
   * @param action The action name (e.g. 'view', 'create', 'edit', 'delete', 'viewProfit')
   * @returns boolean
   */
  const can = (module: string, action: string = 'view'): boolean => {
    if (!user) return false;

    // Owners and Super Admins have unrestricted permissions
    if (isOwner) return true;

    // Accountants have full access to business & financial operations
    if (isAccountant) {
      const allowedModules = [
        'dashboard',
        'sales',
        'inventory',
        'purchases',
        'customers',
        'reports',
        'ledger',
        'gst-reports',
        'item-sales'
      ];
      if (allowedModules.includes(module)) {
        return true;
      }
      return false;
    }

    // Staff access evaluation
    if (isStaff) {
      const staffPerms = user.permissions && Object.keys(user.permissions).length > 0
        ? user.permissions
        : DEFAULT_STAFF_PERMISSIONS;

      const modulePerms = staffPerms[module];
      if (!modulePerms) return false;

      // If specific action is explicitly set to boolean
      if (typeof modulePerms[action] === 'boolean') {
        return modulePerms[action] as boolean;
      }

      // Fallback to default if undefined
      const defaultModule = DEFAULT_STAFF_PERMISSIONS[module];
      if (defaultModule && typeof defaultModule[action] === 'boolean') {
        return defaultModule[action] as boolean;
      }

      return false;
    }

    return false;
  };

  return {
    can,
    isOwner,
    isAccountant,
    isStaff,
    permissions: user?.permissions || DEFAULT_STAFF_PERMISSIONS
  };
};
