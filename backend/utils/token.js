import jwt from 'jsonwebtoken';

export const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role }, 
    process.env.JWT_SECRET, 
    { expiresIn: process.env.JWT_EXPIRE || '15m' } // 15 minutes short-lived token
  );
};

export const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id }, 
    process.env.JWT_REFRESH_SECRET, 
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
};
