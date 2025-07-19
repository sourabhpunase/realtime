#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function setupDemo() {
  console.log('🎬 Setting up collaboration demo...\n');

  try {
    // 1. Create a regular user
    console.log('1. Creating regular user...');
    try {
      await axios.post(`${BASE_URL}/auth/register`, {
        email: 'user@example.com',
        password: 'User123!',
        firstName: 'Regular',
        lastName: 'User'
      });
      console.log('✅ Regular user created: user@example.com / User123!');
    } catch (error) {
      if (error.response?.data?.message?.includes('already exists')) {
        console.log('✅ Regular user already exists: user@example.com / User123!');
      } else {
        throw error;
      }
    }

    // 2. Login as admin and create a project
    console.log('\n2. Admin creating demo project...');
    const adminLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@example.com',
      password: 'Admin123!'
    });
    
    const adminToken = adminLogin.data.token;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    try {
      const projectResponse = await axios.post(`${BASE_URL}/projects`, {
        name: 'Demo Collaboration Project',
        description: 'A demo project to showcase the staged changes workflow'
      }, { headers: adminHeaders });
      console.log('✅ Demo project created:', projectResponse.data.project.name);
    } catch (error) {
      console.log('✅ Demo project may already exist');
    }

    // 3. Get user ID for invitation
    console.log('\n3. Getting user list for invitation...');
    const usersResponse = await axios.get(`${BASE_URL}/admin/users`, { headers: adminHeaders });
    const regularUser = usersResponse.data.users.find(u => u.email === 'user@example.com');
    
    if (regularUser) {
      // 4. Get projects and invite user
      const projectsResponse = await axios.get(`${BASE_URL}/projects`, { headers: adminHeaders });
      const demoProject = projectsResponse.data.projects.find(p => p.name === 'Demo Collaboration Project');
      
      if (demoProject) {
        console.log('\n4. Inviting regular user to demo project...');
        try {
          await axios.post(`${BASE_URL}/projects/${demoProject.id}/invite`, {
            userIds: [regularUser.id]
          }, { headers: adminHeaders });
          console.log('✅ Invitation sent to regular user');
        } catch (error) {
          console.log('✅ User may already be invited');
        }
      }
    }

    console.log('\n🎉 Demo setup complete!');
    console.log('\n📋 Demo Instructions:');
    console.log('1. Login as admin: admin@example.com / Admin123!');
    console.log('2. Login as user: user@example.com / User123!');
    console.log('3. User accepts invitation and makes changes (staged)');
    console.log('4. Admin reviews and approves changes');
    console.log('\n🌐 Frontend: http://localhost:5173');

  } catch (error) {
    console.error('❌ Setup failed:', error.response?.data?.message || error.message);
  }
}

setupDemo();