import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { v2 as cloudinary } from 'cloudinary';

const router = Router();

// Configure storage for audio files
const audioDir = path.resolve(process.cwd(), 'uploads/voice');
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, audioDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'voice-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp3|wav|m4a|mpeg|ogg|aac/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed (mp3, wav, m4a, ogg, aac)'));
    }
  },
});

// Configure Cloudinary check
const useCloudinary = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

const getPublicBaseUrl = (req: Request): string => {
  const configuredRaw = process.env.BETTER_AUTH_URL || process.env.BASE_URL || '';
  const host = req.get('host') || `localhost:${process.env.PORT || 3000}`;
  const inferredProtocol = host.includes('onrender.com') ? 'https' : (req.protocol || 'http');
  return configuredRaw ? configuredRaw.replace(/\/api\/?$/i, '') : `${inferredProtocol}://${host}`;
};

// POST /api/voice-booking/upload - Uploads audio, transcribes it, and generates a service request job automatically
router.post('/upload', authMiddleware, upload.single('audio'), async (req: Request, res: Response) => {
  let createdBookingId: string | null = null;
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No audio file uploaded' });
      return;
    }

    let audioUrl: string;
    if (useCloudinary) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'vexa/voice',
        resource_type: 'video', // Cloudinary treats audio as video files
      });
      audioUrl = result.secure_url;
    } else {
      const publicBaseUrl = getPublicBaseUrl(req);
      audioUrl = `${publicBaseUrl}/uploads/voice/${req.file.filename}`;
    }

    // 1. Create initial VoiceBooking record in PROCESSING state
    const booking = await prisma.voiceBooking.create({
      data: {
        userId: req.user!.userId,
        audioUrl,
        audioFormat: path.extname(req.file.originalname).substring(1),
        status: 'PROCESSING',
      },
    });
    createdBookingId = booking.id;

    // 2. Perform Mock AI transcription based on name or simulate translation
    // In production, integration with speech-to-text APIs like Google Cloud Speech or OpenAI Whisper would go here.
    let transcription = 'I need a plumber to fix a leaking pipe in my bathroom as soon as possible.';
    let categoryName = 'Plumbing';
    let title = 'Plumbing emergency';

    const originalNameLower = req.file.originalname.toLowerCase();
    if (originalNameLower.includes('electric') || originalNameLower.includes('light') || originalNameLower.includes('fan')) {
      transcription = 'I need an electrician to fix a short circuit in my kitchen lighting and install a new ceiling fan.';
      categoryName = 'Electrical';
      title = 'Electrical repair';
    } else if (originalNameLower.includes('clean') || originalNameLower.includes('wash') || originalNameLower.includes('dust')) {
      transcription = 'Looking for a professional home cleaner to deep clean a 3 BHK apartment including windows and bathrooms.';
      categoryName = 'Cleaning';
      title = 'Deep cleaning service';
    }

    // 3. Resolve the category model in DB matching the categoryName
    let category = await prisma.serviceCategory.findFirst({
      where: { name: { equals: categoryName, mode: 'insensitive' } },
    });

    if (!category) {
      category = await prisma.serviceCategory.findFirst();
    }

    // 4. Create the ServiceRequest job automatically from the transcription details
    const orderId = 'VEXA-' + Math.floor(100000 + Math.random() * 900000);
    const serviceRequest = await prisma.serviceRequest.create({
      data: {
        orderId,
        customerId: req.user!.userId,
        title,
        description: transcription,
        categoryId: category!.id,
        location: 'Mumbai, Maharashtra, India', // Default fallback region
        latitude: 19.0760,
        longitude: 72.8777,
        originalPrice: 750.00, // Derived base typical estimate
        urgency: 'IMMEDIATE',
        status: 'POSTED',
      },
    });

    // 5. Update the VoiceBooking with completion results
    const updatedBooking = await prisma.voiceBooking.update({
      where: { id: booking.id },
      data: {
        status: 'JOB_CREATED',
        transcription,
        language: 'en',
        confidenceScore: 0.95,
        generatedJobId: serviceRequest.id,
        generatedTitle: title,
        generatedDescription: transcription,
        generatedCategory: categoryName,
      },
      include: {
        generatedJob: true,
      },
    });

    res.status(201).json({
      success: true,
      data: updatedBooking,
    });
  } catch (error: any) {
    console.error('Voice booking failure:', error);
    if (createdBookingId) {
      await prisma.voiceBooking.update({
        where: { id: createdBookingId },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
        },
      }).catch(console.error);
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/voice-booking/history - Fetch user voice bookings list
router.get('/history', authMiddleware, async (req: Request, res: Response) => {
  try {
    const list = await prisma.voiceBooking.findMany({
      where: { userId: req.user!.userId },
      include: { generatedJob: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: list });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
