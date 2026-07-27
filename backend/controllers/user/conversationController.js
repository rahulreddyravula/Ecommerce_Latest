import Conversation from '../../models/Conversation.js';
import { sendSuccess } from '../../utils/responseFormatter.js';
import ErrorResponse from '../../utils/errorResponse.js';
import mongoose from 'mongoose';

/**
 * @desc    Get conversation by roomId
 * @route   GET /api/v1/conversation/:roomId
 * @access  Private
 */
export const getConversationByRoomId = async (req, res, next) => {
  try {
    const { roomId } = req.params;

    // Find conversation by room ID
    const conversation = await Conversation.findOne({ room: roomId })
      .populate('participants', 'name email avatar role');

    if (!conversation) {
      return next(new ErrorResponse(`Conversation for room ${roomId} not found`, 404));
    }

    return sendSuccess(res, conversation, 'Conversation retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add a message to a conversation (Create conversation if it doesn't exist)
 * @route   POST /api/v1/conversation/message
 * @access  Private
 */
export const addMessageToConversation = async (req, res, next) => {
  try {
    const { roomId, sender, senderName, text } = req.body;

    // Ensure IDs are valid ObjectIds for participants
    const participants = [];
    if (mongoose.Types.ObjectId.isValid(roomId)) {
      participants.push(roomId);
    }
    if (sender && sender !== roomId && mongoose.Types.ObjectId.isValid(sender)) {
      participants.push(sender);
    }

    // Find and update/create conversation by pushing the message
    const conversation = await Conversation.findOneAndUpdate(
      { room: roomId },
      {
        $push: {
          messages: {
            sender,
            senderName,
            text,
            createdAt: new Date()
          }
        },
        $addToSet: { participants: { $each: participants } }
      },
      { new: true, upsert: true, runValidators: true }
    ).populate('participants', 'name email avatar role');

    return sendSuccess(res, conversation, 'Message sent and conversation updated successfully');
  } catch (error) {
    next(error);
  }
};
