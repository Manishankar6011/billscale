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

// Get catalog by slug (skip reserved subpaths if called or passed through)
router.get('/:slug', (req, res, next) => {
    const reserved = ['orders', 'payment', 'by-domain', 'custom-domain'];
    if (reserved.includes(req.params.slug)) {
        return next();
    }
    return getCatalogBySlug(req, res);
});

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
