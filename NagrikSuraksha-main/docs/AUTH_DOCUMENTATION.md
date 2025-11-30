# Authentication Routes Documentation

This file contains detailed documentation for the authentication system implemented in `authRoutes.js`.

## Overview

The authentication system provides secure user registration and login functionality with the following features:

- **OTP-based Authentication**: 6-digit OTP generation and validation
- **RSA Key Pair Generation**: Automatic RSA public/private key generation for each user
- **JWT Token Authentication**: Secure token-based authentication
- **Phone Number Verification**: Phone number-based user identification
- **Rate Limiting**: OTP attempt limits and expiry controls

## Authentication Flow

1. **Generate OTP**: User requests OTP for their phone number
2. **Register User**: User provides personal details and RSA keys are generated
3. **Login with OTP**: User enters OTP to receive JWT token for authenticated access

## API Endpoints

### 1. POST `/api/auth/generate-otp`

Generate a 6-digit OTP for phone number verification.

**Request Body:**
```json
{
  "phoneNumber": "+1234567890"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "OTP generated successfully",
  "phoneNumber": "1234567890",
  "expiresIn": 5,
  "developmentOnly": {
    "otp": "123456",
    "note": "This OTP is shown only for development. In production, it should be sent via SMS."
  }
}
```

**Response (Rate Limited):**
```json
{
  "success": false,
  "message": "OTP already sent. Please wait 3 minutes before requesting a new OTP",
  "remainingTime": 3
}
```

**Features:**
- 6-digit random OTP generation
- 5-minute expiry time
- Rate limiting (one OTP per phone number until expiry)
- Phone number format validation
- Development mode shows OTP in response (remove in production)

---

### 2. POST `/api/auth/register`

Register a new user with personal details and automatic RSA key pair generation.

**Request Body:**
```json
{
  "name": "John Doe",
  "dob": "1990-05-15",
  "phoneNumber": "+1234567890"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "name": "John Doe",
    "dob": "1990-05-15T00:00:00.000Z",
    "phoneNumber": "1234567890",
    "publicKey": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----",
    "registeredAt": "2024-01-01T12:00:00.000Z"
  }
}
```

**Response (User Exists):**
```json
{
  "success": false,
  "message": "User with this phone number already exists"
}
```

**Features:**
- RSA 2048-bit key pair generation (public/private keys)
- User data validation (name, DOB, phone number)
- Age validation (13-120 years old)
- Duplicate phone number prevention
- Secure private key storage (encrypted in production)

---

### 3. POST `/api/auth/login`

Validate OTP and issue JWT token for authenticated access.

**Request Body:**
```json
{
  "phoneNumber": "+1234567890",
  "otp": "123456"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "name": "John Doe",
    "phoneNumber": "1234567890",
    "dob": "1990-05-15T00:00:00.000Z",
    "publicKey": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----",
    "isVerified": true,
    "lastLogin": "2024-01-01T12:00:00.000Z"
  },
  "tokenInfo": {
    "expiresIn": "24h",
    "type": "Bearer"
  }
}
```

**Response (Invalid OTP):**
```json
{
  "success": false,
  "message": "Invalid OTP",
  "remainingAttempts": 2
}
```

**Features:**
- OTP validation with attempt limiting (3 attempts max)
- JWT token generation with 24-hour expiry
- User verification status update
- Last login timestamp tracking
- Automatic OTP cleanup after successful login

---

### 4. POST `/api/auth/verify-token`

Verify and decode JWT token (utility endpoint).

**Request Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (Valid Token):**
```json
{
  "success": true,
  "message": "Token is valid",
  "decoded": {
    "userId": "1234567890",
    "name": "John Doe",
    "phoneNumber": "1234567890",
    "isVerified": true,
    "publicKey": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----",
    "iat": 1640995200,
    "exp": 1641081600,
    "iss": "express-auth-server",
    "aud": "client-app"
  },
  "isExpired": false
}
```

---

### 5. GET `/api/auth/user-info/:phoneNumber`

Get user information by phone number (debugging/admin purposes).

