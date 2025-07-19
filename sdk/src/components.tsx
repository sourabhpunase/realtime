import React, { useEffect, useState } from 'react';

export interface CursorProps {
  x: number;
  y: number;
  user: {
    name: string;
    color: string;
  };
}

export interface TextCursorProps {
  textPosition: number;
  content: string;
  editorRef: React.RefObject<HTMLTextAreaElement>;
  user: {
    name: string;
    color: string;
  };
}

export const Cursor: React.FC<CursorProps> = ({ x, y, user }) => {
  return (
    <div
      className="realtimecursor-cursor"
      style={{
        position: 'fixed',
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
        zIndex: 9999,
        pointerEvents: 'none'
      }}
    >
      <div
        className="realtimecursor-pointer"
        style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: user.color,
          boxShadow: '0 0 5px rgba(0,0,0,0.3)'
        }}
      />
      <div
        className="realtimecursor-name"
        style={{
          backgroundColor: user.color,
          color: '#fff',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '12px',
          marginTop: '4px',
          whiteSpace: 'nowrap'
        }}
      >
        {user.name}
      </div>
    </div>
  );
};

export const TextCursor: React.FC<TextCursorProps> = ({ textPosition, content, editorRef, user }) => {
  const [position, setPosition] = useState({ left: 0, top: 0 });

  useEffect(() => {
    if (!editorRef.current || textPosition === undefined) return;

    try {
      const beforeCursor = content.substring(0, textPosition) || '';
      const lines = beforeCursor.split('\n');
      const line = Math.max(0, lines.length - 1);
      const char = (lines[line] || '').length;
      
      // Calculate position based on line and character
      const lineHeight = 24; // Approximate line height in pixels
      const charWidth = 8.5; // Approximate character width in pixels
      
      setPosition({
        left: char * charWidth + 16,
        top: line * lineHeight + 16
      });
    } catch (error) {
      console.warn('Error calculating cursor position:', error);
    }
  }, [textPosition, content, editorRef]);

  return (
    <div
      className="realtimecursor-text-cursor"
      style={{
        position: 'absolute',
        left: position.left,
        top: position.top,
        zIndex: 9998,
        pointerEvents: 'none'
      }}
    >
      <div
        className="realtimecursor-caret"
        style={{
          width: '2px',
          height: '20px',
          backgroundColor: user.color,
          animation: 'realtimecursor-blink 1s infinite'
        }}
      />
      <div
        className="realtimecursor-flag"
        style={{
          position: 'absolute',
          top: '-18px',
          left: '-8px',
          backgroundColor: user.color,
          color: '#fff',
          width: '18px',
          height: '18px',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          fontWeight: 'bold'
        }}
      >
        {user.name.charAt(0)}
      </div>
    </div>
  );
};

export const CursorOverlay: React.FC<{
  cursors: Record<string, any>;
  content: string;
  editorRef: React.RefObject<HTMLTextAreaElement>;
}> = ({ cursors, content, editorRef }) => {
  return (
    <>
      {Object.entries(cursors).map(([socketId, cursor]) => (
        <React.Fragment key={socketId}>
          {/* Mouse cursor */}
          <Cursor
            x={cursor.x}
            y={cursor.y}
            user={cursor.user}
          />
          
          {/* Text cursor */}
          {cursor.textPosition !== undefined && editorRef.current && (
            <TextCursor
              textPosition={cursor.textPosition}
              content={content}
              editorRef={editorRef}
              user={cursor.user}
            />
          )}
        </React.Fragment>
      ))}
    </>
  );
};

