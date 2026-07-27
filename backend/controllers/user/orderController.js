import Order from '../../models/Order.js';
import Cart from '../../models/Cart.js';
import Product from '../../models/Product.js';
import Address from '../../models/Address.js';
import Coupon from '../../models/Coupon.js';
import ErrorResponse from '../../utils/errorResponse.js';
import { sendSuccess } from '../../utils/responseFormatter.js';

/**
 * @desc    Checkout and place order
 * @route   POST /api/v1/orders
 * @access  Private
 */
export const placeOrder = async (req, res, next) => {
  try {
    const { shippingAddressId, paymentMethod = 'COD', couponCode } = req.body;

    if (!shippingAddressId) {
      return next(new ErrorResponse('Shipping address ID is required', 400));
    }

    // 1. Get user's cart
    const cart = await Cart.findOne({ user: req.user.id }).populate('products.product');
    if (!cart || cart.products.length === 0) {
      return next(new ErrorResponse('Your cart is empty', 400));
    }

    // 2. Verify stock for all items
    for (const item of cart.products) {
      const product = item.product;
      if (!product || product.status !== 'active') {
        return next(new ErrorResponse(`Product ${product ? product.title : 'Unknown'} is no longer available`, 400));
      }
      if (product.stock < item.quantity) {
        return next(new ErrorResponse(`Product "${product.title}" has insufficient stock. Only ${product.stock} left.`, 400));
      }
    }

    // 3. Retrieve and verify shipping address
    const address = await Address.findById(shippingAddressId);
    if (!address) {
      return next(new ErrorResponse('Shipping address not found', 404));
    }
    if (address.user.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized to use this shipping address', 403));
    }

    // Snapshot address fields
    const shippingAddressSnapshot = {
      fullName: address.fullName,
      mobile: address.mobile,
      city: address.city,
      state: address.state,
      country: address.country,
      pincode: address.pincode
    };

    // 4. Calculate total amount
    let totalAmount = 0;
    const orderProducts = [];

    for (const item of cart.products) {
      const product = item.product;
      const activePrice = product.discountPrice && product.discountPrice < product.price
        ? product.discountPrice
        : product.price;

      totalAmount += activePrice * item.quantity;
      
      orderProducts.push({
        product: product._id,
        quantity: item.quantity,
        price: activePrice
      });
    }

    // 5. Apply coupon if provided
    let appliedCoupon = null;
    if (couponCode) {
      const uppercaseCode = couponCode.toUpperCase().trim();
      const coupon = await Coupon.findOne({ code: uppercaseCode });

      if (!coupon) {
        return next(new ErrorResponse('Invalid coupon code', 400));
      }

      if (!coupon.isValid()) {
        return next(new ErrorResponse('Coupon has expired or is inactive', 400));
      }

      const discountAmount = (totalAmount * coupon.discount) / 100;
      totalAmount -= discountAmount;
      appliedCoupon = coupon;
    }

    // 6. Create the order
    const order = await Order.create({
      user: req.user.id,
      products: orderProducts,
      shippingAddress: shippingAddressSnapshot,
      paymentMethod,
      paymentStatus: 'pending',
      orderStatus: 'placed',
      totalAmount: Math.round(totalAmount * 100) / 100 // round to 2 decimals
    });

    // 7. Decrement stock levels
    for (const item of cart.products) {
      await Product.findByIdAndUpdate(item.product._id, {
        $inc: { stock: -item.quantity }
      });
    }

    // 8. Clear the cart
    cart.products = [];
    cart.quantity = 0;
    cart.totalPrice = 0;
    await cart.save();

    return sendSuccess(res, order, 'Order placed successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get logged in user's orders (order history)
 * @route   GET /api/v1/orders
 * @access  Private
 */
export const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate('products.product', 'title images brand slug')
      .sort({ createdAt: -1 });

    return sendSuccess(res, orders, 'Order history retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get details of a single order
 * @route   GET /api/v1/orders/:id
 * @access  Private
 */
export const getOrderDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id)
      .populate('user', 'name email phone')
      .populate('products.product', 'title price images brand slug');

    if (!order) {
      return next(new ErrorResponse('Order not found', 404));
    }

    // Allow user to see their own order, or admins to see any order
    if ((!order.user || order.user._id.toString() !== req.user.id) && req.user.role !== 'Admin') {
      return next(new ErrorResponse('Not authorized to access this order', 403));
    }

    return sendSuccess(res, order, 'Order details retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel order by user
 * @route   PUT /api/v1/orders/:id/cancel
 * @access  Private
 */
export const cancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) {
      return next(new ErrorResponse('Order not found', 404));
    }

    // Ensure ownership
    if (order.user.toString() !== req.user.id && req.user.role !== 'Admin') {
      return next(new ErrorResponse('Not authorized to modify this order', 403));
    }

    // Can only cancel order if it is in 'placed' status
    if (order.orderStatus !== 'placed' && order.orderStatus !== 'processing') {
      return next(new ErrorResponse(`Cannot cancel order that has already been ${order.orderStatus}`, 400));
    }

    order.orderStatus = 'cancelled';
    order.paymentStatus = 'refunded'; // refund if already paid, or set accordingly
    await order.save();

    // Restore stock levels
    for (const item of order.products) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity }
      });
    }

    return sendSuccess(res, order, 'Order cancelled successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Apply and check coupon validity (pre-checkout)
 * @route   POST /api/v1/orders/apply-coupon
 * @access  Private
 */
export const validateAndApplyCoupon = async (req, res, next) => {
  try {
    const { couponCode, cartAmount } = req.body;

    if (!couponCode || cartAmount === undefined) {
      return next(new ErrorResponse('Coupon code and cart amount are required', 400));
    }

    const uppercaseCode = couponCode.toUpperCase().trim();
    const coupon = await Coupon.findOne({ code: uppercaseCode });

    if (!coupon) {
      return next(new ErrorResponse('Invalid coupon code', 404));
    }

    if (!coupon.isValid()) {
      return next(new ErrorResponse('Coupon is expired or inactive', 400));
    }

    const discountAmount = (Number(cartAmount) * coupon.discount) / 100;
    const finalAmount = Number(cartAmount) - discountAmount;

    return sendSuccess(res, {
      code: coupon.code,
      discountPercentage: coupon.discount,
      discountAmount,
      finalAmount
    }, 'Coupon code applied successfully');
  } catch (error) {
    next(error);
  }
};
