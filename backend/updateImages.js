import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Product from './models/Product.js';
import Category from './models/Category.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const run = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ecommerce_db';
    console.log(`Connecting to: ${mongoUri}`);
    await mongoose.connect(mongoUri);

    console.log('Connected. Starting image URL updates...');

    // 1. Update Categories
    const categoryUpdates = [
      { name: 'Electronics', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80' },
      { name: 'Apparel', image: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=500&q=80' },
      { name: 'Home & Office', image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=500&q=80' },
      { name: 'Accessories', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80' }
    ];

    for (const update of categoryUpdates) {
      const result = await Category.updateOne(
        { name: update.name },
        { $set: { image: update.image } }
      );
      console.log(`Category "${update.name}" updated: matched ${result.matchedCount}, modified ${result.modifiedCount}`);
    }

    // 2. Update Products
    const productUpdates = [
      {
        title: 'AeroGlide ANC Wireless Headphones',
        images: [
          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
          'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&q=80'
        ]
      },
      {
        title: 'VibeStream 4K Smart OLED TV',
        images: ['https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=800&q=80']
      },
      {
        title: 'KeyChron K8 Pro Mechanical Keyboard',
        images: ['https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80']
      },
      {
        title: 'Minimalist Merino Wool Hoodie',
        images: ['https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80']
      },
      {
        title: 'Ergonomic Mesh Task Chair',
        images: ['https://images.unsplash.com/photo-1580481072645-022f9a6dbf27?w=800&q=80']
      },
      {
        title: 'TechPack Weatherproof Backpack',
        images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80']
      },
      {
        title: 'Vibe Fit Smartwatch Series X',
        images: ['https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&q=80']
      },
      {
        title: 'All-Weather Shell Running Jacket',
        images: ['https://images.unsplash.com/photo-1548883354-7622d03aca27?w=800&q=80']
      },
      {
        title: 'Anodized Desk Organizer Tray',
        images: ['https://images.unsplash.com/photo-1593642532400-2682810df593?w=800&q=80']
      }
    ];

    for (const update of productUpdates) {
      const result = await Product.updateOne(
        { title: update.title },
        { $set: { images: update.images } }
      );
      console.log(`Product "${update.title}" updated: matched ${result.matchedCount}, modified ${result.modifiedCount}`);
    }

    console.log('Database update completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error during update:', err);
    process.exit(1);
  }
};

run();
