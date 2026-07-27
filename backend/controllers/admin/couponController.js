import Coupon from '../../models/Coupon.js';
import ErrorResponse from '../../utils/errorResponse.js';
import { sendSuccess } from '../../utils/responseFormatter.js';

/**
 * @desc    Create a new coupon
 * @route   POST /api/v1/admin/coupons
 * @access  Private/Admin
 */
export const createCoupon = async (req, res, next) => {
  try {
    const { code, discount, expiryDate, active } = req.body;

    if (!code || discount === undefined || !expiryDate) {
      return next(new ErrorResponse('Code, discount, and expiry date are required', 400));
    }

    const uppercaseCode = code.toUpperCase().trim();

    // Check if code exists
    const couponExists = await Coupon.findOne({ code: uppercaseCode });
    if (couponExists) {
      return next(new ErrorResponse('Coupon code already exists', 400));
    }

    const coupon = await Coupon.create({
      code: uppercaseCode,
      discount,
      expiryDate,
      active
    });

    return sendSuccess(res, coupon, 'Coupon created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all coupons
 * @route   GET /api/v1/admin/coupons
 * @access  Private/Admin
 */
export const getCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    return sendSuccess(res, coupons, 'Coupons retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single coupon by ID
 * @route   GET /api/v1/admin/coupons/:id
 * @access  Private/Admin
 */
export const getCouponById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById(id);

    if (!coupon) {
      return next(new ErrorResponse('Coupon not found', 404));
    }

    return sendSuccess(res, coupon, 'Coupon retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update coupon details
 * @route   PUT /api/v1/admin/coupons/:id
 * @access  Private/Admin
 */
export const updateCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { code, discount, expiryDate, active } = req.body;

    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return next(new ErrorResponse('Coupon not found', 404));
    }

    if (code) {
      const uppercaseCode = code.toUpperCase().trim();
      const codeExists = await Coupon.findOne({ code: uppercaseCode, _id: { $ne: id } });
      if (codeExists) {
        return next(new ErrorResponse('Coupon code already exists', 400));
      }
      coupon.code = uppercaseCode;
    }

    if (discount !== undefined) coupon.discount = discount;
    if (expiryDate) coupon.expiryDate = expiryDate;
    if (active !== undefined) coupon.active = active;

    await coupon.save();

    return sendSuccess(res, coupon, 'Coupon updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete coupon
 * @route   DELETE /api/v1/admin/coupons/:id
 * @access  Private/Admin
 */
export const deleteCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findByIdAndDelete(id);

    if (!coupon) {
      return next(new ErrorResponse('Coupon not found', 404));
    }

    return sendSuccess(res, {}, 'Coupon deleted successfully');
  } catch (error) {
    next(error);
  }
};
