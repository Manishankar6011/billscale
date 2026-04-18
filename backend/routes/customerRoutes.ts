import express from 'express';
import { searchCustomers, getCustomers, createCustomer } from '../controllers/customerController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.use(protect);

router.get('/', getCustomers);
router.get('/search', searchCustomers);
router.post('/', createCustomer);

export default router;
