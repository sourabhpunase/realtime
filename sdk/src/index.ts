import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { io, Socket } from 'socket.io-client';

export interface RealtimeCursorConfig {
  apiUrl: string;
  socketUrl?: string;
  token?: string;
}

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  role?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdByName: string;
  members: string[];
  memberNames: string[];
  content?: string;
  createdAt: string;
  lastActivity?: string;
  hasStagedChanges?: boolean;
}

export interface Comment {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  text: string;
  selectedText: string;
  startPosition: number;
  endPosition: number;
  createdAt: string;
}

export interface StagedChange {
  id: string;
  userId: string;
  userName: string;
  originalContent: string;
  proposedContent: string;
  createdAt: string;
  status?: string;
  reviewedBy?: string;
  reviewerName?: string;
  reviewedAt?: string;
  feedback?: string;
  diff?: DiffItem[];
}

export interface DiffItem {
  type: 'added' | 'removed';
  line: number;
  content: string;
}

export interface HistoryEntry {
  id: string;
  type: 'commit' | 'pull_request' | 'merge' | 'close';
  action: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: string;
  diff?: DiffItem[];
  feedback?: string;
  changeId?: string;
  originalAuthor?: string;
  originalAuthorId?: string;
}

export interface CursorPosition {
  x: number;
  y: number;
  textPosition?: number;
}

export interface CollaboratorInfo {
  id: string;
  name: string;
  color: string;
  socketId: string;
}

export class RealtimeCursorSDK {
  private api: AxiosInstance;
  private socket: Socket | null = null;
  private config: RealtimeCursorConfig;
  private token: string | null = null;
  private currentUser: User | null = null;

