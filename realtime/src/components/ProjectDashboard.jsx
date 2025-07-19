import React, { useState, useEffect } from 'react';
import { Plus, Users, FileText, Activity, Mail, Check, X, Edit3, UserPlus } from 'lucide-react';

const ProjectDashboard = ({ user, onOpenEditor, getAllUsers }) => {
  const [projects, setProjects] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [newProject, setNewProject] = useState({ name: '', description: '' });

  useEffect(() => {
    loadProjects();
    loadInvitations();
    if (user?.role === 'superadmin') {
      loadAllUsers();
    }
  }, []);

  const loadProjects = () => {
    const mockProjects = user?.role === 'superadmin' ? [
      {
        id: 1,
        name: 'Website Redesign',
        description: 'Complete redesign of company website',
        memberCount: 3,
        activityCount: 15,
        createdBy: user.id,
        createdAt: new Date().toISOString()
      }
    ] : [
      {
        id: 2,
        name: 'Mobile App Project',
        description: 'Cross-platform mobile development',
        memberCount: 2,
        activityCount: 8,
        createdBy: 'superadmin',
        createdAt: new Date().toISOString()
      }
    ];
    setProjects(mockProjects);
  };

  const loadInvitations = () => {
    if (user?.role !== 'superadmin') {
      setInvitations([
        {
          id: 1,
          projectId: 1,
          projectName: 'Marketing Campaign',
          projectDescription: 'Q4 marketing strategy and execution',
          inviterName: 'Super Administrator',
          createdAt: new Date().toISOString()
        }
      ]);
    }
  };

  const loadAllUsers = async () => {
    try {
      const response = await getAllUsers();
      setAllUsers(response.users.filter(u => u.id !== user.id));
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleCreateProject = (e) => {
    e.preventDefault();
    const project = {
      id: Date.now(),
      ...newProject,
      memberCount: 1,
      activityCount: 0,
      createdBy: user?.id,
      createdAt: new Date().toISOString()
    };
    setProjects([...projects, project]);
    setNewProject({ name: '', description: '' });
    setShowCreateForm(false);
  };

  const handleInviteUsers = () => {
    if (selectedUsers.length === 0) {
      alert('Please select users to invite');
      return;
    }
    
    alert(`Invitations sent to ${selectedUsers.length} users for project: ${selectedProject.name}`);
    setShowInviteModal(false);
    setSelectedUsers([]);
    setSelectedProject(null);
  };

  const handleInvitationResponse = (invitationId, accept) => {
    if (accept) {
      const invitation = invitations.find(inv => inv.id === invitationId);
      const newProject = {
        id: invitation.projectId,
        name: invitation.projectName,
        description: invitation.projectDescription,
        memberCount: 2,
        activityCount: 5,
        createdBy: 'superadmin',
        createdAt: new Date().toISOString()
      };
      setProjects([...projects, newProject]);
    }
    setInvitations(invitations.filter(inv => inv.id !== invitationId));
  };

  const openInviteModal = (project) => {
    setSelectedProject(project);
    setShowInviteModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center space-x-6">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <FileText className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Project Dashboard</h1>
                <p className="text-xl text-gray-600">Collaborate on projects with your team</p>
                <div className="mt-2 flex items-center space-x-4">
                  <span className="inline-flex items-center px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                    <Users className="w-4 h-4 mr-1" />
                    {projects.length} Projects
                  </span>
                  {invitations.length > 0 && (
                    <span className="inline-flex items-center px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                      <Mail className="w-4 h-4 mr-1" />
                      {invitations.length} Invitations
                    </span>
                  )}
                </div>
              </div>
            </div>
            {user?.role === 'superadmin' && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="btn btn-success flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>New Project</span>
              </button>
            )}
          </div>
        </div>

        {/* Invitations */}
        {invitations.length > 0 && (
          <div className="mb-8 bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Mail className="w-6 h-6 mr-2 text-orange-500" />
              Project Invitations
            </h2>
            <div className="space-y-4">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between p-4 bg-orange-50 rounded-xl border border-orange-200">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{invitation.projectName}</h3>
                      <p className="text-sm text-gray-600">{invitation.projectDescription}</p>
                      <p className="text-xs text-gray-500">
                        Invited by {invitation.inviterName} • {new Date(invitation.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleInvitationResponse(invitation.id, true)}
                      className="btn btn-success text-sm"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Accept
                    </button>
                    <button
                      onClick={() => handleInvitationResponse(invitation.id, false)}
                      className="btn btn-danger text-sm"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create Project Form */}
        {showCreateForm && (
          <div className="mb-8 bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Create New Project</h2>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <input
                type="text"
                placeholder="Project Name"
                value={newProject.name}
                onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                className="input-field"
                required
              />
              <textarea
                placeholder="Project Description"
                value={newProject.description}
                onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                className="input-field h-24 resize-none"
                required
              />
              <div className="flex space-x-3">
                <button type="submit" className="btn btn-success">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Project
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

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Projects Yet</h3>
              <p className="text-gray-600">
                {user?.role === 'superadmin' 
                  ? 'Create your first project to start collaborating'
                  : 'Wait for project invitations to start collaborating'
                }
              </p>
            </div>
          ) : (
            projects.map((project) => (
              <div key={project.id} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  {user?.role === 'superadmin' && project.createdBy === user.id && (
                    <button
                      onClick={() => openInviteModal(project)}
                      className="btn btn-success text-xs flex items-center space-x-1"
                    >
                      <UserPlus className="w-3 h-3" />
                      <span>Invite</span>
                    </button>
                  )}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{project.name}</h3>
                <p className="text-gray-600 mb-4">{project.description}</p>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center text-sm text-gray-500">
                      <Users className="w-4 h-4 mr-1" />
                      {project.memberCount} members
                    </span>
                    <span className="flex items-center text-sm text-gray-500">
                      <Activity className="w-4 h-4 mr-1" />
                      {project.activityCount} activities
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onOpenEditor(project)}
                  className="w-full btn btn-primary flex items-center justify-center space-x-2"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Open Editor</span>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Invite Users Modal */}
        {showInviteModal && selectedProject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">
                  Invite Users to {selectedProject.name}
                </h3>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Select Users to Invite:</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {allUsers.map((dbUser) => (
                    <label key={dbUser.id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
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
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <div className="user-avatar text-sm">
                        {dbUser.firstName?.charAt(0)}{dbUser.lastName?.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{dbUser.fullName}</p>
                        <p className="text-sm text-gray-500">{dbUser.email}</p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          dbUser.role === 'admin' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {dbUser.role === 'admin' ? '👑 Admin' : '👤 User'}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowInviteModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleInviteUsers}
                    className="btn btn-success flex items-center space-x-2"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Send Invitations</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDashboard;