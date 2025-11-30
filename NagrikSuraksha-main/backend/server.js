const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/authRoutes');

// Import database initialization
const db = require('./config/database');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from project root
app.use(express.static(path.join(__dirname, '..')));

// Middleware to log requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Store connected clients for broadcasting
const connectedClients = new Map();

// API Routes

// Authentication routes (using dedicated auth router)
app.use('/api/auth', authRoutes);

// User routes
app.use('/api/user', (req, res, next) => {
  console.log('User route accessed');
  next();
});

app.get('/api/user', (req, res) => {
  res.json({
    message: 'User endpoint',
    endpoints: [
      'GET /api/user/profile',
      'PUT /api/user/profile',
      'GET /api/user/settings'
    ]
  });
});

app.get('/api/user/profile', (req, res) => {
  // Mock user profile data
  res.json({
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    createdAt: '2024-01-01T00:00:00Z',
    lastLogin: new Date().toISOString()
  });
});

app.put('/api/user/profile', (req, res) => {
  const { username, email } = req.body;
  console.log('Profile update:', username, email);
  
  res.json({
    success: true,
    message: 'Profile updated successfully',
    user: { id: 1, username, email }
  });
});

app.get('/api/user/settings', (req, res) => {
  res.json({
    notifications: true,
    darkMode: false,
    language: 'en',
    timezone: 'UTC'
  });
});

// Admin routes
app.use('/api/admin', (req, res, next) => {
  console.log('Admin route accessed');
  // In a real app, you'd check for admin privileges here
  next();
});

app.get('/api/admin', (req, res) => {
  res.json({
    message: 'Admin endpoint',
    endpoints: [
      'GET /api/admin/users',
      'GET /api/admin/stats',
      'DELETE /api/admin/user/:id'
    ]
  });
});

app.get('/api/admin/users', (req, res) => {
  // Mock users data
  res.json({
    users: [
      { id: 1, username: 'user1', email: 'user1@example.com', role: 'user' },
      { id: 2, username: 'user2', email: 'user2@example.com', role: 'user' },
      { id: 3, username: 'admin', email: 'admin@example.com', role: 'admin' }
    ],
    total: 3
  });
});

app.get('/api/admin/stats', (req, res) => {
  res.json({
    totalUsers: 150,
    activeUsers: 45,
    connectedClients: connectedClients.size,
    serverUptime: process.uptime()
  });
});

app.delete('/api/admin/user/:id', (req, res) => {
  const userId = req.params.id;
  console.log('Deleting user:', userId);
  
  res.json({
    success: true,
    message: `User ${userId} deleted successfully`
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    connectedClients: connectedClients.size
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Express WebSocket Server',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      user: '/api/user',
      admin: '/api/admin',
      health: '/health'
    },
    websocket: {
      events: ['send_sos', 'send_location'],
      port: PORT
    }
  });
});

// WebSocket handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  // Store client information
  connectedClients.set(socket.id, {
    id: socket.id,
    connectedAt: new Date().toISOString(),
    lastActivity: new Date().toISOString()
  });

  // Send welcome message
  socket.emit('connected', {
    message: 'Successfully connected to server',
    clientId: socket.id,
    timestamp: new Date().toISOString()
  });

  // Handle SOS events
  socket.on('send_sos', (data) => {
    console.log(`SOS received from ${socket.id}:`, data);
    
    const sosData = {
      clientId: socket.id,
      message: data.message || 'Emergency SOS signal',
      location: data.location || null,
      timestamp: new Date().toISOString(),
      urgency: data.urgency || 'high'
    };

    // Broadcast SOS to all other clients
    socket.broadcast.emit('sos_received', sosData);
    
    // Send confirmation to sender
    socket.emit('sos_sent', {
      success: true,
      message: 'SOS broadcast to all connected clients',
      data: sosData
    });

    // Update client activity
    if (connectedClients.has(socket.id)) {
      connectedClients.get(socket.id).lastActivity = new Date().toISOString();
    }
  });

  // Handle location sharing events
  socket.on('send_location', (data) => {
    console.log(`Location received from ${socket.id}:`, data);
    
    const locationData = {
      clientId: socket.id,
      latitude: data.latitude,
      longitude: data.longitude,
      accuracy: data.accuracy || null,
      timestamp: new Date().toISOString(),
      message: data.message || 'Location update'
    };

    // Broadcast location to all other clients
    socket.broadcast.emit('location_received', locationData);
    
    // Send confirmation to sender
    socket.emit('location_sent', {
      success: true,
      message: 'Location shared with all connected clients',
      data: locationData
    });

    // Update client activity
    if (connectedClients.has(socket.id)) {
      connectedClients.get(socket.id).lastActivity = new Date().toISOString();
    }
  });

  // Handle custom messages
  socket.on('message', (data) => {
    console.log(`Message from ${socket.id}:`, data);
    
    const messageData = {
      clientId: socket.id,
      message: data.message,
      timestamp: new Date().toISOString()
    };

    // Broadcast message to all other clients
    socket.broadcast.emit('message_received', messageData);
    
    // Update client activity
    if (connectedClients.has(socket.id)) {
      connectedClients.get(socket.id).lastActivity = new Date().toISOString();
    }
  });

  // Handle client status requests
  socket.on('get_status', () => {
    socket.emit('status', {
      connectedClients: connectedClients.size,
      clientId: socket.id,
      serverUptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
    connectedClients.delete(socket.id);
    
    // Notify other clients about disconnection
    socket.broadcast.emit('client_disconnected', {
      clientId: socket.id,
      reason: reason,
      timestamp: new Date().toISOString()
    });
  });

  // Handle connection errors
  socket.on('error', (error) => {
    console.error(`Socket error for ${socket.id}:`, error);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Handle 404 routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    availableRoutes: ['/api/auth', '/api/user', '/api/admin', '/health']
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready for connections`);
  console.log(`🔗 API endpoints available at http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log('\n📋 Available WebSocket events:');
  console.log('  - send_sos: Emergency SOS signal');
  console.log('  - send_location: Location sharing');
  console.log('  - message: General messaging');
  console.log('  - get_status: Server status request');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});