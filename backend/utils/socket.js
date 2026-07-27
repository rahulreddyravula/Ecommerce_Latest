import { Server } from 'socket.io';
import Conversation from '../models/Conversation.js';
import mongoose from 'mongoose';

export const setupSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: '*', // Allow all origins for simplicity in local dev
      methods: ['GET', 'POST']
    }
  });

  console.log('Socket.io server configured and ready.');

  io.on('connection', (socket) => {
    console.log(`New socket connection: ${socket.id}`);

    // Join a specific chat room (usually the user's ID)
    socket.on('join_room', (roomId) => {
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room: ${roomId}`);
    });

    // Handle sending message
    socket.on('send_message', async (data) => {
      const { sender, senderName, room, text } = data;

      try {
        // Setup initial participants
        const participants = [];
        if (mongoose.Types.ObjectId.isValid(room)) {
          participants.push(room);
        }
        if (sender && sender !== room && mongoose.Types.ObjectId.isValid(sender)) {
          participants.push(sender);
        }

        // 1. Save to MongoDB (Conversation update/creation)
        const updatedConversation = await Conversation.findOneAndUpdate(
          { room: room },
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
        );

        const lastMessage = updatedConversation.messages[updatedConversation.messages.length - 1];

        // Format message payload for frontend socket listeners
        const broadcastMessage = {
          _id: lastMessage._id,
          sender: lastMessage.sender,
          senderName: lastMessage.senderName,
          text: lastMessage.text,
          createdAt: lastMessage.createdAt,
          room: updatedConversation.room
        };

        // 2. Broadcast message to everyone in the room
        io.to(room).emit('receive_message', broadcastMessage);

        // 3. Notify admins that there's a new or updated room
        // We broadcast globally to any socket listening for updates
        io.emit('room_updated', {
          roomId: room,
          latestMessage: text,
          latestSenderName: senderName,
          lastUpdatedAt: updatedConversation.updatedAt
        });

      } catch (err) {
        console.error('Error saving socket message:', err.message);
        socket.emit('error', 'Failed to deliver message.');
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

