import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private currentToken: string | null = null;

  private getSocketUrl(): string {
    if (typeof window !== 'undefined') {
      const customUrl = (import.meta as any).env?.VITE_WS_URL;
      if (customUrl) return customUrl;

      // In local Vite dev environment, default to backend server port 5000
      if (window.location?.port === '5173') {
        return 'http://localhost:5000';
      }
      return window.location?.origin || 'http://localhost:5000';
    }
    return 'http://localhost:5000';
  }

  /**
   * Connect with JWT access token authentication
   */
  connect(token: string): Socket {
    if (this.socket && this.currentToken === token && this.socket.connected) {
      return this.socket;
    }

    if (this.socket) {
      this.disconnect();
    }

    this.currentToken = token;
    const url = this.getSocketUrl();

    this.socket = io(url, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    this.socket.on('connect', () => {
      // connected successfully
    });

    this.socket.on('connect_error', (err) => {
      console.warn('Real-time socket connection error:', err.message);
    });

    return this.socket;
  }

  /**
   * Disconnect the active socket session
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.currentToken = null;
    }
  }

  /**
   * Join a specific project's real-time updates room
   */
  joinProject(projectId: string): void {
    if (this.socket && projectId) {
      this.socket.emit('join:project', projectId);
    }
  }

  /**
   * Leave a specific project's real-time updates room
   */
  leaveProject(projectId: string): void {
    if (this.socket && projectId) {
      this.socket.emit('leave:project', projectId);
    }
  }

  /**
   * Register event listener
   */
  on(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  /**
   * Remove event listener
   */
  off(event: string, callback?: (...args: any[]) => void): void {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return Boolean(this.socket && this.socket.connected);
  }
}

export const socketService = new SocketService();
