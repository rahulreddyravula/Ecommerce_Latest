import User from '../../models/User.js';
import Order from '../../models/Order.js';
import ErrorResponse from '../../utils/errorResponse.js';
import { sendSuccess } from '../../utils/responseFormatter.js';
import { deleteFile } from '../../utils/fileHelper.js';


/**
 * @desc    Get dashboard analytics & summary stats
 * @route   GET /api/v1/admin/dashboard
 * @access  Private/Admin
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    // 1. Total count metrics
    const totalUsers = await User.countDocuments({ role: 'User' });
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ 
      orderStatus: { $in: ['placed', 'processing'] } 
    });

    // 2. Sales & Revenue aggregations
    // Total Sales: Sum of all non-cancelled orders
    const salesAggregate = await Order.aggregate([
      { $match: { orderStatus: { $ne: 'cancelled' } } },
      { $group: { _id: null, totalSales: { $sum: '$totalAmount' } } }
    ]);
    const totalSales = salesAggregate.length > 0 ? salesAggregate[0].totalSales : 0;

    // Revenue: Sum of paid orders (excluding cancelled)
    const revenueAggregate = await Order.aggregate([
      { $match: { paymentStatus: 'paid', orderStatus: { $ne: 'cancelled' } } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
    ]);
    const revenue = revenueAggregate.length > 0 ? revenueAggregate[0].totalRevenue : 0;

    // 3. Monthly Sales breakdown (current year)
    const currentYear = new Date().getFullYear();
    const monthlySalesAggregate = await Order.aggregate([
      {
        $match: {
          orderStatus: { $ne: 'cancelled' },
          createdAt: { $gte: new Date(`${currentYear}-01-01`) }
        }
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          sales: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Format monthly sales data
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // Fill all months with 0 by default, then merge aggregated results
    const monthlySales = Array.from({ length: 12 }, (_, i) => ({
      month: months[i],
      sales: 0,
      count: 0
    }));

    monthlySalesAggregate.forEach(item => {
      const monthIndex = item._id - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        monthlySales[monthIndex].sales = Math.round(item.sales * 100) / 100;
        monthlySales[monthIndex].count = item.count;
      }
    });

    return sendSuccess(res, {
      totalUsers,
      totalOrders,
      totalSales: Math.round(totalSales * 100) / 100,
      revenue: Math.round(revenue * 100) / 100,
      pendingOrders,
      monthlySales
    }, 'Dashboard stats retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all registered users
 * @route   GET /api/v1/admin/users
 * @access  Private/Admin
 */
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    return sendSuccess(res, users, 'Users list retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user details/role
 * @route   PUT /api/v1/admin/users/:id
 * @access  Private/Admin
 */
export const updateUserData = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, role, status } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (role) user.role = role;
    if (status) user.status = status;

    await user.save();

    return sendSuccess(res, user, 'User updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Block a user
 * @route   PUT /api/v1/admin/users/:id/block
 * @access  Private/Admin
 */
export const blockUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (id === req.user.id) {
      return next(new ErrorResponse('You cannot block your own admin account', 400));
    }

    const user = await User.findByIdAndUpdate(
      id,
      { status: 'blocked' },
      { new: true }
    );

    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }

    return sendSuccess(res, user, 'User account has been blocked');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Unblock a user
 * @route   PUT /api/v1/admin/users/:id/unblock
 * @access  Private/Admin
 */
export const unblockUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndUpdate(
      id,
      { status: 'active' },
      { new: true }
    );

    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }

    return sendSuccess(res, user, 'User account has been unblocked');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a user
 * @route   DELETE /api/v1/admin/users/:id
 * @access  Private/Admin
 */
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return next(new ErrorResponse('You cannot delete your own admin account', 400));
    }

    const user = await User.findById(id);

    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }

    // Delete avatar image from disk if it exists
    if (user.avatar) {
      await deleteFile(user.avatar);
    }

    await User.findByIdAndDelete(id);

    return sendSuccess(res, {}, 'User deleted successfully');
  } catch (error) {
    next(error);
  }
};
