const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Import database services (exported as instances)
const userService = require('../services/userService');
const policeService = require('../services/policeService');
const otpService = require('../services/otpService');
const complaintService = require('../services/complaintService');
const emergencySOSService = require('../services/emergencySOSService');

// Import crypto utilities
const { generateUserKeyPair, encryptUserData, decryptUserData } = require('../utils/crypto');

const router = express.Router();

// Configuration
const OTP_EXPIRY_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 3;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRY = '24h';

// Test configuration
const TEST_PHONE_NUMBERS = ['+1234567890', '1234567890'];
const TEST_OTP = '123456';

// Utility function to generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Utility function to generate RSA key pair
function generateRSAKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  
  return { publicKey, privateKey };
}

// Utility function to validate phone number format
function isValidPhoneNumber(phoneNumber) {
  // Simple validation - accepts formats like +1234567890, 1234567890, etc.
  const phoneRegex = /^[\+]?[1-9][\d]{9,14}$/;
  return phoneRegex.test(phoneNumber.replace(/[\s\-\(\)]/g, ''));
}

// Utility function to validate date of birth
function isValidDOB(dob) {
  const date = new Date(dob);
  const now = new Date();
  const minAge = new Date(now.getFullYear() - 13, now.getMonth(), now.getDate()); // Minimum 13 years old
  const maxAge = new Date(now.getFullYear() - 120, now.getMonth(), now.getDate()); // Maximum 120 years old
  
  return date instanceof Date && !isNaN(date) && date <= minAge && date >= maxAge;
}

/**
 * POST /generate-otp
 * Generate and send a 6-digit OTP for phone number verification
 */
router.post('/generate-otp', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    // Validate input
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Normalize phone number (remove spaces, hyphens, parentheses)
    const normalizedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');

    // Check if this is a test phone number
    const isTestNumber = TEST_PHONE_NUMBERS.includes(normalizedPhone);

    // Bypass phone number format validation for test numbers
    if (!isTestNumber && !isValidPhoneNumber(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format'
      });
    }

    // Check if user is already registered
    const userData = await userService.getUserByPhone(normalizedPhone);
    const isRegistered = !!userData;

    // Check if there's an existing OTP that hasn't expired
    const existingOTP = await otpService.getOTP(normalizedPhone);
    if (existingOTP && new Date(existingOTP.expires_at) > new Date()) {
      const remainingTime = Math.ceil((new Date(existingOTP.expires_at) - new Date()) / 1000 / 60);
      return res.status(429).json({
        success: false,
        message: `OTP already sent. Please wait ${remainingTime} minutes before requesting a new OTP`,
        remainingTime: remainingTime
      });
    }

    // Generate new OTP (use fixed OTP for test numbers)
    const otp = isTestNumber ? TEST_OTP : generateOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Store OTP in database
    await otpService.storeOTP(normalizedPhone, otp, expiresAt);

    // Log OTP generation (remove in production, send via SMS instead)
    const logMessage = isTestNumber 
      ? `TEST OTP generated for ${normalizedPhone}: ${otp} (expires at ${expiresAt.toISOString()})`
      : `OTP generated for ${normalizedPhone}: ${otp} (expires at ${expiresAt.toISOString()})`;
    console.log(logMessage);

    // In production, you would send the OTP via SMS service (Twilio, AWS SNS, etc.)
    // For now, we'll return it in the response (NEVER do this in production)
    res.json({
      success: true,
      message: 'OTP generated successfully',
      phoneNumber: normalizedPhone,
      expiresIn: OTP_EXPIRY_MINUTES,
      isTestNumber: isTestNumber,
      isRegistered: isRegistered,
      registrationStatus: isRegistered 
        ? 'User is registered. Use this OTP to login.'
        : 'Phone number not registered. Register first, then use this OTP to login.',
      nextAction: isRegistered ? 'login' : 'register-then-login',
      // REMOVE THIS IN PRODUCTION - OTP should be sent via SMS
      developmentOnly: {
        otp: otp,
        note: isTestNumber 
          ? 'This is a test phone number with a fixed OTP for development purposes.'
          : 'This OTP is shown only for development. In production, it should be sent via SMS.'
      }
    });

  } catch (error) {
    console.error('Error generating OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while generating OTP'
    });
  }
});

