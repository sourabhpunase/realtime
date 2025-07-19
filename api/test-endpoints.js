#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testEndpoints() {
  console.log('🧪 Testing API Endpoints...\n');

  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check:', healthResponse.data);

    // Test login
    console.log('\n2. Testing admin login...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@example.com',
      password: 'Admin123!'
    });
    
    const token = loginResponse.data.token;
    const headers = { Authorization: `Bearer ${token}` };
    console.log('✅ Admin login successful');

    // Test projects endpoint
    console.log('\n3. Testing projects endpoint...');
    const projectsResponse = await axios.get(`${BASE_URL}/projects`, { headers });
    console.log('✅ Projects endpoint working:', projectsResponse.data);

    // Test invitations endpoint
    console.log('\n4. Testing invitations endpoint...');
    const invitationsResponse = await axios.get(`${BASE_URL}/invitations`, { headers });
    console.log('✅ Invitations endpoint working:', invitationsResponse.data);

    console.log('\n🎉 All endpoints are working correctly!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Make sure the server is running:');
      console.error('   cd api && npm start');
    }
  }
}

testEndpoints();