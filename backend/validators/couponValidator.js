import { body } from 'express-validator';
import { validateRequest } from '../middleware/validationMiddleware.js';

export const validateCoupon = [
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Coupon code is required')
    .isLength({ min: 3, max: 15 })
    .withMessage('Coupon code must be between 3 and 15 characters'),
  
  body('discount')
    .notEmpty()
    .withMessage('Discount is required')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Discount must be a number between 0 and 100'),
  
  body('expiryDate')
    .notEmpty()
    .withMessage('Expiry date is required')
    .isISO8601()
    .withMessage('Expiry date must be a valid ISO8601 date string'),
    
  validateRequest
];
