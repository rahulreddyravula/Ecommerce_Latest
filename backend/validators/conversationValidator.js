import { body, param } from 'express-validator';
import { validateRequest } from '../middleware/validationMiddleware.js';

export const validateRoomIdParam = [
  param('roomId')
    .notEmpty()
    .withMessage('Room ID parameter is required')
    .trim(),
  validateRequest
];

export const validateNewMessage = [
  body('roomId')
    .notEmpty()
    .withMessage('Room ID is required')
    .trim(),
  
  body('sender')
    .notEmpty()
    .withMessage('Sender ID is required')
    .isMongoId()
    .withMessage('Sender ID must be a valid MongoDB ID'),
  
  body('senderName')
    .trim()
    .notEmpty()
    .withMessage('Sender Name is required'),
  
  body('text')
    .trim()
    .notEmpty()
    .withMessage('Message text is required'),
    
  validateRequest
];
