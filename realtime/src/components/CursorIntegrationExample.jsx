import React, { useState } from 'react';
import { CursorProvider, useCursorData } from './CursorProvider';
import CursorDemo from './CursorDemo';
import { MousePointer, Users, Zap, Code, FileText, Presentation } from 'lucide-react';

/**
 * Example showing how to integrate collaborative cursors into your existing app
 */
const CursorIntegrationExample = ({ user }) => {
  const [activeExample, setActiveExample] = useState('basic');

  const examples = [
    { id: 'basic', name: 'Basic Integration', icon: MousePointer },
    { id: 'editor', name: 'Code Editor', icon: Code },
    { id: 'document', name: 'Document Editor', icon: FileText },
    { id: 'presentation', name: 'Presentation', icon: Presentation },
    { id: 'demo', name: 'Full Demo', icon: Zap }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Cursor Integration Examples</h1>
                <p className="text-sm text-gray-600">See how to integrate collaborative cursors</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {examples.map(example => {
                const Icon = example.icon;
                return (
                  <button
                    key={example.id}
                    onClick={() => setActiveExample(example.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      activeExample === example.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{example.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeExample === 'basic' && <BasicExample user={user} />}
        {activeExample === 'editor' && <EditorExample user={user} />}
        {activeExample === 'document' && <DocumentExample user={user} />}
        {activeExample === 'presentation' && <PresentationExample user={user} />}
        {activeExample === 'demo' && <CursorDemo user={user} />}
      </div>
    </div>
  );
};

// Basic integration example
const BasicExample = ({ user }) => (
  <div className="space-y-8">
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Basic Integration</h2>
      <p className="text-gray-600 mb-6">
        The simplest way to add collaborative cursors to your app. Just wrap your content with CursorProvider.
      </p>
      
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <pre className="text-sm text-gray-800 overflow-x-auto">
{`import { CursorProvider } from './components/CursorProvider';

function MyApp() {
  const user = { id: 'user-123', name: 'John Doe' };
  
  return (
    <CursorProvider projectId="my-project" user={user}>
      <div className="min-h-screen p-8">
        <h1>My Collaborative App</h1>
        <p>Move your cursor around!</p>
      </div>
    </CursorProvider>
  );
}`}
        </pre>
      </div>
    </div>

    {/* Live Example */}
    <CursorProvider projectId="basic-example" user={user}>
      <div className="bg-white rounded-lg shadow-sm p-8 min-h-96 border-2 border-dashed border-gray-200">
        <div className="text-center space-y-4">
          <h3 className="text-xl font-semibold text-gray-900">Live Example</h3>
          <p className="text-gray-600">Move your cursor in this area to see it in action!</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-blue-100 p-4 rounded-lg hover:bg-blue-200 transition-colors">
              <div className="w-8 h-8 bg-blue-500 rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-blue-800">Hover me</p>
            </div>
            <div className="bg-green-100 p-4 rounded-lg hover:bg-green-200 transition-colors">
              <div className="w-8 h-8 bg-green-500 rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-green-800">Click me</p>
            </div>
            <div className="bg-purple-100 p-4 rounded-lg hover:bg-purple-200 transition-colors">
              <div className="w-8 h-8 bg-purple-500 rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-purple-800">Try me</p>
            </div>
            <div className="bg-orange-100 p-4 rounded-lg hover:bg-orange-200 transition-colors">
              <div className="w-8 h-8 bg-orange-500 rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-orange-800">Test me</p>
            </div>
          </div>
        </div>
      </div>
    </CursorProvider>
  </div>
);

// Code editor example
const EditorExample = ({ user }) => (
  <div className="space-y-8">
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Code Editor Integration</h2>
      <p className="text-gray-600 mb-6">
        Perfect for collaborative coding environments like VS Code extensions or online IDEs.
      </p>
    </div>

    <CursorProvider 
      projectId="editor-example" 
      user={user}
      config={{ enableHoverEffects: true }}
    >
      <div className="bg-gray-900 rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-400 text-sm ml-4">collaborative-app.jsx</span>
          </div>
          <CursorStats />
        </div>
        
        <div className="p-6 font-mono text-sm text-gray-300 min-h-96">
          <div className="space-y-1">
            <div className="hover:bg-gray-800 px-2 py-1 rounded"><span className="text-purple-400">import</span> <span className="text-blue-400">React</span> <span className="text-purple-400">from</span> <span className="text-green-400">'react'</span>;</div>
            <div className="hover:bg-gray-800 px-2 py-1 rounded"><span className="text-purple-400">import</span> <span className="text-blue-400">{`{ CursorProvider }`}</span> <span className="text-purple-400">from</span> <span className="text-green-400">'./CursorProvider'</span>;</div>
            <div className="hover:bg-gray-800 px-2 py-1 rounded"></div>
            <div className="hover:bg-gray-800 px-2 py-1 rounded"><span className="text-purple-400">function</span> <span className="text-blue-400">CollaborativeEditor</span><span className="text-yellow-400">()</span> <span className="text-yellow-400">{`{`}</span></div>
            <div className="hover:bg-gray-800 px-2 py-1 rounded ml-4"><span className="text-purple-400">const</span> <span className="text-blue-400">user</span> = <span className="text-yellow-400">{`{`}</span> <span className="text-blue-400">id:</span> <span className="text-green-400">'user-123'</span>, <span className="text-blue-400">name:</span> <span className="text-green-400">'Developer'</span> <span className="text-yellow-400">{`}`}</span>;</div>
            <div className="hover:bg-gray-800 px-2 py-1 rounded ml-4"></div>
            <div className="hover:bg-gray-800 px-2 py-1 rounded ml-4"><span className="text-purple-400">return</span> <span className="text-yellow-400">(</span></div>
            <div className="hover:bg-gray-800 px-2 py-1 rounded ml-8"><span className="text-red-400">&lt;CursorProvider</span></div>
            <div className="hover:bg-gray-800 px-2 py-1 rounded ml-10"><span className="text-blue-400">projectId</span>=<span className="text-green-400">"code-session"</span></div>
            <div className="hover:bg-gray-800 px-2 py-1 rounded ml-10"><span className="text-blue-400">user</span>=<span className="text-yellow-400">{`{`}</span><span className="text-blue-400">user</span><span className="text-yellow-400">{`}`}</span></div>
            <div className="hover:bg-gray-800 px-2 py-1 rounded ml-8"><span className="text-red-400">&gt;</span></div>
            <div className="hover:bg-gray-800 px-2 py-1 rounded ml-10"><span className="text-gray-500">// Your code editor component</span></div>
            <div className="hover:bg-gray-800 px-2 py-1 rounded ml-10"><span className="text-red-400">&lt;CodeEditor</span> <span className="text-blue-400">language</span>=<span className="text-green-400">"javascript"</span> <span className="text-red-400">/&gt;</span></div>
            <div className="hover:bg-gray-800 px-2 py-1 rounded ml-8"><span className="text-red-400">&lt;/CursorProvider&gt;</span></div>
            <div className="hover:bg-gray-800 px-2 py-1 rounded ml-4"><span className="text-yellow-400">)</span>;</div>
            <div className="hover:bg-gray-800 px-2 py-1 rounded"><span className="text-yellow-400">{`}`}</span></div>
          </div>
        </div>
      </div>
    </CursorProvider>
  </div>
);

// Document editor example
const DocumentExample = ({ user }) => (
  <div className="space-y-8">
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Document Editor Integration</h2>
      <p className="text-gray-600 mb-6">
        Great for collaborative document editing like Google Docs or Notion.
      </p>
    </div>

    <CursorProvider 
      projectId="document-example" 
      user={user}
      config={{ enableClickEffects: true, enableHoverEffects: true }}
    >
      <div className="bg-white rounded-lg shadow-lg p-8 min-h-96">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2 hover:bg-blue-50 p-2 rounded transition-colors">
              Collaborative Document Title
            </h1>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>Last edited: 2 minutes ago</span>
              <CursorStats />
            </div>
          </div>
          
          <div className="prose max-w-none space-y-4">
            <p className="hover:bg-yellow-50 p-2 rounded transition-colors">
              This is a collaborative document where multiple users can work together in real-time. 
              Move your cursor around to see the collaborative features in action.
            </p>
            
            <p className="hover:bg-green-50 p-2 rounded transition-colors">
              The cursor system provides smooth, real-time tracking of all users' mouse positions, 
              with beautiful animations and visual feedback for clicks and hover states.
            </p>
            
            <div className="bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors">
              <h3 className="font-semibold text-gray-900 mb-2">Key Features:</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li className="hover:bg-white p-1 rounded">Real-time cursor synchronization</li>
                <li className="hover:bg-white p-1 rounded">Automatic color assignment</li>
                <li className="hover:bg-white p-1 rounded">Smooth animations and effects</li>
                <li className="hover:bg-white p-1 rounded">Performance optimized</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </CursorProvider>
  </div>
);

// Presentation example
const PresentationExample = ({ user }) => (
  <div className="space-y-8">
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Presentation Mode</h2>
      <p className="text-gray-600 mb-6">
        Perfect for presentations where you want to highlight content with cursor movements.
      </p>
    </div>

    <CursorProvider 
      projectId="presentation-example" 
      user={user}
      config={{ enableClickEffects: true }}
    >
      <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-lg shadow-lg p-8 text-white min-h-96">
        <div className="text-center space-y-8">
          <div>
            <h1 className="text-4xl font-bold mb-4 hover:scale-105 transition-transform">
              Real-time Collaboration
            </h1>
            <p className="text-xl text-blue-100 hover:text-white transition-colors">
              Experience the future of collaborative work
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 hover:bg-white/20 transition-colors">
              <div className="w-12 h-12 bg-blue-400 rounded-full mx-auto mb-4"></div>
              <h3 className="font-semibold mb-2">Real-time Sync</h3>
              <p className="text-sm text-blue-100">See cursors move instantly</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 hover:bg-white/20 transition-colors">
              <div className="w-12 h-12 bg-green-400 rounded-full mx-auto mb-4"></div>
              <h3 className="font-semibold mb-2">Visual Effects</h3>
              <p className="text-sm text-blue-100">Beautiful click animations</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 hover:bg-white/20 transition-colors">
              <div className="w-12 h-12 bg-purple-400 rounded-full mx-auto mb-4"></div>
              <h3 className="font-semibold mb-2">Easy Integration</h3>
              <p className="text-sm text-blue-100">Drop-in React component</p>
            </div>
          </div>
        </div>
      </div>
    </CursorProvider>
  </div>
);

// Helper component to show cursor statistics
const CursorStats = () => {
  const { userCount, isConnected } = useCursorData();
  
  return (
    <div className="flex items-center space-x-2 text-xs">
      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
      <span className="text-gray-400">
        {userCount} user{userCount !== 1 ? 's' : ''} online
      </span>
    </div>
  );
};

export default CursorIntegrationExample;