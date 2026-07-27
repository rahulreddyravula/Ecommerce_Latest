import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { apiCall } from '../services/api';
import { Send, User, ChevronRight, MessageSquare, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

export default function AdminChat() {
  const { socket, messages, setMessages, joinRoom, sendMessage } = useSocket();
  const [rooms, setRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef(null);
  const toast = useToast();

  const fetchRooms = async () => {
    try {
      const res = await apiCall('/chat/rooms');
      if (res.success) {
        setRooms(res.data);
      }
    } catch (err) {
      console.error('Error fetching chat rooms:', err.message);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  // Set up socket listeners for real-time room updating
  useEffect(() => {
    if (!socket) return;

    socket.on('room_updated', (data) => {
      // Reload rooms to shift updated room to top
      fetchRooms();
    });

    return () => {
      socket.off('room_updated');
    };
  }, [socket]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeRoomId]);

  const handleSelectRoom = async (roomId) => {
    setActiveRoomId(roomId);
    joinRoom(roomId); // Join room socket room

    // Fetch room history from database
    try {
      const res = await apiCall(`/chat/history/${roomId}`);
      if (res.success) {
        setMessages(res.data);
      }
    } catch (err) {
      toast.error(`Error fetching room history: ${err.message}`);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeRoomId) return;
    sendMessage(inputText.trim(), activeRoomId);
    setInputText('');
  };

  return (
    <div className="container fade-in admin-chat-container">
      
      {/* Top breadcrumb */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Support Chat Console</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Chat live with customers to resolve billing and product queries.</p>
        </div>
        <Link to="/admin" className="btn btn-secondary btn-sm" style={{ height: 'fit-content' }}>
          Back to Dashboard
        </Link>
      </div>

      {/* Main Console Split Panel */}
      <div className="chat-console-grid" style={{ flex: 1, height: '100%', minHeight: 0 }}>
        
        {/* Rooms Sidebar */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1rem', minHeight: 0 }}>
          <h3 style={{ fontSize: '1.1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MessageSquare size={16} /> Active Chats
          </h3>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {rooms.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2rem' }}>
                No active chat logs found.
              </div>
            ) : (
              rooms.map((room) => {
                const isSelected = activeRoomId === room.roomId;
                return (
                  <div
                    key={room.roomId}
                    onClick={() => handleSelectRoom(room.roomId)}
                    className="glass-card"
                    style={{
                      cursor: 'pointer',
                      borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                      background: isSelected ? 'var(--primary-glow)' : 'transparent',
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'var(--transition)'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', minWidth: 0, flex: 1 }}>
                      {room.user?.avatar ? (
                        <img src={room.user.avatar.startsWith('/') ? `http://localhost:5000${room.user.avatar}` : `http://localhost:5000/${room.user.avatar}`} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-card-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={16} />
                        </div>
                      )}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {room.user?.name || 'Customer'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {room.latestMessage}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={16} color="var(--text-muted)" />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat window pane */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1rem', minHeight: 0 }}>
          {activeRoomId ? (
            <>
              {/* Header */}
              <div style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--success)' }} />
                <h3 style={{ fontSize: '1.25rem' }}>Active Customer Support Session</h3>
              </div>

              {/* Messages Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {messages.map((msg, index) => {
                  // Admin sent it if it has an Admin role claim or matches admin user ID. 
                  // But since rooms have room ID = customer ID, the customer ID is the room variable.
                  // Thus, if msg.sender is equal to activeRoomId, it is the user. Otherwise, it is the admin.
                  const isUserMessage = msg.sender === activeRoomId;
                  return (
                    <div 
                      key={msg._id || index} 
                      className={`chat-bubble ${isUserMessage ? 'support' : 'user'}`}
                      style={{
                        alignSelf: isUserMessage ? 'flex-start' : 'flex-end',
                        background: isUserMessage ? 'var(--bg-card-hover)' : 'var(--primary)',
                        color: isUserMessage ? 'var(--text-primary)' : 'white',
                        border: isUserMessage ? '1px solid var(--border)' : 'none'
                      }}
                    >
                      <div style={{ fontSize: '0.7rem', fontWeight: 'bold', opacity: 0.8, marginBottom: '2px' }}>
                        {isUserMessage ? msg.senderName : 'Support Agent (You)'}
                      </div>
                      <div>{msg.text}</div>
                      <div style={{ fontSize: '0.65rem', opacity: 0.6, marginTop: '4px', textAlign: 'right' }}>
                        {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Message Input Form */}
              <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)' }}
                  placeholder="Type your support reply..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)' }}>
                  <Send size={16} /> Send
                </button>
              </form>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: '12px' }}>
              <AlertCircle size={40} />
              <h3>No Selected Session</h3>
              <p style={{ fontSize: '0.9rem' }}>Select an active support chat room from the left sidebar to open communications.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
