import React from 'react';
import CollaborativeCursor from './CollaborativeCursor';
import { ArrowLeft } from 'lucide-react';

const RealtimeEditor = ({ project, user, onBack }) => {
  return (
    <CollaborativeCursor 
      projectId={project.id} 
      user={user} 
      className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50"
    >
      <div className="max-w-7xl mx-auto px-4 py-8">
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
                  <p className="text-gray-600">Real-time collaborative editing with live cursors</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Collaborative Editor with Live Cursors</h2>
          <p className="text-gray-600 mb-6">
            This editor shows real-time cursor positions from all connected users. 
            Move your mouse around and see other users' cursors!
          </p>
          
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 min-h-[400px]">
            <div className="text-center">
              <div className="text-6xl mb-4">✨</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Real-time Collaboration</h3>
              <p className="text-gray-600">
                See live cursors from all connected users in this project
              </p>
            </div>
          </div>
        </div>
      </div>
    </CollaborativeCursor>
  );
};

export default RealtimeEditor;