/**
 * POST /register
 * Register a new user with name, DOB, phone number, and generate RSA key pair
 */
router.post('/register', async (req, res) => {
  try {
    const { name, dob, phoneNumber } = req.body;

    // Validate input
    if (!name || !dob || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Name, date of birth, and phone number are required'
      });
    }

    // Validate name (basic validation)
    if (name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Name must be at least 2 characters long'
      });
    }

    // Validate phone number format
    if (!isValidPhoneNumber(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format'
      });
    }

    // Validate date of birth
    if (!isValidDOB(dob)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date of birth. User must be between 13 and 120 years old'
      });
    }

    // Normalize phone number
    const normalizedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');

    // Check if user already exists
    const existingUser = await userService.getUserByPhone(normalizedPhone);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this phone number already exists'
      });
    }

    // Generate RSA key pair for user encryption
    console.log('Generating RSA key pair for user registration...');
    const keyPair = generateUserKeyPair();

    // Create user in database
    const userId = await userService.createUser({
      name: name.trim(),
      dob: new Date(dob).toISOString(),
      phoneNumber: normalizedPhone,
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey
    });

    // Get the created user
    const userData = await userService.getUserByPhone(normalizedPhone);

    console.log(`User registered: ${name} (${normalizedPhone})`);

    // Return success response (don't include private key in response)
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: userData.id,
        name: userData.name,
        dob: userData.dob,
        phoneNumber: userData.phone_number,
        publicKey: userData.public_key,
        registeredAt: userData.created_at
      }
    });

  } catch (error) {
    console.error('Error during user registration:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during registration'
    });
  }
});

/**
 * POST /login
 * Validate OTP and issue JWT token for authenticated user
 */
router.post('/login', async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    // Validate input
    if (!phoneNumber || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and OTP are required'
      });
    }

    // Normalize phone number
    const normalizedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');

    // Check if user exists
    const userData = await userService.getUserByPhone(normalizedPhone);
    if (!userData) {
      return res.status(404).json({
        success: false,
        message: 'Phone number not registered. Please register your number first to continue.',
        action: 'register',
        hint: 'Use the registration endpoint to create your account with this phone number.'
      });
    }

    // Check if OTP exists and is not expired
    const storedOTP = await otpService.getOTP(normalizedPhone);
    if (!storedOTP) {
      return res.status(400).json({
        success: false,
        message: 'No OTP found. Please generate an OTP first.'
      });
    }

    // Check if OTP has expired
    if (new Date(storedOTP.expires_at) <= new Date()) {
      await otpService.deleteOTP(normalizedPhone);
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please generate a new OTP.'
      });
    }

    // Check if maximum attempts exceeded
    if (storedOTP.attempts >= MAX_OTP_ATTEMPTS) {
      await otpService.deleteOTP(normalizedPhone);
      return res.status(429).json({
        success: false,
        message: 'Maximum OTP attempts exceeded. Please generate a new OTP.'
      });
    }

    // Validate OTP
    if (storedOTP.otp !== otp.toString()) {
      await otpService.incrementAttempts(normalizedPhone);
      
      const remainingAttempts = MAX_OTP_ATTEMPTS - (storedOTP.attempts + 1);
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP',
        remainingAttempts: remainingAttempts
      });
    }

    // OTP is valid - clear it from storage
    await otpService.deleteOTP(normalizedPhone);

    // Mark user as verified and update last login
    await userService.updateUser(userData.id, {
      is_verified: true,
      last_login: new Date().toISOString()
    });

    // Generate JWT token
    const tokenPayload = {
      userId: userData.id,
      name: userData.name,
      phoneNumber: userData.phone_number,
      isVerified: true,
      publicKey: userData.public_key
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: JWT_EXPIRY,
      issuer: 'express-auth-server',
      audience: 'client-app'
    });

    console.log(`User logged in successfully: ${userData.name} (${userData.phone_number})`);

    // Return success response with JWT token
    res.json({
      success: true,
      message: 'Login successful',
      token: token,
      user: {
        id: userData.id,
        name: userData.name,
        phoneNumber: userData.phone_number,
        dob: userData.dob,
        publicKey: userData.public_key,
        isVerified: true,
        lastLogin: new Date().toISOString()
      },
      tokenInfo: {
        expiresIn: JWT_EXPIRY,
        type: 'Bearer'
      }
    });

  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login'
    });
  }
});

