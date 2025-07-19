import React, { useState, useEffect, createContext, useContext } from 'react';
import { Eye, EyeOff, User, Mail, Lock, LogIn, UserPlus, Settings, LogOut, Shield, Users, Trash2, Crown, Plus, Edit, FileText, Bell, Check, X, Clock, Edit3, ArrowLeft, MousePointer } from 'lucide-react';
import CollaborationApp from './components/CollaborationApp';


// Auth Context
const AuthContext = createContext();

// Auth Provider Component
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // API helper function
  const apiCall = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        throw new Error('Invalid server response');
      }
      
      if (!response.ok) {
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }
      
      return data;
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Unable to connect to server. Please check if the server is running.');
      }
      throw new Error(error.message || 'Network error');
    }
  };

  // Auth functions
  const register = async (userData) => {
    try {
      if (!userData.firstName || !userData.lastName || !userData.email || !userData.password) {
        throw new Error('All fields are required');
      }

      const response = await apiCall('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });

      if (response.success) {
        setToken(response.token);
        setUser(response.user);
        localStorage.setItem('authToken', response.token);
        return response;
      }
      throw new Error(response.message);
    } catch (error) {
      throw error;
    }
  };

  const login = async (email, password) => {
    try {
      if (!email?.trim() || !password?.trim()) {
        throw new Error('Email and password are required');
      }

      const response = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(), 
          password: password 
        }),
      });

      if (response.success) {
        setToken(response.token);
        setUser(response.user);
        localStorage.setItem('authToken', response.token);
        return response;
      }
      throw new Error(response.message);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
  };

  const getCurrentUser = async () => {
    try {
      const response = await apiCall('/auth/me');
      if (response.success) {
        // Ensure role is properly set from the response
        const userData = {
          ...response.user,
          role: response.user.role || 'user'
        };
        setUser(userData);
        return userData;
      }
    } catch (error) {
      logout();
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await apiCall('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData),
      });

      if (response.success) {
        setUser(response.user);
        return response;
      }
      throw new Error(response.message);
    } catch (error) {
      throw error;
    }
  };

  // Admin functions
  const getAllUsers = async (filters = {}) => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.role) queryParams.append('role', filters.role);
      if (filters.search) queryParams.append('search', filters.search);
      
      const endpoint = `/admin/users${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await apiCall(endpoint);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const createUser = async (userData) => {
    try {
      const response = await apiCall('/admin/users', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
      return response;
    } catch (error) {
      throw error;
    }
  };

  const deleteUser = async (userId) => {
    try {
      const response = await apiCall(`/admin/users/${userId}`, {
        method: 'DELETE',
      });
      return response;
    } catch (error) {
      throw error;
    }
  };

  const bulkDeleteUsers = async (userIds) => {
    try {
      const response = await apiCall('/admin/users', {
        method: 'DELETE',
        body: JSON.stringify({ userIds }),
      });
      return response;
    } catch (error) {
      throw error;
    }
  };

  const updateUserRole = async (userId, role) => {
    try {
      const response = await apiCall(`/admin/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      });
      return response;
    } catch (error) {
      throw error;
    }
  };

  const updateUserById = async (userId, userData) => {
    try {
      const response = await apiCall(`/admin/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(userData),
      });
      return response;
    } catch (error) {
      throw error;
    }
  };

  const changeUserPassword = async (userId, newPassword) => {
    try {
      const response = await apiCall(`/admin/users/${userId}/password`, {
        method: 'PUT',
        body: JSON.stringify({ newPassword }),
      });
      return response;
    } catch (error) {
      throw error;
    }
  };

  const getUserStats = async () => {
    try {
      const response = await apiCall('/admin/stats');
      return response;
    } catch (error) {
      throw error;
    }
  };

  // Project functions for all users
  const getUserProjects = async () => {
    try {
      const response = await apiCall('/projects');
      return response;
    } catch (error) {
      throw error;
    }
  };

  const getUserInvitations = async () => {
    try {
      const response = await apiCall('/invitations');
      return response;
    } catch (error) {
      throw error;
    }
  };

  const respondToInvitation = async (invitationId, accept) => {
    try {
      const response = await apiCall(`/invitations/${invitationId}`, {
        method: 'PUT',
        body: JSON.stringify({ accept }),
      });
      return response;
    } catch (error) {
      throw error;
    }
  };

  const getProject = async (projectId) => {
    try {
      const response = await apiCall(`/projects/${projectId}`);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const updateProjectContent = async (projectId, content) => {
    try {
      const response = await apiCall(`/projects/${projectId}/content`, {
        method: 'PUT',
        body: JSON.stringify({ content }),
      });
      return response;
    } catch (error) {
      throw error;
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          await getCurrentUser();
        } catch (error) {
          logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [token]);

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    getCurrentUser,
    updateProfile,
    isAuthenticated: !!token,
    isAdmin: user?.role === 'admin' || user?.role === 'superadmin',
    isSuperAdmin: user?.role === 'superadmin',
    getAllUsers,
    createUser,
    deleteUser,
    bulkDeleteUsers,
    updateUserRole,
    updateUserById,
    changeUserPassword,
    getUserStats,
    getUserProjects,
    getUserInvitations,
    respondToInvitation,
    getProject,
    updateProjectContent,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// User Projects Section Component for Normal Users
const UserProjectsSection = ({ user, onOpenEditor }) => {
  const { getUserProjects, getUserInvitations, respondToInvitation, getProject } = useAuth();
  const [projects, setProjects] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Loading data for user:', user?.id);
      
      // Load projects
      try {
        const projectsResponse = await getUserProjects();
        console.log('Projects response:', projectsResponse);
        setProjects(projectsResponse.projects || []);
      } catch (error) {
        console.error('Failed to load projects:', error);
        setProjects([]);
      }

      // Load invitations
      try {
        const invitationsResponse = await getUserInvitations();
        console.log('Invitations response:', invitationsResponse);
        setInvitations(invitationsResponse.invitations || []);
      } catch (error) {
        console.error('Failed to load invitations:', error);
        setInvitations([]);
      }
    } catch (error) {
      console.error('Load data error:', error);
      setError('Failed to load data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInvitationResponse = async (invitationId, accept) => {
    try {
      setLoading(true);
      const response = await respondToInvitation(invitationId, accept);
      
      if (response.success) {
        setInvitations(invitations.filter(inv => inv.id !== invitationId));
        if (accept) {
          await loadData(); // Reload to get the new project
        }
        setMessage(response.message);
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      setError('Failed to respond to invitation: ' + error.message);
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const openProject = async (project, onOpenEditor) => {
    try {
      setLoading(true);
      const response = await getProject(project.id);
      if (response.success) {
        onOpenEditor(response.project);
      }
    } catch (error) {
      setError('Failed to open project: ' + error.message);
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  return (
    <div className="space-y-8">
      {/* Messages */}
      {message && (
        <div className="alert alert-success animate-slideInRight">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{message}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-error animate-slideInRight">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Project Invitations */}
      {invitations.length > 0 && (
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 animate-fadeInUp">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Project Invitations</h2>
                <p className="text-gray-600">You have been invited to collaborate on these projects</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={loadData}
                disabled={loading}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh</span>
              </button>
              <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-full font-semibold">
                {invitations.length} New
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-6 border border-orange-200 hover:shadow-lg transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                      <FileText className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{invitation.projectName}</h3>
                      <p className="text-gray-600 mt-1">{invitation.projectDescription}</p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          Invited by {invitation.inviterName}
                        </span>
                        <span className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {new Date(invitation.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleInvitationResponse(invitation.id, true)}
                      disabled={loading}
                      className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50"
                    >
                      <Check className="w-5 h-5" />
                      <span>Accept</span>
                    </button>
                    <button
                      onClick={() => handleInvitationResponse(invitation.id, false)}
                      disabled={loading}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50"
                    >
                      <X className="w-5 h-5" />
                      <span>Decline</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Projects */}
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 animate-fadeInUp">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">My Projects</h2>
              <p className="text-gray-600">Projects you're collaborating on</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>
            <div className="bg-indigo-100 text-indigo-800 px-4 py-2 rounded-full font-semibold">
              {projects.length} Projects
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="loading-spinner w-12 h-12 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-indigo-50 rounded-xl">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">No Projects Yet</h3>
            <p className="text-gray-600 text-lg max-w-md mx-auto">
              You'll see projects here when you're invited to collaborate. 
              Your contributions will be staged for admin approval.
            </p>
            {invitations.length > 0 && (
              <p className="text-indigo-600 font-medium mt-4">
                ↑ Check your invitations above to get started!
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div key={project.id} className="group">
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200 hover:shadow-lg hover:scale-105 transition-all duration-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                      <FileText className="w-7 h-7 text-white" />
                    </div>
                    {project.hasStagedChanges && (
                      <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs font-semibold">
                        Pending Review
                      </div>
                    )}
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{project.name}</h3>
                  <p className="text-gray-600 mb-4 line-clamp-2">{project.description}</p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <span className="flex items-center text-sm text-gray-500 bg-white px-3 py-1 rounded-full">
                        <Users className="w-4 h-4 mr-1" />
                        {project.members?.length || 1}
                      </span>
                      <span className="flex items-center text-sm text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                        <Eye className="w-4 h-4 mr-1" />
                        Collaborator
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => openProject(project, onOpenEditor)}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <Edit3 className="w-5 h-5" />
                    <span>Open & Collaborate</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Collaboration Info */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl shadow-lg p-8 border border-blue-200">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Collaboration Guidelines</h3>
            <div className="space-y-2 text-gray-700">
              <p className="flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                You can contribute to any project you're invited to
              </p>
              <p className="flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                Your changes will be staged for admin approval
              </p>
              <p className="flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                You can invite other users to projects you're part of
              </p>
              <p className="flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                All your contributions are tracked and valued
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Simple Project Editor for Normal Users
const SimpleProjectEditor = ({ project, user, onBack }) => {
  const { updateProjectContent } = useAuth();
  const [content, setContent] = useState(project.content || '# Welcome to the project\n\nStart collaborating here...');
  const [lastSaved, setLastSaved] = useState(new Date());
  const [saving, setSaving] = useState(false);
  const [isStaged, setIsStaged] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      const response = await updateProjectContent(project.id, content);
      
      if (response.success) {
        setLastSaved(new Date());
        setIsStaged(response.staged || false);
        
        if (response.staged) {
          setMessage('Changes submitted for admin approval! ✨');
        } else {
          setMessage('Content saved successfully! ✓');
        }
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Failed to save content:', error);
      setError('Failed to save content: ' + error.message);
      setTimeout(() => setError(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    // Auto-save on Ctrl+S
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="bg-gray-500 hover:bg-gray-600 text-white p-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
                <p className="text-gray-600">{project.description}</p>
                <p className="text-sm text-gray-500">Last saved: {lastSaved.toLocaleTimeString()}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {isStaged && (
                <div className="flex items-center text-orange-600 bg-orange-100 px-4 py-2 rounded-xl">
                  <Clock className="w-5 h-5 mr-2" />
                  <span className="font-semibold">Pending Review</span>
                </div>
              )}
              <div className="flex items-center text-blue-600 bg-blue-100 px-4 py-2 rounded-xl">
                <User className="w-5 h-5 mr-2" />
                <span className="font-semibold">Collaborator</span>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 flex items-center space-x-2"
              >
                {saving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    <span>Submit Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className="mb-6 alert alert-success animate-slideInRight">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{message}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 alert alert-error animate-slideInRight">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Editor */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Collaborative Text Editor</h2>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center text-blue-600 bg-blue-100 px-3 py-1 rounded-full text-sm">
                      <Edit3 className="w-4 h-4 mr-2" />
                      <span>Editing Mode</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      Press Ctrl+S to save
                    </div>
                  </div>
                </div>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full h-96 p-8 border-none resize-none focus:outline-none bg-transparent font-mono text-lg leading-relaxed"
                placeholder="Start writing your content here...\n\nYour changes will be submitted for admin approval.\n\nTip: Use Ctrl+S to save your work!"
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-indigo-500" />
                Project Team
              </h3>
              <div className="space-y-3">
                {project.memberNames?.map((name, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{name}</p>
                      <p className={`text-xs ${
                        project.createdBy === project.members?.[index] ? 'text-blue-600' : 'text-green-600'
                      }`}>
                        {project.createdBy === project.members?.[index] ? 'Project Owner' : 'Collaborator'}
                      </p>
                    </div>
                  </div>
                )) || (
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {user?.firstName?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user?.fullName || 'You'}</p>
                      <p className="text-xs text-green-600">Collaborator</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Content Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Words</span>
                  <span className="font-semibold">{content.trim().split(/\s+/).filter(word => word.length > 0).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Characters</span>
                  <span className="font-semibold">{content.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Lines</span>
                  <span className="font-semibold">{content.split('\n').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Your Role</span>
                  <span className="font-semibold text-green-600">Collaborator</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl shadow-lg p-6 border border-blue-200">
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                <Shield className="w-5 h-5 mr-2 text-blue-500" />
                Collaboration Info
              </h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                  Changes are staged for review
                </p>
                <p className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                  Admins will approve your edits
                </p>
                <p className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                  Save frequently with Ctrl+S
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Login Component
const LoginForm = ({ onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto glass rounded-3xl p-8 bounce-in">
      <div className="text-center mb-8">
        <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-600 rounded-3xl flex items-center justify-center mb-6 shadow-2xl float">
          <LogIn className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">✨ Welcome Back</h2>
        <p className="text-white/80 text-lg">Sign in to your collaboration hub</p>
      </div>

      {error && (
        <div className="mb-6 notification notification-error">
          ❌ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-white/90 font-medium mb-2">
            📧 Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input pl-12"
              placeholder="Enter your email"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-white/90 font-medium mb-2">
            🔒 Password
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input pl-12 pr-12"
              placeholder="Enter your password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn btn-primary hover-lift disabled:opacity-50"
        >
          {loading ? (
            <>
              <div className="spinner mr-2"></div>
              Signing in...
            </>
          ) : (
            '🚀 Sign In'
          )}
        </button>
      </form>

      <div className="mt-8 text-center space-y-6">
        <p className="text-white/80">
          Don't have an account?{' '}
          <button
            onClick={onSwitchToRegister}
            className="text-blue-300 hover:text-blue-200 font-semibold underline"
          >
            Sign up
          </button>
        </p>
        
        {/* Quick Login Options */}
        <div className="border-t border-white/20 pt-6">
          <p className="text-white/60 mb-4 font-medium">⚡ Quick Login Options:</p>
          <div className="flex flex-col space-y-3">
            <button
              type="button"
              onClick={() => {
                setEmail('superadmin@example.com');
                setPassword('SuperAdmin123!');
              }}
              className="btn btn-secondary hover-lift text-sm"
            >
              <span className="mr-2">👑</span>
              Super Admin Login
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('admin@example.com');
                setPassword('Admin123!');
              }}
              className="btn btn-warning hover-lift text-sm"
            >
              <Crown className="w-4 h-4 mr-2" />
              Admin Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Admin Panel Component
const AdminPanel = () => {
  const { getAllUsers, createUser, deleteUser, bulkDeleteUsers, updateUserRole, updateUserById, changeUserPassword, getUserStats, user: currentUser, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordUser, setPasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [filters, setFilters] = useState({ role: '', search: '' });
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'user'
  });

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await getAllUsers(filters);
      setUsers(response.users);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await getUserStats();
      setStats(response.stats);
    } catch (error) {
      console.error('Failed to load stats:', error.message);
    }
  };

  useEffect(() => {
    loadUsers();
    loadStats();
  }, [filters]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setMessage('');
      await createUser(newUser);
      setMessage('User created successfully!');
      setNewUser({ firstName: '', lastName: '', email: '', password: '', role: 'user' });
      setShowCreateForm(false);
      loadUsers();
      loadStats();
    } catch (error) {
      setError(error.message);
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setMessage('');
      await updateUserById(editingUser.id, {
        firstName: editingUser.firstName,
        lastName: editingUser.lastName,
        email: editingUser.email
      });
      setMessage('User updated successfully!');
      setShowEditForm(false);
      setEditingUser(null);
      loadUsers();
    } catch (error) {
      setError(error.message);
    }
  };

  const handleDeleteUser = async (userId, userEmail) => {
    if (window.confirm(`Are you sure you want to delete user: ${userEmail}?`)) {
      try {
        await deleteUser(userId);
        setMessage('User deleted successfully!');
        loadUsers();
        loadStats();
      } catch (error) {
        setError(error.message);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) {
      setError('Please select users to delete');
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${selectedUsers.length} selected users?`)) {
      try {
        await bulkDeleteUsers(selectedUsers);
        setMessage(`${selectedUsers.length} users deleted successfully!`);
        setSelectedUsers([]);
        loadUsers();
        loadStats();
      } catch (error) {
        setError(error.message);
      }
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateUserRole(userId, newRole);
      setMessage(`User role updated to ${newRole}!`);
      loadUsers();
      loadStats();
    } catch (error) {
      setError(error.message);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setMessage('');
      await changeUserPassword(passwordUser.id, newPassword);
      setMessage(`Password updated for ${passwordUser.fullName}!`);
      setShowPasswordForm(false);
      setPasswordUser(null);
      setNewPassword('');
    } catch (error) {
      setError(error.message);
    }
  };

  const openPasswordForm = (user) => {
    setPasswordUser(user);
    setShowPasswordForm(true);
  };

  const handleSelectUser = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(user => user.id));
    }
  };

  const openEditForm = (user) => {
    setEditingUser({ ...user });
    setShowEditForm(true);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 animate-fadeInUp">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center space-x-6">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Users className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 text-lg">Manage all system users and permissions</p>
            {currentUser?.role === 'superadmin' && (
              <div className="mt-2 inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                <span className="mr-1">⭐</span>
                Super Admin Access - Full Control
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {selectedUsers.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="btn btn-danger flex items-center space-x-2 text-sm"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Selected ({selectedUsers.length})</span>
            </button>
          )}
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="btn btn-success flex items-center space-x-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add User</span>
          </button>
          {currentUser?.role === 'superadmin' && (
            <div className="flex items-center px-4 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium">
              <span className="mr-2">⭐</span>
              Super Admin Mode
            </div>
          )}
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="stat-card bg-gradient-to-br from-blue-50 to-blue-100 border-l-blue-500 hover:from-blue-100 hover:to-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold text-blue-700">{stats.totalUsers}</div>
                <div className="text-sm font-semibold text-blue-800 uppercase tracking-wide">Total Users</div>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          <div className="stat-card bg-gradient-to-br from-green-50 to-green-100 border-l-green-500 hover:from-green-100 hover:to-green-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold text-green-700">{stats.regularUsers}</div>
                <div className="text-sm font-semibold text-green-800 uppercase tracking-wide">Regular Users</div>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          <div className="stat-card bg-gradient-to-br from-yellow-50 to-yellow-100 border-l-yellow-500 hover:from-yellow-100 hover:to-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold text-yellow-700">{stats.adminUsers}</div>
                <div className="text-sm font-semibold text-yellow-800 uppercase tracking-wide">Admin Users</div>
              </div>
              <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center">
                <Crown className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          <div className="stat-card bg-gradient-to-br from-purple-50 to-purple-100 border-l-purple-500 hover:from-purple-100 hover:to-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold text-purple-700">{stats.recentUsers}</div>
                <div className="text-sm font-semibold text-purple-800 uppercase tracking-wide">New This Week</div>
              </div>
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 mb-8">
        <div className="flex-1">
          <input
            type="text"
            placeholder="🔍 Search users by name or email..."
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
            className="input-field"
          />
        </div>
        <select
          value={filters.role}
          onChange={(e) => setFilters({...filters, role: e.target.value})}
          className="input-field md:w-48"
        >
          <option value="">All Roles</option>
          <option value="user">👤 Users</option>
          <option value="admin">👑 Admins</option>
        </select>
      </div>

      {message && (
        <div className="mb-6 alert alert-success animate-slideInRight">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{message}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 alert alert-error animate-slideInRight">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      {showCreateForm && (
        <div className="mb-8 p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 animate-scaleIn">
          <h3 className="text-xl font-bold mb-6 text-gray-900 flex items-center">
            <Plus className="w-5 h-5 mr-2 text-green-600" />
            Create New User
          </h3>
          <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="First Name"
              value={newUser.firstName}
              onChange={(e) => setNewUser({...newUser, firstName: e.target.value})}
              className="input-field"
              required
            />
            <input
              type="text"
              placeholder="Last Name"
              value={newUser.lastName}
              onChange={(e) => setNewUser({...newUser, lastName: e.target.value})}
              className="input-field"
              required
            />
            <input
              type="email"
              placeholder="Email Address"
              value={newUser.email}
              onChange={(e) => setNewUser({...newUser, email: e.target.value})}
              className="input-field"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={newUser.password}
              onChange={(e) => setNewUser({...newUser, password: e.target.value})}
              className="input-field"
              required
            />
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({...newUser, role: e.target.value})}
              className="input-field"
            >
              <option value="user">👤 Regular User</option>
              {currentUser?.role === 'admin' && (
                <option value="admin">👑 Administrator</option>
              )}
              {currentUser?.role === 'superadmin' && (
                <>
                  <option value="admin">👑 Administrator</option>
                  <option value="superadmin">⭐ Super Administrator</option>
                </>
              )}
            </select>
            <div className="flex space-x-3 md:col-span-2">
              <button type="submit" className="btn btn-success">
                <Plus className="w-4 h-4 mr-2" />
                Create User
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {showEditForm && editingUser && (
        <div className="mb-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 animate-scaleIn">
          <h3 className="text-xl font-bold mb-6 text-gray-900 flex items-center">
            <Settings className="w-5 h-5 mr-2 text-blue-600" />
            Edit User: {editingUser.fullName}
          </h3>
          <form onSubmit={handleEditUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="First Name"
              value={editingUser.firstName}
              onChange={(e) => setEditingUser({...editingUser, firstName: e.target.value})}
              className="input-field"
              required
            />
            <input
              type="text"
              placeholder="Last Name"
              value={editingUser.lastName}
              onChange={(e) => setEditingUser({...editingUser, lastName: e.target.value})}
              className="input-field"
              required
            />
            <input
              type="email"
              placeholder="Email Address"
              value={editingUser.email}
              onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
              className="input-field md:col-span-2"
              required
            />
            <div className="flex space-x-3 md:col-span-2">
              <button type="submit" className="btn btn-primary">
                <Settings className="w-4 h-4 mr-2" />
                Update User
              </button>
              <button
                type="button"
                onClick={() => { setShowEditForm(false); setEditingUser(null); }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {showPasswordForm && passwordUser && (
        <div className="mb-8 p-6 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border border-purple-200 animate-scaleIn">
          <h3 className="text-xl font-bold mb-6 text-gray-900 flex items-center">
            <Lock className="w-5 h-5 mr-2 text-purple-600" />
            Change Password: {passwordUser.fullName}
          </h3>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <input
                type="password"
                placeholder="Enter new password (8+ chars, mixed case, number, special)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-field"
                required
                minLength={8}
              />
            </div>
            <div className="flex space-x-3">
              <button type="submit" className="btn btn-primary">
                <Lock className="w-4 h-4 mr-2" />
                Update Password
              </button>
              <button
                type="button"
                onClick={() => { setShowPasswordForm(false); setPasswordUser(null); setNewPassword(''); }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl shadow-xl border border-gray-200">
        <table className="admin-table">
          <thead>
            <tr>
              <th className="w-12">
                <input
                  type="checkbox"
                  checked={selectedUsers.length === users.length && users.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </th>
              <th className="min-w-[200px]">User Info</th>
              <th className="min-w-[200px]">Email</th>
              <th className="min-w-[150px]">Role</th>
              <th className="min-w-[120px]">Created</th>
              <th className="min-w-[120px]">Last Login</th>
              <th className="min-w-[100px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="text-center py-16">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="loading-spinner w-12 h-12"></div>
                    <p className="text-gray-600 font-medium">Loading users...</p>
                  </div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-16">
                  <div className="text-gray-500">
                    {filters.search || filters.role ? 'No users match your filters.' : 'No users found.'}
                  </div>
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className={selectedUsers.includes(user.id) ? 'bg-blue-50' : ''}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => handleSelectUser(user.id)}
                      disabled={user.id === currentUser?.id}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                  </td>
                  <td>
                    <div className="flex items-center space-x-3">
                      <div className="user-avatar">
                        {user.firstName?.charAt(0) || 'U'}{user.lastName?.charAt(0) || 'U'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 truncate">
                          {user.fullName || `${user.firstName} ${user.lastName}`}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          ID: {user.id?.substring(0, 8)}...
                        </div>
                        {user.id === currentUser?.id && (
                          <div className="text-xs text-blue-600 font-medium">You</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="text-gray-900 truncate">{user.email}</div>
                  </td>
                  <td>
                    <div className="flex flex-col space-y-2">
                      <span className={`admin-badge ${
                        user.role === 'superadmin' ? 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border-purple-300' :
                        user.role === 'admin' ? 'admin-badge-admin' : 'admin-badge-user'
                      }`}>
                        {user.role === 'superadmin' ? '⭐ Super Admin' :
                         user.role === 'admin' ? '👑 Admin' : '👤 User'}
                      </span>
                      <select
                        value={user.role || 'user'}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        disabled={
                          user.id === currentUser?.id || 
                          (currentUser?.role === 'admin' && (user.role === 'admin' || user.role === 'superadmin')) ||
                          (currentUser?.role !== 'superadmin' && user.role === 'superadmin')
                        }
                        className="text-xs px-2 py-1 border border-gray-300 rounded disabled:bg-gray-100"
                      >
                        <option value="user">👤 User</option>
                        {(currentUser?.role === 'superadmin' || (currentUser?.role === 'admin' && user.role === 'user')) && (
                          <option value="admin">👑 Admin</option>
                        )}
                        {currentUser?.role === 'superadmin' && (
                          <option value="superadmin">⭐ Super Admin</option>
                        )}
                      </select>
                    </div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-900">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {user.createdAt ? new Date(user.createdAt).toLocaleTimeString() : ''}
                    </div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-900">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                    </div>
                    {user.lastLoginAt && (
                      <div className="text-xs text-gray-500">
                        {new Date(user.lastLoginAt).toLocaleTimeString()}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => openEditForm(user)}
                        disabled={
                          user.id === currentUser?.id ||
                          (currentUser?.role === 'admin' && (user.role === 'admin' || user.role === 'superadmin'))
                        }
                        className="action-btn action-btn-edit"
                        title={`Edit ${user.fullName}`}
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      {(
                        currentUser?.role === 'superadmin' || 
                        (currentUser?.role === 'admin' && user.role === 'user')
                      ) && (
                        <button
                          onClick={() => openPasswordForm(user)}
                          disabled={user.id === currentUser?.id}
                          className="action-btn" 
                          style={{color: '#8b5cf6'}}
                          title={`Change Password for ${user.fullName}`}
                        >
                          <Lock className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteUser(user.id, user.email)}
                        disabled={
                          user.id === currentUser?.id ||
                          (currentUser?.role === 'admin' && (user.role === 'admin' || user.role === 'superadmin'))
                        }
                        className="action-btn action-btn-delete"
                        title={`Delete ${user.fullName}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && users.length > 0 && (
        <div className="mt-6 flex justify-between items-center text-sm text-gray-600">
          <div>
            Showing {users.length} user{users.length !== 1 ? 's' : ''}
            {selectedUsers.length > 0 && ` • ${selectedUsers.length} selected`}
          </div>
          <div className="text-xs text-gray-500">
            Total: {stats?.totalUsers || users.length} users
          </div>
        </div>
      )}
    </div>
  );
};

// Profile Component - Shows admin dashboard directly for admins
const ProfileComponent = () => {
  const { user, logout, getAllUsers } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');
  const [activeProject, setActiveProject] = useState(null);

  const handleOpenEditor = (project) => {
    setActiveProject(project);
    setActiveView('editor');
  };

  const handleBackToProjects = () => {
    setActiveProject(null);
    setActiveView('projects');
  };

  const handleBackToDashboard = () => {
    setActiveProject(null);
    setActiveView('dashboard');
  };

  if (activeView === 'collaboration') {
    return <CollaborationApp user={user} getAllUsers={getAllUsers} />;
  }

  // Debug: Log user role
  console.log('User role in ProfileComponent:', user?.role);
  
  // If user is admin or superadmin, show admin dashboard directly
  if (user?.role === 'admin' || user?.role === 'superadmin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="container mx-auto px-4 py-8">
          {/* Admin Header */}
          <div className="mb-8 bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center space-x-6">
                <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Crown className="w-10 h-10 text-white" />
                </div>
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <h1 className="text-4xl font-bold text-gray-900">{user?.role === 'superadmin' ? 'Super Admin Dashboard' : 'Admin Dashboard'}</h1>
                    <span className={`admin-badge text-sm ${
                      user?.role === 'superadmin' ? 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border-purple-300' : 'admin-badge-admin'
                    }`}>
                      {user?.role === 'superadmin' ? (
                        <>
                          <span className="text-lg mr-1">⭐</span>
                          Super Administrator
                        </>
                      ) : (
                        <>
                          <Crown className="w-4 h-4 mr-1" />
                          Administrator
                        </>
                      )}
                    </span>
                  </div>
                  <p className="text-xl text-gray-600 font-medium">Welcome back, {user.fullName}</p>
                  <p className="text-gray-500">{user.email} • ID: {user.id?.substring(0, 8)}...</p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setActiveView('collaboration')}
                  className="btn btn-primary flex items-center space-x-2"
                >
                  <FileText className="w-5 h-5" />
                  <span>Collaboration Hub</span>
                </button>
                <button
                  onClick={logout}
                  className="btn btn-danger flex items-center space-x-2"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>

          {/* Admin Panel Content */}
          <AdminPanel />
        </div>
      </div>
    );
  }

  // Regular user profile view with projects section
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* User Header */}
          <div className="mb-8 bg-white rounded-2xl shadow-xl p-8 border border-gray-100 animate-fadeInUp">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center space-x-6">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-3xl font-bold text-white">
                    {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                  </span>
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 mb-2">
                    {user?.fullName || 'User Dashboard'}
                  </h1>
                  <p className="text-xl text-gray-600 font-medium">{user?.email}</p>
                  <p className="text-gray-500">ID: {user?.id?.substring(0, 8)}...</p>
                  <div className="mt-3 inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full font-medium">
                    <User className="w-4 h-4 mr-2" />
                    Collaborator
                  </div>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setActiveView('collaboration')}
                  className="btn btn-primary flex items-center space-x-2"
                >
                  <FileText className="w-5 h-5" />
                  <span>Collaboration Hub</span>
                </button>
                <button
                  onClick={logout}
                  className="btn btn-danger flex items-center space-x-2"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>

          {activeView === 'collaboration' ? (
            <CollaborationApp user={user} getAllUsers={getAllUsers} />
          ) : (
            <CollaborationApp user={user} getAllUsers={getAllUsers} />
          )}
        </div>
      </div>
    </div>
  );
};

// Register Component
const RegisterForm = ({ onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.firstName?.trim() || !formData.lastName?.trim() || !formData.email?.trim() || !formData.password?.trim()) {
      setError('All fields are required');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      setError('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character');
      setLoading(false);
      return;
    }

    try {
      const userData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      };
      
      await register(userData);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto glass rounded-3xl p-8 bounce-in">
      <div className="text-center mb-8">
        <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-400 to-blue-600 rounded-3xl flex items-center justify-center mb-6 shadow-2xl float">
          <UserPlus className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">🎆 Create Account</h2>
        <p className="text-white/80 text-lg">Join our collaboration community</p>
      </div>

      {error && (
        <div className="mb-6 notification notification-error">
          ❌ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-white/90 font-medium mb-2">
              👤 First Name
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              className="input"
              placeholder="John"
              required
            />
          </div>
          <div>
            <label className="block text-white/90 font-medium mb-2">
              👥 Last Name
            </label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              className="input"
              placeholder="Doe"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-white/90 font-medium mb-2">
            📧 Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="input pl-12"
              placeholder="john@example.com"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-white/90 font-medium mb-2">
            🔒 Password
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="input pl-12 pr-12"
              placeholder="Create a strong password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-white/90 font-medium mb-2">
            ✅ Confirm Password
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="input pl-12"
              placeholder="Confirm your password"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn btn-success hover-lift disabled:opacity-50"
        >
          {loading ? (
            <>
              <div className="spinner mr-2"></div>
              Creating Account...
            </>
          ) : (
            '🎉 Create Account'
          )}
        </button>
      </form>

      <div className="mt-8 text-center">
        <p className="text-white/80">
          Already have an account?{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-green-300 hover:text-green-200 font-semibold underline"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
};

// Main App Component
const App = () => {
  const [authMode, setAuthMode] = useState('login');
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {isAuthenticated ? (
        <ProfileComponent />
      ) : (
        <div className="flex items-center justify-center min-h-screen px-4">
          {authMode === 'login' ? (
            <LoginForm onSwitchToRegister={() => setAuthMode('register')} />
          ) : (
            <RegisterForm onSwitchToLogin={() => setAuthMode('login')} />
          )}
        </div>
      )}
    </div>
  );
};

export default function AuthenticationSystem() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}
