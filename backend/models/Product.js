import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Product title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price must be a positive number']
    },
    discountPrice: {
      type: Number,
      default: 0,
      validate: {
        validator: function (value) {
          // Handle cases where discountPrice is checked
          return value === 0 || value <= this.price;
        },
        message: 'Discount price must be less than or equal to original price'
      }
    },
    stock: {
      type: Number,
      required: [true, 'Product stock quantity is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0
    },
    SKU: {
      type: String,
      required: [true, 'Product SKU is required'],
      unique: true,
      trim: true
    },
    images: {
      type: [String],
      default: []
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Product category is required']
    },
    brand: {
      type: String,
      required: [true, 'Brand is required'],
      trim: true
    },
    ratings: {
      type: Number,
      default: 0,
      min: [0, 'Ratings must be at least 0'],
      max: [5, 'Ratings cannot exceed 5']
    },
    reviews: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Review'
      }
    ],
    featured: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'inactive'],
        message: 'Status must be active or inactive'
      },
      default: 'active'
    }
  },
  {
    timestamps: true
  }
);

// Create compound index for search efficiency
productSchema.index({ title: 'text', description: 'text', brand: 'text' });

// Auto-generate slug before saving
productSchema.pre('save', function (next) {
  if (this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

const Product = mongoose.model('Product', productSchema);
export default Product;
