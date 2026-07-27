import express from 'express';
import {
  getUserChatHistory,
  getRoomChatHistory,
  getAdminChatRooms
} from '../../controllers/user/chatController.js';
import { protect, authorize } from '../../middleware/authMiddleware.js';

const router = express.Router();

// Get personal user chat history
router.get('/history', protect, getUserChatHistory);

// Admin-only endpoints to manage support tickets / chats
router.get('/rooms', protect, authorize('Admin'), getAdminChatRooms);
router.get('/history/:room', protect, authorize('Admin'), getRoomChatHistory);

export default router;
