const database = require('../config/database');
const { encryptUserData } = require('../utils/crypto');

class EmergencySOSService {
  // Submit emergency SOS (INSERT OR REPLACE to overwrite existing)
  async submitEmergencySOS(sosData) {
    const { 
      username, 
      userPhone, 
      userName, 
      message, 
      latitude, 
      longitude, 
      address, 
      accuracy, 
      urgency 
    } = sosData;
    
    try {
      // Get user's public key for encryption (direct database query to avoid circular dependency)
      let encryptedMessage = null;
      let messageEncryptedKey = null;
      let messageEncryptionIv = null;

      try {
        const user = await database.get('SELECT public_key FROM users WHERE phone_number = ?', [userPhone]);
        
        if (user && user.public_key) {
          // Encrypt the message
          const encrypted = encryptUserData(message, user.public_key);
          encryptedMessage = encrypted.encryptedData;
          messageEncryptedKey = encrypted.encryptedKey;
          messageEncryptionIv = encrypted.iv;
        }
      } catch (encryptError) {
        console.warn('Failed to encrypt SOS message, storing in plain text:', encryptError.message);
      }

      const result = await database.run(`
        INSERT OR REPLACE INTO emergency_sos 
        (username, user_phone, user_name, message, latitude, longitude, address, accuracy, urgency,
         encrypted_message, message_encrypted_key, message_encryption_iv, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        username, userPhone, userName, message, latitude, longitude, address, accuracy, urgency || 'critical',
        encryptedMessage, messageEncryptedKey, messageEncryptionIv
      ]);

      // Get the created/updated SOS
      const emergencySOS = await this.getEmergencySOSByUsername(username);
      console.log(`🚨 Emergency SOS ${result.changes > 0 ? 'updated' : 'created'} for ${userName} (${username})`);
      
      return emergencySOS;
    } catch (error) {
      console.error('Error submitting emergency SOS:', error);
      throw error;
    }
  }

  // Get emergency SOS by username
  async getEmergencySOSByUsername(username) {
    try {
      const sos = await database.get(`
        SELECT username, user_phone as userPhone, user_name as userName,
               message, latitude, longitude, address, accuracy, urgency, status,
               encrypted_message, message_encrypted_key, message_encryption_iv,
               created_at as createdAt, updated_at as updatedAt
        FROM emergency_sos
        WHERE username = ?
      `, [username]);

      return sos;
    } catch (error) {
      console.error('Error getting emergency SOS by username:', error);
      throw error;
    }
  }

  // Get all active emergency SOS alerts
  async getAllActiveEmergencySOS() {
    try {
      const sosList = await database.all(`
        SELECT username, user_phone as userPhone, user_name as userName,
               message, latitude, longitude, address, accuracy, urgency, status,
               encrypted_message, message_encrypted_key, message_encryption_iv,
               created_at as createdAt, updated_at as updatedAt
        FROM emergency_sos
        WHERE status = 'active'
        ORDER BY updated_at DESC
      `);

      return sosList;
    } catch (error) {
      console.error('Error getting all active emergency SOS:', error);
      throw error;
    }
  }

  // Get all emergency SOS (active and responding)
  async getAllEmergencySOS() {
    try {
      const sosList = await database.all(`
        SELECT username, user_phone as userPhone, user_name as userName,
               message, latitude, longitude, address, accuracy, urgency, status,
               encrypted_message, message_encrypted_key, message_encryption_iv,
               created_at as createdAt, updated_at as updatedAt
        FROM emergency_sos
        ORDER BY updated_at DESC
      `);

      return sosList;
    } catch (error) {
      console.error('Error getting all emergency SOS:', error);
      throw error;
    }
  }

  // Update emergency SOS status
  async updateEmergencySOSStatus(username, status) {
    try {
      const result = await database.run(`
        UPDATE emergency_sos 
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE username = ?
      `, [status, username]);

      return result.changes > 0;
    } catch (error) {
      console.error('Error updating emergency SOS status:', error);
      throw error;
    }
  }

  // Move emergency SOS to history and delete from active table
  async resolveEmergencySOS(username, resolvedBy, resolvedNotes) {
    try {
      // First get the current SOS data
      const currentSOS = await this.getEmergencySOSByUsername(username);
      
      if (!currentSOS) {
        throw new Error('Emergency SOS not found');
      }

      // Insert into history table
      await database.run(`
        INSERT INTO emergency_sos_history 
        (username, user_phone, user_name, message, latitude, longitude, address, accuracy, 
         urgency, status, resolved_by, resolved_notes, sos_created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'resolved', ?, ?, ?)
      `, [
        currentSOS.username,
        currentSOS.userPhone,
        currentSOS.userName,
        currentSOS.message,
        currentSOS.latitude,
        currentSOS.longitude,
        currentSOS.address,
        currentSOS.accuracy,
        currentSOS.urgency,
        resolvedBy,
        resolvedNotes,
        currentSOS.createdAt
      ]);

      // Delete from active table
      const deleteResult = await database.run(`
        DELETE FROM emergency_sos WHERE username = ?
      `, [username]);

      console.log(`✅ Emergency SOS resolved for ${currentSOS.userName} (${username}) by ${resolvedBy}`);
      
      return deleteResult.changes > 0;
    } catch (error) {
      console.error('Error resolving emergency SOS:', error);
      throw error;
    }
  }

  // Get emergency SOS history
  async getEmergencySOSHistory(limit = 50) {
    try {
      const historyList = await database.all(`
        SELECT id, username, user_phone as userPhone, user_name as userName,
               message, latitude, longitude, address, accuracy, urgency, status,
               resolved_by as resolvedBy, resolved_notes as resolvedNotes,
               sos_created_at as sosCreatedAt, resolved_at as resolvedAt
        FROM emergency_sos_history
        ORDER BY resolved_at DESC
        LIMIT ?
      `, [limit]);

      return historyList;
    } catch (error) {
      console.error('Error getting emergency SOS history:', error);
      throw error;
    }
  }

  // Get emergency SOS statistics
  async getEmergencySOSStats() {
    try {
      const activeCount = await database.get('SELECT COUNT(*) as count FROM emergency_sos WHERE status = "active"');
      const respondingCount = await database.get('SELECT COUNT(*) as count FROM emergency_sos WHERE status = "responding"');
      const todayResolved = await database.get(`
        SELECT COUNT(*) as count FROM emergency_sos_history 
        WHERE DATE(resolved_at) = DATE('now')
      `);
      const totalResolved = await database.get('SELECT COUNT(*) as count FROM emergency_sos_history');
      
      return {
        active: activeCount.count,
        responding: respondingCount.count,
        resolvedToday: todayResolved.count,
        totalResolved: totalResolved.count
      };
    } catch (error) {
      console.error('Error getting emergency SOS stats:', error);
      throw error;
    }
  }
}

module.exports = new EmergencySOSService();