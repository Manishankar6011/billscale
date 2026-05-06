import express from 'express';
import { createPurchase, getPurchases, deletePurchase } from '../controllers/purchaseController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.use(protect);

router.post('/', createPurchase);
router.get('/', getPurchases);
router.delete('/:id', deletePurchase);

export default router;
