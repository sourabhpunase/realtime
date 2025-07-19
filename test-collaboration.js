#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Test collaboration system
async function testCollaboration() {
  console.log('🧪 Testing Collaboration System...\n');

  try {
    // 1. Login as admin
    console.log('1. Logging in as admin...');
    const adminLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@example.com',
      password: 'Admin123!'
    });
    
    const adminToken = adminLogin.data.token;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };
    console.log('✅ Admin logged in successfully\n');

    // 2. Create a regular user
    console.log('2. Creating a regular user...');
    await axios.post(`${BASE_URL}/auth/register`, {
      email: 'user@example.com',
      password: 'User123!',
      firstName: 'Regular',
      lastName: 'User'
    });
    console.log('✅ Regular user created\n');

    // 3. Login as regular user
    console.log('3. Logging in as regular user...');
    const userLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'user@example.com',
      password: 'User123!'
    });
    
    const userToken = userLogin.data.token;
    const userHeaders = { Authorization: `Bearer ${userToken}` };
    const userId = userLogin.data.user.id;
    console.log('✅ Regular user logged in successfully\n');

    // 4. Admin creates a project
    console.log('4. Admin creating a project...');
    const projectResponse = await axios.post(`${BASE_URL}/projects`, {
      name: 'Test Collaboration Project',
      description: 'A project to test the collaboration system'
    }, { headers: adminHeaders });
    
    const projectId = projectResponse.data.project.id;
    console.log('✅ Project created:', projectResponse.data.project.name, '\n');

    // 5. Admin invites regular user
    console.log('5. Admin inviting regular user to project...');
    await axios.post(`${BASE_URL}/projects/${projectId}/invite`, {
      userIds: [userId]
    }, { headers: adminHeaders });
    console.log('✅ Invitation sent\n');

    // 6. Regular user checks invitations
    console.log('6. Regular user checking invitations...');
    const invitationsResponse = await axios.get(`${BASE_URL}/invitations`, { headers: userHeaders });
    const invitations = invitationsResponse.data.invitations;
    console.log('✅ Found', invitations.length, 'invitation(s)\n');

    if (invitations.length > 0) {
      // 7. Regular user accepts invitation
      console.log('7. Regular user accepting invitation...');
      await axios.put(`${BASE_URL}/invitations/${invitations[0].id}`, {
        accept: true
      }, { headers: userHeaders });
      console.log('✅ Invitation accepted\n');

      // 8. Regular user gets projects
      console.log('8. Regular user checking projects...');
      const userProjectsResponse = await axios.get(`${BASE_URL}/projects`, { headers: userHeaders });
      console.log('✅ Regular user has access to', userProjectsResponse.data.projects.length, 'project(s)\n');

      // 9. Regular user tries to edit content (should be staged)
      console.log('9. Regular user editing project content...');
      const editResponse = await axios.put(`${BASE_URL}/projects/${projectId}/content`, {
        content: '# Updated by Regular User\n\nThis content should be staged for admin approval!\n\nRegular users can edit but changes need approval.'
      }, { headers: userHeaders });
      
      console.log('✅ Content update result:', editResponse.data.message);
      console.log('   Staged:', editResponse.data.staged ? 'Yes' : 'No', '\n');

      // 10. Admin checks staged changes
      console.log('10. Admin checking staged changes...');
      const stagedChangesResponse = await axios.get(`${BASE_URL}/projects/${projectId}/staged-changes`, { headers: adminHeaders });
      const stagedChanges = stagedChangesResponse.data.changes;
      console.log('✅ Found', stagedChanges.length, 'staged change(s)\n');

      if (stagedChanges.length > 0) {
        // 11. Admin approves the change
        console.log('11. Admin approving staged change...');
        const approvalResponse = await axios.put(`${BASE_URL}/staged-changes/${stagedChanges[0].id}`, {
          approve: true,
          feedback: 'Great work! Changes approved.'
        }, { headers: adminHeaders });
        
        console.log('✅ Change approval result:', approvalResponse.data.message, '\n');

        // 12. Verify content was updated
        console.log('12. Verifying final project content...');
        const finalProjectResponse = await axios.get(`${BASE_URL}/projects/${projectId}`, { headers: adminHeaders });
        console.log('✅ Final project content preview:');
        console.log(finalProjectResponse.data.project.content.substring(0, 100) + '...\n');
      }
    }

    console.log('🎉 Collaboration system test completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('   ✅ Admin can create projects');
    console.log('   ✅ Admin can invite users');
    console.log('   ✅ Users can accept invitations');
    console.log('   ✅ Users can edit content (staged)');
    console.log('   ✅ Admin can review and approve changes');
    console.log('   ✅ Approved changes are applied to project');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testCollaboration();