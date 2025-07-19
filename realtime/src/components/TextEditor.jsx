import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Users, Activity, Clock, User } from 'lucide-react';

const TextEditor = ({ project, onBack, user }) => {
  const [content, setContent] = useState('# Welcome to the Project\n\nStart collaborating here...');
  const [lastSaved, setLastSaved] = useState(new Date());
  const [collaborators, setCollaborators] = useState([
    { id: 1, name: 'John Doe', avatar: 'JD', active: true, lastSeen: new Date() },
    { id: 2, name: 'Jane Smith', avatar: 'JS', active: false, lastSeen: new Date(Date.now() - 300000) },
    { id: 3, name: 'Mike Johnson', avatar: 'MJ', active: true, lastSeen: new Date() }
  ]);
  const [activities, setActivities] = useState([
    { id: 1, user: 'John Doe', action: 'edited document', time: new Date(Date.now() - 120000) },
    { id: 2, user: 'Jane Smith', action: 'added new section', time: new Date(Date.now() - 300000) },
    { id: 3, user: 'Mike Johnson', action: 'joined project', time: new Date(Date.now() - 600000) }
  ]);

  const handleSave = () => {
    setLastSaved(new Date());
    const newActivity = {
      id: Date.now(),
      user: user?.fullName || 'You',
      action: 'saved document',
      time: new Date()
    };
    setActivities([newActivity, ...activities]);
  };

  const handleContentChange = (e) => {
    setContent(e.target.value);
    // Simulate real-time activity
    const newActivity = {
      id: Date.now(),
      user: user?.fullName || 'You',
      action: 'is typing...',
      time: new Date()
    };
    setActivities([newActivity, ...activities.slice(0, 9)]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="btn btn-secondary text-sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Projects
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                <p className="text-gray-600">Last saved: {lastSaved.toLocaleTimeString()}</p>
              </div>
            </div>
            <button
              onClick={handleSave}
              className="btn btn-success flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Save</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Editor */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h2 className="font-semibold text-gray-900">Document Editor</h2>
              </div>
              <textarea
                value={content}
                onChange={handleContentChange}
                className="w-full h-96 p-6 border-none resize-none focus:outline-none font-mono text-sm leading-relaxed"
                placeholder="Start writing your content here..."
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Collaborators */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-indigo-500" />
                Collaborators ({collaborators.length})
              </h3>
              <div className="space-y-3">
                {collaborators.map((collaborator) => (
                  <div key={collaborator.id} className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {collaborator.avatar}
                      </div>
                      {collaborator.active && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{collaborator.name}</p>
                      <p className="text-xs text-gray-500">
                        {collaborator.active ? 'Active now' : `${Math.floor((Date.now() - collaborator.lastSeen) / 60000)}m ago`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-green-500" />
                Recent Activity
              </h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{activity.user}</span> {activity.action}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {Math.floor((Date.now() - activity.time) / 60000)}m ago
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Project Stats */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Project Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Members</span>
                  <span className="font-semibold text-gray-900">{project.memberCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Activities</span>
                  <span className="font-semibold text-gray-900">{activities.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Word Count</span>
                  <span className="font-semibold text-gray-900">{content.split(' ').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Characters</span>
                  <span className="font-semibold text-gray-900">{content.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextEditor;