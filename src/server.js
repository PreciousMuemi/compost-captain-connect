import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { 
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Store connected users
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Handle user authentication
  socket.on('authenticate', (userData) => {
    connectedUsers.set(socket.id, userData);
    console.log('User authenticated:', userData.role, userData.name);
    
    // Join role-specific room
    socket.join(userData.role);
    
    // Notify others in the same role
    socket.to(userData.role).emit('userJoined', {
      userId: socket.id,
      userData: userData
    });
  });

  // Handle order status updates from dispatch
  socket.on('orderStatusUpdate', (data) => {
    console.log('Order status update:', data);
    
    // Broadcast to all connected clients
    io.emit('orderUpdate', {
      orderId: data.orderId,
      status: data.status,
      timestamp: new Date().toISOString()
    });
    
    // Notify admin specifically
    socket.to('admin').emit('orderStatusChanged', data);
  });

  // Handle rider assignment from dispatch
  socket.on('orderAssigned', (data) => {
    console.log('Order assigned:', data);
    
    // Broadcast to all clients
    io.emit('orderAssigned', {
      orderId: data.orderId,
      riderId: data.riderId,
      timestamp: new Date().toISOString()
    });
    
    // Notify admin
    socket.to('admin').emit('orderAssigned', data);
  });

  // Handle waste report status updates
  socket.on('wasteStatusUpdate', (data) => {
    console.log('Waste report status update:', data);
    
    // Broadcast to all clients
    io.emit('wasteUpdate', {
      reportId: data.reportId,
      status: data.status,
      timestamp: new Date().toISOString()
    });
    
    // If collected, notify admin for payment processing
    if (data.status === 'collected') {
      socket.to('admin').emit('wasteCollected', {
        reportId: data.reportId,
        message: 'Waste collection completed. Ready for payment processing.',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Handle waste report assignment
  socket.on('wasteAssigned', (data) => {
    console.log('Waste report assigned:', data);
    
    // Broadcast to all clients
    io.emit('wasteAssigned', {
      reportId: data.reportId,
      riderId: data.riderId,
      timestamp: new Date().toISOString()
    });
    
    // Notify admin
    socket.to('admin').emit('wasteAssigned', data);
  });

  // Handle rider status updates
  socket.on('riderStatusUpdate', (data) => {
    console.log('Rider status update:', data);
    
    // Broadcast to all clients
    io.emit('riderUpdate', {
      riderId: data.riderId,
      riderName: data.riderName,
      status: data.status,
      timestamp: new Date().toISOString()
    });
  });

  // Handle admin task creation
  socket.on('createAdminTask', (taskData) => {
    console.log('New admin task created:', taskData);
    
    // Broadcast to dispatch team
    socket.to('dispatch').emit('adminTask', {
      ...taskData,
      id: Date.now().toString(), // Temporary ID
      created_at: new Date().toISOString()
    });
  });

  // Handle task status updates from dispatch
  socket.on('taskStatusUpdate', (data) => {
    console.log('Task status update:', data);
    
    // Broadcast to admin
    socket.to('admin').emit('taskStatusChanged', {
      taskId: data.taskId,
      status: data.status,
      updatedBy: connectedUsers.get(socket.id)?.name || 'Dispatch',
      timestamp: new Date().toISOString()
    });
  });

  // Handle inventory alerts
  socket.on('inventoryAlert', (data) => {
    console.log('Inventory alert:', data);
    
    // Broadcast to admin and dispatch
    io.emit('inventoryAlert', {
      itemName: data.itemName,
      currentStock: data.currentStock,
      threshold: data.threshold,
      timestamp: new Date().toISOString()
    });
  });

  // Handle delivery notifications
  socket.on('deliveryNotification', (data) => {
    console.log('Delivery notification:', data);
    
    // Broadcast to relevant parties
    io.emit('deliveryUpdate', {
      orderId: data.orderId,
      status: data.status,
      riderName: data.riderName,
      customerName: data.customerName,
      timestamp: new Date().toISOString()
    });
  });

  // Handle real-time chat between admin and dispatch
  socket.on('dispatchMessage', (messageData) => {
    console.log('Dispatch message:', messageData);
    
    // Send to admin
    socket.to('admin').emit('dispatchMessage', {
      from: connectedUsers.get(socket.id)?.name || 'Dispatch',
      message: messageData.message,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('adminMessage', (messageData) => {
    console.log('Admin message:', messageData);
    
    // Send to dispatch
    socket.to('dispatch').emit('adminMessage', {
      from: connectedUsers.get(socket.id)?.name || 'Admin',
      message: messageData.message,
      timestamp: new Date().toISOString()
    });
  });

  // Handle user disconnection
  socket.on('disconnect', () => {
    const userData = connectedUsers.get(socket.id);
    if (userData) {
      console.log('User disconnected:', userData.name, userData.role);
      connectedUsers.delete(socket.id);
      
      // Notify others in the same role
      socket.to(userData.role).emit('userLeft', {
        userId: socket.id,
        userData: userData
      });
    }
  });
});

// REST API endpoints for non-real-time operations
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    connectedUsers: connectedUsers.size,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/connected-users', (req, res) => {
  const users = Array.from(connectedUsers.values());
  res.json({ users });
});

app.post('/api/broadcast', (req, res) => {
  const { event, data } = req.body;
  io.emit(event, data);
  res.json({ success: true, message: 'Broadcast sent' });
});

// Try different ports if 4000 is busy
const tryPort = (port) => {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.listen(port, () => {
      server.close(() => resolve(port));
    });
    server.on('error', () => {
      resolve(false);
    });
  });
};

const startServer = async () => {
  let port = 4000;
  
  // Try port 4000 first, then 4001, 4002, etc.
  for (let i = 0; i < 10; i++) {
    const testPort = port + i;
    const isAvailable = await tryPort(testPort);
    if (isAvailable) {
      port = testPort;
      break;
    }
  }

  server.listen(port, () => {
    console.log(`🚀 Dispatch server running on port ${port}`);
    console.log(`📡 Real-time communication enabled`);
    console.log(`🔗 CORS enabled for all origins`);
    console.log(`🌐 Server URL: http://localhost:${port}`);
  });
};

startServer();
