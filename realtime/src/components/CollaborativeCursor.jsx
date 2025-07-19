import React from 'react';
import { useCursors } from '../hooks/useCursors';
import CursorOverlay from './CursorOverlay';

const CollaborativeCursor = ({ projectId, user, children, className = '' }) => {
  const { 
    cursors, 
    isConnected, 
    containerRef, 
    handleMouseMove, 
    handleClick, 
    handleMouseEnter, 
    handleMouseLeave 
  } = useCursors(projectId, user);

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ cursor: 'default' }}
    >
      {children}
      
      {/* Enhanced connection status indicator */}
      <div className="fixed top-4 right-4 z-40 flex items-center space-x-3">
        {isConnected ? (
          <div className="flex items-center space-x-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold shadow-lg backdrop-blur-sm border border-green-200">
            <div className="relative">
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
              <div className="absolute inset-0 w-2.5 h-2.5 bg-green-400 rounded-full animate-ping opacity-75"></div>
            </div>
            <span>{cursors.size} collaborator{cursors.size !== 1 ? 's' : ''} online</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2 bg-gradient-to-r from-red-100 to-orange-100 text-red-800 px-4 py-2 rounded-full text-sm font-semibold shadow-lg backdrop-blur-sm border border-red-200">
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
            <span>Disconnected</span>
          </div>
        )}
      </div>
      
      {/* Cursor overlay */}
      <CursorOverlay cursors={cursors} />
    </div>
  );
};

export default CollaborativeCursor;