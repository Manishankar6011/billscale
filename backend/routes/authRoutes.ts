import express from 'express';
const router = express.Router();
import { registerContractor, loginUser, getProfile, updateProfile, forgotPassword, resetPassword } from '../controllers/authController';
import { protect } from '../middleware/auth';

router.post('/register', registerContractor);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);
router.get('/profile', protect as any, getProfile as any);
router.put('/profile', protect as any, updateProfile as any);

export default router;
