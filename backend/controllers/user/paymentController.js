import crypto from 'crypto';
import Razorpay from 'razorpay';
import Order from '../../models/Order.js';
import ErrorResponse from '../../utils/errorResponse.js';
import { sendSuccess } from '../../utils/responseFormatter.js';

/**
 * @desc    Simulate processing credit card payment via Stripe
 * @route   POST /api/v1/payments/process
 * @access  Private
 */
export const processPayment = async (req, res, next) => {
  try {
    const { orderId, cardNumber, cardExpiry, cvc } = req.body;

    if (!orderId) {
      return next(new ErrorResponse('Order ID is required', 400));
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return next(new ErrorResponse('Order not found', 404));
    }

    if (order.user.toString() !== req.user.id && req.user.role !== 'Admin') {
      return next(new ErrorResponse('Not authorized to access this order', 403));
    }

    if (order.paymentStatus === 'paid') {
      return next(new ErrorResponse('Order has already been paid', 400));
    }

    // Simulate validation
    if (cardNumber && cardNumber.replace(/\s/g, '').length < 16) {
      return next(new ErrorResponse('Invalid card number format', 400));
    }

    console.log(`Processing mock payment for Order: ${orderId}, Amount: ${order.totalAmount}`);

    // Simulate network delay for realistic feel
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Simulate success
    order.paymentStatus = 'paid';
    order.transactionId = 'ch_' + Math.random().toString(36).substr(2, 9).toUpperCase();
    order.paymentDetails = {
      cardBrand: cardNumber ? (cardNumber.startsWith('5') ? 'Mastercard' : 'Visa') : 'Visa',
      last4: cardNumber ? cardNumber.replace(/\s/g, '').slice(-4) : '4242',
      paymentGateway: 'Stripe_Simulation',
      paidAt: new Date()
    };

    await order.save();

    return sendSuccess(res, order, 'Payment processed successfully via simulated Stripe gateway');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create Razorpay Order
 * @route   POST /api/v1/payments/razorpay/order
 * @access  Private
 */
export const createRazorpayOrder = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return next(new ErrorResponse('Order ID is required', 400));
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return next(new ErrorResponse('Order not found', 404));
    }

    if (order.user.toString() !== req.user.id && req.user.role !== 'Admin') {
      return next(new ErrorResponse('Not authorized to access this order', 403));
    }

    if (order.paymentStatus === 'paid') {
      return next(new ErrorResponse('Order has already been paid', 400));
    }

    // Convert totalAmount (USD) to INR in Paise (e.g. 1 USD = 80 INR)
    const amountInPaise = Math.round(order.totalAmount * 80 * 100);

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Check if real keys are supplied, otherwise run Sandbox Mock mode
    if (keyId && keyId !== 'rzp_test_placeholder' && keySecret && keySecret !== 'secret_placeholder') {
      const instance = new Razorpay({
        key_id: keyId,
        key_secret: keySecret
      });

      const options = {
        amount: amountInPaise,
        currency: 'INR',
        receipt: `receipt_order_${order._id}`
      };

      const rzpOrder = await instance.orders.create(options);

      return sendSuccess(res, {
        key: keyId,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        rzpOrderId: rzpOrder.id,
        orderId: order._id,
        isMock: false
      }, 'Razorpay order generated successfully');
    } else {
      // Return details for local simulated checkout modal
      const mockRzpOrderId = 'order_' + Math.random().toString(36).substr(2, 9).toUpperCase();
      return sendSuccess(res, {
        key: 'rzp_test_placeholder',
        amount: amountInPaise,
        currency: 'INR',
        rzpOrderId: mockRzpOrderId,
        orderId: order._id,
        isMock: true
      }, 'Mock Razorpay order generated successfully (Sandbox mode)');
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify Razorpay Payment Signature
 * @route   POST /api/v1/payments/razorpay/verify
 * @access  Private
 */
export const verifyRazorpayPayment = async (req, res, next) => {
  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature, isMock } = req.body;

    if (!orderId || !razorpayOrderId || !razorpayPaymentId) {
      return next(new ErrorResponse('Payment credentials are required', 400));
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return next(new ErrorResponse('Order not found', 404));
    }

    if (isMock) {
      // Sandbox verify simulation
      order.paymentStatus = 'paid';
      order.transactionId = razorpayPaymentId;
      order.paymentDetails = {
        paymentGateway: 'Razorpay_Sandbox',
        razorpayOrderId,
        razorpayPaymentId,
        paidAt: new Date()
      };

      await order.save();
      return sendSuccess(res, order, 'Razorpay payment verified successfully (Sandbox Simulation)');
    }

    // Real signature check
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      return next(new ErrorResponse('Invalid signature. Verification failed.', 400));
    }

    order.paymentStatus = 'paid';
    order.transactionId = razorpayPaymentId;
    order.paymentDetails = {
      paymentGateway: 'Razorpay',
      razorpayOrderId,
      razorpayPaymentId,
      paidAt: new Date()
    };

    await order.save();
    return sendSuccess(res, order, 'Razorpay payment verified successfully');
  } catch (error) {
    next(error);
  }
};
