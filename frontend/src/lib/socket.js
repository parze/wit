import { io } from 'socket.io-client';
import { getUser } from './auth';

let socket = null;

export function getSocket() {
  if (!socket) {
    const user = getUser();
    socket = io('http://49.12.195.247:5210', {
      query: { studentId: user?.id },
      transports: ['websocket'],
    });
  }
  return socket;
}
