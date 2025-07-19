import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Bell, Check, X, Plus, FileText, Edit3, Share2, Clock, MessageSquare, AlertCircle, CheckCircle, XCircle, Eye } from 'lucide-react';
import CollaborativeCursor from './CollaborativeCursor';
import RealtimeInput from './RealtimeInput';
import RealtimeEditor from './RealtimeEditor';

const CollaborativeWorkspace = ({ user, getAllUsers }) => {
  const [activeView, setActiveView] = useState('dashboard');
  const [projects, setProjects] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showStagedChanges, setShowStagedChanges] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [stagedChanges, setStagedChanges] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const apiCall = async (url, options = {}) => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`http://localhost:3000${url}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      },
      ...options
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API call failed');
    }
    
    return response.json();
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load projects
      try {
        const projectsResponse = await apiCall('/projects');
        setProjects(projectsResponse.projects || []);
      } catch (error) {
        console.error('Failed to load projects:', error);
        setProjects([]);
      }

      // Load invitations
      try {
        const invitationsResponse = await apiCall('/invitations');
        setInvitations(invitationsResponse.invitations || []);
      } catch (error) {
        console.error('Failed to load invitations:', error);
        setInvitations([]);
      }

      // Load all users for admin
      if (user?.role === 'admin' || user?.role === 'superadmin') {
        try {
          const response = await getAllUsers();
          setAllUsers(response.users.filter(u => u.id !== user.id));
        } catch (error) {
          console.error('Failed to load users:', error);
          setAllUsers([]);
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await apiCall('/projects', {
        method: 'POST',
        body: JSON.stringify(newProject)
      });
      
      if (response.success) {
        setNewProject({ name: '', description: '' });
        setShowCreateForm(false);
        await loadData();
        alert('Project created successfully!');
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUsers = async () => {
    if (selectedUsers.length === 0) return;

    try {
      setLoading(true);
      const response = await apiCall(`/projects/${selectedProject.id}/invite`, {
        method: 'POST',
        body: JSON.stringify({ userIds: selectedUsers })
      });
      
      if (response.success) {
        alert(`Invitations sent to ${selectedUsers.length} users!`);
        setShowInviteModal(false);
        setSelectedUsers([]);
        setSelectedProject(null);
      }
    } catch (error) {
      console.error('Failed to send invitations:', error);
      alert('Failed to send invitations: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInvitationResponse = async (invitationId, accept) => {
    try {
      setLoading(true);
      const response = await apiCall(`/invitations/${invitationId}`, {
        method: 'PUT',
        body: JSON.stringify({ accept })
      });
      
      if (response.success) {
        setInvitations(invitations.filter(inv => inv.id !== invitationId));
        if (accept) {
          await loadData(); // Reload to get the new project
        }
        alert(response.message);
      }
    } catch (error) {
      console.error('Failed to respond to invitation:', error);
      alert('Failed to respond to invitation: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const openInviteModal = (project) => {
    setSelectedProject(project);
    setShowInviteModal(true);
  };

  const openEditor = async (project) => {
    try {
      setLoading(true);
      const response = await apiCall(`/projects/${project.id}`);
      if (response.success) {
        setActiveProject(response.project);
        setActiveView('editor');
      }
    } catch (error) {
      console.error('Failed to load project:', error);
      alert('Failed to load project: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStagedChanges = async (projectId) => {
    try {
      const response = await apiCall(`/projects/${projectId}/staged-changes`);
      if (response.success) {
        setStagedChanges(response.changes || []);
        setShowStagedChanges(true);
      }
    } catch (error) {
      console.error('Failed to load staged changes:', error);
      alert('Failed to load staged changes: ' + error.message);
    }
  };

  const handleReviewChange = async (changeId, approve, feedback = '') => {
    try {
      setLoading(true);
      const response = await apiCall(`/staged-changes/${changeId}`, {
        method: 'PUT',
        body: JSON.stringify({ approve, feedback })
      });
      
      if (response.success) {
        alert(response.message);
        setStagedChanges(stagedChanges.filter(change => change.id !== changeId));
        await loadData(); // Refresh projects
      }
    } catch (error) {
      console.error('Failed to review change:', error);
      alert('Failed to review change: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (activeView === 'editor' && activeProject) {
    return <RealtimeEditor project={activeProject} user={user} onBack={() => setActiveView('dashboard')} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-xl">
                    <FileText className="w-10 h-10 text-white" />
                  </div>
                  {invitations.length > 0 && (
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">{invitations.length}</span>
                    </div>
                  )}
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Collaborative Workspace
                  </h1>
                  <p className="text-xl text-gray-600 mt-2">Build amazing projects together</p>
                  <div className="flex items-center space-x-4 mt-3">
                    <span className="inline-flex items-center px-4 py-2 bg-indigo-100 text-indigo-800 rounded-full text-sm font-semibold">
                      <FileText className="w-4 h-4 mr-2" />
                      {projects.length} Projects
                    </span>
                    {invitations.length > 0 && (
                      <span className="inline-flex items-center px-4 py-2 bg-orange-100 text-orange-800 rounded-full text-sm font-semibold animate-pulse">
                        <Bell className="w-4 h-4 mr-2" />
                        {invitations.length} Invitations
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex space-x-4">
                {(user?.role === 'admin' || user?.role === 'superadmin') && (
                  <button
                    onClick={() => setShowCreateForm(true)}
                    disabled={loading}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50"
                  >
                    <Plus className="w-5 h-5" />
                    <span>New Project</span>
                  </button>
                )}
                {(user?.role === 'admin' || user?.role === 'superadmin') && projects.some(p => p.hasStagedChanges) && (
                  <button
                    onClick={() => {
                      const projectWithChanges = projects.find(p => p.hasStagedChanges);
                      if (projectWithChanges) loadStagedChanges(projectWithChanges.id);
                    }}
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-6 py-3 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-2"
                  >
                    <AlertCircle className="w-5 h-5" />
                    <span>Review Changes</span>
                  </button>
                )}
                {!(user?.role === 'admin' || user?.role === 'superadmin') && (
                  <div className="flex items-center text-blue-600 bg-blue-100 px-4 py-2 rounded-2xl">
                    <Eye className="w-5 h-5 mr-2" />
                    <span className="font-semibold">Collaborator Mode - Changes require approval</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Invitations */}
        {invitations.length > 0 && (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-3xl shadow-xl border border-orange-200 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <Bell className="w-7 h-7 mr-3 text-orange-500" />
                Project Invitations
                <span className="ml-3 bg-orange-500 text-white text-sm px-3 py-1 rounded-full">
                  {invitations.length} New
                </span>
              </h2>
              <div className="grid gap-4">
                {invitations.map((invitation) => (
                  <div key={invitation.id} className="bg-white rounded-2xl p-6 shadow-lg border border-orange-100 hover:shadow-xl transition-all duration-200">
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
                          className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-2"
                        >
                          <Check className="w-5 h-5" />
                          <span>Accept</span>
                        </button>
                        <button
                          onClick={() => handleInvitationResponse(invitation.id, false)}
                          className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-2"
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
          </div>
        )}

        {/* Create Project Form */}
        {showCreateForm && (
          <div className="mb-8">
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <Plus className="w-6 h-6 mr-3 text-indigo-500" />
                Create New Project
              </h2>
              <form onSubmit={handleCreateProject} className="space-y-6">
                <RealtimeInput
                  projectId="new-project-form"
                  user={user}
                  inputId="project-name"
                  placeholder="Project Name"
                  className="w-full px-6 py-4 bg-white/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 text-lg"
                  onContentChange={(content) => setNewProject({...newProject, name: content})}
                />
                <RealtimeInput
                  projectId="new-project-form"
                  user={user}
                  inputId="project-description"
                  multiline={true}
                  rows={4}
                  placeholder="Project Description"
                  className="w-full px-6 py-4 bg-white/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 text-lg h-32 resize-none"
                  onContentChange={(content) => setNewProject({...newProject, description: content})}
                />
                <div className="flex space-x-4">
                  <button 
                    type="submit" 
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-4 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-2"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Create Project</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-8 py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {projects.length === 0 ? (
            <div className="col-span-full">
              <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-12 text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-12 h-12 text-gray-500" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">No Projects Yet</h3>
                <p className="text-gray-600 text-lg">
                  {(user?.role === 'admin' || user?.role === 'superadmin') 
                    ? 'Create your first project to start collaborating with your team'
                    : 'You\'ll see projects here when you\'re invited to collaborate. Your changes will be staged for admin approval.'
                  }
                </p>
              </div>
            </div>
          ) : (
            projects.map((project) => (
              <div key={project.id} className="group">
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-8 hover:shadow-2xl hover:scale-105 transition-all duration-300">
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <FileText className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex space-x-2">
                      {project.members?.includes(user.id) && (
                        <button
                          onClick={() => openInviteModal(project)}
                          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 py-2 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-2"
                        >
                          <Share2 className="w-4 h-4" />
                          <span>Invite</span>
                        </button>
                      )}
                      {project.hasStagedChanges && (user?.role === 'admin' || user?.role === 'superadmin') && (
                        <button
                          onClick={() => loadStagedChanges(project.id)}
                          className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-4 py-2 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-2"
                        >
                          <AlertCircle className="w-4 h-4" />
                          <span>Review</span>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">{project.name}</h3>
                  <p className="text-gray-600 mb-6 line-clamp-2">{project.description}</p>
                  
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded-full">
                        <Users className="w-4 h-4 mr-2" />
                        {project.members?.length || 1} members
                      </span>
                      <span className={`flex items-center text-sm px-3 py-2 rounded-full ${
                        project.hasStagedChanges 
                          ? 'text-orange-700 bg-orange-100' 
                          : 'text-gray-500 bg-gray-100'
                      }`}>
                        {project.hasStagedChanges ? (
                          <>
                            <AlertCircle className="w-4 h-4 mr-2" />
                            Pending Review
                          </>
                        ) : (
                          <>
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Active
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => openEditor(project)}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <Edit3 className="w-5 h-5" />
                    <span>Open Workspace</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Invite Modal */}
        {showInviteModal && selectedProject && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-8 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-gray-900">
                    Invite to {selectedProject.name}
                  </h3>
                  <button
                    onClick={() => setShowInviteModal(false)}
                    className="text-gray-400 hover:text-gray-600 p-2"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              <div className="p-8 max-h-96 overflow-y-auto">
                <h4 className="font-semibold text-gray-900 mb-4">Select team members:</h4>
                <div className="space-y-3">
                  {allUsers.map((dbUser) => (
                    <label key={dbUser.id} className="flex items-center space-x-4 p-4 hover:bg-gray-50 rounded-2xl cursor-pointer transition-all duration-200">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(dbUser.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers([...selectedUsers, dbUser.id]);
                          } else {
                            setSelectedUsers(selectedUsers.filter(id => id !== dbUser.id));
                          }
                        }}
                        className="w-5 h-5 text-indigo-600 rounded-lg"
                      />
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-semibold">
                        {dbUser.firstName?.charAt(0)}{dbUser.lastName?.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{dbUser.fullName}</p>
                        <p className="text-gray-500">{dbUser.email}</p>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          dbUser.role === 'admin' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {dbUser.role === 'admin' ? '👑 Admin' : '👤 User'}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="p-8 border-t border-gray-200 flex items-center justify-between">
                <p className="text-gray-600">
                  {selectedUsers.length} member{selectedUsers.length !== 1 ? 's' : ''} selected
                </p>
                <div className="flex space-x-4">
                  <button
                    onClick={() => setShowInviteModal(false)}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleInviteUsers}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2"
                  >
                    <Share2 className="w-5 h-5" />
                    <span>Send Invitations</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Staged Changes Modal */}
        {showStagedChanges && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-8 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-gray-900 flex items-center">
                    <AlertCircle className="w-7 h-7 mr-3 text-orange-500" />
                    Staged Changes Review
                  </h3>
                  <button
                    onClick={() => setShowStagedChanges(false)}
                    className="text-gray-400 hover:text-gray-600 p-2"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              <div className="p-8 max-h-96 overflow-y-auto">
                {stagedChanges.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h4 className="text-xl font-semibold text-gray-900 mb-2">No Pending Changes</h4>
                    <p className="text-gray-600">All changes have been reviewed.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {stagedChanges.map((change) => (
                      <div key={change.id} className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900">{change.userName}</h4>
                            <p className="text-gray-600">{new Date(change.createdAt).toLocaleString()}</p>
                          </div>
                          <div className="flex space-x-3">
                            <button
                              onClick={() => handleReviewChange(change.id, true)}
                              disabled={loading}
                              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2 disabled:opacity-50"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleReviewChange(change.id, false)}
                              disabled={loading}
                              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2 disabled:opacity-50"
                            >
                              <XCircle className="w-4 h-4" />
                              <span>Reject</span>
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h5 className="font-semibold text-gray-900 mb-2">Original Content</h5>
                            <div className="bg-white p-4 rounded-xl border max-h-40 overflow-y-auto">
                              <pre className="text-sm text-gray-700 whitespace-pre-wrap">{change.originalContent}</pre>
                            </div>
                          </div>
                          <div>
                            <h5 className="font-semibold text-gray-900 mb-2">Proposed Changes</h5>
                            <div className="bg-green-50 p-4 rounded-xl border border-green-200 max-h-40 overflow-y-auto">
                              <pre className="text-sm text-gray-700 whitespace-pre-wrap">{change.proposedContent}</pre>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Project Editor Component
const ProjectEditor = ({ project, user, onBack }) => {
  const [content, setContent] = useState(project.content || '# Welcome\n\nStart collaborating...');
  const [lastSaved, setLastSaved] = useState(new Date());
  const [saving, setSaving] = useState(false);
  const [isStaged, setIsStaged] = useState(false);

  const apiCall = async (url, options = {}) => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`http://localhost:3000${url}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      },
      ...options
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API call failed');
    }
    
    return response.json();
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await apiCall(`/projects/${project.id}/content`, {
        method: 'PUT',
        body: JSON.stringify({ content })
      });
      
      if (response.success) {
        setLastSaved(new Date());
        setIsStaged(response.staged || false);
        
        if (response.staged) {
          alert('Changes staged for admin approval!');
        } else {
          alert('Content saved successfully!');
        }
      }
    } catch (error) {
      console.error('Failed to save content:', error);
      alert('Failed to save content: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={onBack}
                  className="bg-gray-500 hover:bg-gray-600 text-white p-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                  <p className="text-gray-600">Last saved: {lastSaved.toLocaleTimeString()}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {isStaged && (
                  <div className="flex items-center text-orange-600 bg-orange-100 px-4 py-2 rounded-xl">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    <span className="font-semibold">Changes Staged for Review</span>
                  </div>
                )}
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
                      <CheckCircle className="w-5 h-5" />
                      <span>{(user?.role === 'admin' || user?.role === 'superadmin' || project.createdBy === user.id) ? 'Save Changes' : 'Submit for Review'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Collaborative Editor</h2>
                  <div className="flex items-center space-x-4">
                    {!(user?.role === 'admin' || user?.role === 'superadmin' || project.createdBy === user.id) && (
                      <div className="flex items-center text-blue-600 bg-blue-100 px-3 py-1 rounded-full text-sm">
                        <Eye className="w-4 h-4 mr-2" />
                        <span>Collaborator Mode</span>
                      </div>
                    )}
                    {project.hasStagedChanges && (
                      <div className="flex items-center text-orange-600 bg-orange-100 px-3 py-1 rounded-full text-sm">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        <span>Has Pending Changes</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <RealtimeInput
                projectId={project.id}
                user={user}
                inputId="main-editor"
                multiline={true}
                rows={24}
                placeholder={`Start writing your content here...${!(user?.role === 'admin' || user?.role === 'superadmin' || project.createdBy === user.id) ? '\n\nNote: Your changes will be staged for admin approval.' : ''}`}
                className="w-full h-96 p-8 border-none resize-none focus:outline-none bg-transparent font-mono text-lg leading-relaxed"
                onContentChange={(newContent) => setContent(newContent)}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-indigo-500" />
                Team Members
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
                        project.createdBy === project.members[index] ? 'text-blue-600' : 'text-green-600'
                      }`}>
                        {project.createdBy === project.members[index] ? 'Project Owner' : 'Collaborator'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Project Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Members</span>
                  <span className="font-semibold">{project.memberNames?.length || 1}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Words</span>
                  <span className="font-semibold">{content.split(' ').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Characters</span>
                  <span className="font-semibold">{content.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Your Role</span>
                  <span className={`font-semibold ${
                    (user?.role === 'admin' || user?.role === 'superadmin') ? 'text-purple-600' :
                    project.createdBy === user.id ? 'text-blue-600' : 'text-green-600'
                  }`}>
                    {(user?.role === 'admin' || user?.role === 'superadmin') ? 'Admin' :
                     project.createdBy === user.id ? 'Owner' : 'Collaborator'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollaborativeWorkspace;