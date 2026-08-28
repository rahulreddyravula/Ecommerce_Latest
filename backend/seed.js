import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import Category from './models/Category.js';
import Product from './models/Product.js';
import Coupon from './models/Coupon.js';
import Review from './models/Review.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

const slugify = (text) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const categoriesData = [
  {
    name: 'Electronics',
    slug: slugify('Electronics'),
    description: 'High-end smart devices, headphones, and workspace essentials.',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80',
    status: 'active'
  },
  {
    name: 'Apparel',
    slug: slugify('Apparel'),
    description: 'Comfortable clothing, streetwear, and active jackets.',
    image: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=500&q=80',
    status: 'active'
  },
  {
    name: 'Home & Office',
    slug: slugify('Home & Office'),
    description: 'Ergonomic seating, minimal desks, and desk lighting.',
    image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=500&q=80',
    status: 'active'
  },
  {
    name: 'Accessories',
    slug: slugify('Accessories'),
    description: 'Leather wallets, backpacks, and mechanical watch straps.',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80',
    status: 'active'
  }
];

const productsData = (categoryIds) => [
  {
    title: 'AeroGlide ANC Wireless Headphones',
    slug: slugify('AeroGlide ANC Wireless Headphones'),
    description: 'Immersive sound meets premium comfort. Features dual hybrid Active Noise Cancelling, spatial audio, and an astonishing 40-hour battery life. Hand-tuned 40mm drivers deliver rich bass and crystal clear trebles.',
    price: 299,
    discountPrice: 249,
    stock: 25,
    SKU: 'EL-AG-091',
    images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80'],
    category: categoryIds['Electronics'],
    brand: 'AeroSound',
    ratings: 4.8,
    featured: true
  },
  {
    title: 'KeyChron K8 Pro Mechanical Keyboard',
    slug: slugify('KeyChron K8 Pro Mechanical Keyboard'),
    description: 'QMK/VIA wireless mechanical keyboard with hot-swappable tactile switches, double-shot PBT keycaps, and pre-lubed Gateron Pro Brown switches. Perfect for professional developers and gamers alike.',
    price: 139,
    discountPrice: 119,
    stock: 12,
    SKU: 'EL-KC-K8P',
    images: ['https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80'],
    category: categoryIds['Electronics'],
    brand: 'KeyChron',
    ratings: 4.9,
    featured: true
  },
  {
    title: 'Minimalist Merino Wool Hoodie',
    slug: slugify('Minimalist Merino Wool Hoodie'),
    description: 'Crafted from 100% sustainably sourced Merino wool. Excellent thermal regulation, odor resistance, and an athletic, tailored fit. Designed to handle cold mornings and long flights with equal comfort.',
    price: 110,
    discountPrice: 95,
    stock: 50,
    SKU: 'AP-MW-HOOD',
    images: ['https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80'],
    category: categoryIds['Apparel'],
    brand: 'VibeThreads',
    ratings: 4.5,
    featured: false
  },
  {
    title: 'Ergonomic Mesh Task Chair',
    slug: slugify('Ergonomic Mesh Task Chair'),
    description: 'Designed for standard 8+ hour workdays. Provides custom 3D lumbar support, adjustable dynamic armrests, breathable tension mesh backrest, and tilt tension controls for ultimate posture control.',
    price: 499,
    discountPrice: 420,
    stock: 8,
    SKU: 'HO-ER-MESH',
    images: ['https://images.unsplash.com/photo-1580481072645-022f9a6dbf27?w=800&q=80'],
    category: categoryIds['Home & Office'],
    brand: 'ErgoForm',
    ratings: 4.7,
    featured: true
  },
  {
    title: 'TechPack Weatherproof Backpack',
    slug: slugify('TechPack Weatherproof Backpack'),
    description: 'Constructed using heavy-duty 840D ballistic nylon with water-resistant zippers. Features a dedicated suspended laptop compartment for up to 16" devices, plus hidden RFID passport pockets.',
    price: 150,
    discountPrice: 0,
    stock: 30,
    SKU: 'AC-TP-WEAR',
    images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80'],
    category: categoryIds['Accessories'],
    brand: 'TechPack',
    ratings: 4.6,
    featured: true
  },
  {
    title: 'Vibe Fit Smartwatch Series X',
    slug: slugify('Vibe Fit Smartwatch Series X'),
    description: 'Advanced sports tracker with bright AMOLED display, continuous blood oxygen tracking, heart rate alarms, offline GPS navigation, and up to 12 days of battery in standard smart watch mode.',
    price: 199,
    discountPrice: 169,
    stock: 18,
    SKU: 'EL-VF-SMART',
    images: ['https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&q=80'],
    category: categoryIds['Electronics'],
    brand: 'VibeWear',
    ratings: 4.4,
    featured: false
  },
  {
    title: 'All-Weather Shell Running Jacket',
    slug: slugify('All-Weather Shell Running Jacket'),
    description: 'Ultra-lightweight windproof and rainproof shell with active ventilation points, reflective logos, and adjustable hood pulls. Packs completely into its own zipper chest pocket for portability.',
    price: 85,
    discountPrice: 75,
    stock: 45,
    SKU: 'AP-AW-JACKET',
    images: ['https://images.unsplash.com/photo-1548883354-7622d03aca27?w=800&q=80'],
    category: categoryIds['Apparel'],
    brand: 'VibeThreads',
    ratings: 4.3,
    featured: false
  },
  {
    title: 'Anodized Desk Organizer Tray',
    slug: slugify('Anodized Desk Organizer Tray'),
    description: 'CNC machined from a solid block of aerospace grade aluminum. Sandblasted and anodized to provide a highly durable satin finish. Designed with custom compartments for pens, keys, and phone.',
    price: 45,
    discountPrice: 0,
    stock: 60,
    SKU: 'HO-AL-TRAY',
    images: ['https://images.unsplash.com/photo-1593642532400-2682810df593?w=800&q=80'],
    category: categoryIds['Home & Office'],
    brand: 'Minimalist',
    ratings: 4.8,
    featured: false
  }
];

const couponsData = [
  {
    code: 'WELCOME20',
    discount: 20,
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    active: true
  },
  {
    code: 'VIBE50',
    discount: 50,
    expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
    active: true
  },
  {
    code: 'SAVE10',
    discount: 10,
    expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
    active: true
  }
];

const seedDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ecommerce_db';
    console.log(`Connecting to database: ${mongoUri}`);
    await mongoose.connect(mongoUri);
    console.log('Connected to DB. Clearing collections...');

    // Clear existing data
    await Category.deleteMany({});
    await Product.deleteMany({});
    await Coupon.deleteMany({});
    await Review.deleteMany({});
    console.log('Collections cleared.');

    // Insert categories
    const createdCategories = await Category.insertMany(categoriesData);
    console.log(`Seeded ${createdCategories.length} categories.`);

    // Map name to category ID
    const categoryIds = {};
    createdCategories.forEach((cat) => {
      categoryIds[cat.name] = cat._id;
    });

    // Insert products
    const productsToSeed = productsData(categoryIds);
    const createdProducts = await Product.insertMany(productsToSeed);
    console.log(`Seeded ${createdProducts.length} products.`);

    // Insert coupons
    const createdCoupons = await Coupon.insertMany(couponsData);
    console.log(`Seeded ${createdCoupons.length} coupons.`);

    console.log('Database Seeding successfully completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error during seeding database:', error.message);
    process.exit(1);
  }
};

seedDB();
