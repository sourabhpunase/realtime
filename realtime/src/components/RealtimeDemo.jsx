import React, { useState } from 'react';
import CollaborativeCursor from './CollaborativeCursor';
import RealtimeInput from './RealtimeInput';
import { Users, MessageSquare, Edit3, Eye } from 'lucide-react';

const RealtimeDemo = ({ user }) => {
  const demoProjectId = 'realtime-demo';
  const [chatMessage, setChatMessage] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <CollaborativeCursor 
      projectId={demoProjectId} 
      user={user} 
      className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8"
    >
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Real-time Collaborative Demo
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Experience real-time collaboration with live cursors, typing indicators, and synchronized inputs!
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6">
              <div className="flex items-center mb-3">
                <Users className="w-6 h-6 text-green-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Live Cursors</h3>
              </div>
              <p className="text-gray-700 text-sm">See other users' mouse cursors moving in real-time with their names and unique colors.</p>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6">
              <div className="flex items-center mb-3">
                <Edit3 className="w-6 h-6 text-blue-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Real-time Input</h3>
              </div>
              <p className="text-gray-700 text-sm">Type together and see changes instantly with typing indicators and cursor positions.</p>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6">
              <div className="flex items-center mb-3">
                <Eye className="w-6 h-6 text-purple-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Live Presence</h3>
              </div>
              <p className="text-gray-700 text-sm">Know who's online and what they're doing with connection indicators.</p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Chat Section */}
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="flex items-center mb-6">
              <MessageSquare className="w-6 h-6 text-blue-600 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900">Live Chat</h2>
            </div>
            
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-2xl p-4 h-64 overflow-y-auto">
                <p className="text-gray-500 text-center">Start typing to see real-time collaboration!</p>
              </div>
              
              <div className="relative">
                <RealtimeInput
                  projectId={demoProjectId}
                  user={user}
                  inputId="chat-input"
                  placeholder="Type a message... (others will see you typing)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onContentChange={setChatMessage}
                />
              </div>
            </div>
          </div>
          
          {/* Notes Section */}
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="flex items-center mb-6">
              <Edit3 className="w-6 h-6 text-green-600 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900">Collaborative Notes</h2>
            </div>
            
            <div className="relative">
              <RealtimeInput
                projectId={demoProjectId}
                user={user}
                inputId="notes-textarea"
                multiline={true}
                rows={12}
                placeholder="Start writing collaborative notes here...

• See typing indicators
• Real-time synchronization  
• Live cursor positions
• Connection status

Try opening this in multiple tabs!"
                className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm leading-relaxed resize-none"
                onContentChange={setNotes}
              />
            </div>
          </div>
        </div>
        
        {/* Feature Showcase */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">How to Test Real-time Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Single User Testing</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Open this page in multiple browser tabs
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Move your mouse to see cursors sync between tabs
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Type in inputs to see real-time updates
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Watch typing indicators appear
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Multi-User Testing</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Share this page with team members
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Each user gets a unique cursor color
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  See live collaboration in action
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Connection status shows online users
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </CollaborativeCursor>
  );
};

export default RealtimeDemo;