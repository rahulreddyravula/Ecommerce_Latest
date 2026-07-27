import Conversation from '../../models/Conversation.js';
import User from '../../models/User.js';
import { sendSuccess } from '../../utils/responseFormatter.js';
import ErrorResponse from '../../utils/errorResponse.js';
import mongoose from 'mongoose';

/**
 * @desc    Get current user's chat history with support
 * @route   GET /api/v1/chat/history
 * @access  Private
 */
export const getUserChatHistory = async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({ room: req.user.id });
    const messages = conversation ? conversation.messages : [];

    return sendSuccess(res, messages, 'Chat history retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get chat history of a specific room (Admin only)
 * @route   GET /api/v1/chat/history/:room
 * @access  Private (Admin)
 */
export const getRoomChatHistory = async (req, res, next) => {
  try {
    const { room } = req.params;

    const conversation = await Conversation.findOne({ room });
    const messages = conversation ? conversation.messages : [];

    return sendSuccess(res, messages, `Room ${room} history retrieved successfully`);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a list of all active chat rooms/conversations (Admin only)
 * @route   GET /api/v1/chat/rooms
 * @access  Private (Admin)
 */
export const getAdminChatRooms = async (req, res, next) => {
  try {
    // Fetch all conversations, sorted by most recently active
    const conversations = await Conversation.find()
      .populate('participants', 'name email avatar role')
      .sort({ updatedAt: -1 });

    const activeRooms = [];
    for (const convo of conversations) {
      // Find the customer (whose ID matches room, or who is not an Admin)
      let user = convo.participants.find(p => p._id.toString() === convo.room);
      
      if (!user) {
        // Fallback: look up user in DB
        if (mongoose.Types.ObjectId.isValid(convo.room)) {
          user = await User.findById(convo.room).select('name email avatar role');
        }
      }

      if (!user && convo.participants.length > 0) {
        // Fallback 2: grab first non-admin participant
        user = convo.participants.find(p => p.role !== 'Admin') || convo.participants[0];
      }

      if (user) {
        const lastMsg = convo.messages[convo.messages.length - 1];
        activeRooms.push({
          roomId: convo.room,
          user,
          latestMessage: lastMsg ? lastMsg.text : '',
          latestSenderName: lastMsg ? lastMsg.senderName : '',
          latestSenderId: lastMsg ? lastMsg.sender : null,
          lastUpdatedAt: convo.updatedAt
        });
      }
    }

    return sendSuccess(res, activeRooms, 'Active chat rooms retrieved successfully');
  } catch (error) {
    next(error);
  }
};

