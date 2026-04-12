import express from 'express';
import { getProducts, addProduct, updateProduct, deleteProduct } from '../controllers/inventoryController';
import { protect, checkSubscription } from '../middleware/auth';
import tenant from '../middleware/tenant';

const router = express.Router();

router.use(protect);
router.use(tenant);

router.get('/', getProducts);
router.post('/', checkSubscription, addProduct);
router.put('/:id', checkSubscription, updateProduct);
router.delete('/:id', checkSubscription, deleteProduct);

export default router;
