import Review from '../../models/Review.js';
import Product from '../../models/Product.js';
import ErrorResponse from '../../utils/errorResponse.js';
import { sendSuccess } from '../../utils/responseFormatter.js';

// Helper function to update average rating and list on Product
const updateProductRatings = async (productId) => {
  const reviews = await Review.find({ product: productId });
  
  const numOfReviews = reviews.length;
  let avgRating = 0;
  
  if (numOfReviews > 0) {
    const sum = reviews.reduce((acc, item) => acc + item.rating, 0);
    avgRating = sum / numOfReviews;
  }

  const reviewIds = reviews.map(r => r._id);

  await Product.findByIdAndUpdate(productId, {
    ratings: Math.round(avgRating * 10) / 10,
    reviews: reviewIds
  });
};

/**
 * @desc    Create a product review
 * @route   POST /api/v1/reviews
 * @access  Private
 */
export const createReview = async (req, res, next) => {
  try {
    const { productId, rating, comment } = req.body;

    if (!productId || rating === undefined || !comment) {
      return next(new ErrorResponse('Product ID, rating (1-5), and comment are required', 400));
    }

    const product = await Product.findById(productId);
    if (!product || product.status !== 'active') {
      return next(new ErrorResponse('Product not found or inactive', 404));
    }

    // Check if user already reviewed this product
    const alreadyReviewed = await Review.findOne({ user: req.user.id, product: productId });
    if (alreadyReviewed) {
      return next(new ErrorResponse('You have already reviewed this product', 400));
    }

    const review = await Review.create({
      user: req.user.id,
      product: productId,
      rating: Number(rating),
      comment
    });

    // Recalculate ratings
    await updateProductRatings(productId);

    return sendSuccess(res, review, 'Review added successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all reviews for a product
 * @route   GET /api/v1/reviews/product/:productId
 * @access  Public
 */
export const getProductReviews = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const reviews = await Review.find({ product: productId })
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 });

    return sendSuccess(res, reviews, 'Product reviews retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a review
 * @route   DELETE /api/v1/reviews/:id
 * @access  Private
 */
export const deleteReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const review = await Review.findById(id);

    if (!review) {
      return next(new ErrorResponse('Review not found', 404));
    }

    // Auth check: Author of the review or Admin user
    if (review.user.toString() !== req.user.id && req.user.role !== 'Admin') {
      return next(new ErrorResponse('Not authorized to delete this review', 403));
    }

    const productId = review.product;

    await Review.findByIdAndDelete(id);

    // Recalculate product ratings
    await updateProductRatings(productId);

    return sendSuccess(res, {}, 'Review deleted successfully');
  } catch (error) {
    next(error);
  }
};
