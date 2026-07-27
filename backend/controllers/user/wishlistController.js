import Wishlist from '../../models/Wishlist.js';
import Product from '../../models/Product.js';
import ErrorResponse from '../../utils/errorResponse.js';
import { sendSuccess } from '../../utils/responseFormatter.js';

/**
 * @desc    Get user's wishlist
 * @route   GET /api/v1/wishlist
 * @access  Private
 */
export const getWishlist = async (req, res, next) => {
  try {
    const authenticatedUserId = req.user.id;
    const requestedWishlistUserId = req.query.userId || req.body.userId || req.user.id;
    const queryParams = { user: authenticatedUserId };

    console.log('--- Wishlist GET Security Audit ---');
    console.log(`- Authenticated user ID: ${authenticatedUserId}`);
    console.log(`- Requested wishlist user ID: ${requestedWishlistUserId}`);
    console.log(`- Database query parameters: ${JSON.stringify(queryParams)}`);

    let wishlist = await Wishlist.findOne(queryParams).populate('products', 'title price discountPrice images stock slug brand status');
    
    if (!wishlist) {
      wishlist = await Wishlist.create({
        user: authenticatedUserId,
        products: []
      });
    } else {
      // Clean up any deleted or inactive products
      const hasDeletedProduct = wishlist.products.some(item => !item || item.status !== 'active');
      if (hasDeletedProduct) {
        wishlist.products = wishlist.products.filter(item => item && item.status === 'active');
        await wishlist.save();
        // Re-populate
        wishlist = await Wishlist.findOne(queryParams).populate('products', 'title price discountPrice images stock slug brand status');
      }
    }

    console.log(`- Returned wishlist owner ID: ${wishlist.user ? wishlist.user.toString() : 'None'}`);

    return sendSuccess(res, wishlist, 'Wishlist retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add product to wishlist
 * @route   POST /api/v1/wishlist
 * @access  Private
 */
export const addToWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return next(new ErrorResponse('Product ID is required', 400));
    }

    const product = await Product.findById(productId);
    if (!product || product.status !== 'active') {
      return next(new ErrorResponse('Product not found or inactive', 404));
    }

    const authenticatedUserId = req.user.id;
    const requestedWishlistUserId = req.query.userId || req.body.userId || req.user.id;
    const queryParams = { user: authenticatedUserId };

    console.log('--- Wishlist POST Security Audit ---');
    console.log(`- Authenticated user ID: ${authenticatedUserId}`);
    console.log(`- Requested wishlist user ID: ${requestedWishlistUserId}`);
    console.log(`- Database query parameters: ${JSON.stringify(queryParams)}`);

    // Use $addToSet to add if it doesn't already exist in the array
    const wishlist = await Wishlist.findOneAndUpdate(
      queryParams,
      { $addToSet: { products: productId } },
      { new: true, upsert: true }
    ).populate('products', 'title price discountPrice images stock slug brand status');

    console.log(`- Returned wishlist owner ID: ${wishlist.user ? wishlist.user.toString() : 'None'}`);

    return sendSuccess(res, wishlist, 'Product added to wishlist successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove product from wishlist
 * @route   DELETE /api/v1/wishlist/:productId
 * @access  Private
 */
export const removeFromWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const authenticatedUserId = req.user.id;
    const requestedWishlistUserId = req.query.userId || req.body.userId || req.user.id;
    const queryParams = { user: authenticatedUserId };

    console.log('--- Wishlist DELETE Security Audit ---');
    console.log(`- Authenticated user ID: ${authenticatedUserId}`);
    console.log(`- Requested wishlist user ID: ${requestedWishlistUserId}`);
    console.log(`- Database query parameters: ${JSON.stringify(queryParams)}`);

    const wishlist = await Wishlist.findOneAndUpdate(
      queryParams,
      { $pull: { products: productId } },
      { new: true }
    ).populate('products', 'title price discountPrice images stock slug brand status');

    if (!wishlist) {
      return next(new ErrorResponse('Wishlist not found', 404));
    }

    console.log(`- Returned wishlist owner ID: ${wishlist.user ? wishlist.user.toString() : 'None'}`);

    return sendSuccess(res, wishlist, 'Product removed from wishlist successfully');
  } catch (error) {
    next(error);
  }
};