  constructor(config: RealtimeCursorConfig) {
    this.config = config;
    this.token = config.token || null;

    this.api = axios.create({
      baseURL: config.apiUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token to requests if available
    this.api.interceptors.request.use((config: AxiosRequestConfig) => {
      if (this.token && config.headers) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });
  }

  // Authentication methods
  async login(email: string, password: string): Promise<User> {
    try {
      const response = await this.api.post('/auth/login', { email, password });
      if (response.data.success) {
        this.token = response.data.token;
        this.currentUser = response.data.user;
        return response.data.user;
      }
      throw new Error(response.data.message || 'Login failed');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Login failed');
    }
  }

  async register(userData: { email: string; password: string; firstName: string; lastName: string }): Promise<User> {
    try {
      const response = await this.api.post('/auth/register', userData);
      if (response.data.success) {
        this.token = response.data.token;
        this.currentUser = response.data.user;
        return response.data.user;
      }
      throw new Error(response.data.message || 'Registration failed');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Registration failed');
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      const response = await this.api.get('/auth/me');
      if (response.data.success) {
        this.currentUser = response.data.user;
        return response.data.user;
      }
      throw new Error(response.data.message || 'Failed to get user');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to get user');
    }
  }

  logout(): void {
    this.token = null;
    this.currentUser = null;
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Project methods
  async getProjects(): Promise<Project[]> {
    try {
      const response = await this.api.get('/projects');
      if (response.data.success) {
        return response.data.projects || [];
      }
      throw new Error(response.data.message || 'Failed to get projects');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to get projects');
    }
  }

  async createProject(name: string, description: string): Promise<Project> {
    try {
      const response = await this.api.post('/projects', { name, description });
      if (response.data.success) {
        return response.data.project;
      }
      throw new Error(response.data.message || 'Failed to create project');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to create project');
    }
  }

  async getProject(projectId: string): Promise<Project> {
    try {
      const response = await this.api.get(`/projects/${projectId}`);
      if (response.data.success) {
        return response.data.project;
      }
      throw new Error(response.data.message || 'Failed to get project');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to get project');
    }
  }

  async updateProjectContent(projectId: string, content: string): Promise<{ staged: boolean; changeId?: string }> {
    try {
      const response = await this.api.put(`/projects/${projectId}/content`, { content });
      if (response.data.success) {
        return {
          staged: !!response.data.staged,
          changeId: response.data.changeId,
        };
      }
      throw new Error(response.data.message || 'Failed to update content');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to update content');
    }
  }

  async inviteUsers(projectId: string, userIds: string[]): Promise<{ invitations: number }> {
    try {
      const response = await this.api.post(`/projects/${projectId}/invite`, { userIds });
      if (response.data.success) {
        return { invitations: response.data.invitations };
      }
      throw new Error(response.data.message || 'Failed to invite users');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to invite users');
    }
  }

  // Comments methods
  async getComments(projectId: string): Promise<Comment[]> {
    try {
      const response = await this.api.get(`/projects/${projectId}/comments`);
      if (response.data.success) {
        return response.data.comments || [];
      }
      throw new Error(response.data.message || 'Failed to get comments');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to get comments');
    }
  }

  async addComment(projectId: string, commentData: { text: string; selectedText: string; startPosition?: number; endPosition?: number }): Promise<Comment> {
    try {
      const response = await this.api.post(`/projects/${projectId}/comments`, commentData);
      if (response.data.success) {
        return response.data.comment;
      }
      throw new Error(response.data.message || 'Failed to add comment');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to add comment');
    }
  }

  // Review methods
  async getStagedChanges(projectId: string): Promise<StagedChange[]> {
    try {
      const response = await this.api.get(`/projects/${projectId}/staged-changes`);
      if (response.data.success) {
        return response.data.changes || [];
      }
      throw new Error(response.data.message || 'Failed to get staged changes');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to get staged changes');
    }
  }

  async reviewChange(changeId: string, approve: boolean, feedback?: string): Promise<{ approved: boolean }> {
    try {
      const response = await this.api.put(`/staged-changes/${changeId}`, { approve, feedback });
      if (response.data.success) {
        return { approved: response.data.approved };
      }
      throw new Error(response.data.message || 'Failed to review change');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to review change');
    }
  }

  // History methods
  async getHistory(projectId: string): Promise<HistoryEntry[]> {
    try {
      const response = await this.api.get(`/projects/${projectId}/history`);
      if (response.data.success) {
        return response.data.history || [];
      }
      throw new Error(response.data.message || 'Failed to get history');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to get history');
    }
  }

  // Real-time collaboration methods
  connectToProject(projectId: string, userInfo: { id: string; name: string; color?: string }): void {
    if (!this.config.socketUrl) {
      throw new Error('Socket URL not provided in configuration');
    }

    // Disconnect existing socket if any
    if (this.socket) {
      this.socket.disconnect();
    }

    // Connect to socket server
    this.socket = io(this.config.socketUrl, {
      auth: {
        token: this.token
      }
    });

    // Join project room
    this.socket.emit('join-project', {
      projectId,
      user: {
        id: userInfo.id,
        name: userInfo.name,
        color: userInfo.color || this.getRandomColor()
      }
    });
  }

  onContentUpdate(callback: (data: { content: string; user: any }) => void): void {
    if (!this.socket) throw new Error('Socket not connected');
    this.socket.on('content-update', callback);
  }

  onCursorUpdate(callback: (data: { user: any; x: number; y: number; textPosition?: number }) => void): void {
    if (!this.socket) throw new Error('Socket not connected');
    this.socket.on('cursor-update', callback);
  }

  onUserJoined(callback: (data: { user: any }) => void): void {
    if (!this.socket) throw new Error('Socket not connected');
    this.socket.on('user-joined', callback);
  }

  onUserLeft(callback: (data: { socketId: string }) => void): void {
    if (!this.socket) throw new Error('Socket not connected');
    this.socket.on('user-left', callback);
  }

  onRoomUsers(callback: (users: any[]) => void): void {
    if (!this.socket) throw new Error('Socket not connected');
    this.socket.on('room-users', callback);
  }

  updateContent(content: string, cursorPosition?: number): void {
    if (!this.socket) throw new Error('Socket not connected');
    this.socket.emit('content-change', { content, cursorPosition });
  }

  updateCursor(position: { x: number; y: number; textPosition?: number }): void {
    if (!this.socket) throw new Error('Socket not connected');
    this.socket.emit('cursor-move', position);
  }

  updateCursorPosition(textPosition: number): void {
    if (!this.socket) throw new Error('Socket not connected');
    this.socket.emit('cursor-position', { textPosition });
  }

  setTyping(isTyping: boolean): void {
    if (!this.socket) throw new Error('Socket not connected');
    this.socket.emit('user-typing', { isTyping });
  }

  notifyContentSaved(userName: string): void {
    if (!this.socket) throw new Error('Socket not connected');
    this.socket.emit('content-saved', { userName });
  }

  notifyHistoryUpdate(): void {
    if (!this.socket) throw new Error('Socket not connected');
    this.socket.emit('history-update');
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private getRandomColor(): string {
    const colors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
      '#8b5cf6', '#06b6d4', '#f97316', '#84cc16',
      '#ec4899', '#6366f1', '#14b8a6', '#f43f5e'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}

// Export hooks and components
export * from './hooks';
export * from './components';

// Helper function to create a client
export const createRealtimeCursorClient = (config: RealtimeCursorConfig): RealtimeCursorSDK => {
  return new RealtimeCursorSDK(config);
};

export default RealtimeCursorSDK;