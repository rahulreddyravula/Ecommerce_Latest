import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { apiCall } from '../services/api';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cart, setCart] = useState(null);
  const [wishlist, setWishlist] = useState(null);
  const [loading, setLoading] = useState(false);

  const activeUserRef = useRef(user);

  useEffect(() => {
    activeUserRef.current = user;
  }, [user]);

  const fetchCart = async () => {
    if (!user) return;
    const fetchUserId = user._id;
    try {
      setLoading(true);
      const data = await apiCall('/cart');
      if (data.success && activeUserRef.current && activeUserRef.current._id === fetchUserId) {
        setCart(data.data);
      }
    } catch (err) {
      console.error('Error fetching cart:', err.message);
    } finally {
      if (activeUserRef.current && activeUserRef.current._id === fetchUserId) {
        setLoading(false);
      }
    }
  };

  const fetchWishlist = async () => {
    if (!user) return;
    const fetchUserId = user._id;
    try {
      const data = await apiCall('/wishlist');
      if (data.success && activeUserRef.current && activeUserRef.current._id === fetchUserId) {
        setWishlist(data.data);
      }
    } catch (err) {
      console.error('Error fetching wishlist:', err.message);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCart();
      fetchWishlist();
    } else {
      setCart(null);
      setWishlist(null);
    }
  }, [user]);

  const addToCart = async (productId, quantity = 1) => {
    try {
      const data = await apiCall('/cart', {
        method: 'POST',
        body: JSON.stringify({ productId, quantity })
      });
      if (data.success) {
        setCart(data.data);
      }
      return data;
    } catch (err) {
      console.error('Error adding to cart:', err.message);
      throw err;
    }
  };

  const updateCartQty = async (productId, quantity) => {
    try {
      const data = await apiCall('/cart', {
        method: 'PUT',
        body: JSON.stringify({ productId, quantity })
      });
      if (data.success) {
        setCart(data.data);
      }
      return data;
    } catch (err) {
      console.error('Error updating cart:', err.message);
      throw err;
    }
  };

  const removeFromCart = async (productId) => {
    try {
      const data = await apiCall(`/cart/${productId}`, {
        method: 'DELETE'
      });
      if (data.success) {
        setCart(data.data);
      }
      return data;
    } catch (err) {
      console.error('Error removing from cart:', err.message);
      throw err;
    }
  };

  const clearCart = async () => {
    try {
      const data = await apiCall('/cart', {
        method: 'DELETE'
      });
      if (data.success) {
        setCart(null);
      }
      return data;
    } catch (err) {
      console.error('Error clearing cart:', err.message);
      throw err;
    }
  };

  const toggleWishlist = async (productId) => {
    try {
      const isAlreadyWishlisted = wishlist?.products?.some(
        (item) => (item._id || item) === productId
      );

      let data;
      if (isAlreadyWishlisted) {
        data = await apiCall(`/wishlist/${productId}`, {
          method: 'DELETE'
        });
      } else {
        data = await apiCall('/wishlist', {
          method: 'POST',
          body: JSON.stringify({ productId })
        });
      }

      if (data.success) {
        // Fetch fresh wishlist items
        await fetchWishlist();
      }
      return data;
    } catch (err) {
      console.error('Error toggling wishlist:', err.message);
      throw err;
    }
  };

  return (
    <CartContext.Provider value={{
      cart,
      wishlist,
      loading,
      fetchCart,
      fetchWishlist,
      addToCart,
      updateCartQty,
      removeFromCart,
      clearCart,
      toggleWishlist
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
