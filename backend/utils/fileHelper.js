import fs from 'fs/promises';
import path from 'path';

/**
 * Safely and asynchronously delete a file relative to the project root.
 * If the file does not exist, the error is handled gracefully.
 * @param {string} filePath - Absolute or relative path to the file.
 */
export const deleteFile = async (filePath) => {
  if (!filePath) return;
  try {
    // Strip leading slash if present to ensure proper relative resolution on Windows
    const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    const fullPath = path.resolve(cleanPath);
    // Verify file access/existence
    await fs.access(fullPath);
    await fs.unlink(fullPath);
  } catch (err) {
    // Ignore File Not Found errors; log others
    if (err.code !== 'ENOENT') {
      console.error(`Error deleting file at ${filePath}:`, err.message);
    }
  }
};