/**
 * POST /verify-token
 * Verify and decode JWT token (utility endpoint)
 */
router.post('/verify-token', (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);

    res.json({
      success: true,
      message: 'Token is valid',
      decoded: decoded,
      isExpired: false
    });

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired',
        isExpired: true
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    console.error('Error verifying token:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during token verification'
    });
  }
});

/**
 * GET /user-info/:phoneNumber
 * Get user information by phone number (for debugging/admin purposes)
 */
router.get('/user-info/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const normalizedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');

    const userData = await userService.getUserByPhone(normalizedPhone);
    if (!userData) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Return user info without private key
    res.json({
      success: true,
      user: {
        id: userData.id,
        name: userData.name,
        phoneNumber: userData.phone_number,
        dob: userData.dob,
        publicKey: userData.public_key,
        registeredAt: userData.created_at,
        isVerified: userData.is_verified,
        lastLogin: userData.last_login || null
      }
    });

  } catch (error) {
    console.error('Error getting user info:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * GET /stats
 * Get authentication system statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const userStats = await userService.getUserStats();
    const policeStats = await policeService.getPoliceStats();
    const emergencySOSStats = await emergencySOSService.getEmergencySOSStats();
    const complaintStats = await complaintService.getComplaintStats();

    res.json({
      success: true,
      stats: {
        users: userStats,
        police: policeStats,
        sos: emergencySOSStats, // Updated to use emergency SOS stats
        complaints: complaintStats,
        otpExpiryMinutes: OTP_EXPIRY_MINUTES,
        maxOtpAttempts: MAX_OTP_ATTEMPTS,
        jwtExpiryTime: JWT_EXPIRY
      }
    });

  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * POST /check-registration
 * Check if a phone number is already registered
 */
router.post('/check-registration', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Normalize phone number
    const normalizedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');

    // Check if user exists
    const userData = await userService.getUserByPhone(normalizedPhone);
    const isRegistered = !!userData;

    res.json({
      success: true,
      phoneNumber: normalizedPhone,
      isRegistered: isRegistered,
      message: isRegistered 
        ? 'Phone number is registered. You can generate OTP to login.'
        : 'Phone number is not registered. Please register first.',
      nextAction: isRegistered ? 'generate-otp' : 'register'
    });

  } catch (error) {
    console.error('Error checking registration:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while checking registration'
    });
  }
});

/**
 * GET /me
 * Get current user information from JWT token
 */
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const userData = await userService.getUserById(decoded.userId);
      
      if (!userData) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Return user data (excluding sensitive information)
      res.json({
        success: true,
        user: {
          id: userData.id,
          name: userData.name,
          phoneNumber: userData.phone_number,
          dob: userData.dob,
          publicKey: userData.public_key,
          isVerified: userData.is_verified,
          lastLogin: userData.last_login,
          location: {
            latitude: userData.latitude,
            longitude: userData.longitude,
            address: userData.address,
            updatedAt: userData.location_updated_at
          }
        }
      });

    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

  } catch (error) {
    console.error('Error getting user info:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while getting user info'
    });
  }
});

/**
 * PUT /update-location
 * Update user's current location
 */
router.put('/update-location', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const { latitude, longitude, address } = req.body;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required'
        });
      }

      // Update user location in database
      const updated = await userService.updateUserLocation(decoded.userId, {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address: address || null,
        location_updated_at: new Date().toISOString()
      });

      if (updated) {
        res.json({
          success: true,
          message: 'Location updated successfully',
          data: {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            address: address,
            updated_at: new Date().toISOString()
          }
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to update location'
        });
      }

    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while updating location'
    });
  }
});

