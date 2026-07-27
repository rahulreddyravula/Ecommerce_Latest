import express from 'express';
import {
  getAllOrders,
  updateOrderStatus,
  adminCancelOrder
} from '../../controllers/admin/orderController.js';
import { protect, authorize } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorize('Admin'));

router.get('/', getAllOrders);
router.put('/:id/status', updateOrderStatus);
router.put('/:id/cancel', adminCancelOrder);

export default router;
