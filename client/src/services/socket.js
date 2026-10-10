import { io } from 'socket.io-client';

// Connect to backend:
// 1. If VITE_SERVER_URL is provided (e.g. Vercel -> Render), use that.
// 2. If running in production on same server (Render All-in-One), use current origin.
// 3. In local dev, default to http://localhost:5000
const SOCKET_URL = import.meta.env.VITE_SERVER_URL 
  || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' 
      ? window.location.origin 
      : 'http://localhost:5000');

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  transports: ['websocket', 'polling']
});
