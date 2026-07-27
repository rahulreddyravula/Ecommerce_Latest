import express from 'express';
import {
  getConversationByRoomId,
  addMessageToConversation
} from '../../controllers/user/conversationController.js';
import {
  validateRoomIdParam,
  validateNewMessage
} from '../../validators/conversationValidator.js';
import { protect } from '../../middleware/authMiddleware.js';

const router = express.Router();

// GET /conversation/:roomId
router.get('/:roomId', protect, validateRoomIdParam, getConversationByRoomId);

// POST /conversation/message
router.post('/message', protect, validateNewMessage, addMessageToConversation);

export default router;
