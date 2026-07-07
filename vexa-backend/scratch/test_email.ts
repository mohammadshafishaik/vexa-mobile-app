import dotenv from 'dotenv';
import path from 'path';

// Load env variables FIRST
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function run() {
  const { sendWelcomeEmail } = await import('../src/lib/resend');

  console.log('Sending test welcome email via Nodemailer SMTP...');
  console.log('SMTP User:', process.env.SMTP_USER || 'app.vexa.in@gmail.com');
  console.log('SMTP Pass:', process.env.SMTP_PASS ? 'Set ✅' : 'Missing ❌');

  // Change to your desired recipient email
  const targetEmail = 'sk.mohammadshafi3044@gmail.com';
  
  const result = await sendWelcomeEmail(targetEmail, 'Shaik Shafi');
  console.log('Result:', JSON.stringify(result, null, 2));
}

run();
