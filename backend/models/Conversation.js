import mongoose from 'mongoose';

const messageItemSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    senderName: {
      type: String,
      required: true
    },
    text: {
      type: String,
      required: [true, 'Message text is required'],
      trim: true
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

const conversationSchema = new mongoose.Schema(
  {
    room: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    messages: [messageItemSchema]
  },
  {
    timestamps: true
  }
);

const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;
