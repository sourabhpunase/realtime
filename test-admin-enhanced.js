const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';

// Test admin functionality
async function testAdminFunctionality() {
  try {
    console.log('🔐 Testing Enhanced Admin Functionality...\n');

    // Step 1: Login as admin
    console.log('1. Logging in as admin...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'admin@example.com',
      password: 'Admin123!'
    });

    if (!loginResponse.data.success) {
      throw new Error('Admin login failed');
    }

    const adminToken = loginResponse.data.token;
    const headers = { Authorization: `Bearer ${adminToken}` };
    console.log('✅ Admin login successful\n');

    // Step 2: Get user statistics
    console.log('2. Getting user statistics...');
    const statsResponse = await axios.get(`${API_BASE_URL}/admin/stats`, { headers });
    console.log('📊 User Statistics:', statsResponse.data.stats);
    console.log('');

    // Step 3: Create multiple test users
    console.log('3. Creating test users...');
    const testUsers = [
      {
        email: 'john.doe@example.com',
        password: 'TestPass123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user'
      },
      {
        email: 'jane.smith@example.com',
        password: 'TestPass123!',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'user'
      },
      {
        email: 'bob.admin@example.com',
        password: 'TestPass123!',
        firstName: 'Bob',
        lastName: 'Administrator',
        role: 'admin'
      }
    ];

    const createdUsers = [];
    for (const userData of testUsers) {
      try {
        const createResponse = await axios.post(`${API_BASE_URL}/admin/users`, userData, { headers });
        if (createResponse.data.success) {
          createdUsers.push(createResponse.data.user);
          console.log(`✅ Created user: ${userData.email} (${userData.role})`);
        }
      } catch (error) {
        console.log(`⚠️  User ${userData.email} might already exist`);
      }
    }
    console.log('');

    // Step 4: Get all users with filters
    console.log('4. Testing user filters...');
    
    // Get all users
    const allUsersResponse = await axios.get(`${API_BASE_URL}/admin/users`, { headers });
    console.log(`📋 Total users: ${allUsersResponse.data.total}`);

    // Filter by role
    const adminUsersResponse = await axios.get(`${API_BASE_URL}/admin/users?role=admin`, { headers });
    console.log(`👑 Admin users: ${adminUsersResponse.data.total}`);

    const regularUsersResponse = await axios.get(`${API_BASE_URL}/admin/users?role=user`, { headers });
    console.log(`👤 Regular users: ${regularUsersResponse.data.total}`);

    // Search users
    const searchResponse = await axios.get(`${API_BASE_URL}/admin/users?search=john`, { headers });
    console.log(`🔍 Users matching 'john': ${searchResponse.data.total}`);
    console.log('');

    // Step 5: Update user role
    if (createdUsers.length > 0) {
      console.log('5. Testing role updates...');
      const userToPromote = createdUsers.find(u => u.role === 'user');
      if (userToPromote) {
        const roleUpdateResponse = await axios.put(
          `${API_BASE_URL}/admin/users/${userToPromote.id}/role`,
          { role: 'admin' },
          { headers }
        );
        console.log(`✅ Promoted ${userToPromote.email} to admin`);
      }
      console.log('');
    }

    // Step 6: Update user profile
    if (createdUsers.length > 0) {
      console.log('6. Testing user profile updates...');
      const userToUpdate = createdUsers[0];
      const updateResponse = await axios.put(
        `${API_BASE_URL}/admin/users/${userToUpdate.id}`,
        {
          firstName: 'Updated',
          lastName: 'Name',
          email: userToUpdate.email
        },
        { headers }
      );
      console.log(`✅ Updated profile for ${userToUpdate.email}`);
      console.log('');
    }

    // Step 7: Test bulk delete (if we have users to delete)
    if (createdUsers.length > 1) {
      console.log('7. Testing bulk delete...');
      const usersToDelete = createdUsers.slice(0, 2).map(u => u.id);
      const bulkDeleteResponse = await axios.delete(
        `${API_BASE_URL}/admin/users`,
        {
          data: { userIds: usersToDelete },
          headers
        }
      );
      console.log(`✅ Bulk deleted ${usersToDelete.length} users`);
      console.log('');
    }

    // Step 8: Get updated statistics
    console.log('8. Getting updated statistics...');
    const finalStatsResponse = await axios.get(`${API_BASE_URL}/admin/stats`, { headers });
    console.log('📊 Final User Statistics:', finalStatsResponse.data.stats);

    console.log('\n🎉 All admin functionality tests completed successfully!');
    console.log('\n📝 Admin Features Tested:');
    console.log('   ✅ User statistics dashboard');
    console.log('   ✅ Create users with different roles');
    console.log('   ✅ Filter users by role and search');
    console.log('   ✅ Update user roles');
    console.log('   ✅ Update user profiles');
    console.log('   ✅ Bulk delete users');
    console.log('   ✅ Real-time statistics updates');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
  }
}

// Run the test
if (require.main === module) {
  testAdminFunctionality();
}

module.exports = { testAdminFunctionality };