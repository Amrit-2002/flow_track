import { describe, it, expect, vi, beforeEach } from 'vitest';
import { io } from 'socket.io-client';
import { socketService } from './socket.service';

const mockSocket = {
  connected: true,
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  removeAllListeners: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

describe('SocketService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    socketService.disconnect();
  });

  it('connects to socket server with auth token', () => {
    const socket = socketService.connect('mock-jwt-token');

    expect(io).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        auth: { token: 'mock-jwt-token' },
        transports: ['websocket', 'polling'],
      })
    );
    expect(socket).toBe(mockSocket);
    expect(socketService.getSocket()).toBe(mockSocket);
  });

  it('emits join:project when joining a project collaboration room', () => {
    socketService.connect('mock-jwt-token');
    socketService.joinProject('proj-101');

    expect(mockSocket.emit).toHaveBeenCalledWith('join:project', 'proj-101');
  });

  it('emits leave:project when leaving a project collaboration room', () => {
    socketService.connect('mock-jwt-token');
    socketService.leaveProject('proj-101');

    expect(mockSocket.emit).toHaveBeenCalledWith('leave:project', 'proj-101');
  });

  it('registers and unregisters socket event listeners', () => {
    socketService.connect('mock-jwt-token');
    const mockCallback = vi.fn();

    socketService.on('issue:status_changed', mockCallback);
    expect(mockSocket.on).toHaveBeenCalledWith('issue:status_changed', mockCallback);

    socketService.off('issue:status_changed', mockCallback);
    expect(mockSocket.off).toHaveBeenCalledWith('issue:status_changed', mockCallback);
  });

  it('disconnects and cleans up listeners upon disconnect()', () => {
    socketService.connect('mock-jwt-token');
    socketService.disconnect();

    expect(mockSocket.removeAllListeners).toHaveBeenCalled();
    expect(mockSocket.disconnect).toHaveBeenCalled();
    expect(socketService.getSocket()).toBeNull();
  });
});
