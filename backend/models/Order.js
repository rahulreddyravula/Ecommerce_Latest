import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Order must belong to a user']
    },
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, 'Quantity must be at least 1']
        },
        price: {
          type: Number,
          required: true
        }
      }
    ],
    shippingAddress: {
      fullName: { type: String, required: true },
      mobile: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      country: { type: String, required: true },
      pincode: { type: String, required: true }
    },
    paymentMethod: {
      type: String,
      required: [true, 'Payment method is required'],
      enum: {
        values: ['COD', 'Card', 'PayPal', 'UPI', 'Razorpay'],
        message: 'Payment method must be COD, Card, PayPal, UPI, or Razorpay'
      },
      default: 'COD'
    },
    paymentStatus: {
      type: String,
      required: true,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending'
    },
    orderStatus: {
      type: String,
      required: true,
      enum: ['placed', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'placed'
    },
    totalAmount: {
      type: Number,
      required: true,
      min: [0, 'Total amount cannot be negative']
    },
    transactionId: {
      type: String,
      default: ''
    },
    paymentDetails: {
      type: Object,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

const Order = mongoose.model('Order', orderSchema);
export default Order;
