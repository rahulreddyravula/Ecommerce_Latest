import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    // Connect to backend Socket.io server
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    console.log('Socket client connected.');

    // Cleanup on unmount or logout
    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  useEffect(() => {
    if (!socket) return;

    // Listen for new messages
    socket.on('receive_message', (message) => {
      // Append if the message belongs to the current room we're viewing
      if (message.room === activeRoom) {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.find((m) => m._id === message._id)) return prev;
          return [...prev, message];
        });
      }
    });

    return () => {
      socket.off('receive_message');
    };
  }, [socket, activeRoom]);

  const joinRoom = (roomId) => {
    if (!socket) return;
    socket.emit('join_room', roomId);
    setActiveRoom(roomId);
    setMessages([]); // Reset messages; we'll load history via HTTP call
  };

  const sendMessage = (text, roomId) => {
    if (!socket || !user) return;
    const messageData = {
      sender: user._id,
      senderName: user.name,
      room: roomId || user._id,
      text
    };
    socket.emit('send_message', messageData);
  };

  return (
    <SocketContext.Provider value={{
      socket,
      messages,
      setMessages,
      activeRoom,
      joinRoom,
      sendMessage
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
