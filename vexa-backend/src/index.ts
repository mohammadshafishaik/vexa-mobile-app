import dotenv from 'dotenv';
dotenv.config();
console.log("==> Starting Backend (dotenv loaded)");

import express from 'express';
console.log("==> Express imported");
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth';
import { verifyEmailTransport } from './lib/email';
import { setIO } from './lib/socket';
import prisma from './lib/prisma';
console.log("==> Prisma imported");
import { upsertSuperAdmin } from './utils/admin/superAdmin';
import { startAnalytics } from './lib/analytics';
import { generalLimiter } from './lib/rateLimiter';

// Routes
import authRoutes from './routes/auth';
import jobRoutes from './routes/jobs';
import bidRoutes from './routes/bids';
import modificationRoutes from './routes/modifications';
import paymentRoutes, { razorpayWebhookHandler } from './routes/payments';
import ratingRoutes from './routes/ratings';
import notificationRoutes from './routes/notifications';
import disputeRoutes from './routes/disputes';
import uploadRoutes from './routes/upload';
import userRoutes from './routes/users';
import adminRoutes from './routes/admin';
import chatRoutes from './routes/chat';
import skillRoutes from './routes/skills';
import cancellationRoutes from './routes/cancellations';
import portfolioRoutes from './routes/portfolio';
import locationRoutes from './routes/location';
import availabilityRoutes from './routes/availability';
import recommendationRoutes from './routes/recommendations';
import pricingRoutes from './routes/pricing';
import voiceBookingRoutes from './routes/voiceBooking';


const app = express();
const server = http.createServer(app);

const normalizeOrigin = (value: string): string => {
  const cleaned = value
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .replace(/\/+$/g, '');

  if (!cleaned || cleaned === '*') {
    return cleaned;
  }

  try {
    return new URL(cleaned).origin;
  } catch {
    return cleaned;
  }
};

const defaultCorsOrigins = [
  process.env.BETTER_AUTH_URL || '',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
];

const parsedCorsOrigins = (process.env.CORS_ALLOWED_ORIGINS || defaultCorsOrigins.join(','))
  .split(',')
  .map((origin) => normalizeOrigin(origin))
  .filter(Boolean);

const allowAllCorsOrigins = parsedCorsOrigins.includes('*');
const allowedOrigins = parsedCorsOrigins.filter((origin) => origin !== '*');
const allowedOriginSet = new Set(allowedOrigins);

const readEnabledFlag = (value?: string): boolean => {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
};

const bootstrapAdminFromEnv = async (): Promise<void> => {
  if (!readEnabledFlag(process.env.ADMIN_BOOTSTRAP_ENABLED)) {
    return;
  }

  const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  const name = process.env.ADMIN_BOOTSTRAP_NAME;

  if (!email || !password) {
    console.warn('⚠️ ADMIN_BOOTSTRAP_ENABLED is true but ADMIN_BOOTSTRAP_EMAIL/PASSWORD is missing. Skipping bootstrap.');
    return;
  }

  const admin = await upsertSuperAdmin({ email, password, name });
  console.log(`✅ Admin bootstrap ready: ${admin.email} (${admin.adminProfile?.adminRole})`);
};

const corsOrigin: cors.CorsOptions['origin'] = (origin, callback) => {
  if (!origin) {
    callback(null, true);
    return;
  }

  const normalizedRequestOrigin = normalizeOrigin(origin);

  if (allowAllCorsOrigins || allowedOriginSet.has(normalizedRequestOrigin)) {
    callback(null, true);
    return;
  }

  callback(null, false);
};

// Socket.io setup
const io = new SocketServer(server, {
  cors: {
    origin: allowAllCorsOrigins ? true : allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

// Store io globally for route access
setIO(io);

// Middleware
app.use(helmet());
app.use(cors({
  origin: corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true,
}));

// ─── Better Auth Handler ───────────────────────────────
// MUST be mounted BEFORE express.json() — Better Auth handles its own body parsing
app.all('/api/auth/*splat', toNodeHandler(auth));

// Razorpay webhook must read raw body for signature verification
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), razorpayWebhookHandler);

// JSON body parsing for all other routes
app.use(express.json());

// Global rate limiter (100 req/min per IP)
app.use(generalLimiter);

// Serve static files for uploads
app.use('/uploads', express.static('uploads'));

// Health check
app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'VEXA API', version: '1.0.0' });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health/db', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.status(503).json({
      status: 'error',
      database: 'unavailable',
      code: error?.code || 'UNKNOWN',
      message: error?.message || 'Database probe failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// API Routes
// Better Auth handles /api/auth/* — custom auth extensions at /api/custom-auth
app.use('/api/custom-auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/modifications', modificationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/cancellations', cancellationRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/voice-booking', voiceBookingRoutes);

// Socket.io connection
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Join user-specific room for notifications
  socket.on('user:join', (userId: string) => {
    socket.join(`user:${userId}`);
    console.log(`${socket.id} joined user room: ${userId}`);
  });

  // Join bidding room for live bid updates
  socket.on('bidding:join', (jobId: string) => {
    socket.join(`bidding:${jobId}`);
    console.log(`${socket.id} joined bidding room: ${jobId}`);
  });

  socket.on('bidding:leave', (jobId: string) => {
    socket.leave(`bidding:${jobId}`);
  });

  // Chat rooms
  socket.on('chat:join', (jobId: string) => {
    socket.join(`chat:${jobId}`);
    console.log(`${socket.id} joined chat room: ${jobId}`);
  });

  socket.on('chat:leave', (jobId: string) => {
    socket.leave(`chat:${jobId}`);
  });

  socket.on('chat:typing', (data: { jobId: string; userId: string; isTyping: boolean }) => {
    socket.to(`chat:${data.jobId}`).emit('chat:typing', data);
  });

  // Location updates (provider sends periodic GPS)
  socket.on('location:update', async (data: { jobId: string; latitude: number; longitude: number }) => {
    try {
      const job = await prisma.serviceRequest.findUnique({
        where: { id: data.jobId },
        select: { customerId: true },
      });

      if (!job?.customerId) {
        return;
      }

      // Broadcast to the customer watching this job
      socket.to(`user:${job.customerId}`).emit('location:provider', {
        jobId: data.jobId,
        latitude: data.latitude,
        longitude: data.longitude,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {}
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Export io for use in routes
export { io };

// Start server
const PORT = process.env.PORT || 3000;
const PUBLIC_URL = process.env.BETTER_AUTH_URL || `http://localhost:${PORT}`;

server.listen(PORT, () => {
  console.log(`\n🚀 VEXA Backend running`);
  console.log(`📡 Socket.io ready for real-time events`);
  console.log(`🌐 Public URL: ${PUBLIC_URL}`);
  console.log(`🔐 CORS mode: ${allowAllCorsOrigins ? 'allow-all' : allowedOrigins.join(', ')}`);
  console.log(`📊 Health check: ${PUBLIC_URL}/api/health\n`);
  verifyEmailTransport().catch(() => {});
  startAnalytics();
  bootstrapAdminFromEnv().catch((error: any) => {
    console.error('❌ Admin bootstrap failed:', error?.message || error);
  });
});
