const db = require('../config/database');
const crypto = require('crypto');

class UserService {
  // Create a new user
  async createUser(userData) {
    const { phoneNumber, name, dob, publicKey, privateKey } = userData;
    
    try {
      const result = await db.run(`
        INSERT INTO users (phone_number, name, dob, public_key, private_key)
        VALUES (?, ?, ?, ?, ?)
      `, [phoneNumber, name, dob, publicKey, privateKey]);

      return {
        id: result.lastID,
        phoneNumber,
        name,
        dob,
        publicKey,
        isVerified: false,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('Phone number already registered');
      }
      throw error;
    }
  }

  // Get user by phone number
  async getUserByPhone(phoneNumber) {
    try {
      const user = await db.get(`
        SELECT id, phone_number, name, dob, public_key, 
               private_key, is_verified, latitude, longitude, 
               address, location_updated_at,
               created_at, updated_at, last_login
        FROM users 
        WHERE phone_number = ?
      `, [phoneNumber]);

      return user;
    } catch (error) {
      throw error;
    }
  }

  // Get user by ID
  async getUserById(userId) {
    try {
      const user = await db.get(`
        SELECT id, phone_number, name, dob, public_key,
               is_verified, latitude, longitude, address, 
               location_updated_at, created_at, 
               updated_at, last_login
        FROM users 
        WHERE id = ?
      `, [userId]);

      return user;
    } catch (error) {
      throw error;
    }
  }

  // Update user's last login
  async updateLastLogin(phoneNumber) {
    try {
      await db.run(`
        UPDATE users 
        SET last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE phone_number = ?
      `, [phoneNumber]);
    } catch (error) {
      throw error;
    }
  }

  // Update user
  async updateUser(userId, updates) {
    try {
      const fields = [];
      const values = [];
      
      for (const [key, value] of Object.entries(updates)) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
      
      if (fields.length === 0) {
        throw new Error('No fields to update');
      }
      
      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(userId);
      
      await db.run(`
        UPDATE users 
        SET ${fields.join(', ')}
        WHERE id = ?
      `, values);
    } catch (error) {
      throw error;
    }
  }

  // Verify user
  async verifyUser(phoneNumber) {
    try {
      await db.run(`
        UPDATE users 
        SET is_verified = 1, updated_at = CURRENT_TIMESTAMP
        WHERE phone_number = ?
      `, [phoneNumber]);
    } catch (error) {
      throw error;
    }
  }

  // Get all users (for admin)
  async getAllUsers() {
    try {
      const users = await db.all(`
        SELECT id, phone_number, name, dob, 
               is_verified, created_at, last_login
        FROM users 
        ORDER BY created_at DESC
      `);

      return users;
    } catch (error) {
      throw error;
    }
  }

  // Update user location
  async updateUserLocation(userId, locationData) {
    const { latitude, longitude, address, location_updated_at } = locationData;
    
    try {
      const result = await db.run(`
        UPDATE users 
        SET latitude = ?, longitude = ?, address = ?, 
            location_updated_at = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [latitude, longitude, address, location_updated_at, userId]);

      return result.changes > 0;
    } catch (error) {
      throw error;
    }
  }

  // Get user statistics
  async getUserStats() {
    try {
      const totalUsers = await db.get('SELECT COUNT(*) as count FROM users');
      const verifiedUsers = await db.get('SELECT COUNT(*) as count FROM users WHERE is_verified = 1');
      const recentUsers = await db.get('SELECT COUNT(*) as count FROM users WHERE created_at >= datetime("now", "-7 days")');
      
      return {
        total: totalUsers.count,
        verified: verifiedUsers.count,
        unverified: totalUsers.count - verifiedUsers.count,
        recentRegistrations: recentUsers.count
      };
    } catch (error) {
      throw error;
    }
  }

  // Generate RSA key pair for user
  generateRSAKeyPair() {
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
}

module.exports = new UserService();
