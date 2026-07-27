import express from 'express';
import { 
  processPayment, 
  createRazorpayOrder, 
  verifyRazorpayPayment 
} from '../../controllers/user/paymentController.js';
import { protect } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/process', processPayment);
router.post('/razorpay/order', createRazorpayOrder);
router.post('/razorpay/verify', verifyRazorpayPayment);

export default router;
