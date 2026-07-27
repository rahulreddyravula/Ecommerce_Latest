import { body } from 'express-validator';
import { validateRequest } from '../middleware/validationMiddleware.js';

export const validateRegister = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s.-]+$/)
    .withMessage('Name contains invalid characters'),
  
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(), // Sanitizes email
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 12 })
    .withMessage('Password must be at least 12 characters long')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/\d/)
    .withMessage('Password must contain at least one digit')
    .matches(/[@$!%*?&#]/)
    .withMessage('Password must contain at least one special character (@, $, !, %, *, ?, &, #)'),
  
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please enter a valid phone number in international E.164 format'),
    
  body('botToken')
    .if(() => process.env.NODE_ENV === 'production')
    .notEmpty()
    .withMessage('Bot protection security verification is required'),
    
  validateRequest
];

export const validateLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
    
  body('botToken')
    .if(() => process.env.NODE_ENV === 'production')
    .notEmpty()
    .withMessage('Bot protection security verification is required'),
    
  validateRequest
];

export const validateSendOtp = [
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please enter a valid phone number in E.164 format'),
    
  validateRequest
];

export const validateVerifyOtp = [
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please enter a valid phone number in E.164 format'),
  body('otp')
    .trim()
    .notEmpty()
    .withMessage('OTP is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be exactly 6 digits')
    .isNumeric()
    .withMessage('OTP must be numeric'),
    
  validateRequest
];

