import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

async function runTests() {
  console.log('--- STARTING BACKEND SMOKE TEST ---');
  try {
    const auth = await axios.post(`${API_URL}/custom-auth/register`, {
      name: 'Test User',
      email: 'test-smoke-test@example.com',
      phone: '1234567890',
      password: 'Password123!',
      role: 'CUSTOMER',
      captchaToken: 'dummy-token' 
    });
    console.log('✅ Register:', auth.data);
    
    const login = await axios.post(`${API_URL}/custom-auth/login`, {
      email: 'test-smoke-test@example.com',
      password: 'Password123!',
      captchaToken: 'dummy-token'
    });
    console.log('✅ Login:', login.data);
    
  } catch (e: any) {
    console.log('❌ Failed:', e.response?.data || e.message);
  }
}

runTests();
