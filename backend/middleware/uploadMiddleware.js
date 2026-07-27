import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure standard uploads subdirectories exist
const ensureDirExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Configure disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'uploads';
    
    // Dynamically choose subfolder based on the route or request path
    if (
      req.baseUrl.includes('users') || 
      req.path.includes('avatar') || 
      req.path.includes('profile') || 
      req.path.includes('users')
    ) {
      folder = 'uploads/users';
    } else if (
      req.baseUrl.includes('products') || 
      req.path.includes('products')
    ) {
      folder = 'uploads/products';
    } else if (
      req.baseUrl.includes('categories') || 
      req.path.includes('categories')
    ) {
      folder = 'uploads/categories';
    }
    
    ensureDirExists(folder);
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// File type validation (images only)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    return cb(new Error('Invalid file type! Only image files (jpeg, jpg, png, webp, gif) are allowed.'), false);
  }
};

const limitSize = parseInt(process.env.UPLOAD_LIMIT_SIZE) || 5 * 1024 * 1024; // Default 5MB

export const upload = multer({
  storage,
  limits: { fileSize: limitSize },
  fileFilter
});
