import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { Users, Wifi, WifiOff, Save, ArrowLeft, Eye, Edit3 } from 'lucide-react';

const RealTimeEditor = ({ user, documentId, onBack }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [document, setDocument] = useState(null);
  const [content, setContent] = useState('');
  const [users, setUsers] = useState([]);
  const [cursors, setCursors] = useState([]);
  const [selections, setSelections] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [isTyping, setIsTyping] = useState(false);
  
  const editorRef = useRef(null);
  const cursorPositionRef = useRef(0);
  const typingTimeoutRef = useRef(null);
  const operationQueueRef = useRef([]);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to real-time server');
      
      // Join document
      newSocket.emit('join-document', {
        documentId: documentId || 'default-doc',
        user: {
          id: user.id,
          name: user.fullName,
          email: user.email
        }
      });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from real-time server');
    });

    // Document state received
    newSocket.on('document-state', (docState) => {
      setDocument(docState);
      setContent(docState.content);
      setCursors(docState.cursors || []);
      setSelections(docState.selections || []);
    });

    // Users updates
    newSocket.on('users-update', (usersList) => {
      setUsers(usersList);
    });

    newSocket.on('user-joined', (newUser) => {
      console.log(`${newUser.name} joined the document`);
    });

    newSocket.on('user-left', (leftUser) => {
      console.log(`${leftUser.name} left the document`);
    });

    // Real-time operations
    newSocket.on('operation', (operation) => {
      applyOperation(operation);
    });

    // Cursor updates
    newSocket.on('cursor-update', (cursorData) => {
      setCursors(prev => {
        const filtered = prev.filter(c => c.userId !== cursorData.userId);
        return [...filtered, cursorData];
      });
    });

    // Selection updates
    newSocket.on('selection-update', (selectionData) => {
      setSelections(prev => {
        const filtered = prev.filter(s => s.userId !== selectionData.userId);
        return [...filtered, selectionData];
      });
    });

    // Typing indicators
    newSocket.on('user-typing', (typingData) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        if (typingData.isTyping) {
          newSet.add(typingData.userId);
        } else {
          newSet.delete(typingData.userId);
        }
        return newSet;
      });
    });

    return () => {
      newSocket.disconnect();
    };
  }, [documentId, user]);

  // Apply operation to content
  const applyOperation = useCallback((operation) => {
    setContent(prevContent => {
      let newContent = prevContent;
      
      if (operation.type === 'insert') {
        newContent = prevContent.slice(0, operation.position) + 
                    operation.text + 
                    prevContent.slice(operation.position);
      } else if (operation.type === 'delete') {
        newContent = prevContent.slice(0, operation.position) + 
                    prevContent.slice(operation.position + operation.length);
      } else if (operation.type === 'replace') {
        newContent = prevContent.slice(0, operation.position) + 
                    operation.text + 
                    prevContent.slice(operation.position + operation.length);
      }
      
      return newContent;
    });
  }, []);

  // Send operation to server
  const sendOperation = useCallback((operation) => {
    if (socket && isConnected) {
      socket.emit('operation', operation);
    }
  }, [socket, isConnected]);

  // Handle text changes
  const handleContentChange = (e) => {
    const newContent = e.target.value;
    const cursorPosition = e.target.selectionStart;
    
    // Calculate the difference
    const oldContent = content;
    const operation = calculateOperation(oldContent, newContent, cursorPosition);
    
    if (operation) {
      // Apply locally first for immediate feedback
      setContent(newContent);
      
      // Send to server
      sendOperation(operation);
    }

    // Handle typing indicator
    if (!isTyping) {
      setIsTyping(true);
      socket?.emit('typing', { isTyping: true });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket?.emit('typing', { isTyping: false });
    }, 1000);
  };

  // Calculate operation from content difference
  const calculateOperation = (oldContent, newContent, cursorPosition) => {
    if (oldContent === newContent) return null;

    if (newContent.length > oldContent.length) {
      // Insertion
      const insertPosition = cursorPosition - (newContent.length - oldContent.length);
      const insertedText = newContent.slice(insertPosition, cursorPosition);
      
      return {
        type: 'insert',
        position: insertPosition,
        text: insertedText
      };
    } else if (newContent.length < oldContent.length) {
      // Deletion
      const deleteLength = oldContent.length - newContent.length;
      
      return {
        type: 'delete',
        position: cursorPosition,
        length: deleteLength
      };
    } else {
      // Replacement (same length)
      let startPos = 0;
      let endPos = oldContent.length;
      
      // Find start of difference
      while (startPos < oldContent.length && oldContent[startPos] === newContent[startPos]) {
        startPos++;
      }
      
      // Find end of difference
      while (endPos > startPos && oldContent[endPos - 1] === newContent[endPos - 1]) {
        endPos--;
      }
      
      const replacedText = newContent.slice(startPos, startPos + (endPos - startPos));
      
      return {
        type: 'replace',
        position: startPos,
        length: endPos - startPos,
        text: replacedText
      };
    }
  };

  // Handle cursor position changes
  const handleCursorChange = (e) => {
    const position = e.target.selectionStart;
    const textBeforeCursor = content.slice(0, position);
    const lines = textBeforeCursor.split('\n');
    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;

    cursorPositionRef.current = position;

    if (socket && isConnected) {
      socket.emit('cursor-update', {
        position,
        line,
        column
      });
    }
  };

  // Handle text selection
  const handleSelectionChange = (e) => {
    const start = e.target.selectionStart;
    const end = e.target.selectionEnd;

    if (start !== end && socket && isConnected) {
      socket.emit('selection-update', {
        start,
        end
      });
    }
  };

  // Render user avatars
  const renderUserAvatars = () => {
    return users.map((u) => (
      <div
        key={u.socketId}
        className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-full px-3 py-2 shadow-lg border border-white/20"
        title={`${u.name} (${u.email})`}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg"
          style={{ backgroundColor: u.color }}
        >
          {u.name.charAt(0).toUpperCase()}
        </div>
        <div className="hidden md:block">
          <p className="text-sm font-semibold text-gray-900">{u.name}</p>
          {typingUsers.has(u.id) && (
            <p className="text-xs text-green-600 animate-pulse">typing...</p>
          )}
        </div>
      </div>
    ));
  };

  // Render cursor overlays
  const renderCursorOverlays = () => {
    return cursors
      .filter(cursor => cursor.userId !== user.id)
      .map((cursor) => (
        <div
          key={cursor.userId}
          className="absolute pointer-events-none z-10"
          style={{
            left: `${cursor.column * 8}px`, // Approximate character width
            top: `${(cursor.line - 1) * 24}px`, // Approximate line height
          }}
        >
          <div
            className="w-0.5 h-6 animate-pulse"
            style={{ backgroundColor: cursor.color }}
          />
          <div
            className="absolute -top-6 left-0 px-2 py-1 rounded text-xs text-white font-semibold whitespace-nowrap shadow-lg"
            style={{ backgroundColor: cursor.color }}
          >
            {cursor.userName}
          </div>
        </div>
      ));
  };

  if (!document) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl font-semibold text-gray-900">Connecting to real-time server...</p>
          <p className="text-gray-600 mt-2">Setting up collaborative workspace</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
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
                  <h1 className="text-2xl font-bold text-gray-900">{document.title}</h1>
                  <div className="flex items-center space-x-4 mt-2">
                    <div className="flex items-center space-x-2">
                      {isConnected ? (
                        <Wifi className="w-4 h-4 text-green-500" />
                      ) : (
                        <WifiOff className="w-4 h-4 text-red-500" />
                      )}
                      <span className={`text-sm font-semibold ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                        {isConnected ? 'Connected' : 'Disconnected'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-indigo-500" />
                      <span className="text-sm font-semibold text-indigo-600">
                        {users.length} online
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* User Avatars */}
              <div className="flex items-center space-x-3">
                {renderUserAvatars()}
              </div>
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center">
                    <Edit3 className="w-6 h-6 mr-3 text-indigo-500" />
                    Real-Time Collaborative Editor
                  </h2>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <span>Version {document.version}</span>
                    <span>•</span>
                    <span>Auto-saved</span>
                  </div>
                </div>
              </div>
              
              <div className="relative">
                {/* Cursor overlays */}
                <div className="absolute inset-0 pointer-events-none">
                  {renderCursorOverlays()}
                </div>
                
                {/* Main editor */}
                <textarea
                  ref={editorRef}
                  value={content}
                  onChange={handleContentChange}
                  onSelect={handleSelectionChange}
                  onKeyUp={handleCursorChange}
                  onClick={handleCursorChange}
                  className="w-full h-96 p-8 border-none resize-none focus:outline-none bg-transparent font-mono text-lg leading-relaxed relative z-5"
                  placeholder="Start typing to collaborate in real-time..."
                  style={{ minHeight: '500px' }}
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Active Users */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-indigo-500" />
                Active Users ({users.length})
              </h3>
              <div className="space-y-3">
                {users.map((u) => (
                  <div key={u.socketId} className="flex items-center space-x-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shadow-lg"
                      style={{ backgroundColor: u.color }}
                    >
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{u.name}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                      {typingUsers.has(u.id) && (
                        <p className="text-xs text-green-600 animate-pulse font-semibold">
                          typing...
                        </p>
                      )}
                    </div>
                    {u.id === user.id && (
                      <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full font-semibold">
                        You
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Document Stats */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Document Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Characters</span>
                  <span className="font-semibold">{content.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Words</span>
                  <span className="font-semibold">{content.split(/\s+/).filter(w => w.length > 0).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Lines</span>
                  <span className="font-semibold">{content.split('\n').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Version</span>
                  <span className="font-semibold">{document.version}</span>
                </div>
              </div>
            </div>

            {/* Connection Status */}
            <div className={`bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-6 ${isConnected ? 'border-green-200' : 'border-red-200'}`}>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Connection Status</h3>
              <div className="flex items-center space-x-3">
                {isConnected ? (
                  <>
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-600 font-semibold">Connected</span>
                  </>
                ) : (
                  <>
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-red-600 font-semibold">Disconnected</span>
                  </>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {isConnected 
                  ? 'Real-time collaboration is active'
                  : 'Attempting to reconnect...'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealTimeEditor;