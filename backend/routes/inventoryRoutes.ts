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
import { checkPermission } from '../middleware/permission';
import tenant from '../middleware/tenant';

const router = express.Router();

router.use(protect);
router.use(tenant);

router.get('/', checkPermission('inventory', 'view'), getProducts);
router.get('/categories', checkPermission('inventory', 'view'), getCategories);
router.post('/categories', checkSubscription, checkPermission('inventory', 'create'), addCategory);
router.get('/barcode/:barcode', checkPermission('inventory', 'view'), getProductByBarcode);
router.post('/', checkSubscription, checkPermission('inventory', 'create'), addProduct);
router.post('/bulk', checkSubscription, checkPermission('inventory', 'create'), bulkAddProducts);
router.put('/bulk-update', checkSubscription, checkPermission('inventory', 'edit'), bulkUpdateProducts);
router.put('/:id', checkSubscription, checkPermission('inventory', 'edit'), updateProduct);
router.delete('/:id', checkSubscription, checkPermission('inventory', 'delete'), deleteProduct);

export default router;