export const CollaboratorsList: React.FC<{
  collaborators: any[];
  typingUsers?: Set<string>;
}> = ({ collaborators, typingUsers = new Set() }) => {
  return (
    <div className="realtimecursor-collaborators">
      {collaborators.map((collab) => (
        <div 
          key={collab.socketId} 
          className={`realtimecursor-collaborator ${typingUsers.has(collab.socketId) ? 'typing' : ''}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 8px',
            borderRadius: '4px',
            backgroundColor: typingUsers.has(collab.socketId) ? '#f0f9ff' : 'transparent'
          }}
        >
          <div
            className="realtimecursor-avatar"
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: collab.color || '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
          >
            {(collab.name || 'U').charAt(0)}
          </div>
          <span style={{ fontSize: '14px' }}>{collab.name}</span>
          {typingUsers.has(collab.socketId) && (
            <div className="realtimecursor-typing-indicator">
              <span className="realtimecursor-dot"></span>
              <span className="realtimecursor-dot"></span>
              <span className="realtimecursor-dot"></span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export const HistoryList: React.FC<{
  history: any[];
  maxItems?: number;
}> = ({ history, maxItems = 10 }) => {
  const displayHistory = history.slice(0, maxItems);
  
  return (
    <div className="realtimecursor-history">
      {displayHistory.length === 0 ? (
        <div className="realtimecursor-empty-history">
          No history yet
        </div>
      ) : (
        displayHistory.map((entry, index) => (
          <div 
            key={entry.id || index} 
            className="realtimecursor-history-item"
            style={{
              borderLeft: '4px solid #e5e7eb',
              paddingLeft: '12px',
              marginBottom: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '18px' }}>
                {entry.type === 'commit' ? '📝' : 
                 entry.type === 'pull_request' ? '🔄' :
                 entry.type === 'merge' ? '✅' :
                 entry.type === 'close' ? '❌' : '💬'}
              </span>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{entry.userName}</span>
                  <span style={{ color: '#6b7280', fontSize: '12px' }}>
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                </div>
                <div style={{ fontSize: '14px', marginTop: '4px' }}>{entry.message}</div>
              </div>
            </div>
            
            {entry.feedback && (
              <div 
                style={{ 
                  backgroundColor: '#f0f9ff', 
                  border: '1px solid #bae6fd',
                  borderRadius: '4px',
                  padding: '8px',
                  marginTop: '8px',
                  fontSize: '13px'
                }}
              >
                <strong>Review:</strong> {entry.feedback}
              </div>
            )}
            
            {entry.diff && entry.diff.length > 0 && (
              <div 
                style={{ 
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  padding: '8px',
                  marginTop: '8px',
                  maxHeight: '120px',
                  overflow: 'auto'
                }}
              >
                {entry.diff.slice(0, 5).map((line: any, idx: number) => (
                  <div 
                    key={idx} 
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      padding: '2px 4px',
                      backgroundColor: line.type === 'added' ? '#ecfdf5' : line.type === 'removed' ? '#fef2f2' : 'transparent',
                      color: line.type === 'added' ? '#047857' : line.type === 'removed' ? '#b91c1c' : '#374151',
                      borderLeft: `2px solid ${line.type === 'added' ? '#34d399' : line.type === 'removed' ? '#f87171' : 'transparent'}`
                    }}
                  >
                    <span style={{ fontWeight: 'bold', marginRight: '8px' }}>
                      {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                    </span>
                    <span>{line.content || '(empty line)'}</span>
                  </div>
                ))}
                {entry.diff.length > 5 && (
                  <div style={{ textAlign: 'center', fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                    ... {entry.diff.length - 5} more changes
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export const ReviewChangesList: React.FC<{
  changes: any[];
  onApprove: (changeId: string, feedback?: string) => void;
  onReject: (changeId: string, feedback: string) => void;
}> = ({ changes, onApprove, onReject }) => {
  return (
    <div className="realtimecursor-changes">
      {changes.length === 0 ? (
        <div className="realtimecursor-empty-changes">
          No pending changes
        </div>
      ) : (
        changes.map((change) => (
          <div 
            key={change.id} 
            className="realtimecursor-change-item"
            style={{
              border: '1px solid #fde68a',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
              backgroundColor: '#fef3c7'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  {(change.userName || 'U').charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 'bold' }}>{change.userName}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    {new Date(change.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    const feedback = prompt('Optional feedback for approval:');
                    onApprove(change.id, feedback || undefined);
                  }}
                  style={{
                    backgroundColor: '#22c55e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  ✓ Approve
                </button>
                <button
                  onClick={() => {
                    const feedback = prompt('Reason for rejection (required):');
                    if (feedback) onReject(change.id, feedback);
                  }}
                  style={{
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  ✕ Reject
                </button>
              </div>
            </div>
            
            {/* Diff View */}
            {change.diff && change.diff.length > 0 && (
              <div 
                style={{ 
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  padding: '12px',
                  maxHeight: '160px',
                  overflow: 'auto'
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#6b7280' }}>Changes:</div>
                {change.diff.slice(0, 10).map((line: any, idx: number) => (
                  <div 
                    key={idx} 
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      padding: '2px 4px',
                      backgroundColor: line.type === 'added' ? '#ecfdf5' : line.type === 'removed' ? '#fef2f2' : 'transparent',
                      color: line.type === 'added' ? '#047857' : line.type === 'removed' ? '#b91c1c' : '#374151',
                      borderLeft: `2px solid ${line.type === 'added' ? '#34d399' : line.type === 'removed' ? '#f87171' : 'transparent'}`
                    }}
                  >
                    <span style={{ fontWeight: 'bold', marginRight: '8px' }}>
                      {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                    </span>
                    <span>{line.content || '(empty line)'}</span>
                  </div>
                ))}
                {change.diff.length > 10 && (
                  <div style={{ textAlign: 'center', fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                    ... {change.diff.length - 10} more changes
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export const CollaborativeEditor: React.FC<{
  content: string;
  onChange: (content: string) => void;
  editorRef: React.RefObject<HTMLTextAreaElement>;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}> = ({ content, onChange, editorRef, placeholder, className, style }) => {
  return (
    <textarea
      ref={editorRef}
      value={content}
      onChange={(e) => onChange(e.target.value)}
      className={`realtimecursor-editor ${className || ''}`}
      placeholder={placeholder || 'Start typing to collaborate...'}
      style={{
        width: '100%',
        minHeight: '300px',
        padding: '16px',
        fontFamily: 'monospace',
        fontSize: '16px',
        lineHeight: '1.5',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        outline: 'none',
        resize: 'vertical',
        ...style
      }}
    />
  );
};