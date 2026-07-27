import { body } from 'express-validator';
import { validateRequest } from '../middleware/validationMiddleware.js';

export const validateAddress = [
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required'),
  
  body('mobile')
    .trim()
    .notEmpty()
    .withMessage('Mobile number is required')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please enter a valid mobile number'),
  
  body('city')
    .trim()
    .notEmpty()
    .withMessage('City is required'),
  
  body('state')
    .trim()
    .notEmpty()
    .withMessage('State is required'),
  
  body('country')
    .trim()
    .notEmpty()
    .withMessage('Country is required'),
  
  body('pincode')
    .trim()
    .notEmpty()
    .withMessage('Pincode is required'),
    
  validateRequest
];
