import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth';
import { setIO } from './lib/socket';

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


const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new SocketServer(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Store io globally for route access
setIO(io);

// Middleware
app.use(helmet());
app.use(cors({
  origin: '*',
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
server.listen(PORT, () => {
  console.log(`\n🚀 VEXA Backend running on http://localhost:${PORT}`);
  console.log(`📡 Socket.io ready for real-time events`);
  console.log(`📊 API docs: http://localhost:${PORT}/api/health\n`);
});
