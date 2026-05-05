import express from 'express';
import { searchCustomers, getCustomers, createCustomer, updateCustomer, getCustomerLedger, addCustomerPayment } from '../controllers/customerController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.use(protect);

router.get('/', getCustomers);
router.get('/search', searchCustomers);
router.post('/', createCustomer);
router.put('/:id', updateCustomer);
router.get('/:id/ledger', getCustomerLedger);
router.post('/:id/payments', addCustomerPayment);

export default router;
