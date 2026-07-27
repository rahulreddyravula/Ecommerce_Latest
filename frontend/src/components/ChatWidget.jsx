import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { apiCall } from '../services/api';

export default function ChatWidget() {
  const { user } = useAuth();
  const { socket, messages, setMessages, joinRoom, sendMessage } = useSocket();
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef(null);

  // Load chat history from DB when user opens chat
  useEffect(() => {
    if (isOpen && user) {
      // 1. Join room (user ID is the room ID)
      joinRoom(user._id);

      // 2. Fetch history from DB
      apiCall('/chat/history')
        .then((res) => {
          if (res.success) {
            setMessages(res.data);
          }
        })
        .catch((err) => console.error('Error fetching chat history:', err.message));
    }
  }, [isOpen, user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Don't show chat widget if not logged in or if admin
  if (!user || user.role === 'Admin') return null;

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendMessage(inputText.trim());
    setInputText('');
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button className="chat-widget-btn" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <X size={24} color="white" /> : <MessageSquare size={24} color="white" />}
      </button>

      {/* Chat Popup */}
      {isOpen && (
        <div className="chat-popup">
          <div className="chat-header">
            <div>
              <h4 style={{ color: 'white', fontSize: '1rem', fontWeight: 'bold' }}>Support Chat</h4>
              <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>Talk to our support team</span>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white' }}>
              <X size={20} />
            </button>
          </div>

          <div className="chat-body">
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', margin: 'auto 0' }}>
                👋 Hi {user.name}! Send a message to start chatting with our support agents.
              </div>
            ) : (
              messages.map((msg, index) => {
                // If sender ID matches current user ID, it's user. Otherwise it's support/admin.
                const isMe = msg.sender === user._id;
                return (
                  <div key={msg._id || index} className={`chat-bubble ${isMe ? 'user' : 'support'}`}>
                    <div style={{ fontWeight: 'bold', fontSize: '0.7rem', opacity: 0.8, marginBottom: '2px' }}>
                      {isMe ? 'You' : msg.senderName}
                    </div>
                    <div>{msg.text}</div>
                    <div style={{ fontSize: '0.65rem', opacity: 0.6, marginTop: '4px', textAlign: 'right' }}>
                      {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          <form className="chat-footer" onSubmit={handleSend}>
            <input
              type="text"
              className="form-input"
              style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)' }}
              placeholder="Type your message..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)' }}>
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
