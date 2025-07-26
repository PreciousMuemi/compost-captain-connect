const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Example: Listen for delivery status updates from dispatch/admin
  socket.on('updateDeliveryStatus', (data) => {
    // Broadcast to all clients (or use rooms for specific users)
    io.emit('deliveryStatusUpdate', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(4000, () => {
  console.log('Socket.io server running on port 4000');
});
