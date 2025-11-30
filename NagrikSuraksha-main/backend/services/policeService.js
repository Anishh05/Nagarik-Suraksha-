const database = require('../config/database');

class PoliceService {
  // Get police officer by username
  async getOfficerByUsername(username) {
    try {
      const officer = await database.get(`
        SELECT id, username, password, name, role, department, rank, badge_number as badgeNumber,
               is_active as isActive, created_at as createdAt, updated_at as updatedAt, 
               last_login as lastLogin
        FROM police_officers 
        WHERE username = ?
      `, [username]);

      return officer;
    } catch (error) {
      throw error;
    }
  }

  // Authenticate police officer
  async authenticatePolice(username, password) {
    try {
      const officer = await database.get(`
        SELECT id, username, password, name, role, department, rank, badge_number,
               is_active, created_at, updated_at, last_login
        FROM police_officers 
        WHERE username = ? AND password = ? AND is_active = 1
      `, [username, password]);

      return officer;
    } catch (error) {
      throw error;
    }
  }

  // Get police officer by ID
  async getOfficerById(officerId) {
    try {
      const officer = await database.get(`
        SELECT id, username, name, role, department, rank, badge_number as badgeNumber,
               is_active as isActive, created_at as createdAt, updated_at as updatedAt, 
               last_login as lastLogin
        FROM police_officers 
        WHERE id = ?
      `, [officerId]);

      return officer;
    } catch (error) {
      throw error;
    }
  }

  // Update officer's last login
  async updateLastLogin(username) {
    try {
      await database.run(`
        UPDATE police_officers 
        SET last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE username = ?
      `, [username]);
    } catch (error) {
      throw error;
    }
  }

  // Create new police officer
  async createOfficer(officerData) {
    const { username, password, name, role, department, rank, badgeNumber } = officerData;
    
    try {
      const result = await database.run(`
        INSERT INTO police_officers (username, password, name, role, department, rank, badge_number)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [username, password, name, role, department, rank, badgeNumber]);

      return {
        id: result.id,
        username,
        name,
        role,
        department,
        rank,
        badgeNumber,
        isActive: true,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('Username or badge number already exists');
      }
      throw error;
    }
  }

  // Get all officers (for admin)
  async getAllOfficers() {
    try {
      const officers = await database.all(`
        SELECT id, username, name, role, department, rank, badge_number as badgeNumber,
               is_active as isActive, created_at as createdAt, last_login as lastLogin
        FROM police_officers 
        WHERE is_active = 1
        ORDER BY created_at DESC
      `);

      return officers;
    } catch (error) {
      throw error;
    }
  }

  // Deactivate officer
  async deactivateOfficer(officerId) {
    try {
      await database.run(`
        UPDATE police_officers 
        SET is_active = 0, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [officerId]);
    } catch (error) {
      throw error;
    }
  }

  // Update police officer
  async updatePolice(officerId, updates) {
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
      values.push(officerId);
      
      await database.run(`
        UPDATE police_officers 
        SET ${fields.join(', ')}
        WHERE id = ?
      `, values);
    } catch (error) {
      throw error;
    }
  }

  // Get police officer by ID (alias for getOfficerById)
  async getPoliceById(officerId) {
    return this.getOfficerById(officerId);
  }

  // Get police statistics
  async getPoliceStats() {
    try {
      const totalOfficers = await database.get('SELECT COUNT(*) as count FROM police_officers');
      const activeOfficers = await database.get('SELECT COUNT(*) as count FROM police_officers WHERE is_active = 1');
      const recentLogins = await database.get('SELECT COUNT(*) as count FROM police_officers WHERE last_login >= datetime("now", "-7 days")');
      
      return {
        total: totalOfficers.count,
        active: activeOfficers.count,
        inactive: totalOfficers.count - activeOfficers.count,
        recentLogins: recentLogins.count
      };
    } catch (error) {
      throw error;
    }
  }

  // Activate officer
  async activateOfficer(officerId) {
    try {
      await database.run(`
        UPDATE police_officers 
        SET is_active = 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [officerId]);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new PoliceService();