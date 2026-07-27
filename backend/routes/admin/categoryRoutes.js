import express from 'express';
import {
  createCategory,
  updateCategory,
  deleteCategory
} from '../../controllers/admin/categoryController.js';
import { protect, authorize } from '../../middleware/authMiddleware.js';
import { upload } from '../../middleware/uploadMiddleware.js';

const router = express.Router();

// Apply admin protection to all routes
router.use(protect);
router.use(authorize('Admin'));

router.post('/', upload.single('image'), createCategory);
router.put('/:id', upload.single('image'), updateCategory);
router.delete('/:id', deleteCategory);

export default router;
