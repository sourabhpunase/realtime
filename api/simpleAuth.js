const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const SALT_ROUNDS = 12;

class SimpleAuthService {
  constructor() {
    // In-memory user storage (replace with database in production)
    this.users = new Map();
    this.projects = new Map();
    this.invitations = new Map();
    this.stagedChanges = new Map();
    this.comments = new Map();
    this.projectVersions = new Map();
    this.projectAnalytics = new Map();
    this.activityHistory = new Map();
    this.editHistory = new Map();
    console.log('✅ SimpleAuthService initialized successfully');
    
    // Initialize default admin user
    setTimeout(() => {
      this.initializeDefaultAdmin();
    }, 100);
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
  async register(userData, isAdminCreated = false) {
    try {
      const { email, password, firstName, lastName, role = 'user' } = userData;

      console.log('Registration attempt with data:', { email, firstName, lastName, role });

      // Validate input
      if (!email || !password || !firstName || !lastName) {
        throw new Error('All fields are required');
      }

      // Validate email format
      if (!this.validateEmail(email)) {
        throw new Error('Invalid email format');
      }

      // Validate password strength
      const passwordValidation = this.validatePassword(password);
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.message);
      }

      // Check if user already exists
      const normalizedEmail = email.toLowerCase();
      if (this.users.has(normalizedEmail)) {
        throw new Error('User already exists with this email');
      }

      // Hash password
      const hashedPassword = await this.hashPassword(password);

      // Create user
      const userId = crypto.randomUUID();
      const userRole = ['admin', 'superadmin'].includes(role) ? role : 'user';
      const user = {
        id: userId,
        email: normalizedEmail,
        password: hashedPassword,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName: `${firstName.trim()} ${lastName.trim()}`,
        role: userRole,
        emailConfirmed: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: isAdminCreated ? 'admin' : 'self'
      };

      // Store user
      this.users.set(normalizedEmail, user);

      // Generate token
      const token = this.generateJWT({
        sub: userId,
        email: normalizedEmail,
        role: userRole,
        aud: 'authenticated'
      });

      console.log('User registered successfully:', { email: user.email, firstName: user.firstName, role: user.role });

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          role: user.role,
          emailConfirmed: user.emailConfirmed,
          createdAt: user.createdAt
        },
        token
      };
    } catch (error) {
      console.error('Registration error:', error.message);
      throw error;
    }
  }

  // Login user
  async login(email, password) {
    try {
      console.log('Login attempt for email:', email);

      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      if (!this.validateEmail(email)) {
        throw new Error('Invalid email format');
      }

      // Get user
      const normalizedEmail = email.toLowerCase();
      const user = this.users.get(normalizedEmail);
      
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Verify password
      const isValidPassword = await this.verifyPassword(password, user.password);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // Update last login time
      user.lastLoginAt = new Date().toISOString();

      // Generate token
      const token = this.generateJWT({
        sub: user.id,
        email: user.email,
        role: user.role || 'user',
        aud: 'authenticated'
      });

      console.log('Login successful for user:', user.email, 'with role:', user.role);

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          role: user.role || 'user',
          emailConfirmed: user.emailConfirmed,
          createdAt: user.createdAt
        },
        token
      };
    } catch (error) {
      console.error('Login error:', error.message);
      throw error;
    }
  }

  // Get user by ID
  async getUserById(userId) {
    for (const user of this.users.values()) {
      if (user.id === userId) {
        return user;
      }
    }
    return null;
  }

  // Get user by email
  async getUserByEmail(email) {
    return this.users.get(email.toLowerCase()) || null;
  }

  // Update user
  async updateUser(userId, updateData) {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const { firstName, lastName, email } = updateData;
      
      if (firstName) user.firstName = firstName.trim();
      if (lastName) user.lastName = lastName.trim();
      if (firstName || lastName) {
        user.fullName = `${user.firstName} ${user.lastName}`;
      }
      
      if (email && email !== user.email) {
        const normalizedEmail = email.toLowerCase();
        if (this.users.has(normalizedEmail)) {
          throw new Error('Email already in use');
        }
        
        // Update email key in map
        this.users.delete(user.email);
        user.email = normalizedEmail;
        this.users.set(normalizedEmail, user);
      }

      user.updatedAt = new Date().toISOString();

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          emailConfirmed: user.emailConfirmed,
          createdAt: user.createdAt
        }
      };
    } catch (error) {
      console.error('Update user error:', error.message);
      throw error;
    }
  }

  // Change password
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isValidPassword = await this.verifyPassword(currentPassword, user.password);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      // Validate new password
      const passwordValidation = this.validatePassword(newPassword);
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.message);
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);
      user.password = hashedPassword;
      user.updatedAt = new Date().toISOString();

      return { success: true, message: 'Password updated successfully' };
    } catch (error) {
      console.error('Change password error:', error.message);
      throw error;
    }
  }

  // Delete user
  async deleteUser(userId) {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      this.users.delete(user.email);
      return { success: true, message: 'User deleted successfully' };
    } catch (error) {
      console.error('Delete user error:', error.message);
      throw error;
    }
  }

  // Get all users (admin only)
  async getAllUsers(filters = {}) {
    try {
      let users = Array.from(this.users.values()).map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        role: user.role || 'user',
        emailConfirmed: user.emailConfirmed,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        createdBy: user.createdBy || 'self',
        lastLoginAt: user.lastLoginAt || null
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

      // Sort by creation date (newest first)
      users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return { success: true, users, total: users.length };
    } catch (error) {
      console.error('Get all users error:', error.message);
      throw error;
    }
  }

  // Create user by admin
  async createUserByAdmin(userData) {
    try {
      return await this.register(userData, true);
    } catch (error) {
      console.error('Create user by admin error:', error.message);
      throw error;
    }
  }

  // Update user role (admin only)
  async updateUserRole(userId, newRole) {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (!['user', 'admin', 'superadmin'].includes(newRole)) {
        throw new Error('Invalid role. Must be "user", "admin", or "superadmin"');
      }

      user.role = newRole;
      user.updatedAt = new Date().toISOString();

      console.log(`User role updated: ${user.email} -> ${newRole}`);

      return {
        success: true,
        message: `User role updated to ${newRole}`,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          role: user.role,
          emailConfirmed: user.emailConfirmed,
          createdAt: user.createdAt
        }
      };
    } catch (error) {
      console.error('Update user role error:', error.message);
      throw error;
    }
  }

  // Change user password (admin/superadmin only)
  async changeUserPassword(userId, newPassword) {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Validate new password
      const passwordValidation = this.validatePassword(newPassword);
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.message);
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);
      user.password = hashedPassword;
      user.updatedAt = new Date().toISOString();

      console.log(`Password changed for user: ${user.email}`);

      return { success: true, message: 'Password updated successfully' };
    } catch (error) {
      console.error('Change user password error:', error.message);
      throw error;
    }
  }

  // Bulk delete users (admin only)
  async bulkDeleteUsers(userIds) {
    try {
      const deletedUsers = [];
      const errors = [];

      for (const userId of userIds) {
        try {
          const user = await this.getUserById(userId);
          if (user) {
            this.users.delete(user.email);
            deletedUsers.push(user.email);
          }
        } catch (error) {
          errors.push({ userId, error: error.message });
        }
      }

      return {
        success: true,
        message: `${deletedUsers.length} users deleted successfully`,
        deletedUsers,
        errors
      };
    } catch (error) {
      console.error('Bulk delete users error:', error.message);
      throw error;
    }
  }

  // Get user statistics (admin only)
  async getUserStats() {
    try {
      const users = Array.from(this.users.values());
      const totalUsers = users.length;
      const adminUsers = users.filter(user => user.role === 'admin').length;
      const superAdminUsers = users.filter(user => user.role === 'superadmin').length;
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
          adminUsers: adminUsers + superAdminUsers,
          regularUsers,
          recentUsers,
          superAdminUsers
        }
      };
    } catch (error) {
      console.error('Get user stats error:', error.message);
      throw error;
    }
  }

  // Check if user is admin or superadmin
  isAdmin(userId) {
    const user = Array.from(this.users.values()).find(u => u.id === userId);
    return user && (user.role === 'admin' || user.role === 'superadmin');
  }

  // Check if user is superadmin
  isSuperAdmin(userId) {
    const user = Array.from(this.users.values()).find(u => u.id === userId);
    return user && user.role === 'superadmin';
  }

  // Admin middleware
  requireAdmin(req, res, next) {
    this.authenticateToken(req, res, () => {
      if (!this.isAdmin(req.user.sub)) {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }
      next();
    });
  }

  // Initialize default admin user
  async initializeDefaultAdmin() {
    try {
      const adminEmail = 'admin@example.com';
      const superAdminEmail = 'superadmin@example.com';
      
      if (!this.users.has(adminEmail)) {
        await this.register({
          email: adminEmail,
          password: 'Admin123!',
          firstName: 'System',
          lastName: 'Administrator',
          role: 'admin'
        }, true);
        console.log('✅ Default admin user created:', adminEmail, 'password: Admin123!');
      }
      
      if (!this.users.has(superAdminEmail)) {
        await this.register({
          email: superAdminEmail,
          password: 'SuperAdmin123!',
          firstName: 'Super',
          lastName: 'Administrator',
          role: 'superadmin'
        }, true);
        console.log('✅ Default super admin user created:', superAdminEmail, 'password: SuperAdmin123!');
      }
    } catch (error) {
      console.error('Failed to create default admin:', error.message);
    }
  }

  // Middleware to authenticate requests
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

  // Check if user is authenticated
  isAuthenticated(token) {
    try {
      const decoded = this.verifyJWT(token);
      return { authenticated: true, user: decoded };
    } catch (error) {
      return { authenticated: false, error: error.message };
    }
  }

  // Project Management Methods

  // Create project
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
        createdByName: creator.fullName,
        members: [creatorId],
        memberNames: [creator.fullName],
        content: '# Welcome to the Project\n\nStart collaborating here...',
        stagedContent: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };

      this.projects.set(projectId, project);
      console.log('Project created:', project.name, 'by', creator.fullName);

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

  // Get user projects
  async getUserProjects(userId) {
    try {
      const projects = Array.from(this.projects.values())
        .filter(project => project.members.includes(userId))
        .map(project => {
          // Get pending invitations count for this project
          const pendingInvitations = Array.from(this.invitations.values())
            .filter(inv => inv.projectId === project.id && inv.status === 'pending').length;
          
          return {
            id: project.id,
            name: project.name,
            description: project.description,
            createdBy: project.createdBy,
            createdByName: project.createdByName,
            members: project.members,
            memberNames: project.memberNames,
            createdAt: project.createdAt,
            lastActivity: project.lastActivity,
            hasStagedChanges: project.stagedContent !== null,
            pendingInvitations
          };
        });

      return { success: true, projects };
    } catch (error) {
      console.error('Get user projects error:', error.message);
      throw error;
    }
  }

  // Get project by ID
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
      const isAdmin = user && (user.role === 'admin' || user.role === 'superadmin');
      
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
          stagedContent: isAdmin ? project.stagedContent : null,
          createdAt: project.createdAt,
          lastActivity: project.lastActivity,
          hasStagedChanges: project.stagedContent !== null,
          canEdit: isAdmin || project.createdBy === userId
        }
      };
    } catch (error) {
      console.error('Get project error:', error.message);
      throw error;
    }
  }

  // Update project content
  async updateProjectContent(projectId, userId, content) {
    try {
      console.log('Updating project content:', { projectId, userId, contentLength: content?.length });
      
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
      
      const isAdmin = user && (user.role === 'admin' || user.role === 'superadmin');
      const isOwner = project.createdBy === userId;

      // Ensure content is a string
      const safeContent = content !== undefined && content !== null ? String(content) : '';

      if (isAdmin || isOwner) {
        // Save to history before updating
        this.saveEditHistory(projectId, userId, project.content, safeContent, 'direct_edit');
        
        // Admin or owner can directly update content
        project.content = safeContent;
        project.updatedAt = new Date().toISOString();
        project.lastActivity = new Date().toISOString();
        
        console.log('Content updated directly by admin/owner');
        
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
          userName: user.fullName,
          originalContent: project.content || '',
          proposedContent: safeContent,
          status: 'pending',
          createdAt: new Date().toISOString(),
          feedback: null
        };

        this.stagedChanges.set(changeId, stagedChange);
        project.stagedContent = safeContent;
        project.lastActivity = new Date().toISOString();

        console.log('Content staged for approval');

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

  // Invite users to project
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
          inviterName: inviter.fullName,
          inviteeId: userId,
          inviteeName: invitee.fullName,
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

  // Get user invitations
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

  // Get project invitations (for superadmin)
  async getProjectInvitations(projectId) {
    try {
      const invitations = Array.from(this.invitations.values())
        .filter(inv => inv.projectId === projectId)
        .map(inv => ({
          id: inv.id,
          inviteeName: inv.inviteeName,
          inviteeEmail: inv.inviteeEmail,
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

  // Respond to invitation
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

  // Get staged changes for project
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

  // Review staged change
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

      if (approve) {
        // Apply the staged changes
        project.content = change.proposedContent;
        project.stagedContent = null;
        change.status = 'approved';
      } else {
        // Reject the changes
        project.stagedContent = null;
        change.status = 'rejected';
      }

      change.reviewedBy = reviewerId;
      change.reviewerName = reviewer.fullName;
      change.reviewedAt = new Date().toISOString();
      change.feedback = feedback;
      project.updatedAt = new Date().toISOString();
      project.lastActivity = new Date().toISOString();

      return {
        success: true,
        message: approve ? 'Changes approved and applied' : 'Changes rejected',
        approved: approve
      };
    } catch (error) {
      console.error('Review staged change error:', error.message);
      throw error;
    }
  }

  // Comment Management Methods

  // Get project comments
  async getProjectComments(projectId, userId) {
    try {
      const project = this.projects.get(projectId);
      
      if (!project) {
        throw new Error('Project not found');
      }

      if (!project.members.includes(userId)) {
        throw new Error('Access denied to this project');
      }

      const comments = Array.from(this.comments?.values() || [])
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

  // Add comment
  async addComment(projectId, userId, commentData) {
    try {
      console.log('Adding comment:', { projectId, userId, commentData });
      
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

      if (!commentData.text || !commentData.selectedText) {
        throw new Error('Comment text and selected text are required');
      }

      const commentId = crypto.randomUUID();
      const comment = {
        id: commentId,
        projectId: projectId,
        userId: userId,
        userName: user.fullName,
        text: commentData.text.trim(),
        selectedText: commentData.selectedText.trim(),
        startPosition: commentData.startPosition || 0,
        endPosition: commentData.endPosition || commentData.selectedText.length,
        createdAt: new Date().toISOString()
      };

      // Initialize comments map if it doesn't exist
      if (!this.comments) {
        this.comments = new Map();
      }

      this.comments.set(commentId, comment);
      project.lastActivity = new Date().toISOString();
      
      // Add to activity history
      this.addActivityHistory(projectId, userId, 'comment_added', {
        commentId,
        text: commentData.text,
        selectedText: commentData.selectedText
      });

      console.log('Comment added successfully:', comment);

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

  // Delete comment
  async deleteComment(projectId, commentId) {
    try {
      if (!this.comments) {
        throw new Error('Comment not found');
      }

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

  // Revolutionary Features

  // Get project versions
  async getProjectVersions(projectId, userId) {
    try {
      const project = this.projects.get(projectId);
      
      if (!project) {
        throw new Error('Project not found');
      }

      if (!project.members.includes(userId)) {
        throw new Error('Access denied to this project');
      }

      const versions = Array.from(this.projectVersions?.values() || [])
        .filter(version => version.projectId === projectId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return {
        success: true,
        versions
      };
    } catch (error) {
      console.error('Get project versions error:', error.message);
      throw error;
    }
  }

  // Get project analytics
  async getProjectAnalytics(projectId, userId) {
    try {
      const project = this.projects.get(projectId);
      
      if (!project) {
        throw new Error('Project not found');
      }

      if (!project.members.includes(userId)) {
        throw new Error('Access denied to this project');
      }

      const analytics = {
        totalEdits: Math.floor(Math.random() * 100) + 20,
        timeSpent: Math.floor(Math.random() * 300) + 60, // minutes
        collaborators: project.members.length,
        comments: Array.from(this.comments?.values() || [])
          .filter(comment => comment.projectId === projectId).length,
        productivity: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)],
        readabilityScore: Math.floor(Math.random() * 30) + 70,
        engagementScore: Math.floor(Math.random() * 20) + 80
      };

      return {
        success: true,
        analytics
      };
    } catch (error) {
      console.error('Get project analytics error:', error.message);
      throw error;
    }
  }

  // Generate AI suggestions
  async generateAISuggestions(projectId, content, userId) {
    try {
      const project = this.projects.get(projectId);
      
      if (!project) {
        throw new Error('Project not found');
      }

      if (!project.members.includes(userId)) {
        throw new Error('Access denied to this project');
      }

      // Mock AI suggestions
      const suggestions = [
        {
          type: 'grammar',
          text: 'Consider using active voice for better clarity',
          position: Math.floor(Math.random() * content.length),
          confidence: 0.85
        },
        {
          type: 'style',
          text: 'This sentence could be more concise',
          position: Math.floor(Math.random() * content.length),
          confidence: 0.72
        },
        {
          type: 'content',
          text: 'Add more details about implementation',
          position: Math.floor(Math.random() * content.length),
          confidence: 0.68
        },
        {
          type: 'structure',
          text: 'Consider adding subheadings for better organization',
          position: Math.floor(Math.random() * content.length),
          confidence: 0.91
        }
      ];

      return {
        success: true,
        suggestions: suggestions.slice(0, Math.floor(Math.random() * 3) + 1)
      };
    } catch (error) {
      console.error('Generate AI suggestions error:', error.message);
      throw error;
    }
  }

  // Save project version
  async saveProjectVersion(projectId, userId, content, versionName = null) {
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

      const versionId = crypto.randomUUID();
      const version = {
        id: versionId,
        projectId: projectId,
        userId: userId,
        userName: user.fullName,
        content: content,
        name: versionName || `Version ${new Date().toLocaleString()}`,
        createdAt: new Date().toISOString()
      };

      if (!this.projectVersions) {
        this.projectVersions = new Map();
      }

      this.projectVersions.set(versionId, version);

      return {
        success: true,
        version,
        message: 'Version saved successfully'
      };
    } catch (error) {
      console.error('Save project version error:', error.message);
      throw error;
    }
  }

  // Track project analytics
  async trackProjectActivity(projectId, userId, activity) {
    try {
      if (!this.projectAnalytics) {
        this.projectAnalytics = new Map();
      }

      const analyticsKey = `${projectId}-${userId}`;
      let analytics = this.projectAnalytics.get(analyticsKey) || {
        projectId,
        userId,
        activities: [],
        totalTime: 0,
        edits: 0,
        lastActivity: null
      };

      analytics.activities.push({
        type: activity.type,
        timestamp: new Date().toISOString(),
        data: activity.data
      });

      if (activity.type === 'edit') {
        analytics.edits++;
      }

      analytics.lastActivity = new Date().toISOString();
      this.projectAnalytics.set(analyticsKey, analytics);

      return {
        success: true,
        message: 'Activity tracked successfully'
      };
    } catch (error) {
      console.error('Track project activity error:', error.message);
      throw error;
    }
  }

  // History Tracking Methods

  // Save edit history
  saveEditHistory(projectId, userId, oldContent, newContent, editType = 'edit') {
    try {
      // Get user synchronously from existing data
      let user = null;
      for (const u of this.users.values()) {
        if (u.id === userId) {
          user = u;
          break;
        }
      }
      
      if (!user) {
        console.warn('User not found for history:', userId);
        return;
      }

      const historyId = crypto.randomUUID();
      const historyEntry = {
        id: historyId,
        projectId,
        userId,
        userName: user.fullName,
        editType,
        oldContent: oldContent || '',
        newContent: newContent || '',
        timestamp: new Date().toISOString(),
        changes: this.calculateChanges(oldContent || '', newContent || ''),
        diff: this.generateDiff(oldContent || '', newContent || '')
      };

      if (!this.editHistory.has(projectId)) {
        this.editHistory.set(projectId, []);
      }
      
      const projectHistory = this.editHistory.get(projectId);
      projectHistory.push(historyEntry);
      
      console.log('Edit history saved:', historyEntry);
      
      // Keep only last 100 entries per project
      if (projectHistory.length > 100) {
        projectHistory.shift();
      }
      
      return historyEntry;
    } catch (error) {
      console.error('Save edit history error:', error);
    }
  }

  // Add activity history
  addActivityHistory(projectId, userId, activityType, data = {}) {
    try {
      // Get user synchronously
      let user = null;
      for (const u of this.users.values()) {
        if (u.id === userId) {
          user = u;
          break;
        }
      }
      
      if (!user) {
        console.warn('User not found for activity:', userId);
        return;
      }

      const activityId = crypto.randomUUID();
      const activity = {
        id: activityId,
        projectId,
        userId,
        userName: user.fullName,
        activityType,
        data,
        timestamp: new Date().toISOString()
      };

      if (!this.activityHistory.has(projectId)) {
        this.activityHistory.set(projectId, []);
      }
      
      const projectActivities = this.activityHistory.get(projectId);
      projectActivities.push(activity);
      
      console.log('Activity history saved:', activity);
      
      // Keep only last 200 activities per project
      if (projectActivities.length > 200) {
        projectActivities.shift();
      }
      
      return activity;
    } catch (error) {
      console.error('Add activity history error:', error);
    }
  }

  // Calculate changes between two texts
  calculateChanges(oldText, newText) {
    const oldWords = oldText.split(/\s+/).filter(w => w.length > 0);
    const newWords = newText.split(/\s+/).filter(w => w.length > 0);
    
    return {
      oldLength: oldText.length,
      newLength: newText.length,
      oldWordCount: oldWords.length,
      newWordCount: newWords.length,
      charactersAdded: Math.max(0, newText.length - oldText.length),
      charactersRemoved: Math.max(0, oldText.length - newText.length),
      wordsAdded: Math.max(0, newWords.length - oldWords.length),
      wordsRemoved: Math.max(0, oldWords.length - newWords.length)
    };
  }

  // Generate GitHub-style diff
  generateDiff(oldText, newText) {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    const diff = [];
    
    let oldIndex = 0;
    let newIndex = 0;
    
    while (oldIndex < oldLines.length || newIndex < newLines.length) {
      const oldLine = oldLines[oldIndex];
      const newLine = newLines[newIndex];
      
      if (oldIndex >= oldLines.length) {
        // Only new lines left
        diff.push({ type: 'added', content: newLine, lineNumber: newIndex + 1 });
        newIndex++;
      } else if (newIndex >= newLines.length) {
        // Only old lines left
        diff.push({ type: 'removed', content: oldLine, lineNumber: oldIndex + 1 });
        oldIndex++;
      } else if (oldLine === newLine) {
        // Lines are the same
        diff.push({ type: 'unchanged', content: oldLine, lineNumber: newIndex + 1 });
        oldIndex++;
        newIndex++;
      } else {
        // Lines are different
        diff.push({ type: 'removed', content: oldLine, lineNumber: oldIndex + 1 });
        diff.push({ type: 'added', content: newLine, lineNumber: newIndex + 1 });
        oldIndex++;
        newIndex++;
      }
    }
    
    return diff;
  }

  // Get project history
  async getProjectHistory(projectId, userId) {
    try {
      const project = this.projects.get(projectId);
      
      if (!project) {
        throw new Error('Project not found');
      }

      if (!project.members.includes(userId)) {
        throw new Error('Access denied to this project');
      }

      const editHistory = this.editHistory.get(projectId) || [];
      const activityHistory = this.activityHistory.get(projectId) || [];
      
      // Combine and sort by timestamp
      const allHistory = [
        ...editHistory.map(h => ({ ...h, type: 'edit' })),
        ...activityHistory.map(h => ({ ...h, type: 'activity' }))
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return {
        success: true,
        history: allHistory.slice(0, 50) // Return last 50 entries
      };
    } catch (error) {
      console.error('Get project history error:', error.message);
      throw error;
    }
  }

  // Get detailed edit history
  async getEditHistory(projectId, userId) {
    try {
      const project = this.projects.get(projectId);
      
      if (!project) {
        throw new Error('Project not found');
      }

      if (!project.members.includes(userId)) {
        throw new Error('Access denied to this project');
      }

      const editHistory = this.editHistory.get(projectId) || [];
      
      return {
        success: true,
        edits: editHistory.slice(-30).reverse() // Return last 30 edits, newest first
      };
    } catch (error) {
      console.error('Get edit history error:', error.message);
      throw error;
    }
  }
}

module.exports = SimpleAuthService;