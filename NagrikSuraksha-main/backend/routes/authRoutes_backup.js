const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Import database services (exported as instances)
const userService = require('../services/userService');
const policeService = require('../services/policeService');
const otpService = require('../services/otpService');
const emergencySOSService = require('../services/emergencySOSService');
const complaintService = require('../services/complaintService');

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

    // Generate RSA key pair
    console.log('Generating RSA key pair for user registration...');
    const { publicKey, privateKey } = generateRSAKeyPair();

    // Create user in database
    const userId = await userService.createUser({
      name: name.trim(),
      dob: new Date(dob).toISOString(),
      phoneNumber: normalizedPhone,
      publicKey: publicKey,
      privateKey: privateKey
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
});/**
 * POST /login
 * Validate OTP and issue JWT token for authenticated user
 */
router.post('/login', (req, res) => {
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
    const userData = userStorage.get(normalizedPhone);
    if (!userData) {
      return res.status(404).json({
        success: false,
        message: 'Phone number not registered. Please register your number first to continue.',
        action: 'register',
        hint: 'Use the registration endpoint to create your account with this phone number.'
      });
    }

    // Check if OTP exists and is not expired
    const storedOTP = otpStorage.get(normalizedPhone);
    if (!storedOTP) {
      return res.status(400).json({
        success: false,
        message: 'No OTP found. Please generate an OTP first.'
      });
    }

    // Check if OTP has expired
    if (storedOTP.expiresAt <= new Date()) {
      otpStorage.delete(normalizedPhone);
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please generate a new OTP.'
      });
    }

    // Check if maximum attempts exceeded
    if (storedOTP.attempts >= MAX_OTP_ATTEMPTS) {
      otpStorage.delete(normalizedPhone);
      return res.status(429).json({
        success: false,
        message: 'Maximum OTP attempts exceeded. Please generate a new OTP.'
      });
    }

    // Validate OTP
    if (storedOTP.otp !== otp.toString()) {
      storedOTP.attempts++;
      otpStorage.set(normalizedPhone, storedOTP);
      
      const remainingAttempts = MAX_OTP_ATTEMPTS - storedOTP.attempts;
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP',
        remainingAttempts: remainingAttempts
      });
    }

    // OTP is valid - clear it from storage
    otpStorage.delete(normalizedPhone);

    // Mark user as verified
    userData.isVerified = true;
    userData.lastLogin = new Date().toISOString();
    userStorage.set(normalizedPhone, userData);

    // Generate JWT token
    const tokenPayload = {
      userId: normalizedPhone,
      name: userData.name,
      phoneNumber: normalizedPhone,
      isVerified: true,
      publicKey: userData.publicKey
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: JWT_EXPIRY,
      issuer: 'express-auth-server',
      audience: 'client-app'
    });

    console.log(`User logged in successfully: ${userData.name} (${normalizedPhone})`);

    // Return success response with JWT token
    res.json({
      success: true,
      message: 'Login successful',
      token: token,
      user: {
        name: userData.name,
        phoneNumber: userData.phoneNumber,
        dob: userData.dob,
        publicKey: userData.publicKey,
        isVerified: userData.isVerified,
        lastLogin: userData.lastLogin
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
 * GET /verify-token
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
 * GET /user-info
 * Get user information by phone number (for debugging/admin purposes)
 */
router.get('/user-info/:phoneNumber', (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const normalizedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');

    const userData = userStorage.get(normalizedPhone);
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
        name: userData.name,
        phoneNumber: userData.phoneNumber,
        dob: userData.dob,
        publicKey: userData.publicKey,
        registeredAt: userData.registeredAt,
        isVerified: userData.isVerified,
        lastLogin: userData.lastLogin || null
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
router.get('/stats', (req, res) => {
  try {
    const now = new Date();
    const activeOTPs = Array.from(otpStorage.values()).filter(otp => otp.expiresAt > now).length;
    const totalUsers = userStorage.size;
    const verifiedUsers = Array.from(userStorage.values()).filter(user => user.isVerified).length;

    res.json({
      success: true,
      stats: {
        totalUsers: totalUsers,
        verifiedUsers: verifiedUsers,
        unverifiedUsers: totalUsers - verifiedUsers,
        activeOTPs: activeOTPs,
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
router.post('/check-registration', (req, res) => {
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
    const userData = userStorage.get(normalizedPhone);
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
router.get('/me', (req, res) => {
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
      const userData = userStorage.get(decoded.userId);
      
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
          name: userData.name,
          phoneNumber: userData.phoneNumber,
          dob: userData.dob,
          publicKey: userData.publicKey,
          isVerified: userData.isVerified,
          lastLogin: userData.lastLogin
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
 * POST /admin/login
 * Admin/Police login with username and password
 */
router.post('/admin/login', (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // Find admin user
    const adminData = adminStorage.get(username);
    if (!adminData) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Verify password (in production, use bcrypt.compare)
    if (adminData.password !== password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if admin is active
    if (!adminData.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Update last login
    adminData.lastLogin = new Date().toISOString();
    adminStorage.set(username, adminData);

    // Generate JWT token with admin role
    const token = jwt.sign(
      { 
        userId: adminData.id,
        username: adminData.username,
        role: adminData.role,
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
        id: adminData.id,
        username: adminData.username,
        name: adminData.name,
        role: adminData.role,
        department: adminData.department,
        rank: adminData.rank,
        badgeNumber: adminData.badgeNumber,
        lastLogin: adminData.lastLogin
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
router.get('/admin/me', (req, res) => {
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

      const adminData = adminStorage.get(decoded.username);
      
      if (!adminData) {
        return res.status(404).json({
          success: false,
          message: 'Admin not found'
        });
      }

      res.json({
        success: true,
        admin: {
          id: adminData.id,
          username: adminData.username,
          name: adminData.name,
          role: adminData.role,
          department: adminData.department,
          rank: adminData.rank,
          badgeNumber: adminData.badgeNumber,
          lastLogin: adminData.lastLogin
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
router.post('/admin/sos-requests', (req, res) => {
  try {
    const { userId, userName, message, location, urgency } = req.body;

    const sosId = `sos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const sosRequest = {
      id: sosId,
      userId: userId,
      userName: userName,
      message: message || 'Emergency SOS Alert',
      location: location,
      urgency: urgency || 'critical',
      timestamp: new Date().toISOString(),
      status: 'open',
      assignedTo: null,
      responseNotes: []
    };

    sosRequestsStorage.set(sosId, sosRequest);

    res.json({
      success: true,
      message: 'SOS request recorded',
      sosId: sosId
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
 * Get all SOS requests for admin dashboard
 */
router.get('/admin/sos-requests', (req, res) => {
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

      const allSosRequests = Array.from(sosRequestsStorage.values())
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      res.json({
        success: true,
        sosRequests: allSosRequests,
        total: allSosRequests.length
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
 * Store complaint from user
 */
router.post('/admin/complaints', (req, res) => {
  try {
    const { userId, userName, category, subject, description, location, urgency, files } = req.body;

    const complaintId = `complaint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const complaint = {
      id: complaintId,
      userId: userId,
      userName: userName,
      category: category,
      subject: subject,
      description: description,
      location: location,
      urgency: urgency || 'medium',
      files: files || [],
      timestamp: new Date().toISOString(),
      status: 'pending',
      assignedTo: null,
      responseNotes: []
    };

    complaintsStorage.set(complaintId, complaint);

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
 * Get all complaints for admin dashboard
 */
router.get('/admin/complaints', (req, res) => {
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

      const allComplaints = Array.from(complaintsStorage.values())
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      res.json({
        success: true,
        complaints: allComplaints,
        total: allComplaints.length
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

module.exports = router;