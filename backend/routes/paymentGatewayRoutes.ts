import express from 'express';
import {
    saveGatewaySettings,
    getGatewaySettings,
    disconnectGateway,
    createPaymentOrder,
    verifyPayment
} from '../controllers/paymentGatewayController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Protected settings routes
router.post('/', protect, saveGatewaySettings);
router.get('/', protect, getGatewaySettings);
router.post('/disconnect', protect, disconnectGateway);

// Public customer checkout routes
router.post('/orders/:id/create', createPaymentOrder);
router.post('/orders/:id/verify', verifyPayment);

export default router;