/**
 * POST /admin/login
 * Admin/Police login with username and password
 */
router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // Authenticate police officer
    const policeData = await policeService.authenticatePolice(username, password);
    if (!policeData) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    await policeService.updatePolice(policeData.id, {
      last_login: new Date().toISOString()
    });

    // Generate JWT token with admin role
    const token = jwt.sign(
      { 
        userId: policeData.id,
        username: policeData.username,
        role: policeData.role,
        type: 'admin'
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.json({
      success: true,
      message: 'Admin login successful',
      token: token,
      admin: {
        id: policeData.id,
        username: policeData.username,
        name: policeData.name,
        role: policeData.role,
        department: policeData.department,
        rank: policeData.rank,
        badgeNumber: policeData.badge_number,
        lastLogin: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error during admin login:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during admin login'
    });
  }
});

/**
 * GET /admin/me
 * Get current admin information from JWT token
 */
router.get('/admin/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Check if token is for admin
      if (decoded.type !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin token required.'
        });
      }

      const policeData = await policeService.getPoliceById(decoded.userId);
      
      if (!policeData) {
        return res.status(404).json({
          success: false,
          message: 'Admin not found'
        });
      }

      res.json({
        success: true,
        admin: {
          id: policeData.id,
          username: policeData.username,
          name: policeData.name,
          role: policeData.role,
          department: policeData.department,
          rank: policeData.rank,
          badgeNumber: policeData.badge_number,
          lastLogin: policeData.last_login
        }
      });

    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

  } catch (error) {
    console.error('Error getting admin info:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while getting admin info'
    });
  }
});

/**
 * POST /admin/sos-requests
 * Store SOS request from user
 */
router.post('/admin/sos-requests', async (req, res) => {
  try {
    const { userId, userName, userPhone, message, location, urgency, timestamp } = req.body;

    if (!userId || !userName || !userPhone) {
      return res.status(400).json({
        success: false,
        message: 'User ID, name, and phone number are required'
      });
    }

    if (!location || !location.latitude || !location.longitude) {
      return res.status(400).json({
        success: false,
        message: 'Location data is required for SOS requests'
      });
    }

    // Submit emergency SOS (will overwrite existing SOS for this user)
    const emergencySOS = await emergencySOSService.submitEmergencySOS({
      username: userPhone, // Use phone as unique identifier
      userPhone: userPhone,
      userName: userName,
      message: message || 'EMERGENCY SOS - Immediate assistance required!',
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.address || `${location.latitude}, ${location.longitude}`,
      accuracy: location.accuracy || null,
      urgency: urgency || 'critical'
    });

    console.log(`🚨 Emergency SOS alert from ${userName} (${userPhone}) at ${location.latitude}, ${location.longitude}`);

    res.json({
      success: true,
      message: 'Emergency SOS dispatched to police',
      emergencySOS: emergencySOS
    });

  } catch (error) {
    console.error('Error storing SOS request:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while storing SOS request'
    });
  }
});

/**
 * GET /admin/sos-requests
 * Get all emergency SOS requests for admin dashboard
 * Note: This endpoint redirects to emergency SOS data
 */
router.get('/admin/sos-requests', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      if (decoded.type !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin token required.'
        });
      }

      // Use emergency SOS service instead of old SOS service
      const allEmergencySOS = await emergencySOSService.getAllEmergencySOS();

      res.json({
        success: true,
        sosRequests: allEmergencySOS, // Keep the same response format for compatibility
        total: allEmergencySOS.length
      });

    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

  } catch (error) {
    console.error('Error fetching SOS requests:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching SOS requests'
    });
  }
});

/**
 * POST /admin/complaints
 * Store complaint from user with encryption
 */
