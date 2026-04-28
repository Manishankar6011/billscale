import express from 'express';
import { protect } from '../middleware/auth';
import { getFastestSellingItems, getSalesHeatmap, getSalesByHour } from '../controllers/analyticsController';

const router = express.Router();

router.use(protect);

router.get('/fastest-selling', getFastestSellingItems);
router.get('/heatmap', getSalesHeatmap);
router.get('/hourly', getSalesByHour);

export default router;
