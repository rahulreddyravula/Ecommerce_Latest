import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Contexts
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { SocketProvider } from './context/SocketContext';

// Components
import Header from './components/Header';
import Footer from './components/Footer';
import ChatWidget from './components/ChatWidget';

// Pages
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Wishlist from './pages/Wishlist';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import OtpVerify from './pages/OtpVerify';
import EmailVerify from './pages/EmailVerify';
import MfaSetup from './pages/MfaSetup';
import MfaVerify from './pages/MfaVerify';
import AdminDashboard from './pages/AdminDashboard';
import AdminChat from './pages/AdminChat';

// Protection Wrappers
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

function App() {
  return (
    <ToastProvider>
      <Router>
        <AuthProvider>
          <CartProvider>
            <SocketProvider>
              <div className="app-container">
                <Header />
                
                <div className="content-wrap">
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/products" element={<Catalog />} />
                    <Route path="/products/:slug" element={<ProductDetails />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/wishlist" element={<Wishlist />} />
                    
                    {/* Private user routes */}
                    <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
                    <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
                    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                    <Route path="/mfa-setup" element={<ProtectedRoute><MfaSetup /></ProtectedRoute>} />
                    
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/otp-verify" element={<OtpVerify />} />
                    <Route path="/verify-email" element={<EmailVerify />} />
                    <Route path="/mfa-verify" element={<MfaVerify />} />
                    
                    {/* Admin panel routes */}
                    <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                    <Route path="/admin/chat" element={<AdminRoute><AdminChat /></AdminRoute>} />
                  </Routes>
                </div>

                {/* Real-time floating customer chat widget */}
                <ChatWidget />
                
                <Footer />
              </div>
            </SocketProvider>
          </CartProvider>
        </AuthProvider>
      </Router>
    </ToastProvider>
  );
}

export default App;
