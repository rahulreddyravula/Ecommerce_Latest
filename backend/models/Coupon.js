import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      minlength: [3, 'Coupon code must be at least 3 characters'],
      maxlength: [15, 'Coupon code cannot exceed 15 characters']
    },
    discount: {
      type: Number,
      required: [true, 'Discount percentage is required'],
      min: [0, 'Discount percentage cannot be less than 0'],
      max: [100, 'Discount percentage cannot exceed 100']
    },
    expiryDate: {
      type: Date,
      required: [true, 'Expiry date is required']
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Method to verify if a coupon is valid
couponSchema.methods.isValid = function () {
  return this.active && this.expiryDate > new Date();
};

const Coupon = mongoose.model('Coupon', couponSchema);
export default Coupon;
