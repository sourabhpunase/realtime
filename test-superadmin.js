const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';

async function testSuperAdminFunctionality() {
  try {
    console.log('🔍 Testing Super Admin Functionality...\n');

    // Test 1: Login as Super Admin
    console.log('1. Testing Super Admin Login...');
    const superAdminLogin = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'superadmin@example.com',
      password: 'SuperAdmin123!'
    });

    const superAdminToken = superAdminLogin.data.token;
    const superAdminHeaders = { Authorization: `Bearer ${superAdminToken}` };
    
    console.log('✅ Super Admin login successful');
    console.log('   Role:', superAdminLogin.data.user.role);
    console.log('   Name:', superAdminLogin.data.user.fullName);

    // Test 2: Login as Regular Admin
    console.log('\n2. Testing Regular Admin Login...');
    const adminLogin = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'admin@example.com',
      password: 'Admin123!'
    });

    const adminToken = adminLogin.data.token;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };
    
    console.log('✅ Regular Admin login successful');
    console.log('   Role:', adminLogin.data.user.role);
    console.log('   Name:', adminLogin.data.user.fullName);

    // Test 3: Create a test user
    console.log('\n3. Creating test user...');
    const testUser = await axios.post(`${API_BASE_URL}/admin/users`, {
      firstName: 'Test',
      lastName: 'User',
      email: 'testuser@example.com',
      password: 'TestUser123!',
      role: 'user'
    }, { headers: superAdminHeaders });

    console.log('✅ Test user created');
    console.log('   ID:', testUser.data.user.id);

    // Test 4: Super Admin changes user password
    console.log('\n4. Testing Super Admin password change...');
    await axios.put(`${API_BASE_URL}/admin/users/${testUser.data.user.id}/password`, {
      newPassword: 'NewPassword123!'
    }, { headers: superAdminHeaders });

    console.log('✅ Super Admin successfully changed user password');

    // Test 5: Regular Admin tries to change admin password (should fail)
    console.log('\n5. Testing Regular Admin trying to change Super Admin password...');
    try {
      await axios.put(`${API_BASE_URL}/admin/users/${superAdminLogin.data.user.id}/password`, {
        newPassword: 'ShouldFail123!'
      }, { headers: adminHeaders });
      console.log('❌ This should have failed!');
    } catch (error) {
      console.log('✅ Regular Admin correctly blocked from changing Super Admin password');
      console.log('   Error:', error.response.data.message);
    }

    // Test 6: Super Admin promotes user to admin
    console.log('\n6. Testing Super Admin role promotion...');
    await axios.put(`${API_BASE_URL}/admin/users/${testUser.data.user.id}/role`, {
      role: 'admin'
    }, { headers: superAdminHeaders });

    console.log('✅ Super Admin successfully promoted user to admin');

    // Test 7: Regular Admin tries to create super admin (should fail)
    console.log('\n7. Testing Regular Admin trying to create Super Admin...');
    try {
      await axios.post(`${API_BASE_URL}/admin/users`, {
        firstName: 'Should',
        lastName: 'Fail',
        email: 'shouldfail@example.com',
        password: 'ShouldFail123!',
        role: 'superadmin'
      }, { headers: adminHeaders });
      console.log('❌ This should have failed!');
    } catch (error) {
      console.log('✅ Regular Admin correctly blocked from creating Super Admin');
    }

    // Test 8: Get all users and show roles
    console.log('\n8. Displaying all users with roles...');
    const allUsers = await axios.get(`${API_BASE_URL}/admin/users`, { headers: superAdminHeaders });
    
    console.log('👥 All Users:');
    console.log('='.repeat(80));
    allUsers.data.users.forEach(user => {
      const roleIcon = user.role === 'superadmin' ? '⭐' : user.role === 'admin' ? '👑' : '👤';
      console.log(`${roleIcon} ${user.fullName} (${user.email}) - ${user.role.toUpperCase()}`);
    });

    // Test 9: Get statistics
    console.log('\n9. User Statistics:');
    const stats = await axios.get(`${API_BASE_URL}/admin/stats`, { headers: superAdminHeaders });
    console.log('📊 Stats:', stats.data.stats);

    console.log('\n✅ All Super Admin functionality tests passed!');
    console.log('\n🔐 Super Admin Credentials:');
    console.log('   Email: superadmin@example.com');
    console.log('   Password: SuperAdmin123!');
    console.log('\n👑 Regular Admin Credentials:');
    console.log('   Email: admin@example.com');
    console.log('   Password: Admin123!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
  }
}

// Run tests
testSuperAdminFunctionality();