import Order from '../../models/Order.js';
import Product from '../../models/Product.js';
import ErrorResponse from '../../utils/errorResponse.js';
import { sendSuccess } from '../../utils/responseFormatter.js';

/**
 * @desc    Get all orders
 * @route   GET /api/v1/admin/orders
 * @access  Private/Admin
 */
export const getAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email phone')
      .populate('products.product', 'title price brand')
      .sort({ createdAt: -1 });

    return sendSuccess(res, orders, 'All orders retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update order status
 * @route   PUT /api/v1/admin/orders/:id/status
 * @access  Private/Admin
 */
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { orderStatus, paymentStatus } = req.body;

    if (!orderStatus && !paymentStatus) {
      return next(new ErrorResponse('Order status or payment status is required', 400));
    }

    const order = await Order.findById(id);
    if (!order) {
      return next(new ErrorResponse('Order not found', 404));
    }

    // Check if transitioning to cancelled to restore stock
    if (orderStatus === 'cancelled' && order.orderStatus !== 'cancelled') {
      for (const item of order.products) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity }
        });
      }
      order.paymentStatus = 'refunded';
    }

    if (orderStatus) order.orderStatus = orderStatus;
    if (paymentStatus) order.paymentStatus = paymentStatus;

    await order.save();

    return sendSuccess(res, order, `Order status updated to ${order.orderStatus}`);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel order (Admin action)
 * @route   PUT /api/v1/admin/orders/:id/cancel
 * @access  Private/Admin
 */
export const adminCancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) {
      return next(new ErrorResponse('Order not found', 404));
    }

    if (order.orderStatus === 'cancelled') {
      return next(new ErrorResponse('Order is already cancelled', 400));
    }

    order.orderStatus = 'cancelled';
    order.paymentStatus = 'refunded';
    await order.save();

    // Restore stock levels
    for (const item of order.products) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity }
      });
    }

    return sendSuccess(res, order, 'Order cancelled successfully by Admin');
  } catch (error) {
    next(error);
  }
};
