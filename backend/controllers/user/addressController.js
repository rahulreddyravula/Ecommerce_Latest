import Address from '../../models/Address.js';
import ErrorResponse from '../../utils/errorResponse.js';
import { sendSuccess } from '../../utils/responseFormatter.js';

/**
 * @desc    Get all addresses for logged-in user
 * @route   GET /api/v1/addresses
 * @access  Private
 */
export const getAddresses = async (req, res, next) => {
  try {
    const addresses = await Address.find({ user: req.user.id }).sort({ createdAt: -1 });
    return sendSuccess(res, addresses, 'Addresses retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single address by ID
 * @route   GET /api/v1/addresses/:id
 * @access  Private
 */
export const getAddressById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const address = await Address.findById(id);

    if (!address) {
      return next(new ErrorResponse('Address not found', 404));
    }

    // Ensure ownership
    if (address.user.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized to access this address', 403));
    }

    return sendSuccess(res, address, 'Address retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a shipping address
 * @route   POST /api/v1/addresses
 * @access  Private
 */
export const createAddress = async (req, res, next) => {
  try {
    const { fullName, mobile, city, state, country, pincode } = req.body;

    if (!fullName || !mobile || !city || !state || !country || !pincode) {
      return next(new ErrorResponse('All address fields are required', 400));
    }

    const address = await Address.create({
      user: req.user.id,
      fullName,
      mobile,
      city,
      state,
      country,
      pincode
    });

    return sendSuccess(res, address, 'Address created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update address
 * @route   PUT /api/v1/addresses/:id
 * @access  Private
 */
export const updateAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { fullName, mobile, city, state, country, pincode } = req.body;

    const address = await Address.findById(id);
    if (!address) {
      return next(new ErrorResponse('Address not found', 404));
    }

    // Ensure ownership
    if (address.user.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized to modify this address', 403));
    }

    if (fullName) address.fullName = fullName;
    if (mobile) address.mobile = mobile;
    if (city) address.city = city;
    if (state) address.state = state;
    if (country) address.country = country;
    if (pincode) address.pincode = pincode;

    await address.save();

    return sendSuccess(res, address, 'Address updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete address
 * @route   DELETE /api/v1/addresses/:id
 * @access  Private
 */
export const deleteAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const address = await Address.findById(id);

    if (!address) {
      return next(new ErrorResponse('Address not found', 404));
    }

    // Ensure ownership
    if (address.user.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized to delete this address', 403));
    }

    await Address.findByIdAndDelete(id);

    return sendSuccess(res, {}, 'Address deleted successfully');
  } catch (error) {
    next(error);
  }
};
