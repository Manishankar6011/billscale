import express from 'express';
import { getSales, processSale, updateSale, deleteSale, getPurchases, processPurchase, updatePurchase, deletePurchase } from '../controllers/transactionController';
import { protect, checkSubscription } from '../middleware/auth';
import { checkPermission } from '../middleware/permission';
import tenant from '../middleware/tenant';

const router = express.Router();
import { getPublicSale } from '../controllers/transactionController';

// Public route for WhatsApp/Invoice viewing
router.get('/public-sale/:id', getPublicSale);

router.use(protect);
router.use(tenant);

// Sales routes
router.get('/sales', checkPermission('sales', 'view'), getSales);
router.post('/sales', checkSubscription, checkPermission('sales', 'create'), processSale);
router.put('/sales/:id', checkSubscription, checkPermission('sales', 'edit'), updateSale);
router.delete('/sales/:id', checkSubscription, checkPermission('sales', 'delete'), deleteSale);

// Purchases routes
router.get('/purchases', checkPermission('purchases', 'view'), getPurchases);
router.post('/purchases', checkSubscription, checkPermission('purchases', 'create'), processPurchase);
router.put('/purchases/:id', checkSubscription, checkPermission('purchases', 'edit'), updatePurchase);
router.delete('/purchases/:id', checkSubscription, checkPermission('purchases', 'delete'), deletePurchase);

export default router;
