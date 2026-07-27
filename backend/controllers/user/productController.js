import Product from '../../models/Product.js';
import Category from '../../models/Category.js';
import ErrorResponse from '../../utils/errorResponse.js';
import { sendSuccess } from '../../utils/responseFormatter.js';

/**
 * @desc    Get all products with searching, filtering, sorting, pagination
 * @route   GET /api/v1/products
 * @access  Public
 */
export const getProducts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { status: 'active' };

    const conditions = [];

    // Search query
    if (req.query.search) {
      conditions.push({
        $or: [
          { title: { $regex: req.query.search, $options: 'i' } },
          { description: { $regex: req.query.search, $options: 'i' } },
          { brand: { $regex: req.query.search, $options: 'i' } }
        ]
      });
    }

    // Category filter
    if (req.query.category) {
      // Check if it is a valid ObjectId, otherwise resolve category slug
      if (req.query.category.match(/^[0-9a-fA-F]{24}$/)) {
        filter.category = req.query.category;
      } else {
        const cat = await Category.findOne({ slug: req.query.category });
        if (cat) {
          filter.category = cat._id;
        } else {
          // If category not found, return empty results
          return sendSuccess(res, {
            products: [],
            page,
            pages: 0,
            total: 0,
            limit
          }, 'Products retrieved successfully');
        }
      }
    }

    // Brand filter
    if (req.query.brand) {
      filter.brand = { $regex: `^${req.query.brand}$`, $options: 'i' };
    }

    // Featured filter
    if (req.query.featured) {
      filter.featured = req.query.featured === 'true';
    }

    // Price range filters (evaluating active price: discountPrice if set, else price)
    if (req.query.priceMin || req.query.priceMax) {
      const min = req.query.priceMin ? Number(req.query.priceMin) : null;
      const max = req.query.priceMax ? Number(req.query.priceMax) : null;
      
      const discountCond = { discountPrice: { $gt: 0 } };
      const originalCond = { $or: [{ discountPrice: 0 }, { discountPrice: { $exists: false } }] };
      
      const priceRangeCond = {};
      if (min !== null) {
        discountCond.discountPrice.$gte = min;
        priceRangeCond.$gte = min;
      }
      if (max !== null) {
        discountCond.discountPrice.$lte = max;
        priceRangeCond.$lte = max;
      }

      conditions.push({
        $or: [
          discountCond,
          { $and: [originalCond, { price: priceRangeCond }] }
        ]
      });
    }

    if (conditions.length > 0) {
      filter.$and = conditions;
    }

    // Sorting
    let sortBy = '-createdAt';
    if (req.query.sort) {
      sortBy = req.query.sort.split(',').join(' ');
    }

    // Execute query
    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .populate('category', 'name slug')
      .sort(sortBy)
      .skip(skip)
      .limit(limit)
      .lean();

    const pages = Math.ceil(total / limit);

    return sendSuccess(res, {
      products,
      page,
      pages,
      total,
      limit
    }, 'Products retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single product by slug
 * @route   GET /api/v1/products/:slug
 * @access  Public
 */
export const getProductBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const product = await Product.findOne({ slug, status: 'active' })
      .populate('category', 'name slug')
      .populate({
        path: 'reviews',
        populate: { path: 'user', select: 'name avatar' }
      });

    if (!product) {
      return next(new ErrorResponse('Product not found', 404));
    }

    return sendSuccess(res, product, 'Product retrieved successfully');
  } catch (error) {
    next(error);
  }
};
