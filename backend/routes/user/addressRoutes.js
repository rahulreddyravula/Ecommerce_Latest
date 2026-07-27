import express from 'express';
import {
  getAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress
} from '../../controllers/user/addressController.js';
import { validateAddress } from '../../validators/addressValidator.js';
import { protect } from '../../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication middleware to all address routes
router.use(protect);

router.route('/')
  .get(getAddresses)
  .post(validateAddress, createAddress);

router.route('/:id')
  .get(getAddressById)
  .put(validateAddress, updateAddress)
  .delete(deleteAddress);

export default router;
