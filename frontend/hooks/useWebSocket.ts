'use client';
import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore, useNotificationStore } from '@/store';
import toast from 'react-hot-toast';

let socket: Socket | null = null;
let connectedUserId: string | null = null;

export function useWebSocket() {
  const { user } = useAuthStore();
  const { setUnreadCount, unreadCount } = useNotificationStore();

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        socket = null;
        connectedUserId = null;
      }
      return;
    }

    // Do not reconnect if already active for this user
    if (socket && connectedUserId === user.id && socket.connected) {
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_PRIMARY?.replace('/api/v1', '') || 'http://localhost:3001';

    if (socket) {
      socket.disconnect();
    }

    socket = io(`${backendUrl}/notifications`, {
      withCredentials: true,
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
    });

    connectedUserId = user.id;

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

    socket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('[WS] Connection error:', err.message);
    });
  }, [user?.id]);
}
