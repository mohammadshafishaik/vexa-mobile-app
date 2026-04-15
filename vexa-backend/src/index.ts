import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth';
import { verifyEmailTransport } from './lib/email';
import { setIO } from './lib/socket';
import prisma from './lib/prisma';

// Routes
import authRoutes from './routes/auth';
import jobRoutes from './routes/jobs';
import bidRoutes from './routes/bids';
import modificationRoutes from './routes/modifications';
import paymentRoutes from './routes/payments';
import ratingRoutes from './routes/ratings';
import notificationRoutes from './routes/notifications';
import disputeRoutes from './routes/disputes';
import uploadRoutes from './routes/upload';
import userRoutes from './routes/users';
import adminRoutes from './routes/admin';


const app = express();
const server = http.createServer(app);

const defaultCorsOrigins = [
  process.env.BETTER_AUTH_URL || '',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
];

const parsedCorsOrigins = (process.env.CORS_ALLOWED_ORIGINS || defaultCorsOrigins.join(','))
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowAllCorsOrigins = parsedCorsOrigins.includes('*');
const allowedOriginSet = new Set(parsedCorsOrigins);

const corsOrigin: cors.CorsOptions['origin'] = (origin, callback) => {
  if (!origin) {
    callback(null, true);
    return;
  }

  if (allowAllCorsOrigins || allowedOriginSet.has(origin)) {
    callback(null, true);
    return;
  }

  callback(null, false);
};

// Socket.io setup
const io = new SocketServer(server, {
  cors: {
    origin: allowAllCorsOrigins ? true : parsedCorsOrigins,
    methods: ['GET', 'POST'],
  },
});

// Store io globally for route access
setIO(io);

// Middleware
app.use(helmet());
app.use(cors({
  origin: corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

// ─── Better Auth Handler ───────────────────────────────
// MUST be mounted BEFORE express.json() — Better Auth handles its own body parsing
app.all('/api/auth/*splat', toNodeHandler(auth));

// JSON body parsing for all other routes
app.use(express.json());

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
  console.log(`🔐 CORS mode: ${allowAllCorsOrigins ? 'allow-all' : parsedCorsOrigins.join(', ')}`);
  console.log(`📊 Health check: ${PUBLIC_URL}/api/health\n`);
  verifyEmailTransport().catch(() => {});
});
