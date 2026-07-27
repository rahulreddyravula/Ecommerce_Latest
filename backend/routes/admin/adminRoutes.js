import express from 'express';
import {
  getDashboardStats,
  getAllUsers,
  updateUserData,
  blockUser,
  unblockUser,
  deleteUser
} from '../../controllers/admin/adminController.js';
import { protect, authorize } from '../../middleware/authMiddleware.js';

const router = express.Router();

// Apply admin authentication/authorization to all endpoints in this router
router.use(protect);
router.use(authorize('Admin'));

// Analytics Dashboard
router.get('/dashboard', getDashboardStats);

// User Administration
router.route('/users')
  .get(getAllUsers);

router.route('/users/:id')
  .put(updateUserData)
  .delete(deleteUser);

router.put('/users/:id/block', blockUser);
router.put('/users/:id/unblock', unblockUser);

export default router;
