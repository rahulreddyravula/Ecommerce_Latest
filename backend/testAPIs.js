// in this file all the test cases will be there  

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import app from './app.js';
import connectDB from './config/db.js';
import User from './models/User.js';
import Product from './models/Product.js';
import Category from './models/Category.js';
import Coupon from './models/Coupon.js';
import Order from './models/Order.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Override environment variables for test
dotenv.config({ path: path.join(__dirname, '.env') });
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/ecommerce_db_test';
process.env.PORT = '5001';
process.env.NODE_ENV = 'development'; // Keep log/verbose info active

const PORT = 5001;
const BASE_URL = `http://localhost:${PORT}/api/v1`;

// Collect test results for report
const testResults = [];

function recordResult(testName, passed, details = '') {
  testResults.push({ name: testName, passed, details });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[TEST] ${status} - ${testName} ${details ? `(${details})` : ''}`);
}

async function runTests() {
  console.log('=== Starting E2E Integration API Tests ===');
  
  // Connect to DB and clear it
  await connectDB();
  console.log('Clearing database for clean test run...');
  await mongoose.connection.dropDatabase();
  console.log('Database cleared.');

  // Start Express Server
  const server = app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
  });

  try {
    // -------------------------------------------------------------
    // Test 1: Register Normal User
    // -------------------------------------------------------------
    let userToken = '';
    let userId = '';
    try {
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: 'user@example.com',
          password: 'password123',
          phone: '+1234567890'
        })
      });
      const data = await res.json();
      if (res.status === 201 && data.success && data.data.accessToken) {
        userToken = data.data.accessToken;
        userId = data.data.user._id;
        recordResult('Register Normal User', true);
      } else {
        recordResult('Register Normal User', false, `Status: ${res.status}, Msg: ${data.message}`);
      }
    } catch (err) {
      recordResult('Register Normal User', false, err.message);
    }

    // -------------------------------------------------------------
    // Test 2: Register Admin User (Directly update role to Admin in MongoDB)
    // -------------------------------------------------------------
    let adminToken = '';
    let adminId = '';
    try {
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Admin User',
          email: 'admin@example.com',
          password: 'password123',
          phone: '+9876543210'
        })
      });
      const data = await res.json();
      if (res.status === 201 && data.success) {
        // Elevate user to Admin role in DB
        adminId = data.data.user._id;
        await User.findByIdAndUpdate(adminId, { role: 'Admin' });
        
        // Log in again to get token with Admin role claims
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'admin@example.com',
            password: 'password123'
          })
        });
        const loginData = await loginRes.json();
        adminToken = loginData.data.accessToken;
        
        recordResult('Register and Promote Admin User', true);
      } else {
        recordResult('Register and Promote Admin User', false, `Status: ${res.status}`);
      }
    } catch (err) {
      recordResult('Register and Promote Admin User', false, err.message);
    }

    // -------------------------------------------------------------
    // Test 3: User Login
    // -------------------------------------------------------------
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'password123'
        })
      });
      const data = await res.json();
      if (res.status === 200 && data.success && data.data.accessToken) {
        recordResult('Login User', true);
      } else {
        recordResult('Login User', false, `Status: ${res.status}`);
      }
    } catch (err) {
      recordResult('Login User', false, err.message);
    }

    // -------------------------------------------------------------
    // Test 4: Update Profile
    // -------------------------------------------------------------
    try {
      const res = await fetch(`${BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          name: 'Updated User Name',
          phone: '+1111111111'
        })
      });
      const data = await res.json();
      if (res.status === 200 && data.data.user.name === 'Updated User Name') {
        recordResult('Update Profile Info', true);
      } else {
        recordResult('Update Profile Info', false, `Status: ${res.status}, Name: ${data.data?.user?.name}`);
      }
    } catch (err) {
      recordResult('Update Profile Info', false, err.message);
    }

    // -------------------------------------------------------------
    // Test 5: Upload Avatar Image
    // -------------------------------------------------------------
    try {
      const form = new FormData();
      const mockFile = new Blob(['avatar binary content'], { type: 'image/png' });
      form.append('avatar', mockFile, 'avatar.png');

      const res = await fetch(`${BASE_URL}/auth/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`
        },
        body: form
      });
      const data = await res.json();
      if (res.status === 200 && data.success && data.data.avatar) {
        recordResult('Upload Profile Avatar', true, `Path: ${data.data.avatar}`);
      } else {
        recordResult('Upload Profile Avatar', false, `Status: ${res.status}, Message: ${data.message}`);
      }
    } catch (err) {
      recordResult('Upload Profile Avatar', false, err.message);
    }

    // -------------------------------------------------------------
    // Test 6: Create Category (Admin)
    // -------------------------------------------------------------
    let categoryId = '';
    let categorySlug = '';
    try {
      const form = new FormData();
      form.append('name', 'Electronics');
      form.append('description', 'Gadgets and electronic components');
      const mockFile = new Blob(['cat image'], { type: 'image/png' });
      form.append('image', mockFile, 'electronics.png');

      const res = await fetch(`${BASE_URL}/admin/categories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        },
        body: form
      });
      const data = await res.json();
      if (res.status === 201 && data.success) {
        categoryId = data.data._id;
        categorySlug = data.data.slug;
        recordResult('Create Category (Admin)', true, `ID: ${categoryId}, Slug: ${categorySlug}`);
      } else {
        recordResult('Create Category (Admin)', false, `Status: ${res.status}, Msg: ${data.message}`);
      }
    } catch (err) {
      recordResult('Create Category (Admin)', false, err.message);
    }

    // -------------------------------------------------------------
    // Test 7: Get Categories (Public)
    // -------------------------------------------------------------
    try {
      const res = await fetch(`${BASE_URL}/categories`);
      const data = await res.json();
      if (res.status === 200 && data.success && data.data.length > 0) {
        recordResult('Get Categories (Public)', true, `Count: ${data.data.length}`);
      } else {
        recordResult('Get Categories (Public)', false, `Status: ${res.status}`);
      }
    } catch (err) {
      recordResult('Get Categories (Public)', false, err.message);
    }

    // -------------------------------------------------------------
    // Test 8: Create Product (Admin)
    // -------------------------------------------------------------
    let productId = '';
    let productSlug = '';
    try {
      const form = new FormData();
      form.append('title', 'Super Smartphone');
      form.append('description', 'Latest generation 5G smartphone');
      form.append('price', '999.99');
      form.append('discountPrice', '899.99');
      form.append('stock', '50');
      form.append('SKU', 'SMART-123');
      form.append('category', categoryId);
      form.append('brand', 'MegaBrand');
      const mockFile1 = new Blob(['img1'], { type: 'image/png' });
      const mockFile2 = new Blob(['img2'], { type: 'image/png' });
      form.append('images', mockFile1, 'phone1.png');
      form.append('images', mockFile2, 'phone2.png');

      const res = await fetch(`${BASE_URL}/admin/products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        },
        body: form
      });
      const data = await res.json();
      if (res.status === 201 && data.success) {
        productId = data.data._id;
        productSlug = data.data.slug;
        recordResult('Create Product (Admin)', true, `ID: ${productId}, Slug: ${productSlug}`);
      } else {
        recordResult('Create Product (Admin)', false, `Status: ${res.status}, Msg: ${data.message}`);
      }
    } catch (err) {
      recordResult('Create Product (Admin)', false, err.message);
    }

    // -------------------------------------------------------------
    // Test 9: Get Products list with Search/Filters
    // -------------------------------------------------------------
    try {
      const res = await fetch(`${BASE_URL}/products?search=Smartphone&priceMin=100&priceMax=1000&category=${categorySlug}`);
      const data = await res.json();
      if (res.status === 200 && data.success && data.data.products.length > 0) {
        recordResult('Get Products list with Filters', true, `Count: ${data.data.products.length}`);
      } else {
        recordResult('Get Products list with Filters', false, `Status: ${res.status}, Count: ${data.data?.products?.length}`);
      }
    } catch (err) {
      recordResult('Get Products list with Filters', false, err.message);
    }

    // -------------------------------------------------------------
    // Test 10: Get Product by Slug
    // -------------------------------------------------------------
    try {
      const res = await fetch(`${BASE_URL}/products/${productSlug}`);
      const data = await res.json();
      if (res.status === 200 && data.success && data.data._id === productId) {
        recordResult('Get Product by Slug', true);
      } else {
        recordResult('Get Product by Slug', false, `Status: ${res.status}`);
      }
    } catch (err) {
      recordResult('Get Product by Slug', false, err.message);
    }

    // -------------------------------------------------------------
    // Test 11: Add to Cart
    // -------------------------------------------------------------
    try {
      const res = await fetch(`${BASE_URL}/cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          productId,
          quantity: 2
        })
      });
      const data = await res.json();
      if (res.status === 200 && data.success && data.data.products.length > 0) {
        recordResult('Add product to Cart', true, `Items count: ${data.data.products.length}, Price: ${data.data.totalPrice}`);
      } else {
        recordResult('Add product to Cart', false, `Status: ${res.status}, Msg: ${data.message}`);
      }
    } catch (err) {
      recordResult('Add product to Cart', false, err.message);
    }

    // -------------------------------------------------------------
    // Test 12: Update Cart Item Quantity
    // -------------------------------------------------------------
    try {
      const res = await fetch(`${BASE_URL}/cart`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          productId,
          quantity: 3
        })
      });
      const data = await res.json();
      if (res.status === 200 && data.success && data.data.products[0].quantity === 3) {
        recordResult('Update Cart Item Quantity', true, `New Quantity: ${data.data.products[0].quantity}`);
      } else {
        recordResult('Update Cart Item Quantity', false, `Status: ${res.status}, Msg: ${data.message}`);
      }
    } catch (err) {
      recordResult('Update Cart Item Quantity', false, err.message);
    }

    // -------------------------------------------------------------
    // Test 13: Add Product to Wishlist & Retrieve (VERIFY WISH LIST BUG FIX!)
    // -------------------------------------------------------------
    try {
      const addRes = await fetch(`${BASE_URL}/wishlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({ productId })
      });
      
      const getRes = await fetch(`${BASE_URL}/wishlist`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      const getData = await getRes.json();
      
      if (getRes.status === 200 && getData.success && getData.data.products.length > 0) {
        const item = getData.data.products[0];
        if (item.status === 'active' && item.title === 'Super Smartphone') {
          recordResult('Wishlist Bug Fix Verification', true, 'Product active status preserved, list not deleted');
        } else {
          recordResult('Wishlist Bug Fix Verification', false, `Product missing status. item: ${JSON.stringify(item)}`);
        }
      } else {
        recordResult('Wishlist Bug Fix Verification', false, `Status: ${getRes.status}, products: ${getData.data?.products?.length}`);
      }
    } catch (err) {
      recordResult('Wishlist Bug Fix Verification', false, err.message);
    }

    // -------------------------------------------------------------
    // Test 14: Create Shipping Address
    // -------------------------------------------------------------
    let addressId = '';
    try {
      const res = await fetch(`${BASE_URL}/addresses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          fullName: 'John Doe',
          mobile: '9123456789',
          city: 'Bangalore',
          state: 'Karnataka',
          country: 'India',
          pincode: '560001'
        })
      });
      const data = await res.json();
      if (res.status === 201 && data.success) {
        addressId = data.data._id;
        recordResult('Create Shipping Address', true, `ID: ${addressId}`);
      } else {
        recordResult('Create Shipping Address', false, `Status: ${res.status}, Msg: ${data.message}`);
      }
    } catch (err) {
      recordResult('Create Shipping Address', false, err.message);
    }

    // -------------------------------------------------------------
    // Test 15: Create Coupon (Admin)
    // -------------------------------------------------------------
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const res = await fetch(`${BASE_URL}/admin/coupons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          code: 'SALE20',
          discount: 20,
          expiryDate: tomorrow,
          active: true
        })
      });
      const data = await res.json();
      if (res.status === 201 && data.success) {
        recordResult('Create Discount Coupon (Admin)', true);
      } else {
        recordResult('Create Discount Coupon (Admin)', false, `Status: ${res.status}, Msg: ${data.message}`);
      }
    } catch (err) {
      recordResult('Create Discount Coupon (Admin)', false, err.message);
    }

    // -------------------------------------------------------------
    // Test 16: Apply Coupon (User)
    // -------------------------------------------------------------
    try {
      const res = await fetch(`${BASE_URL}/orders/apply-coupon`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          couponCode: 'SALE20',
          cartAmount: 1000
        })
      });
      const data = await res.json();
      if (res.status === 200 && data.success && data.data.discountAmount === 200) {
        recordResult('Apply Coupon Code', true, `Discounted: ${data.data.finalAmount}`);
      } else {
        recordResult('Apply Coupon Code', false, `Status: ${res.status}, Msg: ${data.message}`);
      }
    } catch (err) {
      recordResult('Apply Coupon Code', false, err.message);
    }

    // -------------------------------------------------------------
    // Test 17: Place Order (User Checkout)
    // -------------------------------------------------------------
    let orderId = '';
    try {
      const res = await fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          shippingAddressId: addressId,
          paymentMethod: 'COD',
          couponCode: 'SALE20'
        })
      });
      const data = await res.json();
      if (res.status === 201 && data.success) {
        orderId = data.data._id;
        recordResult('Place Order', true, `Order ID: ${orderId}, Total: ${data.data.totalAmount}`);
        
        // Check if stock has decremented in DB (started with 50, user ordered 3, should be 47)
        const updatedProduct = await Product.findById(productId);
        if (updatedProduct.stock === 47) {
          recordResult('Order Stock Level Decrement', true, `Stock left: ${updatedProduct.stock}`);
        } else {
          recordResult('Order Stock Level Decrement', false, `Expected 47, got ${updatedProduct.stock}`);
        }
      } else {
        recordResult('Place Order', false, `Status: ${res.status}, Msg: ${data.message}`);
      }
    } catch (err) {
      recordResult('Place Order', false, err.message);
    }

    // -------------------------------------------------------------
    // Test 18: Get User Order History
    // -------------------------------------------------------------
    try {
      const res = await fetch(`${BASE_URL}/orders`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      const data = await res.json();
      if (res.status === 200 && data.success && data.data.length > 0) {
        recordResult('Get Order History', true);
      } else {
        recordResult('Get Order History', false, `Status: ${res.status}`);
      }
    } catch (err) {
      recordResult('Get Order History', false, err.message);
    }

    // -------------------------------------------------------------
    // Test 19: Create Review
    // -------------------------------------------------------------
    try {
      const res = await fetch(`${BASE_URL}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          productId,
          rating: 5,
          comment: 'Fantastic phone! High speed performance.'
        })
      });
      const data = await res.json();
      if (res.status === 201 && data.success) {
        recordResult('Create Product Review', true);
        
        // Verify average rating update
        const reviewedProduct = await Product.findById(productId);
        if (reviewedProduct.ratings === 5) {
          recordResult('Product Ratings Recalculation', true, `Avg Rating: ${reviewedProduct.ratings}`);
        } else {
          recordResult('Product Ratings Recalculation', false, `Avg Rating: ${reviewedProduct.ratings}`);
        }
      } else {
        recordResult('Create Product Review', false, `Status: ${res.status}, Msg: ${data.message}`);
      }
    } catch (err) {
      recordResult('Create Product Review', false, err.message);
    }

    // -------------------------------------------------------------
    // Test 20: Retrieve Product Reviews
    // -------------------------------------------------------------
    try {
      const res = await fetch(`${BASE_URL}/reviews/product/${productId}`);
      const data = await res.json();
      if (res.status === 200 && data.success && data.data.length > 0) {
        recordResult('Get Product Reviews List', true, `Count: ${data.data.length}`);
      } else {
        recordResult('Get Product Reviews List', false, `Status: ${res.status}`);
      }
    } catch (err) {
      recordResult('Get Product Reviews List', false, err.message);
    }

    // -------------------------------------------------------------
    // Test 21: Admin Dashboard stats
    // -------------------------------------------------------------
    try {
      const res = await fetch(`${BASE_URL}/admin/dashboard`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const data = await res.json();
      if (res.status === 200 && data.success) {
        recordResult('Get Admin Dashboard Stats', true, `Users: ${data.data.totalUsers}, Orders: ${data.data.totalOrders}`);
      } else {
        recordResult('Get Admin Dashboard Stats', false, `Status: ${res.status}`);
      }
    } catch (err) {
      recordResult('Get Admin Dashboard Stats', false, err.message);
    }

    // -------------------------------------------------------------
    // Test 22: Block & Unblock User (Admin Action)
    // -------------------------------------------------------------
    try {
      const blockRes = await fetch(`${BASE_URL}/admin/users/${userId}/block`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const blockData = await blockRes.json();
      
      const unblockRes = await fetch(`${BASE_URL}/admin/users/${userId}/unblock`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const unblockData = await unblockRes.json();

      if (blockRes.status === 200 && blockData.data.status === 'blocked' && unblockRes.status === 200 && unblockData.data.status === 'active') {
        recordResult('Admin Block/Unblock User', true);
      } else {
        recordResult('Admin Block/Unblock User', false, `Block status: ${blockRes.status}, Unblock status: ${unblockRes.status}`);
      }
    } catch (err) {
      recordResult('Admin Block/Unblock User', false, err.message);
    }

    // -------------------------------------------------------------
    // Test 23: Razorpay Payment Flow (Mock Sandbox Simulation)
    // -------------------------------------------------------------
    try {
      // 1. Add item to cart
      await fetch(`${BASE_URL}/cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({ productId, quantity: 1 })
      });

      // 2. Checkout order using Razorpay payment method
      const checkoutRes = await fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          shippingAddressId: addressId,
          paymentMethod: 'Razorpay'
        })
      });
      const checkoutData = await checkoutRes.json();
      const rzpOrderId = checkoutData.data._id;

      // 3. Verify order created with paymentStatus 'pending'
      const initialOrder = await Order.findById(rzpOrderId);
      const isInitiallyPending = initialOrder && initialOrder.paymentStatus === 'pending';

      // 4. Create Razorpay Gateway order session
      const createSessionRes = await fetch(`${BASE_URL}/payments/razorpay/order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({ orderId: rzpOrderId })
      });
      const sessionData = await createSessionRes.json();
      const mockRzpOrderId = sessionData.data.rzpOrderId;

      // 5. Verify the payment
      const verifyRes = await fetch(`${BASE_URL}/payments/razorpay/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          orderId: rzpOrderId,
          razorpayOrderId: mockRzpOrderId,
          razorpayPaymentId: 'pay_mock_test_12345',
          razorpaySignature: 'mock_signature_hash',
          isMock: true
        })
      });
      const verifyData = await verifyRes.json();

      // 6. Verify order updated to 'paid' in DB
      const paidOrder = await Order.findById(rzpOrderId);
      const isPaid = paidOrder && paidOrder.paymentStatus === 'paid';

      if (
        checkoutRes.status === 201 &&
        isInitiallyPending &&
        createSessionRes.status === 200 &&
        sessionData.data.isMock &&
        verifyRes.status === 200 &&
        isPaid
      ) {
        recordResult('Razorpay E2E Payment Flow & Verification', true, 'Order paymentStatus initializes as pending and updates to paid on success');
      } else {
        recordResult(
          'Razorpay E2E Payment Flow & Verification',
          false,
          `Initial pending: ${isInitiallyPending}, Mock session: ${sessionData.data?.isMock}, Paid status: ${isPaid}`
        );
      }
    } catch (err) {
      recordResult('Razorpay E2E Payment Flow & Verification', false, err.message);
    }

  } finally {
    // Shutdown server and connection
    console.log('Shutting down test server and DB connections...');
    server.close(() => {
      console.log('Server stopped.');
    });
    await mongoose.connection.close();
    console.log('Database connection closed.');
    
    // Save report to disk
    console.log('=== E2E Test Run Completed ===');
    const passedCount = testResults.filter(t => t.passed).length;
    console.log(`Total Passed: ${passedCount} / ${testResults.length}`);
    process.exit(passedCount === testResults.length ? 0 : 1);
  }
}

runTests().catch(err => {
  console.error('Fatal Test Suite Error:', err);
  process.exit(1);
});
