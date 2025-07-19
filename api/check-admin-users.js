const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';

async function checkAdminUsers() {
  try {
    console.log('🔍 Checking Admin Users...\n');

    // Login as admin to get token
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'admin@example.com',
      password: 'Admin123!'
    });

    const adminToken = loginResponse.data.token;
    const headers = { Authorization: `Bearer ${adminToken}` };

    // Get all users
    const usersResponse = await axios.get(`${API_BASE_URL}/admin/users`, { headers });
    const users = usersResponse.data.users;

    console.log('👥 All Users:');
    console.log('='.repeat(80));
    users.forEach(user => {
      const roleIcon = user.role === 'admin' ? '👑' : '👤';
      const status = user.role === 'admin' ? 'ADMIN' : 'USER';
      console.log(`${roleIcon} ${user.fullName} (${user.email}) - ${status}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Created: ${new Date(user.createdAt).toLocaleString()}`);
      console.log('');
    });

    // Show admin users specifically
    const adminUsers = users.filter(user => user.role === 'admin');
    console.log('👑 Admin Users Only:');
    console.log('='.repeat(50));
    adminUsers.forEach(admin => {
      console.log(`• ${admin.fullName} (${admin.email})`);
      console.log(`  ID: ${admin.id}`);
    });

    console.log(`\n📊 Summary:`);
    console.log(`Total Users: ${users.length}`);
    console.log(`Admin Users: ${adminUsers.length}`);
    console.log(`Regular Users: ${users.length - adminUsers.length}`);

  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
    console.log('\n💡 Make sure the server is running: npm start in the api folder');
  }
}

checkAdminUsers();