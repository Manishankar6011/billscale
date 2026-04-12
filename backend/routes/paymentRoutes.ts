import express from 'express';
const router = express.Router();
import { addPayment, getPayments, getLabourPaymentSummary } from '../controllers/paymentController';
import { protect } from '../middleware/auth';
import tenantMiddleware from '../middleware/tenant';

router.use(protect as any);
router.use(tenantMiddleware as any);

router.post('/', addPayment);
router.get('/', getPayments);
router.get('/summary/:labourId', getLabourPaymentSummary);

export default router;
