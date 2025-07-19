import { useState, useEffect, useRef } from 'react';
import RealtimeCursorSDK, { RealtimeCursorConfig, User, Project, Comment, StagedChange, HistoryEntry } from './index';

export interface UseRealtimeCursorOptions {
  autoConnect?: boolean;
}

export function useRealtimeCursor(config: RealtimeCursorConfig, options: UseRealtimeCursorOptions = {}) {
  const [client] = useState<RealtimeCursorSDK>(() => new RealtimeCursorSDK(config));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!config.token);

  // Check authentication status on mount
  useEffect(() => {
    if (config.token && options.autoConnect !== false) {
      setLoading(true);
      client.getCurrentUser()
        .then(user => {
          setUser(user);
          setIsAuthenticated(true);
        })
        .catch(err => {
          setError(err.message);
          setIsAuthenticated(false);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const user = await client.login(email, password);
      setUser(user);
      setIsAuthenticated(true);
      return user;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: { email: string; password: string; firstName: string; lastName: string }) => {
    setLoading(true);
    setError(null);
    try {
      const user = await client.register(userData);
      setUser(user);
      setIsAuthenticated(true);
      return user;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    client.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  return {
    client,
    user,
    loading,
    error,
    isAuthenticated,
    login,
    register,
    logout
  };
}

export function useProject(client: RealtimeCursorSDK, projectId?: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [content, setContent] = useState<string>('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [stagedChanges, setStagedChanges] = useState<StagedChange[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [cursors, setCursors] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const socketConnected = useRef<boolean>(false);

  // Load project data when projectId changes
  useEffect(() => {
    if (!projectId) return;

    const loadProjectData = async () => {
      setLoading(true);
      setError(null);
      try {
        const project = await client.getProject(projectId);
        setProject(project);
        setContent(project.content || '');

        // Load comments
        const comments = await client.getComments(projectId);
        setComments(comments);

        // Load history
        const history = await client.getHistory(projectId);
        setHistory(history);

        // If user is superadmin, load staged changes
        try {
          const stagedChanges = await client.getStagedChanges(projectId);
          setStagedChanges(stagedChanges);
        } catch (err) {
          // Ignore errors - user might not have permission
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadProjectData();
  }, [projectId, client]);

  // Connect to real-time collaboration
  useEffect(() => {
    if (!projectId || !project || socketConnected.current) return;

    try {
      client.connectToProject(projectId, {
        id: client.getCurrentUser().id,
        name: client.getCurrentUser().fullName || client.getCurrentUser().email
      });
      socketConnected.current = true;

      // Set up event listeners
      client.onRoomUsers(users => {
        setCollaborators(users);
      });

      client.onUserJoined(({ user }) => {
        setCollaborators(prev => [...prev, user]);
      });

      client.onUserLeft(({ socketId }) => {
        setCollaborators(prev => prev.filter(u => u.socketId !== socketId));
        setCursors(prev => {
          const newCursors = { ...prev };
          delete newCursors[socketId];
          return newCursors;
        });
      });

      client.onContentUpdate(({ content: newContent, user }) => {
        setContent(newContent);
      });

      client.onCursorUpdate(({ socketId, user, x, y, textPosition }) => {
        setCursors(prev => ({
          ...prev,
          [socketId]: { x, y, user, textPosition }
        }));
      });

      return () => {
        client.disconnect();
        socketConnected.current = false;
      };
    } catch (err: any) {
      setError(`Failed to connect to real-time collaboration: ${err.message}`);
    }
  }, [projectId, project, client]);

  const updateContent = async (newContent: string) => {
    setContent(newContent);
    
    // Update content in real-time
    client.updateContent(newContent);
    
    // Save content to server
    try {
      const result = await client.updateProjectContent(projectId!, newContent);
      if (result.staged) {
        // Content was staged for approval
        return { staged: true, changeId: result.changeId };
      }
      
      // Content was saved directly
      client.notifyContentSaved(client.getCurrentUser().fullName || client.getCurrentUser().email);
      client.notifyHistoryUpdate();
      
      // Refresh history
      const history = await client.getHistory(projectId!);
      setHistory(history);
      
      return { staged: false };
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const updateCursor = (position: { x: number; y: number; textPosition?: number }) => {
    client.updateCursor(position);
  };

  const addComment = async (commentData: { text: string; selectedText: string; startPosition?: number; endPosition?: number }) => {
    try {
      const comment = await client.addComment(projectId!, commentData);
      setComments(prev => [...prev, comment]);
      return comment;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const reviewChange = async (changeId: string, approve: boolean, feedback?: string) => {
    try {
      const result = await client.reviewChange(changeId, approve, feedback);
      
      // Refresh staged changes
      const stagedChanges = await client.getStagedChanges(projectId!);
      setStagedChanges(stagedChanges);
      
      // Refresh project data if change was approved
      if (approve) {
        const project = await client.getProject(projectId!);
        setProject(project);
        setContent(project.content || '');
      }
      
      // Refresh history
      const history = await client.getHistory(projectId!);
      setHistory(history);
      
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return {
    project,
    content,
    comments,
    stagedChanges,
    history,
    collaborators,
    cursors,
    loading,
    error,
    updateContent,
    updateCursor,
    addComment,
    reviewChange
  };
}

export function useCursorTracking(editorRef: React.RefObject<HTMLTextAreaElement>, client: RealtimeCursorSDK) {
  useEffect(() => {
    if (!editorRef.current) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!editorRef.current) return;
      
      const rect = editorRef.current.getBoundingClientRect();
      const relativeX = Math.max(0, e.clientX - rect.left);
      const relativeY = Math.max(0, e.clientY - rect.top);
      
      // Calculate text position
      const textPosition = getTextPositionFromCoords(editorRef.current, relativeX, relativeY);
      
      client.updateCursor({
        x: e.clientX,
        y: e.clientY,
        relativeX,
        relativeY,
        textPosition
      });
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!editorRef.current) return;
      
      const cursorPosition = editorRef.current.selectionStart;
      client.updateCursorPosition(cursorPosition);
    };
    
    const handleFocus = () => {
      client.setTyping(true);
    };
    
    const handleBlur = () => {
      client.setTyping(false);
    };
    
    editorRef.current.addEventListener('mousemove', handleMouseMove);
    editorRef.current.addEventListener('keyup', handleKeyUp);
    editorRef.current.addEventListener('focus', handleFocus);
    editorRef.current.addEventListener('blur', handleBlur);
    
    return () => {
      if (editorRef.current) {
        editorRef.current.removeEventListener('mousemove', handleMouseMove);
        editorRef.current.removeEventListener('keyup', handleKeyUp);
        editorRef.current.removeEventListener('focus', handleFocus);
        editorRef.current.removeEventListener('blur', handleBlur);
      }
    };
  }, [editorRef, client]);
}

// Helper function to calculate text position from coordinates
function getTextPositionFromCoords(element: HTMLTextAreaElement, x: number, y: number): number {
  const content = element.value;
  if (!content) return 0;
  
  try {
    const lineHeight = 24; // Approximate line height in pixels
    const charWidth = 8.5; // Approximate character width in pixels
    
    const line = Math.max(0, Math.floor(y / lineHeight));
    const char = Math.max(0, Math.floor(x / charWidth));
    
    const lines = content.split('\n');
    if (lines.length === 0) return 0;
    
    let position = 0;
    
    for (let i = 0; i < line && i < lines.length; i++) {
      position += (lines[i] || '').length + 1;
    }
    
    if (line < lines.length && lines[line]) {
      position += Math.min(char, lines[line].length);
    }
    
    return Math.max(0, Math.min(position, content.length));
  } catch (error) {
    console.warn('Error calculating text position:', error);
    return 0;
  }
}