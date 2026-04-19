import express from 'express';
import { createOrder, verifyPayment, getSubscriptionStatus, incrementAIUsage } from '../controllers/subscriptionController';
import { handleRazorpayWebhook } from '../controllers/subscriptionWebhook';
import { protect } from '../middleware/auth';
import tenant from '../middleware/tenant';

const router = express.Router();

router.use(protect);
router.use(tenant);

router.get('/status', getSubscriptionStatus);
router.post('/order', createOrder);
router.post('/verify', verifyPayment);
router.post('/ai-usage', protect, incrementAIUsage);

// Public Webhook (No Auth)
router.post('/webhook', handleRazorpayWebhook);

export default router;
