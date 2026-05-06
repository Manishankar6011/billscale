import express from 'express';
import { getPurchases, processPurchase, updatePurchase, deletePurchase } from '../controllers/transactionController';
import { protect, checkSubscription } from '../middleware/auth';
import tenant from '../middleware/tenant';

const router = express.Router();

router.use(protect);
router.use(tenant);

router.get('/', getPurchases);
router.post('/', checkSubscription, processPurchase);
router.put('/:id', checkSubscription, updatePurchase);
router.delete('/:id', checkSubscription, deletePurchase);

export default router;
