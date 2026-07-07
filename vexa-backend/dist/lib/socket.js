let io = null;
export function setIO(socketIO) {
    io = socketIO;
}
export function getIO() {
    if (!io)
        throw new Error('Socket.io not initialized');
    return io;
}
//# sourceMappingURL=socket.js.map