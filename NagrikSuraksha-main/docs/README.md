# Express WebSocket Server

A Node.js Express server with integrated WebSocket support using Socket.io for real-time communication.

## Features

- **Express Server**: RESTful API with authentication, user, and admin routes
- **WebSocket Support**: Real-time communication with Socket.io
- **Emergency Features**: SOS and location sharing capabilities
- **CORS Enabled**: Cross-origin resource sharing support
- **Error Handling**: Comprehensive error handling and logging

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

## API Endpoints

### Authentication (`/api/auth`)
- `GET /api/auth` - List available auth endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

### User Management (`/api/user`)
- `GET /api/user` - List available user endpoints
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `GET /api/user/settings` - Get user settings

### Admin (`/api/admin`)
- `GET /api/admin` - List available admin endpoints
- `GET /api/admin/users` - Get all users
- `GET /api/admin/stats` - Get server statistics
- `DELETE /api/admin/user/:id` - Delete user by ID

### Other Endpoints
- `GET /` - Server information and available endpoints
- `GET /health` - Health check endpoint

## WebSocket Events

### Client → Server Events

#### `send_sos`
Emergency SOS signal broadcast
```javascript
socket.emit('send_sos', {
  message: 'Emergency help needed!',
  location: { latitude: 40.7128, longitude: -74.0060 },
  urgency: 'high'
});
```

#### `send_location`
Share location with other clients
```javascript
socket.emit('send_location', {
  latitude: 40.7128,
  longitude: -74.0060,
  accuracy: 10,
  message: 'Current location update'
});
```

#### `message`
Send general message
```javascript
socket.emit('message', {
  message: 'Hello everyone!'
});
```

#### `get_status`
Request server status
```javascript
socket.emit('get_status');
```

### Server → Client Events

#### `connected`
Confirmation of successful connection
```javascript
{
  message: 'Successfully connected to server',
  clientId: 'socket_id',
  timestamp: '2024-01-01T00:00:00.000Z'
}
```

#### `sos_received`
Broadcast when another client sends SOS
```javascript
{
  clientId: 'sender_socket_id',
  message: 'Emergency SOS signal',
  location: { latitude: 40.7128, longitude: -74.0060 },
  timestamp: '2024-01-01T00:00:00.000Z',
  urgency: 'high'
}
```

#### `location_received`
Broadcast when another client shares location
```javascript
{
  clientId: 'sender_socket_id',
  latitude: 40.7128,
  longitude: -74.0060,
  accuracy: 10,
  timestamp: '2024-01-01T00:00:00.000Z',
  message: 'Location update'
}
```

#### `message_received`
Broadcast when another client sends message
```javascript
{
  clientId: 'sender_socket_id',
  message: 'Hello everyone!',
  timestamp: '2024-01-01T00:00:00.000Z'
}
```

#### `status`
Server status response
```javascript
{
  connectedClients: 5,
  clientId: 'your_socket_id',
  serverUptime: 3600,
  timestamp: '2024-01-01T00:00:00.000Z'
}
```

## Example Usage

### REST API Example
```javascript
// Login
fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'testuser',
    password: 'password123'
  })
});
```

### WebSocket Example
```javascript
const socket = io('http://localhost:3000');

// Listen for connection
socket.on('connected', (data) => {
  console.log('Connected:', data);
});

// Send SOS
socket.emit('send_sos', {
  message: 'Emergency at Central Park',
  location: { latitude: 40.7829, longitude: -73.9654 },
  urgency: 'critical'
});

// Listen for SOS from others
socket.on('sos_received', (data) => {
  console.log('SOS Alert:', data);
  // Handle emergency alert
});

// Send location
socket.emit('send_location', {
  latitude: 40.7128,
  longitude: -74.0060,
  accuracy: 5
});

// Listen for location updates
socket.on('location_received', (data) => {
  console.log('Location update:', data);
  // Update map or location display
});
```

## Configuration

The server uses the following default settings:
- **Port**: 3000 (configurable via `PORT` environment variable)
- **CORS**: Enabled for all origins
- **Body Parser**: JSON and URL-encoded support

## Dependencies

- `express`: Web framework
- `body-parser`: Request body parsing middleware
- `socket.io`: WebSocket library for real-time communication
- `cors`: Cross-origin resource sharing middleware

## Development Dependencies

- `nodemon`: Auto-restart during development

## Server Logs

The server logs all incoming requests and WebSocket events:
- HTTP requests with method and path
- WebSocket connections and disconnections
- SOS and location events
- Error messages

## Error Handling

The server includes comprehensive error handling:
- HTTP error middleware for API routes
- WebSocket error handling
- Graceful shutdown on SIGTERM/SIGINT
- 404 handling for unknown routes

## Security Notes

This is a basic implementation. For production use, consider adding:
- Authentication middleware for protected routes
- Input validation and sanitization
- Rate limiting
- HTTPS support
- JWT token verification
- Database integration for persistent data