**Response:**
```json
{
  "success": true,
  "user": {
    "name": "John Doe",
    "phoneNumber": "1234567890",
    "dob": "1990-05-15T00:00:00.000Z",
    "publicKey": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----",
    "registeredAt": "2024-01-01T10:00:00.000Z",
    "isVerified": true,
    "lastLogin": "2024-01-01T12:00:00.000Z"
  }
}
```

---

### 6. GET `/api/auth/stats`

Get authentication system statistics.

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalUsers": 150,
    "verifiedUsers": 142,
    "unverifiedUsers": 8,
    "activeOTPs": 5,
    "otpExpiryMinutes": 5,
    "maxOtpAttempts": 3,
    "jwtExpiryTime": "24h"
  }
}
```

## Security Configuration

### OTP Settings
- **Length**: 6 digits
- **Expiry**: 5 minutes
- **Max Attempts**: 3 per OTP
- **Rate Limiting**: One OTP per phone number until expiry

### RSA Key Pair
- **Algorithm**: RSA
- **Key Length**: 2048 bits
- **Public Key Format**: SPKI/PEM
- **Private Key Format**: PKCS8/PEM

### JWT Configuration
- **Algorithm**: HS256
- **Expiry**: 24 hours
- **Issuer**: express-auth-server
- **Audience**: client-app
- **Secret**: Configurable via environment variable

## Data Storage

The current implementation uses in-memory storage for demonstration:

### OTP Storage
```javascript
Map<phoneNumber, {
  otp: string,
  expiresAt: Date,
  attempts: number,
  createdAt: Date
}>
```

### User Storage
```javascript
Map<phoneNumber, {
  name: string,
  dob: string,
  phoneNumber: string,
  publicKey: string,
  privateKey: string,
  registeredAt: string,
  isVerified: boolean,
  lastLogin?: string
}>
```

## Error Handling

The authentication system includes comprehensive error handling for:

- **Validation Errors**: Invalid input data, phone number format, age restrictions
- **Authentication Errors**: Invalid OTP, expired tokens, user not found
- **Rate Limiting**: Too many OTP attempts, OTP request limits
- **Server Errors**: Internal server errors with proper error logging

## Usage Examples

### Complete Authentication Flow

```javascript
// 1. Generate OTP
const otpResponse = await fetch('/api/auth/generate-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phoneNumber: '+1234567890' })
});

// 2. Register user (can be done before or after OTP)
const registerResponse = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'John Doe',
    dob: '1990-05-15',
    phoneNumber: '+1234567890'
  })
});

// 3. Login with OTP
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phoneNumber: '+1234567890',
    otp: '123456'
  })
});

const { token } = await loginResponse.json();

// 4. Use JWT token for authenticated requests
const authenticatedRequest = await fetch('/api/user/profile', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

## Production Considerations

### Security Enhancements Needed:
1. **Database Storage**: Replace in-memory storage with secure database
2. **SMS Integration**: Integrate with SMS service (Twilio, AWS SNS) for OTP delivery
3. **Private Key Encryption**: Encrypt private keys before database storage
4. **Environment Variables**: Use secure environment variables for JWT secret
5. **Rate Limiting**: Implement proper rate limiting middleware
6. **Input Sanitization**: Add comprehensive input validation and sanitization
7. **Logging**: Implement secure logging without exposing sensitive data
8. **HTTPS**: Ensure all communication is over HTTPS
9. **Key Rotation**: Implement JWT secret rotation strategy
10. **Audit Trail**: Add user activity logging and audit trails

### Scalability Considerations:
1. **Caching**: Use Redis for OTP storage and session management
2. **Load Balancing**: Design for horizontal scaling
3. **Database Optimization**: Implement proper indexing and query optimization
4. **CDN Integration**: Use CDN for static assets and API responses
5. **Monitoring**: Add health checks and performance monitoring

## Environment Variables

Create a `.env` file with the following variables:

```env
JWT_SECRET=your-super-secret-jwt-key-minimum-256-bits
SMS_API_KEY=your-sms-service-api-key
SMS_API_SECRET=your-sms-service-secret
DATABASE_URL=your-database-connection-string
REDIS_URL=your-redis-connection-string
NODE_ENV=production
```