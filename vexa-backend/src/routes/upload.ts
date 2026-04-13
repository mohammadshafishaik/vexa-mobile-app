import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { authMiddleware } from '../middleware/auth';

const router = Router();

const normalizeBaseUrl = (value: string): string => value.trim().replace(/\/+$/, '');

const getPublicBaseUrl = (req: Request): string => {
  const configured = normalizeBaseUrl(process.env.BETTER_AUTH_URL || process.env.BASE_URL || '');
  if (configured) return configured;

  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
  const protocol = forwardedProto || req.protocol || 'http';
  const host = forwardedHost || req.get('host') || `localhost:${process.env.PORT || 3000}`;
  return `${protocol}://${host}`;
};

// Configure Cloudinary if credentials are provided
const useCloudinary = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (useCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('✅ Cloudinary configured for image uploads');
} else {
  console.log('⚠️  Using local storage for uploads (Cloudinary not configured)');
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  },
});

// ─── POST /api/upload (Single Image) ──────────────────────
router.post('/', authMiddleware, upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    let fileUrl: string;

    if (useCloudinary) {
      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'vexa',
        resource_type: 'image',
      });
      fileUrl = result.secure_url;
    } else {
      // Use local storage URL
      const publicBaseUrl = getPublicBaseUrl(req);
      fileUrl = `${publicBaseUrl}/uploads/${req.file.filename}`;
    }

    res.status(201).json({
      success: true,
      data: { url: fileUrl },
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── POST /api/upload/multiple (Multiple Images) ──────────
router.post('/multiple', authMiddleware, upload.array('images', 10), async (req: Request, res: Response) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      res.status(400).json({ success: false, message: 'No files uploaded' });
      return;
    }

    const uploadPromises = req.files.map(async (file) => {
      if (useCloudinary) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: 'vexa',
          resource_type: 'image',
        });
        return result.secure_url;
      } else {
        const publicBaseUrl = getPublicBaseUrl(req);
        return `${publicBaseUrl}/uploads/${file.filename}`;
      }
    });

    const urls = await Promise.all(uploadPromises);

    res.status(201).json({
      success: true,
      data: { urls },
    });
  } catch (error: any) {
    console.error('Multiple upload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
