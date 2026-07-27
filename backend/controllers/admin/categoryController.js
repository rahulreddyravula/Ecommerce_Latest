import Category from '../../models/Category.js';
import ErrorResponse from '../../utils/errorResponse.js';
import { sendSuccess } from '../../utils/responseFormatter.js';
import { deleteFile } from '../../utils/fileHelper.js';
import mongoose from 'mongoose';

/**
 * @desc    Create a new category
 * @route   POST /api/v1/admin/categories
 * @access  Private/Admin
 */
export const createCategory = async (req, res, next) => {
  try {
    const { name, description, parent } = req.body;

    if (!name) {
      return next(new ErrorResponse('Category name is required', 400));
    }

    // Check if category name exists
    const categoryExists = await Category.findOne({ name });
    if (categoryExists) {
      return next(new ErrorResponse('Category with this name already exists', 400));
    }

    let parentId = null;
    if (parent && parent !== '' && parent !== 'null') {
      if (!mongoose.Types.ObjectId.isValid(parent)) {
        return next(new ErrorResponse('Invalid parent category ID', 400));
      }
      const parentCategory = await Category.findById(parent);
      if (!parentCategory) {
        return next(new ErrorResponse('Parent category not found', 404));
      }
      parentId = parent;
    }

    let image = '';
    if (req.file) {
      image = req.file.path.replace(/\\/g, '/');
    }

    const category = await Category.create({
      name,
      description,
      parent: parentId,
      image
    });

    const populatedCategory = await Category.findById(category._id).populate('parent', 'name slug');
    return sendSuccess(res, populatedCategory, 'Category created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all categories
 * @route   GET /api/v1/categories
 * @access  Public
 */
export const getCategories = async (req, res, next) => {
  try {
    const filter = {};
    if (!req.user || req.user.role !== 'Admin') {
      filter.status = 'active';
    }

    const categories = await Category.find(filter)
      .populate('parent', 'name slug')
      .sort({ name: 1 });
    return sendSuccess(res, categories, 'Categories retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single category by slug
 * @route   GET /api/v1/categories/:slug
 * @access  Public
 */
export const getCategoryBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const category = await Category.findOne({ slug }).populate('parent', 'name slug');

    if (!category) {
      return next(new ErrorResponse('Category not found', 404));
    }

    return sendSuccess(res, category, 'Category retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update category
 * @route   PUT /api/v1/admin/categories/:id
 * @access  Private/Admin
 */
export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, status, parent } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      return next(new ErrorResponse('Category not found', 404));
    }

    if (name) {
      // Check if name is taken by other category
      const nameExists = await Category.findOne({ name, _id: { $ne: id } });
      if (nameExists) {
        return next(new ErrorResponse('Category with this name already exists', 400));
      }
      category.name = name;
    }

    if (description !== undefined) category.description = description;
    if (status !== undefined) category.status = status;

    if (parent !== undefined) {
      if (parent === '' || parent === 'null' || parent === null) {
        category.parent = null;
      } else {
        if (!mongoose.Types.ObjectId.isValid(parent)) {
          return next(new ErrorResponse('Invalid parent category ID', 400));
        }
        if (parent.toString() === id.toString()) {
          return next(new ErrorResponse('A category cannot be its own parent', 400));
        }
        
        const parentCategory = await Category.findById(parent);
        if (!parentCategory) {
          return next(new ErrorResponse('Parent category not found', 404));
        }

        // Cycle check: check if the new parent is currently a descendant of this category
        const isDescendant = async (parentId, childId) => {
          let currentParentId = parentId;
          while (currentParentId) {
            if (currentParentId.toString() === childId.toString()) {
              return true;
            }
            const parentCat = await Category.findById(currentParentId);
            currentParentId = parentCat ? parentCat.parent : null;
          }
          return false;
        };

        if (await isDescendant(parent, id)) {
          return next(new ErrorResponse('Circular category nesting is not allowed', 400));
        }

        category.parent = parent;
      }
    }

    if (req.file) {
      // Delete old category image from disk if it exists
      if (category.image) {
        await deleteFile(category.image);
      }
      category.image = req.file.path.replace(/\\/g, '/');
    }

    await category.save();

    const populatedCategory = await Category.findById(category._id).populate('parent', 'name slug');
    return sendSuccess(res, populatedCategory, 'Category updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete category
 * @route   DELETE /api/v1/admin/categories/:id
 * @access  Private/Admin
 */
export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);

    if (!category) {
      return next(new ErrorResponse('Category not found', 404));
    }

    // Delete category image from disk if it exists
    if (category.image) {
      await deleteFile(category.image);
    }

    // Re-route children pointing to this category to its parent (or null)
    await Category.updateMany(
      { parent: id },
      { parent: category.parent || null }
    );

    await Category.findByIdAndDelete(id);

    return sendSuccess(res, {}, 'Category deleted successfully');
  } catch (error) {
    next(error);
  }
};

