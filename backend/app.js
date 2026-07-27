import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

// Utility & Middleware imports
import errorHandler from './middleware/errorHandler.js';
import ErrorResponse from './utils/errorResponse.js';

// Route imports
import authRoutes from './routes/user/authRoutes.js';
import categoryUserRoutes from './routes/user/categoryRoutes.js';
import categoryAdminRoutes from './routes/admin/categoryRoutes.js';
import productUserRoutes from './routes/user/productRoutes.js';
import productAdminRoutes from './routes/admin/productRoutes.js';
import cartRoutes from './routes/user/cartRoutes.js';
import wishlistRoutes from './routes/user/wishlistRoutes.js';
import addressRoutes from './routes/user/addressRoutes.js';
import orderUserRoutes from './routes/user/orderRoutes.js';
import orderAdminRoutes from './routes/admin/orderRoutes.js';
import couponAdminRoutes from './routes/admin/couponRoutes.js';
import reviewRoutes from './routes/user/reviewRoutes.js';
import adminRoutes from './routes/admin/adminRoutes.js';
import chatRoutes from './routes/user/chatRoutes.js';
import conversationRoutes from './routes/user/conversationRoutes.js';
import paymentRoutes from './routes/user/paymentRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 1. Security Headers
app.use(helmet());

// 2. CORS setup
app.use(cors({
  origin: '*', // Allow all origins for local testing, can customize in prod
  credentials: true
}));

// 3. Request Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// 4. Body parsers & Cookie parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 5. Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// 6. Response compression
app.use(compression());

// 7. Rate Limiter (Prevent brute force / spam requests)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per window
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', apiLimiter);

// Disable caching for all API endpoints to prevent browser-side caching of private data
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  next();
});

// 8. Serve static folders (uploads, public assets)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// 9. API Routes registration
app.use('/api/auth', authRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/categories', categoryUserRoutes);
app.use('/api/v1/admin/categories', categoryAdminRoutes);
app.use('/api/v1/products', productUserRoutes);
app.use('/api/v1/admin/products', productAdminRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/wishlist', wishlistRoutes);
app.use('/api/v1/addresses', addressRoutes);
app.use('/api/v1/orders', orderUserRoutes);
app.use('/api/v1/admin/orders', orderAdminRoutes);
app.use('/api/v1/admin/coupons', couponAdminRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/conversation', conversationRoutes);
app.use('/api/v1/conversation', conversationRoutes);
app.use('/api/v1/payments', paymentRoutes);

// 10. Default Route / Base check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'eCommerce RESTful Backend API is running smoothly.'
  });
});

// 11. Catch-all for Not Found (404) routes
app.use('*', (req, res, next) => {
  next(new ErrorResponse(`Route not found: ${req.originalUrl}`, 404));
});

// 12. Centralized Error Handler (Must be registered last)
app.use(errorHandler);

export default app;
