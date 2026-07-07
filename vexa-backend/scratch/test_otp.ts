import dotenv from 'dotenv';
import path from 'path';

// Load env variables FIRST
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import prisma from '../src/lib/prisma';
import { sendLoginOtpEmail } from '../src/lib/email';

async function run() {
  console.log('--- Testing Login OTP Generation and Verification (tsx) ---');

  const testEmail = 'sk.mohammadshafi3044@gmail.com';
  const user = await prisma.user.findUnique({
    where: { email: testEmail }
  });

  if (!user) {
    console.error(`User with email ${testEmail} does not exist in the database.`);
    return;
  }

  console.log(`Found test user: ${user.name} (${user.email})`);

  // 1. Generate OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const identifier = `otp:email:${testEmail}`;
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

  await prisma.verification.upsert({
    where: { id: identifier },
    create: {
      id: identifier,
      identifier,
      value: otpCode,
      expiresAt,
    },
    update: {
      value: otpCode,
      expiresAt,
    },
  });

  console.log(`Generated OTP Code: ${otpCode} (saved to DB under identifier ${identifier})`);

  // 2. Dispatch Email
  console.log(`Sending email containing OTP to ${testEmail}...`);
  const emailResult = await sendLoginOtpEmail(testEmail, user.name, otpCode);
  console.log('Email dispatch result:', JSON.stringify(emailResult, null, 2));

  // 3. Verify OTP
  const verificationRecord = await prisma.verification.findUnique({
    where: { id: identifier }
  });

  if (verificationRecord && verificationRecord.value === otpCode && new Date() < verificationRecord.expiresAt) {
    console.log('OTP Verification Check: SUCCESS ✅ (OTP matches and is not expired)');
  } else {
    console.error('OTP Verification Check: FAILED ❌');
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
