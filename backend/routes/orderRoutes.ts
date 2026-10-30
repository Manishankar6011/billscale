import express from 'express';
import { placeOrder, getOrders, updateOrderStatus, getOrderStream } from '../controllers/orderController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Public - customer places order from catalog
router.post('/', placeOrder);

// Protected - store owner views & manages orders, SSE stream
router.get('/', protect, getOrders);
router.put('/:id/status', protect, updateOrderStatus);
router.get('/stream', protect, getOrderStream);

export default router;
