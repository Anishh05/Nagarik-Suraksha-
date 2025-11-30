# 🧪 NagrikSuraksha Testing Guide

## Overview
This guide provides comprehensive testing instructions for your NagrikSuraksha (Citizen Safety) emergency response application.

## 🚀 Quick Start

### 1. Start the Application
```bash
# Terminal 1 - Backend Server
cd backend
npm install
npm start
# Server runs on http://localhost:3000

# Terminal 2 - Frontend Application  
cd frontend
npm install
set PORT=3001 && npm start  # Windows
# Frontend runs on http://localhost:3001
```

## 🔍 Testing Checklist

### ✅ Backend API Testing

#### Health Check
- **URL**: http://localhost:3000/health
- **Method**: GET
- **Expected**: JSON with server status, uptime, and connected clients

#### Root Endpoint
- **URL**: http://localhost:3000/
- **Method**: GET  
- **Expected**: API information with available endpoints

#### Authentication Endpoints
1. **Generate OTP**
   - **URL**: http://localhost:3000/api/auth/generate-otp
   - **Method**: POST
   - **Body**: `{"phoneNumber": "+1234567890"}`
   - **Expected**: Success message with OTP generated

2. **Verify OTP**
   - **URL**: http://localhost:3000/api/auth/verify-otp
   - **Method**: POST
   - **Body**: `{"phoneNumber": "+1234567890", "otp": "123456"}`
   - **Expected**: JWT token and user data

3. **User Registration**
   - **URL**: http://localhost:3000/api/auth/register
   - **Method**: POST
   - **Body**: 
   ```json
   {
     "phoneNumber": "+1234567890",
     "name": "Test User",
     "dob": "1990-01-01",
     "otp": "123456"
   }
   ```

#### User Endpoints
- **URL**: http://localhost:3000/api/user
- **Method**: GET
- **Expected**: List of available user endpoints

#### Admin Endpoints
- **URL**: http://localhost:3000/api/admin/users
- **Method**: GET
- **Expected**: List of all users

### ✅ Frontend Testing

#### 1. Access Main Application
- Open: http://localhost:3001
- **Check**: React app loads without errors
- **Check**: Navigation and routing work properly

#### 2. User Registration Flow
1. Navigate to registration page
2. Enter phone number: `+1234567890`
3. Click "Generate OTP"
4. Enter OTP: `123456` (test OTP)
5. Complete registration with name and date of birth
6. **Expected**: Successful registration and redirect to dashboard

#### 3. User Login Flow
1. Navigate to login page
2. Enter registered phone number
3. Generate and enter OTP
4. **Expected**: Login success and dashboard access

#### 4. Police Login Flow
1. Navigate to police login page
2. Use test credentials:
   - Username: `admin`
   - Password: `admin123`
3. **Expected**: Access to police dashboard

### ✅ WebSocket Real-time Testing

#### Use the WebSocket Test Page
- **URL**: http://localhost:3001/test-websocket.html
- **Features to test**:

1. **Connection Test**
   - Click "Connect to Server"
   - **Expected**: Connection established, client ID received

2. **Emergency SOS Test**
   - Enter emergency message
   - Set location coordinates
   - Click "Send Emergency SOS"
   - **Expected**: SOS broadcast to all connected clients

3. **Location Sharing Test**
   - Enter location message
   - Set coordinates or use current location
   - Click "Share Location"
   - **Expected**: Location shared with all clients

4. **General Messaging Test**
   - Enter a message
   - Click "Send Message"
   - **Expected**: Message broadcast to all clients

### ✅ Database Testing

#### 1. Check Database Tables
The backend automatically creates these tables:
- `users` - User registration data
- `police_officers` - Police personnel data
- `otp_storage` - OTP verification codes
- `complaints` - User complaints
- `emergency_sos` - Active emergency alerts
- `emergency_sos_history` - Resolved emergencies

#### 2. Test Data
The system creates default test data:
- **Test Users**: 
  - Phone: `+1234567890` (Test User)
  - Phone: `+9876543210` (Demo User)
- **Police Officers**:
  - Username: `admin`, Password: `admin123`
  - Username: `officer.smith`, Password: `password123`
  - Username: `supervisor.johnson`, Password: `supervisor456`

## 🔧 Testing with Tools

### Using PowerShell (Windows)
```powershell
# Test health endpoint
Invoke-WebRequest -Uri "http://localhost:3000/health" -Method GET

# Test OTP generation
$body = '{"phoneNumber": "+1234567890"}'
Invoke-WebRequest -Uri "http://localhost:3000/api/auth/generate-otp" -Method POST -Body $body -ContentType "application/json"
```

### Using curl (if available)
```bash
# Test health endpoint
curl http://localhost:3000/health

# Test OTP generation
curl -X POST http://localhost:3000/api/auth/generate-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890"}'
```

## 🚨 Emergency Response Testing

### Complete Emergency Workflow
1. **User Side**:
   - Login to user dashboard
   - Click "Emergency SOS" button
   - Fill location and emergency details
   - Send SOS alert

2. **Police Side**:
   - Login to police dashboard
   - Monitor incoming SOS alerts
   - Respond to emergencies
   - Update case status

### Real-time Features
- Multiple browser tabs/windows for testing real-time updates
- Test WebSocket connections with multiple clients
- Verify SOS alerts are broadcast to all connected police officers

## 📊 Performance Testing

### Load Testing
- Open multiple browser tabs with WebSocket connections
- Send concurrent SOS alerts
- Monitor server performance and response times

### Database Performance
- Check query execution times in server logs
- Test with multiple simultaneous user registrations
- Verify database locking and transaction handling

## 🐛 Common Issues & Troubleshooting

### Backend Issues
- **Port 3000 in use**: Check if another service is running on port 3000
- **Database errors**: Ensure SQLite database is properly initialized
- **Module not found**: Run `npm install` in backend directory

### Frontend Issues
- **Port conflicts**: Frontend runs on 3001, backend on 3000
- **API connection failed**: Verify backend is running on port 3000
- **Build errors**: Clear cache with `npm start -- --reset-cache`

### WebSocket Issues
- **Connection failed**: Check if backend WebSocket server is running
- **Messages not received**: Verify client is properly connected
- **CORS errors**: Backend is configured to allow all origins for development

## 📈 Success Criteria

### Functional Tests Pass ✅
- [ ] Backend server starts without errors
- [ ] Frontend application loads properly
- [ ] Database tables created successfully
- [ ] User registration and login work
- [ ] Police login and dashboard access work
- [ ] WebSocket connections establish properly
- [ ] Real-time messaging functions correctly
- [ ] Emergency SOS alerts are broadcast
- [ ] Location sharing works as expected

### Performance Benchmarks ✅
- [ ] API responses under 500ms
- [ ] WebSocket message latency under 100ms
- [ ] Frontend page load under 3 seconds
- [ ] Database queries execute under 100ms
- [ ] Server handles 10+ concurrent connections

## 🎯 Next Steps

After successful testing:
1. **Security**: Implement production-ready authentication
2. **Deployment**: Prepare for production deployment
3. **Monitoring**: Add logging and error tracking
4. **Scalability**: Consider database optimization
5. **Mobile**: Test responsive design on mobile devices

---

**Happy Testing! 🧪✨**

For issues or questions, check the console logs in both browser developer tools and terminal outputs.