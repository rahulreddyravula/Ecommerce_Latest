import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Address must belong to a user']
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid mobile number']
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      trim: true
    }
  },
  {
    timestamps: true
  }
);

const Address = mongoose.model('Address', addressSchema);
export default Address;
