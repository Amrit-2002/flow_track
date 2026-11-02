import { useEffect, useRef } from 'react';
import { useAppSelector } from './useRedux';
import { socketService } from '../services/socket.service';

/**
 * Hook to manage global authenticated Socket.IO connection lifecycle
 */
export function useSocketInit(): void {
  const token = useAppSelector((state) => state.auth.accessToken);

  useEffect(() => {
    if (token) {
      socketService.connect(token);
    } else {
      socketService.disconnect();
    }

    return () => {
      // Keep connected while authenticated across page transitions
    };
  }, [token]);
}

/**
 * Hook to subscribe a component to a project's collaboration room
 */
export function useProjectSocket(projectId?: string | null): void {
  useEffect(() => {
    if (!projectId) return;

    socketService.joinProject(projectId);

    return () => {
      socketService.leaveProject(projectId);
    };
  }, [projectId]);
}

/**
 * Hook to listen for a specific real-time event with stable listener reference
 */
export function useSocketEvent<T = unknown>(
  event: string,
  handler: (data: T) => void
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const listener = (data: T) => {
      handlerRef.current?.(data);
    };
    socketService.on(event, listener);

    return () => {
      socketService.off(event, listener);
    };
  }, [event]);
}
