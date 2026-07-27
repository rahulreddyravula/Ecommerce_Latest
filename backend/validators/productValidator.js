import { body } from 'express-validator';
import { validateRequest } from '../middleware/validationMiddleware.js';

export const validateProduct = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Product title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Product description is required'),
  
  body('price')
    .notEmpty()
    .withMessage('Product price is required')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  
  body('discountPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Discount price must be a positive number')
    .custom((value, { req }) => {
      if (value && Number(value) > Number(req.body.price)) {
        throw new Error('Discount price must be less than or equal to original price');
      }
      return true;
    }),
  
  body('stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer'),
  
  body('SKU')
    .trim()
    .notEmpty()
    .withMessage('Product SKU is required'),
  
  body('category')
    .notEmpty()
    .withMessage('Product category ID is required')
    .isMongoId()
    .withMessage('Category must be a valid MongoDB ID'),
  
  body('brand')
    .trim()
    .notEmpty()
    .withMessage('Product brand is required'),
    
  validateRequest
];
