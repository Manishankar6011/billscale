import express from 'express';
import { 
    getProducts, 
    getProductByBarcode, 
    addProduct, 
    updateProduct, 
    deleteProduct, 
    bulkAddProducts, 
    bulkUpdateProducts,
    getCategories,
    addCategory
} from '../controllers/inventoryController';
import { protect, checkSubscription } from '../middleware/auth';
import tenant from '../middleware/tenant';

const router = express.Router();

router.use(protect);
router.use(tenant);

router.get('/', getProducts);
router.get('/categories', getCategories);
router.post('/categories', checkSubscription, addCategory);
router.get('/barcode/:barcode', getProductByBarcode);
router.post('/', checkSubscription, addProduct);
router.post('/bulk', checkSubscription, bulkAddProducts);
router.put('/bulk-update', checkSubscription, bulkUpdateProducts);
router.put('/:id', checkSubscription, updateProduct);
router.delete('/:id', checkSubscription, deleteProduct);

export default router;
