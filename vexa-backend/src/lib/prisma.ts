import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { parse } from 'pg-connection-string';

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

const config = parse(connectionString);
const pool = new pg.Pool({
  ...config,
  host: config.host || undefined,
  password: config.password || '',
  port: config.port ? parseInt(config.port, 10) : undefined,
  database: config.database || undefined,
  ssl: config.ssl as any,
});
const adapter = new PrismaPg(pool as any);

const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

export default prisma;
