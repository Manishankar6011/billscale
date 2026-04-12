import express from 'express';
const router = express.Router();
import { getDashboardStats } from '../controllers/dashboardController';
import { protect } from '../middleware/auth';
import tenantMiddleware from '../middleware/tenant';

router.use(protect as any);
router.use(tenantMiddleware as any);

router.get('/stats', getDashboardStats);

export default router;
