const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';

// Test data
const testUser = {
  firstName: 'John',
  lastName: 'Doe', 
  email: 'john.doe@example.com',
  password: 'SecurePass123!'
};

async function testAuthentication() {
  console.log('🔐 Testing Authentication System...\n');

  try {
    // Test 1: Register a new user
    console.log('📝 Testing user registration...');
    try {
      const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, testUser);
      console.log('✅ Registration successful!');
      console.log('User:', registerResponse.data.user);
      console.log('Token received:', registerResponse.data.token ? 'Yes' : 'No');
      
      // Test 2: Try to register the same user again (should fail)
      console.log('\n🔄 Testing duplicate registration...');
      try {
        await axios.post(`${API_BASE_URL}/auth/register`, testUser);
        console.log('❌ Duplicate registration should have failed!');
      } catch (duplicateError) {
        console.log('✅ Duplicate registration correctly rejected:', duplicateError.response.data.message);
      }
      
      // Test 3: Login with correct credentials
      console.log('\n🔑 Testing login with correct credentials...');
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: testUser.email,
        password: testUser.password
      });
      console.log('✅ Login successful!');
      console.log('User:', loginResponse.data.user);
      
      // Test 4: Login with wrong password
      console.log('\n🚫 Testing login with wrong password...');
      try {
        await axios.post(`${API_BASE_URL}/auth/login`, {
          email: testUser.email,
          password: 'wrongpassword'
        });
        console.log('❌ Login with wrong password should have failed!');
      } catch (wrongPasswordError) {
        console.log('✅ Wrong password correctly rejected:', wrongPasswordError.response.data.message);
      }
      
      // Test 5: Test protected route
      console.log('\n🔒 Testing protected route...');
      const token = loginResponse.data.token;
      const profileResponse = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Protected route access successful!');
      console.log('Profile data:', profileResponse.data.user);
      
    } catch (registerError) {
      if (registerError.response?.data?.message?.includes('already exists')) {
        console.log('ℹ️ User already exists, testing login instead...');
        
        // Test login if user already exists
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
          email: testUser.email,
          password: testUser.password
        });
        console.log('✅ Login successful with existing user!');
        console.log('User:', loginResponse.data.user);
      } else {
        throw registerError;
      }
    }
    
    // Test 6: Test password validation
    console.log('\n🔐 Testing password validation...');
    try {
      await axios.post(`${API_BASE_URL}/auth/register`, {
        firstName: 'Test',
        lastName: 'User',
        email: 'test.weak@example.com',
        password: 'weak' // Should fail validation
      });
      console.log('❌ Weak password should have been rejected!');
    } catch (weakPasswordError) {
      console.log('✅ Weak password correctly rejected:', weakPasswordError.response.data.message);
    }
    
    console.log('\n🎉 All authentication tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testAuthentication();