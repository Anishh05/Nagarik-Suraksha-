const database = require('../config/database');

class OTPService {
  // Store OTP
  async storeOTP(phoneNumber, otp, expiresAt) {
    try {
      // Delete any existing OTP for this phone number
      await database.run(`
        DELETE FROM otp_storage WHERE phone_number = ?
      `, [phoneNumber]);

      // Convert JavaScript Date to SQLite datetime format
      const sqliteDateTime = expiresAt.toISOString().replace('T', ' ').replace('.000Z', '');

      // Insert new OTP
      const result = await database.run(`
        INSERT INTO otp_storage (phone_number, otp, expires_at)
        VALUES (?, ?, ?)
      `, [phoneNumber, otp, sqliteDateTime]);

      return result.id;
    } catch (error) {
      throw error;
    }
  }

  // Get OTP
  async getOTP(phoneNumber) {
    try {
      const otpRecord = await database.get(`
        SELECT id, phone_number, otp, expires_at, 
               attempts, created_at
        FROM otp_storage 
        WHERE phone_number = ? AND datetime(expires_at) > datetime('now')
        ORDER BY created_at DESC 
        LIMIT 1
      `, [phoneNumber]);

      return otpRecord;
    } catch (error) {
      throw error;
    }
  }

  // Increment OTP attempts
  async incrementAttempts(phoneNumber) {
    try {
      await database.run(`
        UPDATE otp_storage 
        SET attempts = attempts + 1
        WHERE phone_number = ?
      `, [phoneNumber]);
    } catch (error) {
      throw error;
    }
  }

  // Delete OTP
  async deleteOTP(phoneNumber) {
    try {
      await database.run(`
        DELETE FROM otp_storage WHERE phone_number = ?
      `, [phoneNumber]);
    } catch (error) {
      throw error;
    }
  }

  // Clean expired OTPs
  async cleanExpiredOTPs() {
    try {
      const result = await database.run(`
        DELETE FROM otp_storage WHERE datetime(expires_at) <= datetime('now')
      `);
      
      if (result.changes > 0) {
        console.log(`🧹 Cleaned ${result.changes} expired OTPs`);
      }
    } catch (error) {
      console.error('Error cleaning expired OTPs:', error);
    }
  }

  // Debug method to get all OTPs for a phone number
  async getAllOTPsForPhone(phoneNumber) {
    try {
      const otpRecords = await database.all(`
        SELECT id, phone_number, otp, expires_at, 
               attempts, created_at
        FROM otp_storage 
        WHERE phone_number = ?
        ORDER BY created_at DESC
      `, [phoneNumber]);

      return otpRecords;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new OTPService();