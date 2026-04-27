import express from 'express';
import { getMasterProducts, getMasterCategories } from '../controllers/masterProductController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Protected because we only want registered shop owners to see this library
router.use(protect);

router.get('/', getMasterProducts);
router.get('/categories', getMasterCategories);

export default router;
