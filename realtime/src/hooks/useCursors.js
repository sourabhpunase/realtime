import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const CURSOR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#FF8A80', '#80CBC4', '#81C784', '#FFB74D', '#F48FB1',
  '#CE93D8', '#90CAF9', '#A5D6A7', '#FFCC02', '#BCAAA4'
];

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

const debounce = (func, delay) => {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
};

export const useCursors = (projectId, user) => {
  const [cursors, setCursors] = useState(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);
  const userColorsRef = useRef(new Map());
  const containerRef = useRef(null);

  const assignUserColor = useCallback((userId) => {
    if (!userColorsRef.current.has(userId)) {
      const colorIndex = userColorsRef.current.size % CURSOR_COLORS.length;
      userColorsRef.current.set(userId, CURSOR_COLORS[colorIndex]);
    }
    return userColorsRef.current.get(userId);
  }, []);

  const throttledCursorMove = useCallback(
    throttle((x, y) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit('cursor-move', { x, y });
      }
    }, 16), // ~60fps
    [isConnected]
  );

  const handleMouseMove = useCallback((event) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
    
    throttledCursorMove(x, y);
  }, [throttledCursorMove]);

  const handleClick = useCallback((event) => {
    if (!containerRef.current || !socketRef.current || !isConnected) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
    
    socketRef.current.emit('cursor-click', { x, y });
  }, [isConnected]);

  const handleMouseEnter = useCallback(() => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('cursor-hover', { type: 'enter' });
    }
  }, [isConnected]);

  const handleMouseLeave = useCallback(() => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('cursor-hover', { type: 'leave' });
    }
  }, [isConnected]);

  useEffect(() => {
    if (!projectId || !user) return;

    const token = localStorage.getItem('authToken');
    if (!token) return;

    const socket = io('http://localhost:3000');
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to cursor service');
      socket.emit('join-room', {
        roomId: projectId,
        user: {
          id: user.id,
          name: user.fullName,
          color: assignUserColor(user.id)
        }
      });
    });

    socket.on('room-users', (users) => {
      const newCursors = new Map();
      users.forEach(user => {
        newCursors.set(user.socketId, {
          ...user,
          color: assignUserColor(user.id),
          x: 50,
          y: 50,
          lastSeen: Date.now()
        });
      });
      setCursors(newCursors);
      setIsConnected(true);
    });

    socket.on('user-joined', ({ user: newUser }) => {
      setCursors(prev => {
        const updated = new Map(prev);
        updated.set(newUser.socketId, {
          ...newUser,
          color: assignUserColor(newUser.id),
          x: 50,
          y: 50,
          lastSeen: Date.now()
        });
        return updated;
      });
    });

    socket.on('cursor-update', ({ socketId, x, y, user: cursorUser }) => {
      setCursors(prev => {
        const updated = new Map(prev);
        const existing = updated.get(socketId) || {};
        updated.set(socketId, {
          ...existing,
          ...cursorUser,
          color: assignUserColor(cursorUser.id),
          x,
          y,
          lastSeen: Date.now()
        });
        return updated;
      });
    });

    socket.on('cursor-click', ({ socketId, x, y, user: cursorUser }) => {
      setCursors(prev => {
        const updated = new Map(prev);
        const existing = updated.get(socketId) || {};
        updated.set(socketId, {
          ...existing,
          ...cursorUser,
          color: assignUserColor(cursorUser.id),
          x,
          y,
          lastSeen: Date.now(),
          clicked: true,
          clickId: Date.now() // Unique ID for each click
        });
        return updated;
      });

      // Remove click effect after animation
      setTimeout(() => {
        setCursors(prev => {
          const updated = new Map(prev);
          const cursor = updated.get(socketId);
          if (cursor) {
            updated.set(socketId, { ...cursor, clicked: false });
          }
          return updated;
        });
      }, 400);
    });

    socket.on('cursor-hover', ({ socketId, type, user: cursorUser }) => {
      setCursors(prev => {
        const updated = new Map(prev);
        const existing = updated.get(socketId) || {};
        updated.set(socketId, {
          ...existing,
          ...cursorUser,
          color: assignUserColor(cursorUser.id),
          lastSeen: Date.now(),
          hovering: type === 'enter'
        });
        return updated;
      });
    });

    socket.on('user-left', ({ socketId }) => {
      setCursors(prev => {
        const updated = new Map(prev);
        updated.delete(socketId);
        return updated;
      });
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from cursor service');
      setIsConnected(false);
      setCursors(new Map());
    });

    return () => {
      socket.disconnect();
    };
  }, [projectId, user, assignUserColor]);

  // Cleanup stale cursors
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCursors(prev => {
        const updated = new Map();
        prev.forEach((cursor, socketId) => {
          if (now - cursor.lastSeen < 30000) { // 30 seconds
            updated.set(socketId, cursor);
          }
        });
        return updated;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    cursors,
    isConnected,
    containerRef,
    handleMouseMove,
    handleClick,
    handleMouseEnter,
    handleMouseLeave
  };
};