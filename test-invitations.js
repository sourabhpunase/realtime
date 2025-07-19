const API_BASE = 'http://localhost:3000';

async function testInvitationSystem() {
  const fetch = (await import('node-fetch')).default;
  try {
    console.log('🧪 Testing Invitation System...\n');

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

    // 2. Create a regular user
    console.log('\n2. Creating a regular user...');
    const createUserResponse = await fetch(`${API_BASE}/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${superadminToken}`
      },
      body: JSON.stringify({
        email: 'testuser@example.com',
        password: 'TestUser123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'user'
      })
    });
    const createUserData = await createUserResponse.json();
    
    if (!createUserData.success) {
      console.log('User might already exist, continuing...');
    } else {
      console.log('✅ Regular user created successfully');
    }

    // 3. Login as regular user to get their ID
    console.log('\n3. Logging in as regular user...');
    const userLoginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'testuser@example.com',
        password: 'TestUser123!'
      })
    });
    const userLoginData = await userLoginResponse.json();
    
    if (!userLoginData.success) {
      throw new Error('Failed to login as regular user');
    }
    
    const userToken = userLoginData.token;
    const userId = userLoginData.user.id;
    console.log('✅ Regular user logged in successfully');
    console.log('   User ID:', userId);

    // 4. Create a project as superadmin
    console.log('\n4. Creating a project as superadmin...');
    const createProjectResponse = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${superadminToken}`
      },
      body: JSON.stringify({
        name: 'Test Collaboration Project',
        description: 'A test project for collaboration'
      })
    });
    const createProjectData = await createProjectResponse.json();
    
    if (!createProjectData.success) {
      throw new Error('Failed to create project');
    }
    
    const projectId = createProjectData.project.id;
    console.log('✅ Project created successfully');
    console.log('   Project ID:', projectId);

    // 5. Invite user to project
    console.log('\n5. Inviting user to project...');
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
      throw new Error('Failed to send invitation');
    }
    
    console.log('✅ Invitation sent successfully');
    console.log('   Invitations sent:', inviteData.invitations);

    // 6. Check user's invitations
    console.log('\n6. Checking user\'s invitations...');
    const invitationsResponse = await fetch(`${API_BASE}/invitations`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });
    const invitationsData = await invitationsResponse.json();
    
    if (!invitationsData.success) {
      throw new Error('Failed to get invitations');
    }
    
    console.log('✅ User invitations retrieved successfully');
    console.log('   Number of invitations:', invitationsData.invitations.length);
    
    if (invitationsData.invitations.length > 0) {
      console.log('   First invitation:', {
        id: invitationsData.invitations[0].id,
        projectName: invitationsData.invitations[0].projectName,
        inviterName: invitationsData.invitations[0].inviterName
      });
      
      // 7. Accept the invitation
      console.log('\n7. Accepting the invitation...');
      const acceptResponse = await fetch(`${API_BASE}/invitations/${invitationsData.invitations[0].id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          accept: true
        })
      });
      const acceptData = await acceptResponse.json();
      
      if (!acceptData.success) {
        throw new Error('Failed to accept invitation');
      }
      
      console.log('✅ Invitation accepted successfully');
      console.log('   Message:', acceptData.message);
      
      // 8. Check user's projects
      console.log('\n8. Checking user\'s projects...');
      const projectsResponse = await fetch(`${API_BASE}/projects`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });
      const projectsData = await projectsResponse.json();
      
      if (!projectsData.success) {
        throw new Error('Failed to get projects');
      }
      
      console.log('✅ User projects retrieved successfully');
      console.log('   Number of projects:', projectsData.projects.length);
      
      if (projectsData.projects.length > 0) {
        console.log('   First project:', {
          id: projectsData.projects[0].id,
          name: projectsData.projects[0].name,
          members: projectsData.projects[0].members.length
        });
      }
    } else {
      console.log('❌ No invitations found for user');
    }

    console.log('\n🎉 Invitation system test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testInvitationSystem();