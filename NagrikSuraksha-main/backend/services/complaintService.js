const database = require('../config/database');

class ComplaintService {
  // Create complaint
  async createComplaint(complaintData) {
    const { 
      userId, userPhone, userName, category, subject, description, location, urgency, files,
      encryptedDescription, encryptedKey, encryptionIv
    } = complaintData;
    
    try {
      // Insert complaint with encryption data
      const result = await database.run(`
        INSERT INTO complaints (
          user_id, user_phone, user_name, category, subject, description, location, urgency,
          encrypted_description, encrypted_key, encryption_iv
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId, userPhone, userName, category, subject, description, location, urgency || 'medium',
        encryptedDescription, encryptedKey, encryptionIv
      ]);

      const complaintId = result.id;

      // Insert files if any
      if (files && files.length > 0) {
        for (const file of files) {
          await database.run(`
            INSERT INTO complaint_files (complaint_id, file_name, file_type, file_size)
            VALUES (?, ?, ?, ?)
          `, [complaintId, file.name, file.type, file.size]);
        }
      }

      // Get the created complaint with files
      const complaint = await this.getComplaintById(complaintId);
      return complaint;
    } catch (error) {
      throw error;
    }
  }

  // Get complaint by ID
  async getComplaintById(complaintId) {
    try {
      const complaint = await database.get(`
        SELECT c.id, c.user_id as userId, c.user_phone as userPhone, c.user_name as userName,
               c.category, c.subject, c.description, c.location, c.urgency, c.status,
               c.assigned_to as assignedTo, c.response_notes as responseNotes,
               c.created_at as createdAt, c.updated_at as updatedAt, c.resolved_at as resolvedAt,
               c.encrypted_description, c.encrypted_key, c.encryption_iv,
               p.name as assignedOfficerName, p.badge_number as assignedOfficerBadge
        FROM complaints c
        LEFT JOIN police_officers p ON c.assigned_to = p.id
        WHERE c.id = ?
      `, [complaintId]);

      if (complaint) {
        // Get associated files
        const files = await database.all(`
          SELECT id, file_name as name, file_type as type, file_size as size, 
                 file_path as path, created_at as createdAt
          FROM complaint_files 
          WHERE complaint_id = ?
        `, [complaintId]);

        complaint.files = files;
      }

      return complaint;
    } catch (error) {
      throw error;
    }
  }

  // Get all complaints
  async getAllComplaints() {
    try {
      const complaints = await database.all(`
        SELECT c.id, c.user_id as userId, c.user_phone as userPhone, c.user_name as userName,
               c.category, c.subject, c.description, c.location, c.urgency, c.status,
               c.assigned_to as assignedTo, c.response_notes as responseNotes,
               c.created_at as createdAt, c.updated_at as updatedAt, c.resolved_at as resolvedAt,
               c.encrypted_description, c.encrypted_key, c.encryption_iv,
               p.name as assignedOfficerName, p.badge_number as assignedOfficerBadge,
               COUNT(cf.id) as fileCount
        FROM complaints c
        LEFT JOIN police_officers p ON c.assigned_to = p.id
        LEFT JOIN complaint_files cf ON c.id = cf.complaint_id
        GROUP BY c.id
        ORDER BY c.created_at DESC
      `);

      return complaints;
    } catch (error) {
      throw error;
    }
  }

  // Get complaints by status
  async getComplaintsByStatus(status) {
    try {
      const complaints = await database.all(`
        SELECT c.id, c.user_id as userId, c.user_phone as userPhone, c.user_name as userName,
               c.category, c.subject, c.description, c.location, c.urgency, c.status,
               c.assigned_to as assignedTo, c.response_notes as responseNotes,
               c.created_at as createdAt, c.updated_at as updatedAt,
               c.encrypted_description, c.encrypted_key, c.encryption_iv,
               p.name as assignedOfficerName, p.badge_number as assignedOfficerBadge,
               COUNT(cf.id) as fileCount
        FROM complaints c
        LEFT JOIN police_officers p ON c.assigned_to = p.id
        LEFT JOIN complaint_files cf ON c.id = cf.complaint_id
        WHERE c.status = ?
        GROUP BY c.id
        ORDER BY c.urgency DESC, c.created_at DESC
      `, [status]);

      return complaints;
    } catch (error) {
      throw error;
    }
  }

  // Get pending complaints
  async getPendingComplaints() {
    return await this.getComplaintsByStatus('pending');
  }

  // Update complaint status
  async updateComplaintStatus(complaintId, status, officerId = null, responseNotes = null) {
    try {
      let sql = `
        UPDATE complaints 
        SET status = ?, updated_at = CURRENT_TIMESTAMP
      `;
      let params = [status];

      if (officerId) {
        sql += `, assigned_to = ?`;
        params.push(officerId);
      }

      if (responseNotes) {
        sql += `, response_notes = ?`;
        params.push(responseNotes);
      }

      if (status === 'resolved' || status === 'rejected') {
        sql += `, resolved_at = CURRENT_TIMESTAMP`;
      }

      sql += ` WHERE id = ?`;
      params.push(complaintId);

      await database.run(sql, params);

      // Return updated complaint
      return await this.getComplaintById(complaintId);
    } catch (error) {
      throw error;
    }
  }

  // Assign complaint to officer
  async assignComplaintToOfficer(complaintId, officerId) {
    try {
      await database.run(`
        UPDATE complaints 
        SET assigned_to = ?, status = 'assigned', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [officerId, complaintId]);

      return await this.getComplaintById(complaintId);
    } catch (error) {
      throw error;
    }
  }

  // Get complaint statistics
  async getComplaintStatistics() {
    try {
      const stats = await database.get(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'assigned' THEN 1 END) as assigned,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as inProgress,
          COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
          COUNT(CASE WHEN DATE(created_at) = DATE('now') THEN 1 END) as today
        FROM complaints
      `);

      return stats;
    } catch (error) {
      throw error;
    }
  }

  // Get complaints by category
  async getComplaintsByCategory() {
    try {
      const categories = await database.all(`
        SELECT category, COUNT(*) as count
        FROM complaints
        GROUP BY category
        ORDER BY count DESC
      `);

      return categories;
    } catch (error) {
      throw error;
    }
  }

  // Get complaint stats (alias for getComplaintStatistics)
  async getComplaintStats() {
    return await this.getComplaintStatistics();
  }
}

module.exports = new ComplaintService();