import express from 'express';
import { getGSTR1, getGSTR3B } from '../controllers/gstController';
import { protect, checkSubscription, checkPlan } from '../middleware/auth';

const router = express.Router();

router.use(protect);
router.use(checkSubscription);

router.get('/gstr-1', checkPlan('basic'), getGSTR1);
router.get('/gstr-3b', checkPlan('basic'), getGSTR3B);

export default router;
