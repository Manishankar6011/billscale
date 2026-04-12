import express from 'express';
import { getSales, processSale, getPurchases, processPurchase, updatePurchase, deletePurchase } from '../controllers/transactionController';
import { protect, checkSubscription } from '../middleware/auth';
import tenant from '../middleware/tenant';

const router = express.Router();

router.use(protect);
router.use(tenant);

router.get('/sales', getSales);
router.post('/sales', checkSubscription, processSale);
router.get('/purchases', getPurchases);
router.post('/purchases', checkSubscription, processPurchase);
router.put('/purchases/:id', checkSubscription, updatePurchase);
router.delete('/purchases/:id', checkSubscription, deletePurchase);

export default router;
