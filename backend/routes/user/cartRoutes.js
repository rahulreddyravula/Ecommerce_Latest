import express from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart
} from '../../controllers/user/cartController.js';
import { protect } from '../../middleware/authMiddleware.js';

const router = express.Router();

// All cart endpoints require user authentication
router.use(protect);

router.route('/')
  .get(getCart)
  .post(addToCart)
  .put(updateCartItem)
  .delete(clearCart);

router.delete('/:productId', removeCartItem);

export default router;
