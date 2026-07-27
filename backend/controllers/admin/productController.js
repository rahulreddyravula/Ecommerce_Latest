import Product from '../../models/Product.js';
import Category from '../../models/Category.js';
import ErrorResponse from '../../utils/errorResponse.js';
import { sendSuccess } from '../../utils/responseFormatter.js';
import { deleteFile } from '../../utils/fileHelper.js';


/**
 * @desc    Create a product
 * @route   POST /api/v1/admin/products
 * @access  Private/Admin
 */
export const createProduct = async (req, res, next) => {
  try {
    const {
      title,
      description,
      price,
      discountPrice,
      stock,
      SKU,
      category,
      brand,
      featured,
      status
    } = req.body;

    // Check SKU uniqueness
    const skuExists = await Product.findOne({ SKU });
    if (skuExists) {
      return next(new ErrorResponse('Product SKU already exists', 400));
    }

    // Verify Category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return next(new ErrorResponse('Invalid category ID. Category does not exist.', 400));
    }

    // Handle multiple image uploads
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map((file) => file.path.replace(/\\/g, '/'));
    }

    const product = await Product.create({
      title,
      description,
      price,
      discountPrice: discountPrice || 0,
      stock: stock || 0,
      SKU,
      category,
      brand,
      images,
      featured: featured === 'true' || featured === true,
      status: status || 'active'
    });

    return sendSuccess(res, product, 'Product created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a product
 * @route   PUT /api/v1/admin/products/:id
 * @access  Private/Admin
 */
export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      price,
      discountPrice,
      stock,
      SKU,
      category,
      brand,
      featured,
      status,
      removeImages // Expecting array of image paths to remove
    } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return next(new ErrorResponse('Product not found', 404));
    }

    if (SKU && SKU !== product.SKU) {
      const skuExists = await Product.findOne({ SKU });
      if (skuExists) {
        return next(new ErrorResponse('Product SKU already exists', 400));
      }
      product.SKU = SKU;
    }

    if (category) {
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return next(new ErrorResponse('Category does not exist', 400));
      }
      product.category = category;
    }

    if (title) product.title = title;
    if (description) product.description = description;
    if (price !== undefined) product.price = Number(price);
    if (discountPrice !== undefined) product.discountPrice = Number(discountPrice);
    if (stock !== undefined) product.stock = Number(stock);
    if (brand) product.brand = brand;
    if (featured !== undefined) product.featured = featured === 'true' || featured === true;
    if (status) product.status = status;

    // Handle image removal if specified
    if (removeImages) {
      const imagesToRemove = Array.isArray(removeImages) ? removeImages : [removeImages];
      for (const img of imagesToRemove) {
        await deleteFile(img);
      }
      product.images = product.images.filter((img) => !imagesToRemove.includes(img));
    }

    // Handle new uploads (append to existing product images)
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file) => file.path.replace(/\\/g, '/'));
      product.images = [...product.images, ...newImages];
    }

    await product.save();

    return sendSuccess(res, product, 'Product updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a product
 * @route   DELETE /api/v1/admin/products/:id
 * @access  Private/Admin
 */
export const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return next(new ErrorResponse('Product not found', 404));
    }

    // Delete all product images from disk
    if (product.images && product.images.length > 0) {
      for (const img of product.images) {
        await deleteFile(img);
      }
    }

    await Product.findByIdAndDelete(id);

    return sendSuccess(res, {}, 'Product deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Upload multiple product images separately
 * @route   POST /api/v1/admin/products/:id/images
 * @access  Private/Admin
 */
export const uploadProductImages = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!req.files || req.files.length === 0) {
      return next(new ErrorResponse('Please upload files', 400));
    }

    const product = await Product.findById(id);
    if (!product) {
      return next(new ErrorResponse('Product not found', 404));
    }

    const uploadedPaths = req.files.map(file => file.path.replace(/\\/g, '/'));
    product.images = [...product.images, ...uploadedPaths];
    await product.save();

    return sendSuccess(res, { images: product.images }, 'Product images uploaded successfully');
  } catch (error) {
    next(error);
  }
};
