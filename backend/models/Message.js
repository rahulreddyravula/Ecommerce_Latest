import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
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
    room: {
      type: String,
      required: true // Equal to the customer's User ID
    },
    text: {
      type: String,
      required: [true, 'Message text is required'],
      trim: true
    }
  },
  {
    timestamps: true
  }
);

const Message = mongoose.model('Message', messageSchema);
export default Message;
