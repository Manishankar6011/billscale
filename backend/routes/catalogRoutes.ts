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
// Get catalog by custom domain (placed before :slug so :slug never intercepts)
router.get('/by-domain/lookup', getCatalogByDomain);

// Get catalog by slug
router.get('/:slug', getCatalogBySlug);

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
