const http = require('http');

const API_BASE_URL = 'http://localhost:3000';

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (error) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testAdminFunctionality() {
  console.log('🔐 Testing Admin Functionality...\n');

  try {
    // Step 1: Login as admin
    console.log('1. 🔑 Logging in as admin...');
    const loginOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const loginData = {
      email: 'admin@example.com',
      password: 'Admin123!'
    };

    const loginResponse = await makeRequest(loginOptions, loginData);
    
    if (loginResponse.status !== 200) {
      console.log('❌ Admin login failed:', loginResponse.data);
      return;
    }

    console.log('✅ Admin login successful!');
    const adminToken = loginResponse.data.token;
    console.log('Admin user:', loginResponse.data.user);

    // Step 2: Get all users
    console.log('\n2. 👥 Getting all users...');
    const getUsersOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/admin/users',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    };

    const usersResponse = await makeRequest(getUsersOptions);
    
    if (usersResponse.status === 200) {
      console.log('✅ Users retrieved successfully!');
      console.log(`Total users: ${usersResponse.data.total}`);
      usersResponse.data.users.forEach(user => {
        console.log(`- ${user.fullName} (${user.email}) - Role: ${user.role}`);
      });
    } else {
      console.log('❌ Failed to get users:', usersResponse.data);
    }

    // Step 3: Create a new user
    console.log('\n3. ➕ Creating a new user...');
    const createUserOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/admin/users',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    };

    const newUserData = {
      firstName: 'Test',
      lastName: 'User',
      email: 'testuser@example.com',
      password: 'TestPass123!',
      role: 'user'
    };

    const createResponse = await makeRequest(createUserOptions, newUserData);
    
    if (createResponse.status === 201) {
      console.log('✅ User created successfully!');
      console.log('New user:', createResponse.data.user);
    } else {
      console.log('❌ Failed to create user:', createResponse.data);
    }

    // Step 4: Get updated user list
    console.log('\n4. 🔄 Getting updated user list...');
    const updatedUsersResponse = await makeRequest(getUsersOptions);
    
    if (updatedUsersResponse.status === 200) {
      console.log('✅ Updated users list:');
      console.log(`Total users: ${updatedUsersResponse.data.total}`);
      updatedUsersResponse.data.users.forEach(user => {
        console.log(`- ${user.fullName} (${user.email}) - Role: ${user.role}`);
      });
    }

    console.log('\n🎉 Admin functionality test completed!');
    console.log('\n📝 Admin credentials:');
    console.log('Email: admin@example.com');
    console.log('Password: Admin123!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testAdminFunctionality();