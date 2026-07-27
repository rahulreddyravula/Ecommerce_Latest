import express from 'express';
import { getCategories, getCategoryBySlug } from '../../controllers/admin/categoryController.js';

const router = express.Router();

router.get('/', getCategories);
router.get('/:slug', getCategoryBySlug);

export default router;
