import express from 'express';
const router = express.Router();
import { markAttendance, getAttendance } from '../controllers/attendanceController';
import { protect, checkSubscription } from '../middleware/auth';
import { checkPermission } from '../middleware/permission';
import tenantMiddleware from '../middleware/tenant';

router.use(protect as any);
router.use(tenantMiddleware as any);

router.post('/mark', checkSubscription, checkPermission('attendance', 'edit'), markAttendance);
router.get('/', checkPermission('attendance', 'view'), getAttendance);

export default router;