router.post('/admin/complaints', async (req, res) => {
  try {
    const { userId, userName, userPhone, category, subject, description, location, urgency, files } = req.body;

    // Get user's public key for encryption
    const user = await userService.getUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Encrypt the sensitive description data
    const encryptedDescription = encryptUserData(description, user.public_key);

    const complaintId = await complaintService.createComplaint({
      userId: userId,
      userName: userName,
      userPhone: userPhone,
      category: category,
      subject: subject,
      description: description, // Keep original for backwards compatibility
      encryptedDescription: encryptedDescription.encryptedData,
      encryptedKey: encryptedDescription.encryptedKey,
      encryptionIv: encryptedDescription.iv,
      location: location,
      urgency: urgency || 'medium',
      files: files || []
    });

    console.log(`Complaint encrypted and stored for user ${userName} (ID: ${userId})`);

    res.json({
      success: true,
      message: 'Complaint submitted successfully',
      complaintId: complaintId
    });

  } catch (error) {
    console.error('Error storing complaint:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while storing complaint'
    });
  }
});

/**
 * GET /admin/complaints
 * Get all complaints for admin dashboard with decryption
 */
router.get('/admin/complaints', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      if (decoded.type !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin token required.'
        });
      }

      const allComplaints = await complaintService.getAllComplaints();

      // Decrypt complaint descriptions for police viewing
      const decryptedComplaints = await Promise.all(allComplaints.map(async (complaint) => {
        try {
          // Get user's private key for decryption
          const user = await userService.getUserById(complaint.user_id);
          
          if (user && complaint.encrypted_description && complaint.encrypted_key && complaint.encryption_iv) {
            // Decrypt the description
            const decrypted = decryptUserData(
              complaint.encrypted_description,
              complaint.encrypted_key,
              complaint.encryption_iv,
              user.private_key
            );
            
            return {
              ...complaint,
              description: decrypted.plaintext, // Replace with decrypted text
              isDecrypted: true
            };
          } else {
            // Fallback to original description if encryption data not available
            return {
              ...complaint,
              isDecrypted: false
            };
          }
        } catch (decryptError) {
          console.error(`Error decrypting complaint ${complaint.id}:`, decryptError.message);
          // Return original description if decryption fails
          return {
            ...complaint,
            description: complaint.description || '[Decryption failed]',
            isDecrypted: false,
            decryptionError: true
          };
        }
      }));

      res.json({
        success: true,
        complaints: decryptedComplaints,
        total: decryptedComplaints.length
      });

    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

  } catch (error) {
    console.error('Error fetching complaints:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching complaints'
    });
  }
});

/**
 * POST /admin/complaints/:id/resolve
 * Resolve a complaint and mark it as resolved
 */
router.post('/admin/complaints/:id/resolve', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    const { id } = req.params;
    const { resolution, notes } = req.body;
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      if (decoded.type !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin token required.'
        });
      }

      // Get the complaint first to ensure it exists
      const complaint = await complaintService.getComplaintById(id);
      if (!complaint) {
        return res.status(404).json({
          success: false,
          message: 'Complaint not found'
        });
      }

      // Update complaint status to resolved
      const resolvedComplaint = await complaintService.updateComplaintStatus(
        id, 
        'resolved', 
        decoded.userId, // Assign to the resolving officer
        notes || resolution || 'Complaint resolved by police officer'
      );

      console.log(`Complaint ${id} resolved by officer ${decoded.username}`);

      res.json({
        success: true,
        message: 'Complaint resolved successfully',
        complaint: resolvedComplaint
      });

    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

  } catch (error) {
    console.error('Error resolving complaint:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while resolving complaint'
    });
  }
});

/**
 * GET /admin/emergency-sos
 * Get all active emergency SOS alerts for police dashboard with decryption
 */
