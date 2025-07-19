import React, { useEffect, useRef } from 'react';
import { useRealtimeInput } from '../hooks/useRealtimeInput';

const RealtimeInput = ({ 
  projectId, 
  user, 
  inputId = 'default',
  placeholder = 'Start typing...',
  className = '',
  multiline = false,
  rows = 1,
  onContentChange
}) => {
  const {
    content,
    setContent,
    cursors,
    isConnected,
    typingUsers,
    inputRef,
    handleCursorMove,
    startTyping,
    stopTyping
  } = useRealtimeInput(projectId, user, inputId);

  const typingTimeoutRef = useRef(null);

  const handleInputChange = (e) => {
    const newContent = e.target.value;
    const cursorPosition = e.target.selectionStart;
    
    setContent(newContent, cursorPosition);
    if (onContentChange) {
      onContentChange(newContent);
    }

    // Handle typing indicators
    startTyping();
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 1000);
  };

  const handleSelectionChange = () => {
    if (inputRef.current) {
      const position = inputRef.current.selectionStart;
      handleCursorMove(position);
    }
  };

  const handleKeyUp = () => {
    handleSelectionChange();
  };

  const handleClick = () => {
    handleSelectionChange();
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const InputComponent = multiline ? 'textarea' : 'input';

  return (
    <div className="relative">
      <InputComponent
        ref={inputRef}
        type={multiline ? undefined : 'text'}
        value={content}
        onChange={handleInputChange}
        onKeyUp={handleKeyUp}
        onClick={handleClick}
        placeholder={placeholder}
        className={`${className} ${isConnected ? 'border-green-300' : 'border-gray-300'}`}
        rows={multiline ? rows : undefined}
      />
      
      {/* Connection indicator */}
      {isConnected && (
        <div className="absolute -top-2 -right-2 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
      )}
      
      {/* Typing indicators */}
      {typingUsers.size > 0 && (
        <div className="absolute -bottom-6 left-0 text-xs text-gray-500 flex items-center space-x-1">
          <div className="flex space-x-1">
            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <span>
            {Array.from(typingUsers).slice(0, 2).join(', ')} 
            {typingUsers.size > 2 && ` and ${typingUsers.size - 2} others`} typing...
          </span>
        </div>
      )}
      
      {/* Cursor positions (for textarea) */}
      {multiline && cursors.size > 0 && (
        <div className="absolute top-0 left-0 pointer-events-none">
          {Array.from(cursors.entries()).map(([userId, cursor]) => (
            <div
              key={userId}
              className="absolute w-0.5 h-5 bg-blue-500 animate-pulse"
              style={{
                left: `${cursor.position * 0.6}ch`, // Approximate character width
                top: '0.25rem'
              }}
            >
              <div className="absolute -top-6 left-0 bg-blue-500 text-white text-xs px-1 py-0.5 rounded whitespace-nowrap">
                {cursor.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RealtimeInput;