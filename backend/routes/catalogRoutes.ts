import express from 'express';
import {
    getCatalogBySlug,
    getCatalogByDomain,
    saveCustomDomain,
    verifyCustomDomain,
    removeCustomDomain,
} from '../controllers/catalogController';
import { protect, checkSubscription, checkPlan } from '../middleware/auth';

const router = express.Router();

// ─── Public Routes ──────────────────────────────────────────────────────────
// Get catalog by slug (existing)
router.get('/:slug', getCatalogBySlug);

// Get catalog by custom domain (Host header se domain read karta hai)
router.get('/by-domain/lookup', getCatalogByDomain);

// ─── Protected Routes (Paid Plans Only) ────────────────────────────────────
router.post(
    '/custom-domain/save',
    protect,
    checkSubscription,
    checkPlan('basic'),
    saveCustomDomain
);

router.post(
    '/custom-domain/verify',
    protect,
    checkSubscription,
    checkPlan('basic'),
    verifyCustomDomain
);

router.delete(
    '/custom-domain/remove',
    protect,
    checkSubscription,
    checkPlan('basic'),
    removeCustomDomain
);

export default router;
