import express from 'express';
import {
  createCoupon,
  getCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon
} from '../../controllers/admin/couponController.js';
import { validateCoupon } from '../../validators/couponValidator.js';
import { protect, authorize } from '../../middleware/authMiddleware.js';

const router = express.Router();

// Apply admin authentication/authorization to all coupon routes
router.use(protect);
router.use(authorize('Admin'));

router.route('/')
  .get(getCoupons)
  .post(validateCoupon, createCoupon);

router.route('/:id')
  .get(getCouponById)
  .put(validateCoupon, updateCoupon)
  .delete(deleteCoupon);

export default router;
