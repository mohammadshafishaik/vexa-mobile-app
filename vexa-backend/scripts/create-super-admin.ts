import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import prisma from '../src/lib/prisma';

dotenv.config();

const DEFAULT_ADMIN_EMAIL = 'superadmin@vexa.app';
const DEFAULT_ADMIN_PASSWORD = 'Admin@12345';
const DEFAULT_ADMIN_NAME = 'VEXA Super Admin';

const normalizeEmail = (value: string): string => value.trim().toLowerCase();

async function main() {
  const email = normalizeEmail(process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL);
  const password = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
  const name = (process.env.ADMIN_NAME || DEFAULT_ADMIN_NAME).trim();

  if (!email) {
    throw new Error('ADMIN_EMAIL is required');
  }

  if (!password || password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters long');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      password: passwordHash,
      role: 'ADMIN',
      adminRole: 'SUPER_ADMIN',
      accountStatus: 'ACTIVE',
      isVerified: true,
      emailVerified: true,
      suspendedUntil: null,
      banReason: null,
      bannedAt: null,
      bannedById: null,
    },
    create: {
      email,
      name,
      password: passwordHash,
      role: 'ADMIN',
      adminRole: 'SUPER_ADMIN',
      accountStatus: 'ACTIVE',
      isVerified: true,
      emailVerified: true,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      adminRole: true,
      accountStatus: true,
    },
  });

  console.log('✅ Super admin ready');
  console.log(`Email: ${admin.email}`);
  console.log(`Role: ${admin.role}`);
  console.log(`Admin Role: ${admin.adminRole}`);
  console.log(`Status: ${admin.accountStatus}`);
}

main()
  .catch((error) => {
    console.error('❌ Failed to create super admin');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
