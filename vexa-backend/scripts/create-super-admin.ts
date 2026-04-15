import dotenv from 'dotenv';
import prisma from '../src/lib/prisma';
import { upsertSuperAdmin } from '../src/utils/admin/superAdmin';

dotenv.config();

async function main() {
  const admin = await upsertSuperAdmin({
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    name: process.env.ADMIN_NAME,
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
