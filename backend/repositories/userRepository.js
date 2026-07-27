import User from '../models/User.js';

/**
 * Finds a user by their registered mobile number.
 */
export const findUserByPhone = async (phone) => {
  return await User.findOne({ phone });
};

/**
 * Finds a user by their ID.
 */
export const findUserById = async (id) => {
  return await User.findById(id);
};

/**
 * Creates a new user record in the database.
 */
export const createUser = async (userData) => {
  return await User.create(userData);
};
