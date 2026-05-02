import express from 'express';
const router = express.Router();
import { 
    registerContractor, 
    loginUser, 
    getProfile, 
    updateProfile, 
    forgotPassword, 
    resetPassword, 
    getReferralStats, 
    deleteAccount,
    createStaffUser,
    getStaffUsers,
    deleteStaffUser
} from '../controllers/authController';
import { protect, authorize } from '../middleware/auth';

router.post('/register', registerContractor);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);
router.get('/profile', protect as any, getProfile as any);
router.put('/profile', protect as any, updateProfile as any);
router.get('/referrals', protect as any, getReferralStats as any);
router.delete('/account', protect as any, deleteAccount as any);

// Staff Management
router.post('/staff', protect as any, authorize('owner') as any, createStaffUser as any);
router.get('/staff', protect as any, authorize('owner', 'accountant') as any, getStaffUsers as any);
router.delete('/staff/:id', protect as any, authorize('owner') as any, deleteStaffUser as any);

export default router;
