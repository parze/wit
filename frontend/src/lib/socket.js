import { io } from 'socket.io-client';
import { getUser } from './auth';

let socket = null;

export function getSocket() {
  if (!socket) {
    const user = getUser();
    socket = io(window.location.origin, {
      query: { studentId: user?.id },
      transports: ['websocket'],
    });
  }
  return socket;
}
