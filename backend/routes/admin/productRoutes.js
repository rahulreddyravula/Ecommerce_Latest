import express from 'express';
import {
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImages
} from '../../controllers/admin/productController.js';
import { validateProduct } from '../../validators/productValidator.js';
import { protect, authorize } from '../../middleware/authMiddleware.js';
import { upload } from '../../middleware/uploadMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorize('Admin'));

// Create product (accepts up to 10 images)
router.post('/', upload.array('images', 10), validateProduct, createProduct);

// Update product details or images
router.put('/:id', upload.array('images', 10), updateProduct);

// Separate endpoint to upload more images specifically
router.post('/:id/images', upload.array('images', 10), uploadProductImages);

// Delete product
router.delete('/:id', deleteProduct);

export default router;
