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

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true }
  });

  let user;

  if (existingUser) {
    user = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        name,
        password: passwordHash,
        role: 'ADMIN',
        accountStatus: 'ACTIVE',
        isVerified: true,
        emailVerified: true,
        suspendedUntil: null,
        banReason: null,
        bannedAt: null,
        bannedById: null,
      },
    });
  } else {
    user = await prisma.user.create({
      data: {
        email,
        name,
        password: passwordHash,
        role: 'ADMIN',
        accountStatus: 'ACTIVE',
        isVerified: true,
        emailVerified: true,
      },
    });
  }

  // Ensure AdminProfile exists and is up to date
  await prisma.adminProfile.upsert({
    where: { userId: user.id },
    update: { adminRole: 'SUPER_ADMIN' },
    create: {
      userId: user.id,
      adminRole: 'SUPER_ADMIN',
    },
  });

  return prisma.user.findUnique({
    where: { id: user.id },
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