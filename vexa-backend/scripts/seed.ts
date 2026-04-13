/**
 * Database Seeding Script
 * Creates test users and sample data for development
 */

import prisma from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 Seeding database...');

  // Create test customer
  const customerPassword = await bcrypt.hash('Test123!', 10);
  const customer = await prisma.user.upsert({
    where: { email: 'customer@test.com' },
    update: {},
    create: {
      email: 'customer@test.com',
      name: 'Test Customer',
      password: customerPassword,
      role: 'CUSTOMER',
      phone: '+91 9876543210',
      isVerified: true,
    },
  });
  console.log('✓ Created test customer:', customer.email);

  // Create test provider
  const providerPassword = await bcrypt.hash('Test123!', 10);
  const provider = await prisma.user.upsert({
    where: { email: 'provider@test.com' },
    update: {},
    create: {
      email: 'provider@test.com',
      name: 'Test Provider',
      password: providerPassword,
      role: 'PROVIDER',
      phone: '+91 9876543211',
      isVerified: true,
      kycStatus: 'VERIFIED',
    },
  });
  console.log('✓ Created test provider:', provider.email);

  // Create verified provider
  const verifiedProviderPassword = await bcrypt.hash('Test123!', 10);
  const verifiedProvider = await prisma.user.upsert({
    where: { email: 'verified.provider@test.com' },
    update: {},
    create: {
      email: 'verified.provider@test.com',
      name: 'Verified Provider',
      password: verifiedProviderPassword,
      role: 'PROVIDER',
      phone: '+91 9876543212',
      isVerified: true,
      kycStatus: 'VERIFIED',
    },
  });
  console.log('✓ Created verified provider:', verifiedProvider.email);

  // Create sample jobs
  const job1 = await prisma.serviceRequest.create({
    data: {
      customerId: customer.id,
      title: 'Plumbing Repair - Leaking Pipe',
      description: 'Need urgent plumbing repair. Kitchen sink pipe is leaking.',
      category: 'Plumbing',
      location: 'Andheri West, Mumbai',
      latitude: 19.1136,
      longitude: 72.8697,
      originalPrice: 500,
      urgency: 'HIGH',
      status: 'BIDDING',
    },
  });
  console.log('✓ Created sample job:', job1.title);

  const job2 = await prisma.serviceRequest.create({
    data: {
      customerId: customer.id,
      title: 'Electrical Work - Fan Installation',
      description: 'Need to install 2 ceiling fans in bedroom and living room.',
      category: 'Electrical',
      location: 'Bandra East, Mumbai',
      latitude: 19.0596,
      longitude: 72.8656,
      originalPrice: 800,
      urgency: 'NORMAL',
      status: 'BIDDING',
    },
  });
  console.log('✓ Created sample job:', job2.title);

  const job3 = await prisma.serviceRequest.create({
    data: {
      customerId: customer.id,
      title: 'House Cleaning Service',
      description: 'Deep cleaning required for 2BHK apartment.',
      category: 'Cleaning',
      location: 'Powai, Mumbai',
      latitude: 19.1176,
      longitude: 72.9060,
      originalPrice: 1500,
      urgency: 'NORMAL',
      status: 'BIDDING',
      scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    },
  });
  console.log('✓ Created sample job:', job3.title);

  // Create sample bids
  const bid1 = await prisma.bid.create({
    data: {
      jobId: job1.id,
      providerId: provider.id,
      amount: 450,
      message: 'I can fix this quickly. Have 5 years experience in plumbing.',
      estimatedDuration: '2 hours',
    },
  });
  console.log('✓ Created sample bid for job 1');

  const bid2 = await prisma.bid.create({
    data: {
      jobId: job1.id,
      providerId: verifiedProvider.id,
      amount: 480,
      message: 'Verified plumber with all tools. Can start immediately.',
      estimatedDuration: '1.5 hours',
    },
  });
  console.log('✓ Created sample bid for job 1');

  const bid3 = await prisma.bid.create({
    data: {
      jobId: job2.id,
      providerId: verifiedProvider.id,
      amount: 750,
      message: 'Licensed electrician. Will provide warranty on installation.',
      estimatedDuration: '3 hours',
    },
  });
  console.log('✓ Created sample bid for job 2');

  // Create a completed job with rating
  const completedJob = await prisma.serviceRequest.create({
    data: {
      customerId: customer.id,
      title: 'AC Servicing',
      description: 'Regular AC maintenance and cleaning.',
      category: 'AC Repair',
      location: 'Juhu, Mumbai',
      latitude: 19.1075,
      longitude: 72.8263,
      originalPrice: 600,
      urgency: 'NORMAL',
      status: 'PAID',
      selectedProviderId: verifiedProvider.id,
    },
  });
  console.log('✓ Created completed job:', completedJob.title);

  // Create rating for completed job
  const rating = await prisma.rating.create({
    data: {
      jobId: completedJob.id,
      raterId: customer.id,
      rateeId: verifiedProvider.id,
      score: 5,
      review: 'Excellent service! Very professional and completed work on time.',
    },
  });
  console.log('✓ Created sample rating');

  // Create sample notifications
  await prisma.notification.create({
    data: {
      userId: customer.id,
      type: 'BID_RECEIVED',
      title: 'New Bid Received',
      body: `You received a new bid of ₹${bid1.amount} on "${job1.title}"`,
      data: { jobId: job1.id, bidId: bid1.id },
    },
  });
  console.log('✓ Created sample notification');

  console.log('\n✅ Database seeded successfully!');
  console.log('\nTest Credentials:');
  console.log('─────────────────────────────────────');
  console.log('Customer:');
  console.log('  Email: customer@test.com');
  console.log('  Password: Test123!');
  console.log('');
  console.log('Provider:');
  console.log('  Email: provider@test.com');
  console.log('  Password: Test123!');
  console.log('');
  console.log('Verified Provider:');
  console.log('  Email: verified.provider@test.com');
  console.log('  Password: Test123!');
  console.log('─────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
