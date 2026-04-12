import express from 'express';
const router = express.Router();
import { getSubscriptionStatus, upgradePlan } from '../controllers/subscriptionController';
import { protect, authorize } from '../middleware/auth';

// Only owners should be able to see/change subscription details
router.get('/current', protect as any, getSubscriptionStatus as any);
router.patch('/upgrade', protect as any, authorize('owner') as any, upgradePlan as any);

export default router;
