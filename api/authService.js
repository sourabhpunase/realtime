const axios = require('axios');
const https = require('https');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Configuration
const SUPABASE_URL = "https://supabase.merai.app";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q";
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const SALT_ROUNDS = 12;

// Headers for Supabase requests
const headers = {
  'apikey': SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json'
};

// HTTPS agent to disable SSL verification (only for development)
const agent = new https.Agent({
  rejectUnauthorized: false
});

class AuthService {
  constructor() {
    this.baseURL = SUPABASE_URL;
    this.headers = headers;
    this.agent = agent;
    this.projects = new Map();
    this.invitations = new Map();
    this.stagedChanges = new Map();
    this.comments = new Map();
    this.projectHistory = new Map();
  }

  // Generate JWT token
  generateJWT(payload, expiresIn = '24h') {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
  }

  // Verify JWT token
  verifyJWT(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  // Hash password
  async hashPassword(password) {
    try {
      const salt = await bcrypt.genSalt(SALT_ROUNDS);
      return await bcrypt.hash(password, salt);
    } catch (error) {
      throw new Error('Password hashing failed');
    }
  }

  // Verify password
  async verifyPassword(password, hashedPassword) {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      throw new Error('Password verification failed');
    }
  }

  // Validate email format
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate password strength
  validatePassword(password) {
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters long' };
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }
    if (!/(?=.*\d)/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' };
    }
    if (!/(?=.*[@$!%*?&])/.test(password)) {
      return { valid: false, message: 'Password must contain at least one special character' };
    }
    return { valid: true };
  }

  // Register new user
  async register(userData) {
    try {
      const { email, password, firstName, lastName } = userData;

      if (!email || !password || !firstName || !lastName) {
        throw new Error('All fields are required');
      }

      if (!this.validateEmail(email)) {
        throw new Error('Invalid email format');
      }

      const passwordValidation = this.validatePassword(password);
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.message);
      }

      // Check if user already exists
      const existingUser = await this.getUserByEmail(email.toLowerCase());
      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Create user data for Supabase
      const newUser = {
        email: email.toLowerCase(),
        password: password,
        email_confirm: true,
        user_metadata: {
          firstName: firstName,
          lastName: lastName,
          fullName: `${firstName} ${lastName}`
        }
      };

      // Insert user into Supabase
      const response = await axios.post(
        `${this.baseURL}/auth/v1/admin/users`,
        newUser,
        { headers: this.headers, httpsAgent: this.agent }
      );

      if (response.status === 200 || response.status === 201) {
        const user = response.data;
        const userRole = user.app_metadata?.role || 'user';
        const token = this.generateJWT({
          sub: user.id,
          email: user.email,
          role: userRole,
          fullName: user.user_metadata?.fullName || `${firstName} ${lastName}`,
          aud: 'authenticated'
        });

        return {
          success: true,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.user_metadata?.firstName || firstName,
            lastName: user.user_metadata?.lastName || lastName,
            fullName: user.user_metadata?.fullName || `${firstName} ${lastName}`,
            role: userRole,
            emailConfirmed: user.email_confirmed || true,
            createdAt: user.created_at
          },
          token
        };
      } else {
        throw new Error('Failed to create user');
      }
    } catch (error) {
      console.error('Registration error:', error.message);
      throw error;
    }
  }

  // Login user
  async login(email, password) {
    try {
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      if (!this.validateEmail(email)) {
        throw new Error('Invalid email format');
      }

      // Get user by email
      const user = await this.getUserByEmail(email);
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // For Supabase users, we'll use the auth endpoint to verify
      try {
        const loginResponse = await axios.post(
          `${this.baseURL}/auth/v1/token?grant_type=password`,
          {
            email: email,
            password: password
          },
          { 
            headers: {
              'apikey': SERVICE_ROLE_KEY,
              'Content-Type': 'application/json'
            },
            httpsAgent: this.agent 
          }
        );

        if (loginResponse.status === 200) {
          const userRole = user.app_metadata?.role || 'user';
          const token = this.generateJWT({
            sub: user.id,
            email: user.email,
            role: userRole,
            fullName: user.user_metadata?.fullName || user.raw_user_meta_data?.fullName,
            aud: 'authenticated'
          });

          return {
            success: true,
            user: {
              id: user.id,
              email: user.email,
              firstName: user.user_metadata?.firstName || user.raw_user_meta_data?.firstName,
              lastName: user.user_metadata?.lastName || user.raw_user_meta_data?.lastName,
              fullName: user.user_metadata?.fullName || user.raw_user_meta_data?.fullName,
              role: userRole,
              emailConfirmed: user.email_confirmed,
              createdAt: user.created_at
            },
            token
          };
        }
      } catch (authError) {
        throw new Error('Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error.message);
      throw error;
    }
  }

  // Get user by email
  async getUserByEmail(email) {
    try {
      const response = await axios.get(
        `${this.baseURL}/auth/v1/admin/users`,
        { headers: this.headers, httpsAgent: this.agent }
      );

      if (response.status === 200) {
        const users = response.data.users || [];
        return users.find(user => user.email?.toLowerCase() === email.toLowerCase());
      }
      return null;
    } catch (error) {
      console.error('Get user by email error:', error.message);
      return null;
    }
  }

  // Get user by ID
  async getUserById(userId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/auth/v1/admin/users/${userId}`,
        { headers: this.headers, httpsAgent: this.agent }
      );

      if (response.status === 200) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Get user by ID error:', error.message);
      return null;
    }
  }

  // Get all users
  async getAllUsers(filters = {}) {
    try {
      const response = await axios.get(
        `${this.baseURL}/auth/v1/admin/users`,
        { headers: this.headers, httpsAgent: this.agent }
      );

      if (response.status === 200) {
        let users = response.data.users || [];
        
        // Transform users to match expected format
        users = users.map(user => ({
          id: user.id,
          email: user.email,
          firstName: user.user_metadata?.firstName || user.raw_user_meta_data?.firstName || '',
          lastName: user.user_metadata?.lastName || user.raw_user_meta_data?.lastName || '',
          fullName: user.user_metadata?.fullName || user.raw_user_meta_data?.fullName || 
                   `${user.user_metadata?.firstName || ''} ${user.user_metadata?.lastName || ''}`.trim(),
          role: user.app_metadata?.role || 'user',
          emailConfirmed: user.email_confirmed || false,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          lastLoginAt: user.last_sign_in_at
        }));

        // Apply filters
        if (filters.role) {
          users = users.filter(user => user.role === filters.role);
        }
        if (filters.search) {
          const searchTerm = filters.search.toLowerCase();
          users = users.filter(user => 
            user.email.toLowerCase().includes(searchTerm) ||
            user.fullName.toLowerCase().includes(searchTerm)
          );
        }

        return { success: true, users, total: users.length };
      }
      return { success: true, users: [], total: 0 };
    } catch (error) {
      console.error('Get all users error:', error.message);
      throw error;
    }
  }

  // Update user role
  async updateUserRole(userId, newRole) {
    try {
      const updatePayload = {
        app_metadata: {
          role: newRole
        }
      };

      const response = await axios.put(
        `${this.baseURL}/auth/v1/admin/users/${userId}`,
        updatePayload,
        { headers: this.headers, httpsAgent: this.agent }
      );

      if (response.status === 200) {
        return {
          success: true,
          message: `User role updated to ${newRole}`,
          user: response.data
        };
      } else {
        throw new Error('Failed to update user role');
      }
    } catch (error) {
      console.error('Update user role error:', error.message);
      throw error;
    }
  }

  // Create user by admin
  async createUserByAdmin(userData) {
    try {
      const result = await this.register(userData);
      
      // Update role if specified
      if (userData.role && userData.role !== 'user') {
        await this.updateUserRole(result.user.id, userData.role);
      }
      
      return result;
    } catch (error) {
      console.error('Create user by admin error:', error.message);
      throw error;
    }
  }

  // Delete user
  async deleteUser(userId) {
    try {
      const response = await axios.delete(
        `${this.baseURL}/auth/v1/admin/users/${userId}`,
        { headers: this.headers, httpsAgent: this.agent }
      );

      if (response.status === 200) {
        return { success: true, message: 'User deleted successfully' };
      } else {
        throw new Error('Failed to delete user');
      }
    } catch (error) {
      console.error('Delete user error:', error.message);
      throw error;
    }
  }

  // Update user
  async updateUser(userId, updateData) {
    try {
      const { firstName, lastName, email } = updateData;
      
      const updatePayload = {
        user_metadata: {
          firstName,
          lastName,
          fullName: `${firstName} ${lastName}`
        }
      };

      if (email) {
        updatePayload.email = email.toLowerCase();
      }

      const response = await axios.put(
        `${this.baseURL}/auth/v1/admin/users/${userId}`,
        updatePayload,
        { headers: this.headers, httpsAgent: this.agent }
      );

      if (response.status === 200) {
        return {
          success: true,
          user: response.data
        };
      } else {
        throw new Error('Failed to update user');
      }
    } catch (error) {
      console.error('Update user error:', error.message);
      throw error;
    }
  }

  // Change user password
  async changeUserPassword(userId, newPassword) {
    try {
      const passwordValidation = this.validatePassword(newPassword);
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.message);
      }

      const updatePayload = {
        password: newPassword
      };

      const response = await axios.put(
        `${this.baseURL}/auth/v1/admin/users/${userId}`,
        updatePayload,
        { headers: this.headers, httpsAgent: this.agent }
      );

      if (response.status === 200) {
        return { success: true, message: 'Password updated successfully' };
      } else {
        throw new Error('Failed to update password');
      }
    } catch (error) {
      console.error('Change user password error:', error.message);
      throw error;
    }
  }

  // Bulk delete users
  async bulkDeleteUsers(userIds) {
    try {
      const results = [];
      const errors = [];

      for (const userId of userIds) {
        try {
          await this.deleteUser(userId);
          results.push(userId);
        } catch (error) {
          errors.push({ userId, error: error.message });
        }
      }

      return {
        success: true,
        message: `${results.length} users deleted successfully`,
        deletedUsers: results,
        errors
      };
    } catch (error) {
      console.error('Bulk delete users error:', error.message);
      throw error;
    }
  }

  // Get user statistics
  async getUserStats() {
    try {
      const response = await this.getAllUsers();
      const users = response.users || [];
      
      const totalUsers = users.length;
      const adminUsers = users.filter(user => user.role === 'admin' || user.role === 'superadmin').length;
      const regularUsers = users.filter(user => user.role === 'user').length;
      const recentUsers = users.filter(user => {
        const createdDate = new Date(user.createdAt);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return createdDate > weekAgo;
      }).length;

      return {
        success: true,
        stats: {
          totalUsers,
          adminUsers,
          regularUsers,
          recentUsers,
          superAdminUsers: users.filter(user => user.role === 'superadmin').length
        }
      };
    } catch (error) {
      console.error('Get user stats error:', error.message);
      throw error;
    }
  }

  // Authentication middleware
  authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    try {
      const decoded = this.verifyJWT(token);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
  }

  // Admin middleware
  requireAdmin(req, res, next) {
    this.authenticateToken(req, res, async () => {
      try {
        const user = await this.getUserById(req.user.sub);
        if (!user || (user.app_metadata?.role !== 'admin' && user.app_metadata?.role !== 'superadmin')) {
          return res.status(403).json({
            success: false,
            message: 'Admin access required'
          });
        }
        next();
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: 'Error checking admin status'
        });
      }
    });
  }

  // Check if user is authenticated
  isAuthenticated(token) {
    try {
      const decoded = this.verifyJWT(token);
      return { authenticated: true, user: decoded };
    } catch (error) {
      return { authenticated: false, error: error.message };
    }
  }

  // Initialize project storage

  async getUserProjects(userId) {
    try {
      const userProjects = Array.from(this.projects.values())
        .filter(project => project.members.includes(userId))
        .map(project => ({
          id: project.id,
          name: project.name,
          description: project.description,
          createdBy: project.createdBy,
          createdByName: project.createdByName,
          members: project.members,
          memberNames: project.memberNames,
          createdAt: project.createdAt,
          lastActivity: project.lastActivity,
          hasStagedChanges: Array.from(this.stagedChanges.values())
            .some(change => change.projectId === project.id && change.status === 'pending')
        }));
      
      return { success: true, projects: userProjects };
    } catch (error) {
      console.error('Get user projects error:', error.message);
      throw error;
    }
  }

  async createProject(creatorId, projectData) {
    try {
      const { name, description } = projectData;
      const creator = await this.getUserById(creatorId);
      
      if (!creator) {
        throw new Error('Creator not found');
      }

      const projectId = crypto.randomUUID();
      const project = {
        id: projectId,
        name: name.trim(),
        description: description.trim(),
        createdBy: creatorId,
        createdByName: creator.user_metadata?.fullName || creator.raw_user_meta_data?.fullName || creator.email,
        members: [creatorId],
        memberNames: [creator.user_metadata?.fullName || creator.raw_user_meta_data?.fullName || creator.email],
        content: '# Welcome to the Project\n\nStart collaborating here...',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };

      this.projects.set(projectId, project);
      console.log('Project created:', project.name, 'by', project.createdByName);

      return {
        success: true,
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          createdBy: project.createdBy,
          createdByName: project.createdByName,
          members: project.members,
          memberNames: project.memberNames,
          createdAt: project.createdAt
        }
      };
    } catch (error) {
      console.error('Create project error:', error.message);
      throw error;
    }
  }

  async getProject(projectId, userId) {
    try {
      const project = this.projects.get(projectId);
      
      if (!project) {
        throw new Error('Project not found');
      }

      if (!project.members.includes(userId)) {
        throw new Error('Access denied to this project');
      }

      const user = await this.getUserById(userId);
      const isAdmin = user && (user.app_metadata?.role === 'admin' || user.app_metadata?.role === 'superadmin');
      
      return {
        success: true,
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          createdBy: project.createdBy,
          createdByName: project.createdByName,
          members: project.members,
          memberNames: project.memberNames,
          content: project.content,
          createdAt: project.createdAt,
          lastActivity: project.lastActivity,
          canEdit: isAdmin || project.createdBy === userId
        }
      };
    } catch (error) {
      console.error('Get project error:', error.message);
      throw error;
    }
  }

  async updateProjectContent(projectId, userId, content) {
    try {
      const project = this.projects.get(projectId);
      
      if (!project) {
        throw new Error('Project not found');
      }

      if (!project.members.includes(userId)) {
        throw new Error('Access denied to this project');
      }

      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      const isAdmin = user && (user.app_metadata?.role === 'admin' || user.app_metadata?.role === 'superadmin');
      const isOwner = project.createdBy === userId;
      const userName = user.user_metadata?.fullName || user.raw_user_meta_data?.fullName || user.email;
      const oldContent = project.content || '';
      const newContent = content || '';

      if (isAdmin || isOwner) {
        // Admin or owner can directly update content
        project.content = newContent;
        project.updatedAt = new Date().toISOString();
        project.lastActivity = new Date().toISOString();
        
        // Add to history
        this.addToProjectHistory(projectId, {
          type: 'commit',
          action: 'direct_edit',
          userId: userId,
          userName: userName,
          message: `Updated project content`,
          oldContent: oldContent,
          newContent: newContent,
          diff: this.generateDiff(oldContent, newContent),
          timestamp: new Date().toISOString()
        });
        
        return {
          success: true,
          message: 'Content updated successfully',
          directUpdate: true
        };
      } else {
        // Normal user - stage the changes
        const changeId = crypto.randomUUID();
        const stagedChange = {
          id: changeId,
          projectId: projectId,
          userId: userId,
          userName: userName,
          originalContent: oldContent,
          proposedContent: newContent,
          status: 'pending',
          createdAt: new Date().toISOString(),
          feedback: null,
          diff: this.generateDiff(oldContent, newContent)
        };

        this.stagedChanges.set(changeId, stagedChange);
        project.lastActivity = new Date().toISOString();

        // Add to history
        this.addToProjectHistory(projectId, {
          type: 'pull_request',
          action: 'staged_changes',
          userId: userId,
          userName: userName,
          message: `Proposed changes for review`,
          changeId: changeId,
          diff: this.generateDiff(oldContent, newContent),
          timestamp: new Date().toISOString()
        });

        return {
          success: true,
          message: 'Changes staged for admin approval',
          staged: true,
          changeId: changeId
        };
      }
    } catch (error) {
      console.error('Update project content error:', error.message);
      throw error;
    }
  }

  async inviteUsersToProject(projectId, inviterId, userIds) {
    try {
      const project = this.projects.get(projectId);
      
      if (!project) {
        throw new Error('Project not found');
      }

      const inviter = await this.getUserById(inviterId);
      if (!inviter) {
        throw new Error('Inviter not found');
      }

      const invitations = [];
      
      for (const userId of userIds) {
        const invitee = await this.getUserById(userId);
        if (!invitee) continue;
        
        if (project.members.includes(userId)) continue;

        const invitationId = crypto.randomUUID();
        const invitation = {
          id: invitationId,
          projectId: projectId,
          projectName: project.name,
          projectDescription: project.description,
          inviterId: inviterId,
          inviterName: inviter.user_metadata?.fullName || inviter.raw_user_meta_data?.fullName || inviter.email,
          inviteeId: userId,
          inviteeName: invitee.user_metadata?.fullName || invitee.raw_user_meta_data?.fullName || invitee.email,
          inviteeEmail: invitee.email,
          status: 'pending',
          createdAt: new Date().toISOString()
        };

        this.invitations.set(invitationId, invitation);
        invitations.push(invitation);
      }

      return {
        success: true,
        message: `${invitations.length} invitations sent`,
        invitations: invitations.length
      };
    } catch (error) {
      console.error('Invite users to project error:', error.message);
      throw error;
    }
  }

  async getUserInvitations(userId) {
    try {
      const invitations = Array.from(this.invitations.values())
        .filter(inv => inv.inviteeId === userId && inv.status === 'pending')
        .map(inv => ({
          id: inv.id,
          projectId: inv.projectId,
          projectName: inv.projectName,
          projectDescription: inv.projectDescription,
          inviterName: inv.inviterName,
          createdAt: inv.createdAt
        }));

      return { success: true, invitations };
    } catch (error) {
      console.error('Get user invitations error:', error.message);
      throw error;
    }
  }

  async getProjectInvitations(projectId) {
    try {
      const invitations = Array.from(this.invitations.values())
        .filter(inv => inv.projectId === projectId)
        .map(inv => ({
          id: inv.id,
          inviteeId: inv.inviteeId,
          inviteeName: inv.inviteeName,
          inviteeEmail: inv.inviteeEmail,
          inviterName: inv.inviterName,
          status: inv.status,
          createdAt: inv.createdAt,
          respondedAt: inv.respondedAt
        }));

      return { success: true, invitations };
    } catch (error) {
      console.error('Get project invitations error:', error.message);
      throw error;
    }
  }

  async respondToInvitation(invitationId, userId, accept) {
    try {
      const invitation = this.invitations.get(invitationId);
      
      if (!invitation) {
        throw new Error('Invitation not found');
      }

      if (invitation.inviteeId !== userId) {
        throw new Error('Access denied to this invitation');
      }

      if (invitation.status !== 'pending') {
        throw new Error('Invitation already responded to');
      }

      if (accept) {
        const project = this.projects.get(invitation.projectId);
        if (project) {
          project.members.push(userId);
          project.memberNames.push(invitation.inviteeName);
          project.lastActivity = new Date().toISOString();
        }
        invitation.status = 'accepted';
      } else {
        invitation.status = 'declined';
      }

      invitation.respondedAt = new Date().toISOString();

      return {
        success: true,
        message: accept ? 'Invitation accepted' : 'Invitation declined',
        accepted: accept
      };
    } catch (error) {
      console.error('Respond to invitation error:', error.message);
      throw error;
    }
  }

  async getStagedChanges(projectId) {
    try {
      const project = this.projects.get(projectId);
      
      if (!project) {
        throw new Error('Project not found');
      }

      const changes = Array.from(this.stagedChanges.values())
        .filter(change => change.projectId === projectId && change.status === 'pending')
        .map(change => ({
          id: change.id,
          userId: change.userId,
          userName: change.userName,
          originalContent: change.originalContent,
          proposedContent: change.proposedContent,
          createdAt: change.createdAt
        }));

      return { success: true, changes, projectName: project.name };
    } catch (error) {
      console.error('Get staged changes error:', error.message);
      throw error;
    }
  }

  async reviewStagedChange(changeId, reviewerId, approve, feedback = null) {
    try {
      const change = this.stagedChanges.get(changeId);
      
      if (!change) {
        throw new Error('Staged change not found');
      }

      if (change.status !== 'pending') {
        throw new Error('Change already reviewed');
      }

      const project = this.projects.get(change.projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      const reviewer = await this.getUserById(reviewerId);
      if (!reviewer) {
        throw new Error('Reviewer not found');
      }

      const reviewerName = reviewer.user_metadata?.fullName || reviewer.raw_user_meta_data?.fullName || reviewer.email;

      if (approve) {
        // Apply the staged changes
        project.content = change.proposedContent;
        change.status = 'approved';
        
        // Add approval to history
        this.addToProjectHistory(change.projectId, {
          type: 'merge',
          action: 'approved_changes',
          userId: reviewerId,
          userName: reviewerName,
          message: `Approved and merged changes from ${change.userName}`,
          originalAuthor: change.userName,
          originalAuthorId: change.userId,
          changeId: changeId,
          feedback: feedback,
          diff: change.diff,
          timestamp: new Date().toISOString()
        });
      } else {
        // Reject the changes
        change.status = 'rejected';
        
        // Add rejection to history
        this.addToProjectHistory(change.projectId, {
          type: 'close',
          action: 'rejected_changes',
          userId: reviewerId,
          userName: reviewerName,
          message: `Rejected changes from ${change.userName}`,
          originalAuthor: change.userName,
          originalAuthorId: change.userId,
          changeId: changeId,
          feedback: feedback,
          timestamp: new Date().toISOString()
        });
      }

      change.reviewedBy = reviewerId;
      change.reviewerName = reviewerName;
      change.reviewedAt = new Date().toISOString();
      change.feedback = feedback;
      project.updatedAt = new Date().toISOString();
      project.lastActivity = new Date().toISOString();

      return {
        success: true,
        message: approve ? 'Changes approved and applied' : 'Changes rejected',
        approved: approve,
        projectId: project.id,
        change: change
      };
    } catch (error) {
      console.error('Review staged change error:', error.message);
      throw error;
    }
  }

  addToProjectHistory(projectId, entry) {
    if (!this.projectHistory.has(projectId)) {
      this.projectHistory.set(projectId, []);
    }
    const history = this.projectHistory.get(projectId);
    history.push({
      id: crypto.randomUUID(),
      ...entry
    });
    // Keep only last 100 entries
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
  }

  generateDiff(oldContent, newContent) {
    const oldLines = (oldContent || '').split('\n');
    const newLines = (newContent || '').split('\n');
    const diff = [];
    
    const maxLines = Math.max(oldLines.length, newLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];
      
      if (oldLine === undefined) {
        diff.push({ type: 'added', line: i + 1, content: newLine });
      } else if (newLine === undefined) {
        diff.push({ type: 'removed', line: i + 1, content: oldLine });
      } else if (oldLine !== newLine) {
        diff.push({ type: 'removed', line: i + 1, content: oldLine });
        diff.push({ type: 'added', line: i + 1, content: newLine });
      }
    }
    
    return diff;
  }

  async getProjectHistory(projectId, userId) {
    try {
      const project = this.projects.get(projectId);
      
      if (!project) {
        throw new Error('Project not found');
      }

      if (!project.members.includes(userId)) {
        throw new Error('Access denied to this project');
      }

      const history = this.projectHistory.get(projectId) || [];
      
      return {
        success: true,
        history: history.slice().reverse() // Return newest first
      };
    } catch (error) {
      console.error('Get project history error:', error.message);
      throw error;
    }
  }

  async getEditHistory(projectId, userId) {
    try {
      const project = this.projects.get(projectId);
      
      if (!project) {
        throw new Error('Project not found');
      }

      if (!project.members.includes(userId)) {
        throw new Error('Access denied to this project');
      }

      const edits = Array.from(this.stagedChanges.values())
        .filter(change => change.projectId === projectId)
        .map(change => ({
          id: change.id,
          userId: change.userId,
          userName: change.userName,
          action: change.status,
          content: change.proposedContent,
          createdAt: change.createdAt,
          reviewedAt: change.reviewedAt,
          feedback: change.feedback
        }));
      
      return {
        success: true,
        edits: edits.slice(-30).reverse() // Return last 30 edits, newest first
      };
    } catch (error) {
      console.error('Get edit history error:', error.message);
      throw error;
    }
  }

  async getProjectComments(projectId, userId) {
    try {
      const project = this.projects.get(projectId);
      
      if (!project) {
        throw new Error('Project not found');
      }

      if (!project.members.includes(userId)) {
        throw new Error('Access denied to this project');
      }

      const comments = Array.from(this.comments.values())
        .filter(comment => comment.projectId === projectId)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      return {
        success: true,
        comments
      };
    } catch (error) {
      console.error('Get project comments error:', error.message);
      throw error;
    }
  }

  async addComment(projectId, userId, commentData) {
    try {
      const project = this.projects.get(projectId);
      
      if (!project) {
        throw new Error('Project not found');
      }

      if (!project.members.includes(userId)) {
        throw new Error('Access denied to this project');
      }

      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const commentId = crypto.randomUUID();
      const comment = {
        id: commentId,
        projectId: projectId,
        userId: userId,
        userName: user.user_metadata?.fullName || user.raw_user_meta_data?.fullName || user.email,
        text: commentData.text.trim(),
        selectedText: commentData.selectedText?.trim() || '',
        startPosition: commentData.startPosition || 0,
        endPosition: commentData.endPosition || 0,
        createdAt: new Date().toISOString()
      };

      this.comments.set(commentId, comment);
      project.lastActivity = new Date().toISOString();

      return {
        success: true,
        comment,
        message: 'Comment added successfully'
      };
    } catch (error) {
      console.error('Add comment error:', error.message);
      throw error;
    }
  }

  async deleteComment(projectId, commentId) {
    try {
      const comment = this.comments.get(commentId);
      
      if (!comment) {
        throw new Error('Comment not found');
      }

      if (comment.projectId !== projectId) {
        throw new Error('Comment does not belong to this project');
      }

      this.comments.delete(commentId);

      return {
        success: true,
        message: 'Comment deleted successfully'
      };
    } catch (error) {
      console.error('Delete comment error:', error.message);
      throw error;
    }
  }

  async getProjectVersions(projectId, userId) {
    return { success: true, versions: [] };
  }

  async getProjectAnalytics(projectId, userId) {
    try {
      const project = this.projects.get(projectId);
      
      if (!project) {
        throw new Error('Project not found');
      }

      const comments = Array.from(this.comments.values())
        .filter(comment => comment.projectId === projectId);
      
      const edits = Array.from(this.stagedChanges.values())
        .filter(change => change.projectId === projectId);

      return {
        success: true,
        analytics: {
          totalEdits: edits.length,
          timeSpent: Math.floor(Math.random() * 300) + 60,
          collaborators: project.members.length,
          comments: comments.length,
          productivity: 'High',
          readabilityScore: 85,
          engagementScore: 90
        }
      };
    } catch (error) {
      console.error('Get project analytics error:', error.message);
      throw error;
    }
  }

  async generateAISuggestions(projectId, content, userId) {
    return { success: true, suggestions: [] };
  }
}

module.exports = AuthService;