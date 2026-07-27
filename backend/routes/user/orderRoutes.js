import express from 'express';
import {
  placeOrder,
  getMyOrders,
  getOrderDetails,
  cancelOrder,
  validateAndApplyCoupon
} from '../../controllers/user/orderController.js';
import { protect } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getMyOrders)
  .post(placeOrder);

router.post('/apply-coupon', validateAndApplyCoupon);

router.route('/:id')
  .get(getOrderDetails);

router.put('/:id/cancel', cancelOrder);

export default router;
