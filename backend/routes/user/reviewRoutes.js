import express from 'express';
import {
  createReview,
  getProductReviews,
  deleteReview
} from '../../controllers/user/reviewController.js';
import { validateReview } from '../../validators/reviewValidator.js';
import { protect } from '../../middleware/authMiddleware.js';

const router = express.Router();

// Public endpoint
router.get('/product/:productId', getProductReviews);

// Protected endpoints
router.post('/', protect, validateReview, createReview);
router.delete('/:id', protect, deleteReview);

export default router;
