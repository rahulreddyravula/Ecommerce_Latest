import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import ErrorResponse from '../utils/errorResponse.js';

// Protect routes - Verify JWT
export const protect = async (req, res, next) => {
  let token;

  // Check Authorization header for Bearer token
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the database
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return next(new ErrorResponse('Not authorized, user not found', 401));
      }

      if (req.user.status === 'blocked') {
        return next(new ErrorResponse('Your account is blocked. Contact support.', 403));
      }

      if (!req.user.isVerified) {
        const path = req.originalUrl.split('?')[0];
        const isProfileOrLogout = path.startsWith('/api/v1/auth/profile') || 
                                  path.startsWith('/api/v1/auth/logout');
        
        if (!isProfileOrLogout) {
          return next(new ErrorResponse('Please verify your email address to access this resource.', 401));
        }
      }

      next();
    } catch (error) {
      return next(error); // central error handler will format TokenExpired / Invalid tokens
    }
  }

  if (!token) {
    return next(new ErrorResponse('Not authorized, no token provided', 401));
  }
};

// Grant access to specific roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorResponse('Not authorized, session missing', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `User role '${req.user.role}' is not authorized to access this route`,
          403
        )
      );
    }
    next();
  };
};
