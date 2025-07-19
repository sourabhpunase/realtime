const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const AuthService = require('./authService');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});
const PORT = process.env.PORT || 3000;

const authService = new AuthService();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Test comments endpoint
app.get('/test-comments', (req, res) => {
  res.json({ 
    message: 'Comments endpoint is working',
    routes: [
      'GET /projects/:projectId/comments',
      'POST /projects/:projectId/comments',
      'DELETE /projects/:projectId/comments/:commentId'
    ]
  });
});

// Authentication Routes

// Register endpoint
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    
    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: email, password, firstName, lastName'
      });
    }

    // Trim and validate data
    const userData = {
      email: email.trim().toLowerCase(),
      password: password,
      firstName: firstName.trim(),
      lastName: lastName.trim()
    };
    
    const result = await authService.register(userData);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: result.user,
      token: result.token
    });

  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Login endpoint
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    const result = await authService.login(email.trim().toLowerCase(), password);

    res.json({
      success: true,
      message: 'Login successful',
      user: result.user,
      token: result.token
    });

  } catch (error) {
    console.error('Login error:', error.message);
    res.status(401).json({
      success: false,
      message: error.message
    });
  }
});

// Get current user (protected route)
app.get('/auth/me', (req, res) => {
  authService.authenticateToken(req, res, async () => {
    try {
      const user = await authService.getUserById(req.user.sub);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Use role from JWT token if available, otherwise from database
      const userRole = req.user.role || user.app_metadata?.role || user.role || 'user';

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.user_metadata?.firstName || user.raw_user_meta_data?.firstName,
          lastName: user.user_metadata?.lastName || user.raw_user_meta_data?.lastName,
          fullName: user.user_metadata?.fullName || user.raw_user_meta_data?.fullName,
          role: userRole,
          emailConfirmed: user.email_confirmed,
          createdAt: user.created_at,
          lastLoginAt: user.last_sign_in_at
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });
});

// Update user profile (protected route)
app.put('/auth/profile', (req, res) => {
  authService.authenticateToken(req, res, async () => {
    try {
      const { firstName, lastName, email } = req.body;
      
      const result = await authService.updateUser(req.user.sub, {
        firstName,
        lastName,
        email
      });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: result.user
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });
});

// Update user by admin (admin only)
app.put('/admin/users/:userId', (req, res) => {
  authService.requireAdmin(req, res, async () => {
    try {
      const { userId } = req.params;
      const { firstName, lastName, email } = req.body;
      
      // Check permissions
      const currentUser = await authService.getUserById(req.user.sub);
      const targetUser = await authService.getUserById(userId);
      
      // Admin can only edit regular users (not other admins)
      if (currentUser.role === 'admin' && (targetUser.role === 'admin' || targetUser.role === 'superadmin')) {
        return res.status(403).json({
          success: false,
          message: 'Admin can only edit regular user profiles'
        });
      }
      
      const result = await authService.updateUser(userId, {
        firstName,
        lastName,
        email
      });

      res.json({
        success: true,
        message: 'User updated successfully',
        user: result.user
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });
});

// Change password (protected route)
app.put('/auth/change-password', (req, res) => {
  authService.authenticateToken(req, res, async () => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      const result = await authService.changePassword(
        req.user.sub,
        currentPassword,
        newPassword
      );

      res.json({
        success: true,
        message: result.message
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });
});

// Delete account (protected route)
app.delete('/auth/account', (req, res) => {
  authService.authenticateToken(req, res, async () => {
    try {
      const result = await authService.deleteUser(req.user.sub);

      res.json({
        success: true,
        message: result.message
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });
});

// Verify token endpoint
app.post('/auth/verify-token', (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    const result = authService.isAuthenticated(token);

    if (result.authenticated) {
      res.json({
        success: true,
        authenticated: true,
        user: result.user
      });
    } else {
      res.status(401).json({
        success: false,
        authenticated: false,
        message: result.error
      });
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Admin Routes (protected)

// Get all users (admin only)
app.get('/admin/users', (req, res) => {
  authService.requireAdmin(req, res, async () => {
    try {
      const { role, search } = req.query;
      const filters = {};
      if (role) filters.role = role;
      if (search) filters.search = search;
      
      const result = await authService.getAllUsers(filters);
      res.json({
        success: true,
        users: result.users,
        total: result.total
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });
});

// Create user (admin only)
app.post('/admin/users', (req, res) => {
  authService.requireAdmin(req, res, async () => {
    try {
      const { email, password, firstName, lastName, role = 'user' } = req.body;
      
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required: email, password, firstName, lastName'
        });
      }

      const userData = {
        email: email.trim().toLowerCase(),
        password: password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role: role
      };
      
      const result = await authService.createUserByAdmin(userData);
      res.status(201).json({
        success: true,
        message: 'User created successfully',
        user: result.user
      });
    } catch (error) {
      console.error('Admin create user error:', error.message);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });
});

// Update user role (admin only)
app.put('/admin/users/:userId/role', (req, res) => {
  authService.requireAdmin(req, res, async () => {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      
      if (!role) {
        return res.status(400).json({
          success: false,
          message: 'Role is required'
        });
      }

      // Prevent admin from changing their own role
      if (userId === req.user.sub) {
        return res.status(400).json({
          success: false,
          message: 'Cannot change your own role'
        });
      }

      // Get current user and target user
      const currentUser = await authService.getUserById(req.user.sub);
      const targetUser = await authService.getUserById(userId);
      
      // Only super admin can create/modify super admin roles
      if (role === 'superadmin' && currentUser.role !== 'superadmin') {
        return res.status(403).json({
          success: false,
          message: 'Only super admin can assign super admin role'
        });
      }

      // Admin can only modify regular users, not other admins
      if (currentUser.role === 'admin' && (targetUser.role === 'admin' || targetUser.role === 'superadmin')) {
        return res.status(403).json({
          success: false,
          message: 'Admin can only modify regular user roles'
        });
      }
      
      // Admin cannot promote users to superadmin
      if (currentUser.role === 'admin' && role === 'superadmin') {
        return res.status(403).json({
          success: false,
          message: 'Admin cannot create super admin accounts'
        });
      }

      const result = await authService.updateUserRole(userId, role);
      res.json({
        success: true,
        message: result.message,
        user: result.user
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });
});

// Change user password (admin/superadmin only)
app.put('/admin/users/:userId/password', (req, res) => {
  authService.requireAdmin(req, res, async () => {
    try {
      const { userId } = req.params;
      const { newPassword } = req.body;
      
      if (!newPassword) {
        return res.status(400).json({
          success: false,
          message: 'New password is required'
        });
      }

      // Prevent changing own password through admin endpoint
      if (userId === req.user.sub) {
        return res.status(400).json({
          success: false,
          message: 'Use the profile password change endpoint for your own password'
        });
      }

      // Only super admin can change admin passwords
      const currentUser = await authService.getUserById(req.user.sub);
      const targetUser = await authService.getUserById(userId);
      
      if ((targetUser.role === 'admin' || targetUser.role === 'superadmin') && currentUser.role !== 'superadmin') {
        return res.status(403).json({
          success: false,
          message: 'Only super admin can change admin passwords'
        });
      }

      const result = await authService.changeUserPassword(userId, newPassword);
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });
});

// Get user by ID (admin only)
app.get('/admin/users/:userId', (req, res) => {
  authService.requireAdmin(req, res, async () => {
    try {
      const { userId } = req.params;
      const user = await authService.getUserById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          role: user.role,
          emailConfirmed: user.emailConfirmed,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          lastLoginAt: user.lastLoginAt
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });
});

// Delete user by ID (admin only)
app.delete('/admin/users/:userId', (req, res) => {
  authService.requireAdmin(req, res, async () => {
    try {
      const { userId } = req.params;
      
      // Prevent admin from deleting themselves
      if (userId === req.user.sub) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete your own account'
        });
      }

      // Check permissions
      const currentUser = await authService.getUserById(req.user.sub);
      const targetUser = await authService.getUserById(userId);
      
      // Admin can only delete regular users
      if (currentUser.role === 'admin' && (targetUser.role === 'admin' || targetUser.role === 'superadmin')) {
        return res.status(403).json({
          success: false,
          message: 'Admin can only delete regular users'
        });
      }

      const result = await authService.deleteUser(userId);
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });
});

// Bulk delete users (admin only)
app.delete('/admin/users', (req, res) => {
  authService.requireAdmin(req, res, async () => {
    try {
      const { userIds } = req.body;
      
      if (!userIds || !Array.isArray(userIds)) {
        return res.status(400).json({
          success: false,
          message: 'userIds array is required'
        });
      }

      // Prevent admin from deleting themselves
      if (userIds.includes(req.user.sub)) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete your own account'
        });
      }

      const result = await authService.bulkDeleteUsers(userIds);
      res.json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });
});

// Get user statistics (admin only)
app.get('/admin/stats', (req, res) => {
  authService.requireAdmin(req, res, async () => {
    try {
      const result = await authService.getUserStats();
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });
});

// Collaboration Routes

// Get projects for user
app.get('/projects', (req, res) => {
  authService.authenticateToken(req, res, async () => {
    try {
      const result = await authService.getUserProjects(req.user.sub);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });
});

// Create project (superadmin only)
app.post('/projects', (req, res) => {
  authService.authenticateToken(req, res, async () => {
    try {
      const { name, description } = req.body;
      
      // Check if user is superadmin
      if (req.user.role !== 'superadmin') {
        return res.status(403).json({
          success: false,
          message: 'Only superadmin can create projects'
        });
      }
      
      if (!name || !description) {
        return res.status(400).json({
          success: false,
          message: 'Name and description are required'
        });
      }
      
      const result = await authService.createProject(req.user.sub, { name, description });
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });
});

// Get project by ID
app.get('/projects/:projectId', (req, res) => {
  authService.authenticateToken(req, res, async () => {
    try {
      const { projectId } = req.params;
      const result = await authService.getProject(projectId, req.user.sub);
      res.json(result);
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  });
});

// Update project content (staged for normal users)
app.put('/projects/:projectId/content', (req, res) => {
  authService.authenticateToken(req, res, async () => {
    try {
      const { projectId } = req.params;
      const { content } = req.body;
      
      console.log('Update content request:', { projectId, contentLength: content?.length });
      
      if (content === undefined || content === null) {
        return res.status(400).json({
          success: false,
          message: 'Content is required'
        });
      }
      
      // Allow empty content
      const result = await authService.updateProjectContent(projectId, req.user.sub, content || '');
      res.json(result);
    } catch (error) {
      console.error('Update content error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });
});

// Invite users to project (superadmin only)
app.post('/projects/:projectId/invite', (req, res) => {
  authService.authenticateToken(req, res, async () => {
    try {
      const { projectId } = req.params;
      const { userIds } = req.body;
      
      console.log('Invitation request:', { projectId, userIds, userId: req.user.sub });
      
      // Check if user is superadmin
      if (req.user.role !== 'superadmin') {
        return res.status(403).json({
          success: false,
          message: 'Only superadmin can send invitations'
        });
      }
      
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'userIds array is required and must not be empty'
        });
      }
      
      const result = await authService.inviteUsersToProject(projectId, req.user.sub, userIds);
      console.log('Invitation result:', result);
      res.json(result);
    } catch (error) {
      console.error('Invitation error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });
});

// Get invitations for user
app.get('/invitations', (req, res) => {
  authService.authenticateToken(req, res, async () => {
    try {
      const result = await authService.getUserInvitations(req.user.sub);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });
});

// Get all invitations for project (superadmin only)
app.get('/projects/:projectId/invitations', (req, res) => {
  authService.authenticateToken(req, res, async () => {
    try {
      const { projectId } = req.params;
      
      // Check if user is superadmin
      if (req.user.role !== 'superadmin') {
        return res.status(403).json({
          success: false,
          message: 'Only superadmin can view project invitations'
        });
      }
      
      const result = await authService.getProjectInvitations(projectId);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });
});

// Respond to invitation
app.put('/invitations/:invitationId', (req, res) => {
  authService.authenticateToken(req, res, async () => {
    try {
      const { invitationId } = req.params;
      const { accept } = req.body;
      
      if (typeof accept !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'accept field is required (boolean)'
        });
      }
      
      const result = await authService.respondToInvitation(invitationId, req.user.sub, accept);
      res.json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });
});

// Get staged changes for project (superadmin only)
app.get('/projects/:projectId/staged-changes', (req, res) => {
  authService.authenticateToken(req, res, async () => {
    try {
      const { projectId } = req.params;
      
      // Check if user is superadmin
      if (req.user.role !== 'superadmin') {
        return res.status(403).json({
          success: false,
          message: 'Only superadmin can view staged changes'
        });
      }
      
      const result = await authService.getStagedChanges(projectId);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });
});

// Get comments for project
app.get('/projects/:projectId/comments', (req, res) => {
  authService.authenticateToken(req, res, async () => {
    try {
      const { projectId } = req.params;
      const result = await authService.getProjectComments(projectId, req.user.sub);
      res.json(result);
    } catch (error) {
      console.error('Get comments error:', error);
      res.status(200).json({
        success: true,
        comments: []
      });
    }
  });
});

// Add comment to project
app.post('/projects/:projectId/comments', (req, res) => {
  authService.authenticateToken(req, res, async () => {
    try {
      const { projectId } = req.params;
      const { text, selectedText, startPosition, endPosition } = req.body;
      
      if (!text || !selectedText) {
        return res.status(400).json({
          success: false,
          message: 'Text and selectedText are required'
        });
      }
      
      const result = await authService.addComment(projectId, req.user.sub, {
        text: text.trim(),
        selectedText: selectedText.trim(),
        startPosition: startPosition || 0,
        endPosition: endPosition || selectedText.length
      });
      
      res.status(201).json(result);
    } catch (error) {
      console.error('Add comment error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });
});

// Delete comment (admin only)
app.delete('/projects/:projectId/comments/:commentId', (req, res) => {
  authService.authenticateToken(req, res, async () => {
    try {
      const { projectId, commentId } = req.params;
      
      // Check if user is admin or superadmin
      if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only admins can delete comments'
        });
      }
      
      const result = await authService.deleteComment(projectId, commentId);
      res.json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });
});

// Get project versions
app.get('/projects/:projectId/versions', (req, res) => {
  authService.authenticateToken(req, res, async () => {
    try {
      const { projectId } = req.params;
      const result = await authService.getProjectVersions(projectId, req.user.sub);
      res.json(result);
    } catch (error) {
      console.error('Get versions error:', error);
      res.status(200).json({
        success: true,
        versions: []
      });
    }
  });
});

// Get project analytics
app.get('/projects/:projectId/analytics', (req, res) => {
  authService.authenticateToken(req, res, async () => {
    try {
      const { projectId } = req.params;
      const result = await authService.getProjectAnalytics(projectId, req.user.sub);
      res.json(result);
    } catch (error) {
      console.error('Get analytics error:', error);
      res.status(200).json({
        success: true,
        analytics: {
          totalEdits: 0,
          timeSpent: 0,
          collaborators: 1,
          comments: 0,
          productivity: 'Medium',
          readabilityScore: 75,
          engagementScore: 80
        }
      });
    }
  });
});

// Generate AI suggestions
app.post('/projects/:projectId/ai-suggestions', (req, res) => {
  authService.authenticateToken(req, res, async () => {
    try {
      const { projectId } = req.params;
      const { content } = req.body;
      const result = await authService.generateAISuggestions(projectId, content, req.user.sub);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });
});

// Get project history
app.get('/projects/:projectId/history', (req, res) => {
  authService.authenticateToken(req, res, async () => {
    try {
      const { projectId } = req.params;
      const result = await authService.getProjectHistory(projectId, req.user.sub);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });
});

// Get edit history
app.get('/projects/:projectId/edit-history', (req, res) => {
  authService.authenticateToken(req, res, async () => {
    try {
      const { projectId } = req.params;
      const result = await authService.getEditHistory(projectId, req.user.sub);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });
});

// Approve/reject staged changes (superadmin only)
app.put('/staged-changes/:changeId', (req, res) => {
  authService.authenticateToken(req, res, async () => {
    try {
      const { changeId } = req.params;
      const { approve, feedback } = req.body;
      
      // Check if user is superadmin
      if (req.user.role !== 'superadmin') {
        return res.status(403).json({
          success: false,
          message: 'Only superadmin can approve/reject changes'
        });
      }
      
      if (typeof approve !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'approve field is required (boolean)'
        });
      }
      
      const result = await authService.reviewStagedChange(changeId, req.user.sub, approve, feedback);
      res.json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  });
});

// Test Supabase connection
app.get('/test-supabase', async (req, res) => {
  try {
    console.log('🔍 Testing Supabase connection...');
    console.log('🔍 URL: https://supabase.merai.app');
    
    const axios = require('axios');
    const https = require('https');
    
    const agent = new https.Agent({
      rejectUnauthorized: false
    });
    
    const headers = {
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q',
      'Content-Type': 'application/json'
    };
    
    const response = await axios.get(
      'https://supabase.merai.app/auth/v1/admin/users',
      { 
        headers: headers,
        httpsAgent: agent,
        timeout: 10000
      }
    );
    
    console.log('✅ Supabase connected successfully!');
    console.log('📊 Users found:', response.data.users?.length || 0);
    
    res.json({
      success: true,
      message: 'Supabase connected!',
      userCount: response.data.users?.length || 0,
      users: response.data.users || []
    });
    
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message);
    res.json({
      success: false,
      error: error.message,
      url: 'https://supabase.merai.app',
      details: error.response?.data || null
    });
  }
});

// Get all users from Supabase
app.get('/all-users', async (req, res) => {
  try {
    const users = await authService.getAllUsers();
    res.json({
      success: true,
      message: 'Using Supabase Database',
      userCount: users.users?.length || 0,
      users: users.users || [],
      authSystem: 'Supabase'
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      authSystem: 'Supabase'
    });
  }
});

// Create default admin users in Supabase
app.post('/create-default-admins', async (req, res) => {
  try {
    const results = [];
    
    // Create superadmin
    try {
      const superadmin = await authService.register({
        email: 'superadmin@example.com',
        password: 'SuperAdmin123!',
        firstName: 'Super',
        lastName: 'Admin'
      });
      
      // Update role to superadmin
      await authService.updateUserRole(superadmin.user.id, 'superadmin');
      results.push({ user: 'superadmin@example.com', status: 'created', role: 'superadmin' });
    } catch (error) {
      results.push({ user: 'superadmin@example.com', status: 'exists or failed', error: error.message });
    }
    
    // Create admin
    try {
      const admin = await authService.register({
        email: 'admin@example.com',
        password: 'Admin123!',
        firstName: 'Admin',
        lastName: 'User'
      });
      
      await authService.updateUserRole(admin.user.id, 'admin');
      results.push({ user: 'admin@example.com', status: 'created', role: 'admin' });
    } catch (error) {
      results.push({ user: 'admin@example.com', status: 'exists or failed', error: error.message });
    }
    
    res.json({
      success: true,
      message: 'Default admin users creation attempted',
      results: results
    });
    
  } catch (error) {
    res.json({
      success: false,
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  // Don't exit the process, just log the error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

// Real-time collaboration
const rooms = new Map();

io.on('connection', (socket) => {
  socket.on('join-project', ({ projectId, user }) => {
    socket.join(projectId);
    socket.projectId = projectId;
    socket.user = user;
    
    if (!rooms.has(projectId)) {
      rooms.set(projectId, new Map());
    }
    
    const room = rooms.get(projectId);
    room.set(socket.id, { ...user, socketId: socket.id });
    
    socket.emit('room-users', Array.from(room.values()));
    socket.to(projectId).emit('user-joined', { user: { ...user, socketId: socket.id } });
  });

  socket.on('content-change', ({ content, cursorPosition }) => {
    if (socket.projectId) {
      socket.to(socket.projectId).emit('content-update', {
        content,
        cursorPosition,
        user: socket.user,
        socketId: socket.id
      });
    }
  });

  socket.on('cursor-move', ({ x, y, relativeX, relativeY, textPosition }) => {
    if (socket.projectId) {
      socket.to(socket.projectId).emit('cursor-update', {
        x, y, relativeX, relativeY, textPosition,
        user: socket.user, socketId: socket.id,
        timestamp: Date.now()
      });
    }
  });

  socket.on('comment-added', (comment) => {
    if (socket.projectId) {
      socket.to(socket.projectId).emit('comment-added', comment);
    }
  });

  socket.on('comment-deleted', ({ commentId }) => {
    if (socket.projectId) {
      socket.to(socket.projectId).emit('comment-deleted', { commentId });
    }
  });

  socket.on('user-typing', ({ isTyping }) => {
    if (socket.projectId && socket.user) {
      socket.to(socket.projectId).emit('user-typing', {
        socketId: socket.id,
        isTyping,
        user: socket.user
      });
    }
  });

  socket.on('cursor-position', ({ textPosition }) => {
    if (socket.projectId && socket.user) {
      socket.to(socket.projectId).emit('cursor-position', {
        socketId: socket.id,
        textPosition,
        user: socket.user,
        timestamp: Date.now()
      });
    }
  });

  socket.on('content-saved', ({ userName }) => {
    if (socket.projectId) {
      socket.to(socket.projectId).emit('content-saved', {
        userName,
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on('history-update', () => {
    if (socket.projectId) {
      socket.to(socket.projectId).emit('history-updated');
    }
  });

  socket.on('disconnect', () => {
    if (socket.projectId) {
      const room = rooms.get(socket.projectId);
      if (room) {
        room.delete(socket.id);
        if (room.size === 0) {
          rooms.delete(socket.projectId);
        } else {
          socket.to(socket.projectId).emit('user-left', { socketId: socket.id });
        }
      }
    }
  });
});

// Start server with error handling
server.listen(PORT, () => {
  console.log(`🚀 Authentication server running on port ${PORT}`);
  console.log(`📝 Register: POST http://localhost:${PORT}/auth/register`);
  console.log(`🔑 Login: POST http://localhost:${PORT}/auth/login`);
  console.log(`👤 Profile: GET http://localhost:${PORT}/auth/me`);
  console.log(`👑 Admin Panel: GET http://localhost:${PORT}/admin/users`);
  console.log(`📊 Admin Stats: GET http://localhost:${PORT}/admin/stats`);
  console.log(`🔒 Protected routes require Authorization: Bearer <token>`);
  console.log(`\n🔐 Default Admin Credentials:`);
  console.log(`   Email: admin@example.com`);
  console.log(`   Password: Admin123!`);
  console.log(`\n✅ Server is ready to accept connections!`);
  console.log(`Press Ctrl+C to stop the server\n`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please use a different port or kill the existing process.`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', error);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = app;