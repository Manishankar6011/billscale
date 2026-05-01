import express from 'express';
import { getCatalogBySlug } from '../controllers/catalogController';

const router = express.Router();

router.get('/:slug', getCatalogBySlug);

export default router;
