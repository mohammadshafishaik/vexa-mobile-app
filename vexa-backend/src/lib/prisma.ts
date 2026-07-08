import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

// Set up WebSocket polyfill for Neon serverless
neonConfig.webSocketConstructor = ws;

// We can just use the standard DATABASE_URL. 
// Note: Neon connection string over WebSockets does NOT use pgbouncer.
const connectionString =
  process.env.DATABASE_URL
  || process.env.DATABASE_INTERNAL_URL
  || process.env.POSTGRES_URL
  || process.env.POSTGRES_PRISMA_URL
  || process.env.RENDER_DATABASE_URL
  || (process.env.NODE_ENV !== 'production' ? 'postgresql://shaikshafi:@localhost:5432/vexa_db' : undefined);

if (!connectionString) {
  throw new Error('Database URL is missing. Set DATABASE_URL in production environment variables.');
}

const adapter = new PrismaNeon({ connectionString });

const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

export default prisma;
