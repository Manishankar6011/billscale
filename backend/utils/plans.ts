
export const PLANS = {
    free: {
        monthly: 0,
        yearly: 0
    },
    basic: {
        monthly: 179,
        yearly: 1668 // 139 * 12
    },
    business: {
        monthly: 399,
        yearly: 3588 // 299 * 12
    }
};

export type PlanType = keyof typeof PLANS;
export type BillingCycle = 'monthly' | 'yearly';
