import express from 'express';
import { getSales, processSale, updateSale, deleteSale, getPurchases, processPurchase, updatePurchase, deletePurchase } from '../controllers/transactionController';
import { protect, checkSubscription } from '../middleware/auth';
import tenant from '../middleware/tenant';

const router = express.Router();
import { getPublicSale } from '../controllers/transactionController';

// Public route for WhatsApp/Invoice viewing
router.get('/public-sale/:id', getPublicSale);

router.use(protect);
router.use(tenant);

router.get('/sales', getSales);
router.post('/sales', checkSubscription, processSale);
router.put('/sales/:id', checkSubscription, updateSale);
router.delete('/sales/:id', checkSubscription, deleteSale);
router.get('/purchases', getPurchases);
router.post('/purchases', checkSubscription, processPurchase);
router.put('/purchases/:id', checkSubscription, updatePurchase);
router.delete('/purchases/:id', checkSubscription, deletePurchase);

export default router;
