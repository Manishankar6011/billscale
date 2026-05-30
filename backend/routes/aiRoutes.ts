import express from 'express';
import { handleAIChat } from '../controllers/aiController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.post('/chat', protect, handleAIChat);

export default router;
