import express from 'express';
import { searchCustomers, getCustomers, createCustomer, updateCustomer, deleteCustomer, getCustomerLedger, addCustomerPayment, getCustomerReport, getCustomerItems } from '../controllers/customerController';
import { protect } from '../middleware/auth';
import { checkPermission } from '../middleware/permission';

const router = express.Router();

router.use(protect);

router.get('/', checkPermission('customers', 'view'), getCustomers);
router.get('/search', checkPermission('customers', 'view'), searchCustomers);
router.post('/', checkPermission('customers', 'create'), createCustomer);
router.put('/:id', checkPermission('customers', 'edit'), updateCustomer);
router.get('/:id/ledger', checkPermission('customers', 'view'), getCustomerLedger);
router.get('/:id/report', checkPermission('customers', 'view'), getCustomerReport);
router.get('/:id/items', checkPermission('customers', 'view'), getCustomerItems);
router.post('/:id/payments', checkPermission('customers', 'edit'), addCustomerPayment);
router.delete('/:id', checkPermission('customers', 'delete'), deleteCustomer);

export default router;
