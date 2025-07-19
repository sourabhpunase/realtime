const API_BASE = 'http://localhost:3000';

async function createTestUserAndInvite() {
  const fetch = (await import('node-fetch')).default;
  
  try {
    console.log('🧪 Creating test user and sending invitation...\n');

    // 1. Login as superadmin
    console.log('1. Logging in as superadmin...');
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'superadmin@example.com',
        password: 'SuperAdmin123!'
      })
    });
    const loginData = await loginResponse.json();
    
    if (!loginData.success) {
      throw new Error('Failed to login as superadmin');
    }
    
    const superadminToken = loginData.token;
    console.log('✅ Superadmin logged in successfully');

    // 2. Create a test user with a simple email
    console.log('\n2. Creating test user...');
    const createUserResponse = await fetch(`${API_BASE}/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${superadminToken}`
      },
      body: JSON.stringify({
        email: 'testuser@test.com',
        password: 'TestUser123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'user'
      })
    });
    
    let createUserData;
    try {
      createUserData = await createUserResponse.json();
    } catch (e) {
      console.log('User might already exist, continuing...');
    }
    
    if (createUserData && createUserData.success) {
      console.log('✅ Test user created successfully');
    } else {
      console.log('ℹ️ User might already exist, continuing...');
    }

    // 3. Login as test user to get their ID
    console.log('\n3. Logging in as test user...');
    const userLoginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'testuser@test.com',
        password: 'TestUser123!'
      })
    });
    const userLoginData = await userLoginResponse.json();
    
    if (!userLoginData.success) {
      throw new Error('Failed to login as test user: ' + userLoginData.message);
    }
    
    const userToken = userLoginData.token;
    const userId = userLoginData.user.id;
    console.log('✅ Test user logged in successfully');
    console.log('   User ID:', userId);
    console.log('   User Email:', userLoginData.user.email);

    // 4. Create a project as superadmin
    console.log('\n4. Creating a project as superadmin...');
    const createProjectResponse = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${superadminToken}`
      },
      body: JSON.stringify({
        name: 'Collaboration Test Project',
        description: 'A project to test normal user collaboration features'
      })
    });
    const createProjectData = await createProjectResponse.json();
    
    if (!createProjectData.success) {
      throw new Error('Failed to create project: ' + createProjectData.message);
    }
    
    const projectId = createProjectData.project.id;
    console.log('✅ Project created successfully');
    console.log('   Project ID:', projectId);
    console.log('   Project Name:', createProjectData.project.name);

    // 5. Invite test user to project
    console.log('\n5. Inviting test user to project...');
    const inviteResponse = await fetch(`${API_BASE}/projects/${projectId}/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${superadminToken}`
      },
      body: JSON.stringify({
        userIds: [userId]
      })
    });
    const inviteData = await inviteResponse.json();
    
    if (!inviteData.success) {
      throw new Error('Failed to send invitation: ' + inviteData.message);
    }
    
    console.log('✅ Invitation sent successfully');
    console.log('   Invitations sent:', inviteData.invitations);

    // 6. Check test user's invitations
    console.log('\n6. Checking test user\'s invitations...');
    const invitationsResponse = await fetch(`${API_BASE}/invitations`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });
    const invitationsData = await invitationsResponse.json();
    
    if (!invitationsData.success) {
      throw new Error('Failed to get invitations: ' + invitationsData.message);
    }
    
    console.log('✅ Test user invitations retrieved successfully');
    console.log('   Number of invitations:', invitationsData.invitations.length);
    
    if (invitationsData.invitations.length > 0) {
      console.log('   Invitation details:');
      invitationsData.invitations.forEach((inv, index) => {
        console.log(`     ${index + 1}. Project: ${inv.projectName}`);
        console.log(`        Invited by: ${inv.inviterName}`);
        console.log(`        Date: ${new Date(inv.createdAt).toLocaleString()}`);
        console.log(`        ID: ${inv.id}`);
      });
    } else {
      console.log('❌ No invitations found for test user');
    }

    console.log('\n🎉 Test completed successfully!');
    console.log('\n📋 Test User Credentials:');
    console.log('   Email: testuser@test.com');
    console.log('   Password: TestUser123!');
    console.log('\n💡 You can now login with these credentials in the frontend to see the invitations.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
createTestUserAndInvite();