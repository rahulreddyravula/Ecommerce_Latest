import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './models/User.js';
import Order from './models/Order.js';
import Cart from './models/Cart.js';
import Address from './models/Address.js';
import Product from './models/Product.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const run = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ecommerce_db';
    console.log(`Connecting to: ${mongoUri}`);
    await mongoose.connect(mongoUri);

    console.log("Fetching all products...");
    const products = await Product.find({}, 'title stock status price discountPrice');
    console.log(JSON.stringify(products, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Error during query:', err);
    process.exit(1);
  }
};

run();
