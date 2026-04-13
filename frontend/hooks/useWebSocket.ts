'use client';
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore, useNotificationStore } from '@/store';
import toast from 'react-hot-toast';

let socket: Socket | null = null;

export function useWebSocket() {
  const { user } = useAuthStore();
  const { setUnreadCount, unreadCount } = useNotificationStore();
  const initialised = useRef(false);

  useEffect(() => {
    if (!user || initialised.current) return;
    initialised.current = true;

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_PRIMARY?.replace('/api/v1', '') || 'http://localhost:3001';

    socket = io(`${backendUrl}/notifications`, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
    });

    socket.on('connect', () => {
      console.log('[WS] Connected to notifications gateway');
    });

    socket.on('notification', (data: { title: string; message: string; type: string }) => {
      toast(data.message, {
        icon: data.type === 'answer' ? '💬' : '🔔',
        duration: 6000,
      });
      setUnreadCount(unreadCount + 1);
    });

    socket.on('disconnect', () => {
      console.log('[WS] Disconnected');
    });

    socket.on('connect_error', (err) => {
      console.warn('[WS] Connection error:', err.message);
    });

    return () => {
      socket?.disconnect();
      socket = null;
      initialised.current = false;
    };
  }, [user?.id]);
}
