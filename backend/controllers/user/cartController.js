import Cart from '../../models/Cart.js';
import Product from '../../models/Product.js';
import ErrorResponse from '../../utils/errorResponse.js';
import { sendSuccess } from '../../utils/responseFormatter.js';

// Helper to recalculate cart quantity and totalPrice
const recalculateCart = async (cart) => {
  let totalPrice = 0;
  let totalQuantity = 0;
  const activeProducts = [];

  for (const item of cart.products) {
    const product = await Product.findById(item.product);
    if (product && product.status === 'active') {
      const activePrice = product.discountPrice && product.discountPrice < product.price
        ? product.discountPrice
        : product.price;
      totalPrice += activePrice * item.quantity;
      totalQuantity += item.quantity;
      activeProducts.push(item);
    }
  }

  cart.products = activeProducts;
  cart.totalPrice = totalPrice;
  cart.quantity = totalQuantity;
  return await cart.save();
};

/**
 * @desc    Get current user's cart
 * @route   GET /api/v1/cart
 * @access  Private
 */
export const getCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id }).populate('products.product', 'title price discountPrice images stock slug brand');
    
    if (!cart) {
      // Create empty cart if it doesn't exist
      cart = await Cart.create({
        user: req.user.id,
        products: [],
        quantity: 0,
        totalPrice: 0
      });
    } else {
      // Filter out items where product has been deleted or deactivated
      const hasDeletedProduct = cart.products.some(item => !item.product);
      if (hasDeletedProduct) {
        cart.products = cart.products.filter(item => item.product);
        await recalculateCart(cart);
        // Re-populate
        cart = await Cart.findOne({ user: req.user.id }).populate('products.product', 'title price discountPrice images stock slug brand');
      }
    }

    return sendSuccess(res, cart, 'Cart retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add product to cart
 * @route   POST /api/v1/cart
 * @access  Private
 */
export const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return next(new ErrorResponse('Product ID is required', 400));
    }

    const product = await Product.findById(productId);
    if (!product || product.status !== 'active') {
      return next(new ErrorResponse('Product not found or inactive', 404));
    }

    // Verify stock availability
    if (product.stock < quantity) {
      return next(new ErrorResponse(`Only ${product.stock} items left in stock`, 400));
    }

    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      cart = new Cart({
        user: req.user.id,
        products: []
      });
    }

    // Check if product is already in cart
    const itemIndex = cart.products.findIndex(item => item.product.toString() === productId);

    if (itemIndex > -1) {
      // Product exists, update quantity
      const newQuantity = cart.products[itemIndex].quantity + Number(quantity);
      if (product.stock < newQuantity) {
        return next(new ErrorResponse(`Only ${product.stock} items left in stock. You already have ${cart.products[itemIndex].quantity} in cart.`, 400));
      }
      cart.products[itemIndex].quantity = newQuantity;
    } else {
      // Add new product
      cart.products.push({ product: productId, quantity: Number(quantity) });
    }

    await recalculateCart(cart);
    
    const updatedCart = await Cart.findOne({ user: req.user.id }).populate('products.product', 'title price discountPrice images stock slug brand');
    return sendSuccess(res, updatedCart, 'Product added to cart successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update product quantity in cart
 * @route   PUT /api/v1/cart
 * @access  Private
 */
export const updateCartItem = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId || quantity === undefined) {
      return next(new ErrorResponse('Product ID and quantity are required', 400));
    }

    if (Number(quantity) < 1) {
      return next(new ErrorResponse('Quantity must be at least 1. To remove, use delete endpoint.', 400));
    }

    const product = await Product.findById(productId);
    if (!product) {
      return next(new ErrorResponse('Product not found', 404));
    }

    // Verify stock availability
    if (product.stock < quantity) {
      return next(new ErrorResponse(`Only ${product.stock} items left in stock`, 400));
    }

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return next(new ErrorResponse('Cart not found', 404));
    }

    const itemIndex = cart.products.findIndex(item => item.product.toString() === productId);
    if (itemIndex === -1) {
      return next(new ErrorResponse('Product not found in cart', 404));
    }

    cart.products[itemIndex].quantity = Number(quantity);
    await recalculateCart(cart);

    const updatedCart = await Cart.findOne({ user: req.user.id }).populate('products.product', 'title price discountPrice images stock slug brand');
    return sendSuccess(res, updatedCart, 'Cart updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove product from cart
 * @route   DELETE /api/v1/cart/:productId
 * @access  Private
 */
export const removeCartItem = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return next(new ErrorResponse('Cart not found', 404));
    }

    const itemIndex = cart.products.findIndex(item => item.product.toString() === productId);
    if (itemIndex === -1) {
      return next(new ErrorResponse('Product not found in cart', 404));
    }

    cart.products.splice(itemIndex, 1);
    await recalculateCart(cart);

    const updatedCart = await Cart.findOne({ user: req.user.id }).populate('products.product', 'title price discountPrice images stock slug brand');
    return sendSuccess(res, updatedCart, 'Product removed from cart successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Clear entire cart
 * @route   DELETE /api/v1/cart
 * @access  Private
 */
export const clearCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return next(new ErrorResponse('Cart not found', 404));
    }

    cart.products = [];
    cart.quantity = 0;
    cart.totalPrice = 0;
    await cart.save();

    return sendSuccess(res, cart, 'Cart cleared successfully');
  } catch (error) {
    next(error);
  }
};
