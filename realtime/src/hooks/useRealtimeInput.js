import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const throttle = (func, delay) => {
  let timeoutId;
  let lastExecTime = 0;
  return function (...args) {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func.apply(this, args);
      lastExecTime = currentTime;
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(this, args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
};

export const useRealtimeInput = (projectId, user, inputId = 'default') => {
  const [content, setContent] = useState('');
  const [cursors, setCursors] = useState(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const socketRef = useRef(null);
  const inputRef = useRef(null);
  const isLocalChange = useRef(false);

  const throttledContentChange = useCallback(
    throttle((newContent, cursorPosition) => {
      if (socketRef.current && isConnected && !isLocalChange.current) {
        socketRef.current.emit('input-change', {
          inputId,
          content: newContent,
          cursorPosition,
          timestamp: Date.now()
        });
      }
    }, 100),
    [isConnected, inputId]
  );

  const throttledCursorMove = useCallback(
    throttle((position) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit('cursor-position', {
          inputId,
          position,
          timestamp: Date.now()
        });
      }
    }, 50),
    [isConnected, inputId]
  );

  const handleContentChange = useCallback((newContent, cursorPosition) => {
    setContent(newContent);
    throttledContentChange(newContent, cursorPosition);
  }, [throttledContentChange]);

  const handleCursorMove = useCallback((position) => {
    throttledCursorMove(position);
  }, [throttledCursorMove]);

  const startTyping = useCallback(() => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('typing-start', { inputId });
    }
  }, [isConnected, inputId]);

  const stopTyping = useCallback(() => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('typing-stop', { inputId });
    }
  }, [isConnected, inputId]);

  useEffect(() => {
    if (!projectId || !user) return;

    const socket = io('http://localhost:3000');
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to realtime input service');
      socket.emit('join-room', {
        roomId: projectId,
        user: {
          id: user.id,
          name: user.fullName,
          email: user.email
        }
      });
    });

    socket.on('room-users', () => {
      setIsConnected(true);
    });

    socket.on('input-changed', ({ inputId: changedInputId, content: newContent, cursorPosition, user: changeUser }) => {
      if (changedInputId === inputId && changeUser.id !== user.id) {
        isLocalChange.current = true;
        setContent(newContent);
        
        // Preserve local cursor position if possible
        setTimeout(() => {
          isLocalChange.current = false;
        }, 100);
      }
    });

    socket.on('cursor-moved', ({ inputId: changedInputId, position, user: cursorUser }) => {
      if (changedInputId === inputId && cursorUser.id !== user.id) {
        setCursors(prev => {
          const updated = new Map(prev);
          updated.set(cursorUser.id, {
            ...cursorUser,
            position,
            lastSeen: Date.now()
          });
          return updated;
        });
      }
    });

    socket.on('user-typing', ({ inputId: typingInputId, user: typingUser, isTyping }) => {
      if (typingInputId === inputId && typingUser.id !== user.id) {
        setTypingUsers(prev => {
          const updated = new Set(prev);
          if (isTyping) {
            updated.add(typingUser.name);
          } else {
            updated.delete(typingUser.name);
          }
          return updated;
        });
      }
    });

    socket.on('user-left', ({ userId }) => {
      setCursors(prev => {
        const updated = new Map(prev);
        updated.delete(userId);
        return updated;
      });
      setTypingUsers(prev => {
        const updated = new Set(prev);
        // Remove user from typing (we don't have name here, so clear all)
        return new Set();
      });
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from realtime input service');
      setIsConnected(false);
      setCursors(new Map());
      setTypingUsers(new Set());
    });

    return () => {
      socket.disconnect();
    };
  }, [projectId, user, inputId]);

  // Cleanup stale cursors
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCursors(prev => {
        const updated = new Map();
        prev.forEach((cursor, userId) => {
          if (now - cursor.lastSeen < 10000) { // 10 seconds
            updated.set(userId, cursor);
          }
        });
        return updated;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    content,
    setContent: handleContentChange,
    cursors,
    isConnected,
    typingUsers,
    inputRef,
    handleCursorMove,
    startTyping,
    stopTyping
  };
};