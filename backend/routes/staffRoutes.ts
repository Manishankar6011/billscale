import express from 'express';
import { getStaff, addStaff, getStaffSummary, updateStaff, deleteStaff, paySalary, deleteSalaryPayment } from '../controllers/staffController';
import { protect, checkSubscription } from '../middleware/auth';
import { checkPermission } from '../middleware/permission';
import tenant from '../middleware/tenant';

const router = express.Router();

router.use(protect);
router.use(tenant);

router.get('/', checkPermission('staff', 'view'), getStaff);
router.post('/', checkSubscription, checkPermission('staff', 'create'), addStaff);
router.put('/:id', checkSubscription, checkPermission('staff', 'edit'), updateStaff);
router.delete('/:id', checkSubscription, checkPermission('staff', 'delete'), deleteStaff);
router.get('/summary/:id', checkPermission('staff', 'view'), getStaffSummary);
router.post('/pay', checkSubscription, checkPermission('salary', 'pay'), paySalary);
router.delete('/payment/:paymentId', checkSubscription, checkPermission('salary', 'pay'), deleteSalaryPayment);

export default router;
