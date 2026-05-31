import express from 'express';
import { searchCustomers, getCustomers, createCustomer, updateCustomer, deleteCustomer, getCustomerLedger, addCustomerPayment, getCustomerReport, getCustomerItems } from '../controllers/customerController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.use(protect);

router.get('/', getCustomers);
router.get('/search', searchCustomers);
router.post('/', createCustomer);
router.put('/:id', updateCustomer);
router.get('/:id/ledger', getCustomerLedger);
router.get('/:id/report', getCustomerReport);
router.get('/:id/items', getCustomerItems);
router.post('/:id/payments', addCustomerPayment);
router.delete('/:id', deleteCustomer);

export default router;
