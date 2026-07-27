import express from 'express';
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist
} from '../../controllers/user/wishlistController.js';
import { protect } from '../../middleware/authMiddleware.js';

const router = express.Router();

// Protect all wishlist endpoints
router.use(protect);

router.route('/')
  .get(getWishlist)
  .post(addToWishlist);

router.delete('/:productId', removeFromWishlist);

export default router;
