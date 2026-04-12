import express from 'express';
const router = express.Router();
import { markAttendance, getAttendance } from '../controllers/attendanceController';
import { protect, checkSubscription } from '../middleware/auth';
import tenantMiddleware from '../middleware/tenant';

router.use(protect as any);
router.use(tenantMiddleware as any);

router.post('/mark', checkSubscription, markAttendance);
router.get('/', getAttendance);

export default router;
