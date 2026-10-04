import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

let socket = null;

export function initSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: false, // Wait until we explicitly connect
    });

    socket.on('connect', () => {
      console.log('Connected to real-time server:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from real-time server');
    });
  }
  return socket;
}

export function getSocket() {
  if (!socket) {
    return initSocket();
  }
  return socket;
}
