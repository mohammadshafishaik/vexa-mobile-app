import bcrypt from 'bcryptjs';
import prisma from '../../lib/prisma';

export const DEFAULT_ADMIN_EMAIL = 'superadmin@vexa.app';
export const DEFAULT_ADMIN_PASSWORD = 'Admin@12345';
export const DEFAULT_ADMIN_NAME = 'VEXA Super Admin';

const normalizeEmail = (value: string): string => value.trim().toLowerCase();

export type UpsertSuperAdminInput = {
  email: string;
  password: string;
  name: string;
};

export const resolveSuperAdminInput = (values?: Partial<UpsertSuperAdminInput>): UpsertSuperAdminInput => {
  const email = normalizeEmail(values?.email || DEFAULT_ADMIN_EMAIL);
  const password = values?.password || DEFAULT_ADMIN_PASSWORD;
  const name = (values?.name || DEFAULT_ADMIN_NAME).trim();

  if (!email) {
    throw new Error('ADMIN_EMAIL is required');
  }

  if (!password || password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters long');
  }

  return { email, password, name };
};

export const upsertSuperAdmin = async (values?: Partial<UpsertSuperAdminInput>) => {
  const { email, password, name } = resolveSuperAdminInput(values);
  const passwordHash = await bcrypt.hash(password, 10);

  return prisma.user.upsert({
    where: { email },
    update: {
      name,
      password: passwordHash,
      role: 'ADMIN',
      adminProfile: {
        upsert: {
          create: { adminRole: 'SUPER_ADMIN' },
          update: { adminRole: 'SUPER_ADMIN' }
        }
      },
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
      adminProfile: {
        create: { adminRole: 'SUPER_ADMIN' }
      },
      accountStatus: 'ACTIVE',
      isVerified: true,
      emailVerified: true,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      adminProfile: {
        select: { adminRole: true }
      },
      accountStatus: true,
    },
  });
};