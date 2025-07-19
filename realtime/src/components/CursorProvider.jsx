import React, { createContext, useContext, useEffect, useState } from 'react';
import { useCursors } from '../hooks/useCursors';
import CursorOverlay from './CursorOverlay';

const CursorContext = createContext();

export const useCursorContext = () => {
  const context = useContext(CursorContext);
  if (!context) {
    throw new Error('useCursorContext must be used within a CursorProvider');
  }
  return context;
};

/**
 * CursorProvider - A modular provider for real-time collaborative cursors
 * 
 * @param {Object} props
 * @param {string} props.projectId - Unique identifier for the collaboration session
 * @param {Object} props.user - Current user object with id, name, etc.
 * @param {React.ReactNode} props.children - Child components
 * @param {Object} props.config - Configuration options
 * @param {boolean} props.config.showConnectionStatus - Show connection indicator
 * @param {boolean} props.config.enableClickEffects - Enable click animations
 * @param {boolean} props.config.enableHoverEffects - Enable hover effects
 * @param {number} props.config.throttleMs - Cursor update throttle in milliseconds
 * @param {string} props.config.className - Additional CSS classes
 * @param {Function} props.onCursorUpdate - Callback for cursor updates
 * @param {Function} props.onUserJoin - Callback when user joins
 * @param {Function} props.onUserLeave - Callback when user leaves
 */
export const CursorProvider = ({
  projectId,
  user,
  children,
  config = {},
  onCursorUpdate,
  onUserJoin,
  onUserLeave
}) => {
  const {
    showConnectionStatus = true,
    enableClickEffects = true,
    enableHoverEffects = true,
    throttleMs = 16,
    className = ''
  } = config;

  const {
    cursors,
    isConnected,
    containerRef,
    handleMouseMove,
    handleClick,
    handleMouseEnter,
    handleMouseLeave
  } = useCursors(projectId, user);

  const [previousCursors, setPreviousCursors] = useState(new Map());

  // Track cursor changes and trigger callbacks
  useEffect(() => {
    if (onCursorUpdate) {
      cursors.forEach((cursor, socketId) => {
        const prevCursor = previousCursors.get(socketId);
        if (!prevCursor || prevCursor.x !== cursor.x || prevCursor.y !== cursor.y) {
          onCursorUpdate(cursor, socketId);
        }
      });
    }
    setPreviousCursors(new Map(cursors));
  }, [cursors, onCursorUpdate, previousCursors]);

  // Track user join/leave events
  useEffect(() => {
    const currentUserIds = new Set(Array.from(cursors.values()).map(c => c.id));
    const previousUserIds = new Set(Array.from(previousCursors.values()).map(c => c.id));

    // Check for new users
    currentUserIds.forEach(userId => {
      if (!previousUserIds.has(userId) && onUserJoin) {
        const user = Array.from(cursors.values()).find(c => c.id === userId);
        onUserJoin(user);
      }
    });

    // Check for users who left
    previousUserIds.forEach(userId => {
      if (!currentUserIds.has(userId) && onUserLeave) {
        const user = Array.from(previousCursors.values()).find(c => c.id === userId);
        onUserLeave(user);
      }
    });
  }, [cursors, previousCursors, onUserJoin, onUserLeave]);

  const contextValue = {
    cursors,
    isConnected,
    userCount: cursors.size,
    config: {
      showConnectionStatus,
      enableClickEffects,
      enableHoverEffects,
      throttleMs
    }
  };

  const eventHandlers = {
    onMouseMove: handleMouseMove,
    onClick: enableClickEffects ? handleClick : undefined,
    onMouseEnter: enableHoverEffects ? handleMouseEnter : undefined,
    onMouseLeave: enableHoverEffects ? handleMouseLeave : undefined
  };

  return (
    <CursorContext.Provider value={contextValue}>
      <div
        ref={containerRef}
        className={`relative ${className}`}
        {...eventHandlers}
        style={{ cursor: 'default' }}
      >
        {children}
        
        {/* Connection Status Indicator */}
        {showConnectionStatus && (
          <ConnectionIndicator isConnected={isConnected} userCount={cursors.size} />
        )}
        
        {/* Cursor Overlay */}
        <CursorOverlay cursors={cursors} />
      </div>
    </CursorContext.Provider>
  );
};

const ConnectionIndicator = ({ isConnected, userCount }) => (
  <div className="fixed top-4 right-4 z-40 flex items-center space-x-3">
    {isConnected ? (
      <div className="flex items-center space-x-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold shadow-lg backdrop-blur-sm border border-green-200">
        <div className="relative">
          <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
          <div className="absolute inset-0 w-2.5 h-2.5 bg-green-400 rounded-full animate-ping opacity-75"></div>
        </div>
        <span>{userCount} collaborator{userCount !== 1 ? 's' : ''} online</span>
      </div>
    ) : (
      <div className="flex items-center space-x-2 bg-gradient-to-r from-red-100 to-orange-100 text-red-800 px-4 py-2 rounded-full text-sm font-semibold shadow-lg backdrop-blur-sm border border-red-200">
        <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
        <span>Disconnected</span>
      </div>
    )}
  </div>
);

/**
 * Hook to access cursor data and methods within a CursorProvider
 */
export const useCursorData = () => {
  const context = useCursorContext();
  return {
    cursors: context.cursors,
    isConnected: context.isConnected,
    userCount: context.userCount,
    config: context.config
  };
};

export default CursorProvider;