router.get('/admin/emergency-sos', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      if (decoded.type !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin token required.'
        });
      }

      const activeEmergencySOS = await emergencySOSService.getAllEmergencySOS();
      const stats = await emergencySOSService.getEmergencySOSStats();

      // Decrypt emergency SOS messages for police viewing
      const decryptedEmergencySOS = await Promise.all(activeEmergencySOS.map(async (sos) => {
        try {
          // Get user's private key for decryption
          const user = await userService.getUserByPhone(sos.user_phone);
          
          if (user && sos.encrypted_message && sos.message_encrypted_key && sos.message_encryption_iv) {
            // Decrypt the message
            const decrypted = decryptUserData(
              sos.encrypted_message,
              sos.message_encrypted_key,
              sos.message_encryption_iv,
              user.private_key
            );
            
            return {
              ...sos,
              message: decrypted.plaintext, // Replace with decrypted text
              isDecrypted: true
            };
          } else {
            // Fallback to original message if encryption data not available
            return {
              ...sos,
              isDecrypted: false
            };
          }
        } catch (decryptError) {
          console.error(`Error decrypting SOS for ${sos.username}:`, decryptError.message);
          // Return original message if decryption fails
          return {
            ...sos,
            message: sos.message || '[Decryption failed]',
            isDecrypted: false,
            decryptionError: true
          };
        }
      }));

      res.json({
        success: true,
        emergencySOS: decryptedEmergencySOS,
        stats: stats
      });

    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

  } catch (error) {
    console.error('Error fetching emergency SOS:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching emergency SOS'
    });
  }
});

/**
 * PUT /admin/emergency-sos/:username/status
 * Update emergency SOS status (active -> responding)
 */
router.put('/admin/emergency-sos/:username/status', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    const { username } = req.params;
    const { status } = req.body;
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      if (decoded.type !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin token required.'
        });
      }

      const updated = await emergencySOSService.updateEmergencySOSStatus(username, status);

      if (updated) {
        res.json({
          success: true,
          message: `Emergency SOS status updated to ${status}`
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Emergency SOS not found'
        });
      }

    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

  } catch (error) {
    console.error('Error updating emergency SOS status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while updating emergency SOS status'
    });
  }
});

/**
 * POST /admin/emergency-sos/:username/resolve
 * Resolve emergency SOS and move to history
 */
router.post('/admin/emergency-sos/:username/resolve', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    const { username } = req.params;
    const { resolvedNotes } = req.body;
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      if (decoded.type !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin token required.'
        });
      }

      // Get officer info
      const policeData = await policeService.getPoliceById(decoded.userId);
      const resolvedBy = policeData ? policeData.name : 'Unknown Officer';

      const resolved = await emergencySOSService.resolveEmergencySOS(username, resolvedBy, resolvedNotes);

      if (resolved) {
        res.json({
          success: true,
          message: 'Emergency SOS resolved and moved to history'
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Emergency SOS not found'
        });
      }

    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

  } catch (error) {
    console.error('Error resolving emergency SOS:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while resolving emergency SOS'
    });
  }
});

/**
 * GET /admin/emergency-sos/history
 * Get emergency SOS history
 */
router.get('/admin/emergency-sos/history', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    const { limit } = req.query;
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      if (decoded.type !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin token required.'
        });
      }

      const history = await emergencySOSService.getEmergencySOSHistory(limit ? parseInt(limit) : 50);

      res.json({
        success: true,
        history: history
      });

    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

  } catch (error) {
    console.error('Error fetching emergency SOS history:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching emergency SOS history'
    });
  }
});

/**
 * GET /debug/emergency-sos
 * Debug endpoint to check emergency SOS data (REMOVE IN PRODUCTION)
 */
router.get('/debug/emergency-sos', async (req, res) => {
  try {
    const activeEmergencySOS = await emergencySOSService.getAllEmergencySOS();
    const stats = await emergencySOSService.getEmergencySOSStats();
    
    res.json({
      success: true,
      debug: true,
      emergencySOS: activeEmergencySOS,
      stats: stats,
      count: activeEmergencySOS.length
    });
  } catch (error) {
    console.error('Error in emergency SOS debug endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Debug error',
      error: error.message
    });
  }
});

/**
 * GET /debug/otp/:phoneNumber
 * Debug endpoint to check OTP storage (REMOVE IN PRODUCTION)
 */
router.get('/debug/otp/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const normalizedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    const allOTPs = await otpService.getAllOTPsForPhone(normalizedPhone);
    const currentOTP = await otpService.getOTP(normalizedPhone);
    
    res.json({
      success: true,
      phoneNumber: normalizedPhone,
      currentOTP: currentOTP,
      allOTPs: allOTPs,
      currentTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Debug error',
      error: error.message
    });
  }
});

module.exports = router;