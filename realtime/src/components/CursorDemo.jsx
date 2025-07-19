import React, { useState, useEffect } from 'react';
import CollaborativeCursor from './CollaborativeCursor';
import { Users, MousePointer, Zap, Eye, Settings } from 'lucide-react';

const CursorDemo = ({ user }) => {
  const [demoMode, setDemoMode] = useState('canvas');
  const [showInstructions, setShowInstructions] = useState(true);

  const demoModes = [
    { id: 'canvas', name: 'Canvas Mode', icon: MousePointer, description: 'Free-form cursor tracking' },
    { id: 'editor', name: 'Editor Mode', icon: Settings, description: 'Text editor simulation' },
    { id: 'presentation', name: 'Presentation Mode', icon: Eye, description: 'Presentation viewer' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Real-time Collaborative Cursors</h1>
                <p className="text-sm text-gray-600">Experience live cursor collaboration</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <select
                value={demoMode}
                onChange={(e) => setDemoMode(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {demoModes.map(mode => (
                  <option key={mode.id} value={mode.id}>{mode.name}</option>
                ))}
              </select>
              
              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {showInstructions ? 'Hide' : 'Show'} Instructions
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions Panel */}
      {showInstructions && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <MousePointer className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900">Move Your Cursor</h3>
                  <p className="text-sm text-blue-700">Move your mouse around to see your cursor position shared with others in real-time</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-900">Click Anywhere</h3>
                  <p className="text-sm text-green-700">Click to create animated effects that other users can see</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Eye className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-purple-900">Hover Effects</h3>
                  <p className="text-sm text-purple-700">Hover over elements to show enhanced cursor effects and activity indicators</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Demo Content */}
      <CollaborativeCursor 
        projectId={`demo-${demoMode}`} 
        user={user}
        className="flex-1"
      >
        <div className="max-w-7xl mx-auto px-4 py-8">
          {demoMode === 'canvas' && <CanvasDemo />}
          {demoMode === 'editor' && <EditorDemo />}
          {demoMode === 'presentation' && <PresentationDemo />}
        </div>
      </CollaborativeCursor>
    </div>
  );
};

const CanvasDemo = () => (
  <div className="space-y-8">
    <div className="text-center">
      <h2 className="text-3xl font-bold text-gray-900 mb-4">Canvas Collaboration</h2>
      <p className="text-gray-600 max-w-2xl mx-auto">
        This simulates a collaborative canvas where multiple users can interact simultaneously. 
        Move your cursor around and click to see real-time collaboration in action.
      </p>
    </div>
    
    <div className="bg-white rounded-xl shadow-lg p-8 min-h-96 border-2 border-dashed border-gray-200 relative">
      <div className="absolute inset-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <MousePointer className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Interactive Canvas Area</h3>
          <p className="text-gray-500">Move your cursor and click anywhere in this area</p>
        </div>
      </div>
      
      {/* Interactive elements */}
      <div className="absolute top-8 left-8 w-16 h-16 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors cursor-pointer"></div>
      <div className="absolute top-8 right-8 w-16 h-16 bg-green-500 rounded-full hover:bg-green-600 transition-colors cursor-pointer"></div>
      <div className="absolute bottom-8 left-8 w-16 h-16 bg-purple-500 rounded-lg rotate-45 hover:bg-purple-600 transition-colors cursor-pointer"></div>
      <div className="absolute bottom-8 right-8 w-16 h-16 bg-red-500 rounded-full hover:bg-red-600 transition-colors cursor-pointer"></div>
    </div>
  </div>
);

const EditorDemo = () => (
  <div className="space-y-8">
    <div className="text-center">
      <h2 className="text-3xl font-bold text-gray-900 mb-4">Code Editor Collaboration</h2>
      <p className="text-gray-600 max-w-2xl mx-auto">
        Simulates a collaborative code editor where team members can see each other's cursor positions while editing.
      </p>
    </div>
    
    <div className="bg-gray-900 rounded-xl shadow-lg overflow-hidden">
      <div className="bg-gray-800 px-4 py-2 flex items-center space-x-2">
        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
        <span className="text-gray-400 text-sm ml-4">collaborative-editor.js</span>
      </div>
      
      <div className="p-6 font-mono text-sm text-gray-300 min-h-96 relative">
        <div className="space-y-2">
          <div><span className="text-purple-400">import</span> <span className="text-blue-400">React</span> <span className="text-purple-400">from</span> <span className="text-green-400">'react'</span>;</div>
          <div><span className="text-purple-400">import</span> <span className="text-blue-400">CollaborativeCursor</span> <span className="text-purple-400">from</span> <span className="text-green-400">'./CollaborativeCursor'</span>;</div>
          <div></div>
          <div><span className="text-purple-400">const</span> <span className="text-blue-400">MyEditor</span> = <span className="text-yellow-400">()</span> <span className="text-purple-400">=&gt;</span> <span className="text-yellow-400">{`{`}</span></div>
          <div className="ml-4"><span className="text-purple-400">return</span> <span className="text-yellow-400">(</span></div>
          <div className="ml-8"><span className="text-red-400">&lt;CollaborativeCursor</span></div>
          <div className="ml-10"><span className="text-blue-400">projectId</span>=<span className="text-green-400">"my-project"</span></div>
          <div className="ml-10"><span className="text-blue-400">user</span>=<span className="text-yellow-400">{`{`}</span><span className="text-blue-400">currentUser</span><span className="text-yellow-400">{`}`}</span></div>
          <div className="ml-8"><span className="text-red-400">&gt;</span></div>
          <div className="ml-10"><span className="text-gray-500">// Your editor content here</span></div>
          <div className="ml-8"><span className="text-red-400">&lt;/CollaborativeCursor&gt;</span></div>
          <div className="ml-4"><span className="text-yellow-400">)</span>;</div>
          <div><span className="text-yellow-400">{`}`}</span>;</div>
        </div>
        
        {/* Hover areas */}
        <div className="absolute inset-0 grid grid-cols-12 grid-rows-12 gap-1 opacity-0 hover:opacity-10">
          {Array.from({ length: 144 }, (_, i) => (
            <div key={i} className="bg-blue-500 hover:bg-blue-400 transition-colors"></div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const PresentationDemo = () => (
  <div className="space-y-8">
    <div className="text-center">
      <h2 className="text-3xl font-bold text-gray-900 mb-4">Presentation Mode</h2>
      <p className="text-gray-600 max-w-2xl mx-auto">
        Perfect for presentations where you want to show cursor movements to highlight content for your audience.
      </p>
    </div>
    
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h3 className="text-2xl font-bold text-gray-900">Key Features</h3>
          <ul className="space-y-4">
            <li className="flex items-start space-x-3 hover:bg-blue-50 p-3 rounded-lg transition-colors">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex-shrink-0 mt-0.5"></div>
              <div>
                <h4 className="font-semibold text-gray-900">Real-time Synchronization</h4>
                <p className="text-gray-600">See cursor movements instantly across all connected clients</p>
              </div>
            </li>
            <li className="flex items-start space-x-3 hover:bg-green-50 p-3 rounded-lg transition-colors">
              <div className="w-6 h-6 bg-green-500 rounded-full flex-shrink-0 mt-0.5"></div>
              <div>
                <h4 className="font-semibold text-gray-900">Smooth Animations</h4>
                <p className="text-gray-600">Buttery smooth cursor movements with optimized performance</p>
              </div>
            </li>
            <li className="flex items-start space-x-3 hover:bg-purple-50 p-3 rounded-lg transition-colors">
              <div className="w-6 h-6 bg-purple-500 rounded-full flex-shrink-0 mt-0.5"></div>
              <div>
                <h4 className="font-semibold text-gray-900">Visual Effects</h4>
                <p className="text-gray-600">Click and hover effects to enhance collaboration</p>
              </div>
            </li>
          </ul>
        </div>
        
        <div className="space-y-6">
          <h3 className="text-2xl font-bold text-gray-900">Technical Specs</h3>
          <div className="bg-gray-50 rounded-lg p-6 space-y-4">
            <div className="flex justify-between items-center hover:bg-white p-2 rounded transition-colors">
              <span className="font-medium text-gray-700">Update Rate</span>
              <span className="text-blue-600 font-semibold">60 FPS</span>
            </div>
            <div className="flex justify-between items-center hover:bg-white p-2 rounded transition-colors">
              <span className="font-medium text-gray-700">Latency</span>
              <span className="text-green-600 font-semibold">&lt; 50ms</span>
            </div>
            <div className="flex justify-between items-center hover:bg-white p-2 rounded transition-colors">
              <span className="font-medium text-gray-700">Max Users</span>
              <span className="text-purple-600 font-semibold">100+</span>
            </div>
            <div className="flex justify-between items-center hover:bg-white p-2 rounded transition-colors">
              <span className="font-medium text-gray-700">Protocol</span>
              <span className="text-orange-600 font-semibold">WebSocket</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default CursorDemo;