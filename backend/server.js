import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Define __dirname for ES Modules compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables first
dotenv.config({ path: path.join(__dirname, '.env') });

// Uncaught exceptions handler (must be registered at top)
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down...');
  console.error(err.name, err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});

// Import app and db connector after loading environment
import app from './app.js';
import connectDB from './config/db.js';
import { setupSocket } from './utils/socket.js';

// Connect to MongoDB Database
connectDB();

const PORT = process.env.PORT || 5000;

// Start Express Server listening
const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Bind Socket.io
setupSocket(server);

// Unhandled Promise Rejections handler
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! Shutting down server gracefully...');
  console.error(err.name, err.message);
  if (err.stack) console.error(err.stack);
  server.close(() => {
    process.exit(1);
  });
});
