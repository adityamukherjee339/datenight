import { io, Socket } from 'socket.io-client';

const URL = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

export const socket: Socket = io(URL, {
  autoConnect: false, // We will manually connect in the room component
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});
