import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { BadRequestError } from '../../shared/errors.js';
import { env } from '../../config/env.js';

const uploadDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export class StorageService {
  private readonly uploadDir = uploadDir;

  /**
   * Persist an uploaded multer file and return attachment metadata
   */
  async saveFile(file: Express.Multer.File): Promise<{
    fileKey: string;
    fileUrl: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
  }> {
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniquePrefix = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const fileKey = `${uniquePrefix}-${sanitizedName}`;
    const targetPath = path.join(this.uploadDir, fileKey);

    // If memory storage (buffer), write to disk
    if (file.buffer) {
      await fs.promises.writeFile(targetPath, file.buffer);
    } else if (file.path && file.path !== targetPath) {
      await fs.promises.copyFile(file.path, targetPath);
      // clean up temp file if needed
      try {
        await fs.promises.unlink(file.path);
      } catch {
        // ignore
      }
    }

    const fileUrl = `/uploads/${fileKey}`;

    return {
      fileKey,
      fileUrl,
      fileName: file.originalname,
      mimeType: file.mimetype || 'application/octet-stream',
      fileSize: file.size,
    };
  }

  /**
   * Delete a stored file from storage
   */
  async deleteFile(fileKey: string): Promise<void> {
    const targetPath = path.join(this.uploadDir, path.basename(fileKey));
    try {
      if (fs.existsSync(targetPath)) {
        await fs.promises.unlink(targetPath);
      }
    } catch (err) {
      // Log or swallow if already removed
    }
  }

  /**
   * Get absolute local path to file
   */
  getFilePath(fileKey: string): string {
    return path.join(this.uploadDir, path.basename(fileKey));
  }
}

export const storageService = new StorageService();

// Multer memory storage configuration for clean in-memory buffer processing
const memoryStorage = multer.memoryStorage();

export const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const disallowedExtensions = ['.exe', '.bat', '.cmd', '.sh', '.msi', '.vbs', '.php', '.phtml'];
    if (disallowedExtensions.includes(ext)) {
      return cb(new BadRequestError(`File extension "${ext}" is not permitted for security reasons`));
    }
    cb(null, true);
  },
});

