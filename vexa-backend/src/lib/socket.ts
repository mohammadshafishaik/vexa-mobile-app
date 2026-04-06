import { Server as SocketServer } from 'socket.io';

let io: SocketServer | null = null;

export function setIO(socketIO: SocketServer) {
  io = socketIO;
}

export function getIO(): SocketServer {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}
