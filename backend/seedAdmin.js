import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const seedAdmin = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ecommerce_db';
    console.log(`Connecting to database: ${mongoUri}`);
    await mongoose.connect(mongoUri);
    
    const adminEmail = 'admin@example.com';
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (existingAdmin) {
      existingAdmin.role = 'Admin';
      await existingAdmin.save();
      console.log('User admin@example.com role updated to Admin successfully!');
    } else {
      const adminUser = new User({
        name: 'System Administrator',
        email: adminEmail,
        password: 'password12345',
        phone: '+19876543210',
        role: 'Admin',
        isVerified: true
      });
      await adminUser.save();
      console.log('Admin user (admin@example.com / password123) created successfully!');
    }
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error.message);
    process.exit(1);
  }
};

seedAdmin();
