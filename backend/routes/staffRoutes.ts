import express from 'express';
import { getStaff, addStaff, getStaffSummary, updateStaff, deleteStaff, paySalary, deleteSalaryPayment } from '../controllers/staffController';
import { protect, checkSubscription } from '../middleware/auth';
import tenant from '../middleware/tenant';

const router = express.Router();

router.use(protect);
router.use(tenant);

router.get('/', getStaff);
router.post('/', checkSubscription, addStaff);
router.put('/:id', checkSubscription, updateStaff);
router.delete('/:id', checkSubscription, deleteStaff);
router.get('/summary/:id', getStaffSummary);
router.post('/pay', checkSubscription, paySalary);
router.delete('/payment/:paymentId', checkSubscription, deleteSalaryPayment);

export default router;
