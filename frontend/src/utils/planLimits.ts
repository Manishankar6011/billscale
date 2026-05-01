export type PlanType = 'free' | 'basic' | 'business';

export interface PlanLimits {
    maxBillsPerMonth: number;
    maxProducts: number;
    maxStaff: number;
    hasDigitalCatalog: boolean;
    hasProfitAnalytics: boolean;
    hasExpenseTracking: boolean;
    hasAISmartAssistant: boolean;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
    free: {
        maxBillsPerMonth: 50,
        maxProducts: 100,
        maxStaff: 0,
        hasDigitalCatalog: false,
        hasProfitAnalytics: false,
        hasExpenseTracking: false,
        hasAISmartAssistant: false,
    },
    basic: {
        maxBillsPerMonth: Infinity,
        maxProducts: Infinity,
        maxStaff: 1,
        hasDigitalCatalog: true,
        hasProfitAnalytics: false,
        hasExpenseTracking: false,
        hasAISmartAssistant: false,
    },
    business: {
        maxBillsPerMonth: Infinity,
        maxProducts: Infinity,
        maxStaff: 5,
        hasDigitalCatalog: true,
        hasProfitAnalytics: true,
        hasExpenseTracking: true,
        hasAISmartAssistant: true,
    }
};

export const canUseFeature = (plan: PlanType, feature: keyof PlanLimits): boolean => {
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
    const value = limits[feature];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value > 0;
    return false;
};
