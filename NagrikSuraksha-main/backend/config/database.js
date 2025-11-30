const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database configuration
const DB_PATH = path.join(__dirname, '../database/emergency_response.db');

class Database {
  constructor() {
    this.db = null;
    this.init();
  }

  init() {
    // Create database directory if it doesn't exist
    const fs = require('fs');
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Initialize database connection
    this.db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
      } else {
        console.log('✅ Connected to SQLite database');
        this.createTables();
      }
    });

    // Enable foreign keys
    this.db.run('PRAGMA foreign_keys = ON');
  }

  async createTables() {
    let completedTables = 0;
    const totalTables = 6;
    
    const checkCompletion = () => {
      completedTables++;
      if (completedTables === totalTables) {
        console.log('✅ All tables created, now creating indexes and adding encryption columns...');
        setTimeout(() => {
          this.createIndexes();
          this.addEncryptionColumns();
        }, 100); // Small delay to ensure all table operations are complete
      }
    };

    // Users table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone_number TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        dob TEXT NOT NULL,
        public_key TEXT NOT NULL,
        private_key TEXT NOT NULL,
        is_verified BOOLEAN DEFAULT 0,
        latitude REAL,
        longitude REAL,
        address TEXT,
        location_updated_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
      )
    `, (err) => {
      if (err) {
        console.error('Error creating users table:', err.message);
      } else {
        console.log('✅ Users table ready');
        // Add location columns if they don't exist
        this.addLocationColumns();
        this.insertTestUsers();
      }
      checkCompletion();
    });

    // Police officers table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS police_officers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'officer', 'supervisor')),
        department TEXT NOT NULL,
        rank TEXT NOT NULL,
        badge_number TEXT UNIQUE NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
      )
    `, (err) => {
      if (err) {
        console.error('Error creating police_officers table:', err.message);
      } else {
        console.log('✅ Police officers table ready');
        this.insertDefaultPoliceOfficers();
      }
      checkCompletion();
    });

    // OTP storage table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS otp_storage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone_number TEXT NOT NULL,
        otp TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        attempts INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error creating otp_storage table:', err.message);
      } else {
        console.log('✅ OTP storage table ready');
      }
      checkCompletion();
    });

    // Complaints table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS complaints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        user_phone TEXT NOT NULL,
        user_name TEXT NOT NULL,
        category TEXT NOT NULL,
        subject TEXT NOT NULL,
        description TEXT NOT NULL,
        location TEXT,
        urgency TEXT NOT NULL DEFAULT 'medium' CHECK(urgency IN ('low', 'medium', 'high', 'critical')),
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'assigned', 'in_progress', 'resolved', 'rejected')),
        assigned_to INTEGER,
        response_notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (assigned_to) REFERENCES police_officers (id)
      )
    `, (err) => {
      if (err) {
        console.error('Error creating complaints table:', err.message);
      } else {
        console.log('✅ Complaints table ready');
      }
      checkCompletion();
    });

    // Complaint files table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS complaint_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        complaint_id INTEGER NOT NULL,
        file_name TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        file_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (complaint_id) REFERENCES complaints (id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) {
        console.error('Error creating complaint_files table:', err.message);
      } else {
        console.log('✅ Complaint files table ready');
      }
      checkCompletion();
    });

    // Emergency SOS table (active alerts) - username as primary key
    this.db.run(`
      CREATE TABLE IF NOT EXISTS emergency_sos (
        username TEXT PRIMARY KEY,
        user_phone TEXT NOT NULL,
        user_name TEXT NOT NULL,
        message TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        address TEXT,
        accuracy REAL,
        urgency TEXT NOT NULL DEFAULT 'critical' CHECK(urgency IN ('low', 'medium', 'high', 'critical')),
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'responding', 'resolved')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error creating emergency_sos table:', err.message);
      } else {
        console.log('✅ Emergency SOS table ready');
      }
      checkCompletion();
    });

    // Emergency SOS history table (resolved cases)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS emergency_sos_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        user_phone TEXT NOT NULL,
        user_name TEXT NOT NULL,
        message TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        address TEXT,
        accuracy REAL,
        urgency TEXT NOT NULL DEFAULT 'critical',
        status TEXT NOT NULL DEFAULT 'resolved',
        resolved_by TEXT,
        resolved_notes TEXT,
        sos_created_at DATETIME NOT NULL,
        resolved_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error creating emergency_sos_history table:', err.message);
      } else {
        console.log('✅ Emergency SOS history table ready');
      }
      checkCompletion();
    });
  }

  createIndexes() {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone_number)',
      'CREATE INDEX IF NOT EXISTS idx_users_created ON users (created_at)',
      'CREATE INDEX IF NOT EXISTS idx_police_username ON police_officers (username)',
      'CREATE INDEX IF NOT EXISTS idx_police_badge ON police_officers (badge_number)',
      'CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_storage (phone_number)',
      'CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_storage (expires_at)',
      'CREATE INDEX IF NOT EXISTS idx_emergency_sos_status ON emergency_sos (status)',
      'CREATE INDEX IF NOT EXISTS idx_emergency_sos_created ON emergency_sos (created_at)',
      'CREATE INDEX IF NOT EXISTS idx_emergency_sos_history_username ON emergency_sos_history (username)',
      'CREATE INDEX IF NOT EXISTS idx_emergency_sos_history_resolved ON emergency_sos_history (resolved_at)',
      'CREATE INDEX IF NOT EXISTS idx_complaints_user ON complaints (user_id)',
      'CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints (status)',
      'CREATE INDEX IF NOT EXISTS idx_complaints_created ON complaints (created_at)',
      'CREATE INDEX IF NOT EXISTS idx_complaint_files_complaint ON complaint_files (complaint_id)'
    ];

    indexes.forEach(indexSQL => {
      this.db.run(indexSQL, (err) => {
        if (err) {
          console.error('Error creating index:', err.message);
        }
      });
    });

    console.log('✅ Database indexes created');
  }

  addEncryptionColumns() {
    // Add encryption columns to complaints table
    this.db.run(`ALTER TABLE complaints ADD COLUMN encrypted_description TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error adding encrypted_description column:', err.message);
      }
    });

    this.db.run(`ALTER TABLE complaints ADD COLUMN encrypted_key TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error adding encrypted_key column:', err.message);
      }
    });

    this.db.run(`ALTER TABLE complaints ADD COLUMN encryption_iv TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error adding encryption_iv column:', err.message);
      }
    });

    // Add encryption columns to emergency_sos table
    this.db.run(`ALTER TABLE emergency_sos ADD COLUMN encrypted_message TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error adding encrypted_message column:', err.message);
      }
    });

    this.db.run(`ALTER TABLE emergency_sos ADD COLUMN message_encrypted_key TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error adding message_encrypted_key column:', err.message);
      }
    });

    this.db.run(`ALTER TABLE emergency_sos ADD COLUMN message_encryption_iv TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error adding message_encryption_iv column:', err.message);
      }
    });

    // Add encryption columns to emergency_sos_history table
    this.db.run(`ALTER TABLE emergency_sos_history ADD COLUMN encrypted_message TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error adding encrypted_message column:', err.message);
      }
    });

    this.db.run(`ALTER TABLE emergency_sos_history ADD COLUMN message_encrypted_key TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error adding message_encrypted_key column:', err.message);
      }
    });

    this.db.run(`ALTER TABLE emergency_sos_history ADD COLUMN message_encryption_iv TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error adding message_encryption_iv column:', err.message);
      }
    });

    console.log('✅ Encryption columns added to tables');
  }

  insertDefaultPoliceOfficers() {
    const defaultOfficers = [
      {
        username: 'police.admin',
        password: 'police123',
        name: 'Police Administrator',
        role: 'admin',
        department: 'Metropolitan Police',
        rank: 'Chief Officer',
        badge_number: 'PD001'
      },
      {
        username: 'officer.john',
        password: 'officer123',
        name: 'Officer John Smith',
        role: 'officer',
        department: 'Metropolitan Police',
        rank: 'Police Officer',
        badge_number: 'PD002'
      },
      {
        username: 'supervisor.mary',
        password: 'supervisor123',
        name: 'Supervisor Mary Johnson',
        role: 'supervisor',
        department: 'Metropolitan Police',
        rank: 'Police Supervisor',
        badge_number: 'PD003'
      },
      {
        username: 'BV Anish',
        password: 'ghost',
        name: 'BV Anish',
        role: 'admin',
        department: 'Metropolitan Police',
        rank: 'Chief Administrator',
        badge_number: 'PD004'
      }
    ];

    defaultOfficers.forEach(officer => {
      this.db.run(`
        INSERT OR IGNORE INTO police_officers 
        (username, password, name, role, department, rank, badge_number) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        officer.username,
        officer.password,
        officer.name,
        officer.role,
        officer.department,
        officer.rank,
        officer.badge_number
      ], (err) => {
        if (err) {
          console.error('Error inserting default police officer:', err.message);
        } else {
          console.log(`✅ Default police officer created: ${officer.name}`);
        }
      });
    });
  }

  addLocationColumns() {
    // Add location columns to existing users table if they don't exist
    const locationColumns = [
      { name: 'latitude', type: 'REAL' },
      { name: 'longitude', type: 'REAL' },
      { name: 'address', type: 'TEXT' },
      { name: 'location_updated_at', type: 'DATETIME' }
    ];

    locationColumns.forEach(column => {
      this.db.run(`ALTER TABLE users ADD COLUMN ${column.name} ${column.type}`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error(`Error adding ${column.name} column:`, err.message);
        } else if (!err) {
          console.log(`✅ Added ${column.name} column to users table`);
        }
      });
    });
  }

  insertTestUsers() {
    const crypto = require('crypto');
    
    // Generate RSA key pair for test user
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

    const testUsers = [
      {
        phone_number: '+1234567890',
        name: 'Test User',
        dob: '1990-01-01',
        public_key: publicKey,
        private_key: privateKey,
        is_verified: 1
      },
      {
        phone_number: '+9876543210',
        name: 'Demo User',
        dob: '1985-05-15',
        public_key: publicKey,
        private_key: privateKey,
        is_verified: 1
      }
    ];

    testUsers.forEach(user => {
      this.db.run(`
        INSERT OR IGNORE INTO users 
        (phone_number, name, dob, public_key, private_key, is_verified) 
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        user.phone_number,
        user.name,
        user.dob,
        user.public_key,
        user.private_key,
        user.is_verified
      ], (err) => {
        if (err) {
          console.error('Error inserting test user:', err.message);
        } else {
          console.log(`✅ Test user created: ${user.name} (${user.phone_number})`);
        }
      });
    });
  }

  // Utility methods for database operations
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('✅ Database connection closed');
          resolve();
        }
      });
    });
  }
}

// Create and export a singleton instance
const database = new Database();

module.exports = database;