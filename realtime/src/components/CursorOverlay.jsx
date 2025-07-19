import React from 'react';

const CursorOverlay = ({ cursors }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {Array.from(cursors.entries()).map(([socketId, cursor]) => (
        <div
          key={socketId}
          className="absolute transition-all duration-75 ease-out"
          style={{
            left: `${cursor.x}%`,
            top: `${cursor.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Cursor SVG with hover effect */}
          <div className={`relative ${cursor.hovering ? 'scale-110' : 'scale-100'} transition-transform duration-200`}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              className="drop-shadow-lg filter"
              style={{
                filter: cursor.hovering ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
              }}
            >
              <path
                d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
                fill={cursor.color}
                stroke="white"
                strokeWidth="1.5"
              />
            </svg>

            {/* Hover glow effect */}
            {cursor.hovering && (
              <div
                className="absolute inset-0 rounded-full animate-pulse"
                style={{
                  backgroundColor: cursor.color,
                  opacity: 0.3,
                  transform: 'scale(1.5)',
                  filter: 'blur(8px)'
                }}
              />
            )}
          </div>

          {/* Enhanced click effect */}
          {cursor.clicked && (
            <>
              <div
                className="absolute top-0 left-0 w-8 h-8 rounded-full animate-ping"
                style={{
                  backgroundColor: cursor.color,
                  opacity: 0.7,
                  transform: 'translate(-50%, -50%)',
                  animationDuration: '0.4s'
                }}
              />
              <div
                className="absolute top-0 left-0 w-12 h-12 rounded-full animate-ping"
                style={{
                  backgroundColor: cursor.color,
                  opacity: 0.4,
                  transform: 'translate(-50%, -50%)',
                  animationDuration: '0.6s',
                  animationDelay: '0.1s'
                }}
              />
              <div
                className="absolute top-0 left-0 w-4 h-4 rounded-full"
                style={{
                  backgroundColor: cursor.color,
                  opacity: 0.9,
                  transform: 'translate(-50%, -50%) scale(0)',
                  animation: 'cursor-click-burst 0.4s ease-out'
                }}
              />
            </>
          )}

          {/* Enhanced user name label */}
          <div
            className={`absolute top-6 left-2 px-3 py-1.5 rounded-full text-white text-xs font-semibold whitespace-nowrap shadow-lg transition-all duration-200 ${
              cursor.hovering ? 'scale-105 shadow-xl' : 'scale-100'
            }`}
            style={{
              backgroundColor: cursor.color,
              boxShadow: cursor.hovering 
                ? `0 4px 12px ${cursor.color}40, 0 2px 4px rgba(0,0,0,0.1)`
                : `0 2px 8px ${cursor.color}30, 0 1px 2px rgba(0,0,0,0.1)`
            }}
          >
            {cursor.name}
            {cursor.hovering && (
              <div className="absolute inset-0 rounded-full bg-white opacity-20 animate-pulse" />
            )}
          </div>

          {/* Activity indicator */}
          {cursor.hovering && (
            <div
              className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-bounce"
              style={{
                backgroundColor: cursor.color,
                boxShadow: `0 0 8px ${cursor.color}`
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default CursorOverlay;