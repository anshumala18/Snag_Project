const { Pool } = require('pg');

// Database configuration for local & production (Render/Supabase/Neon)
const poolConfig = process.env.DATABASE_URL 
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false } // Required for most cloud DB providers
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'snag_detection_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

const pool = new Pool(poolConfig);

// Test connection on startup
const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL connected successfully');
    client.release();
    await createTables();
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error.message);
    process.exit(1);
  }
};

// Auto-create tables if they don't exist
const createTables = async () => {
  try {
    // Users table (Site Engineers & Contractors)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id     SERIAL PRIMARY KEY,
        name        VARCHAR(100) NOT NULL,
        email       VARCHAR(150) UNIQUE NOT NULL,
        password    VARCHAR(255) NOT NULL,
        role        VARCHAR(50) NOT NULL CHECK (role IN ('site_engineer', 'contractor')),
        company     VARCHAR(150),
        phone       VARCHAR(20),
        license_number   VARCHAR(100),
        personal_email   VARCHAR(150),
        company_email    VARCHAR(150),
        specialization   VARCHAR(100),
        consent_terms    BOOLEAN DEFAULT false,
        consent_survey   BOOLEAN DEFAULT false,
        consent_contact  BOOLEAN DEFAULT false,
        phone_verified   BOOLEAN DEFAULT false,
        profile_completed BOOLEAN DEFAULT false,
        is_active   BOOLEAN DEFAULT true,
        created_at  TIMESTAMP DEFAULT NOW(),
        updated_at  TIMESTAMP DEFAULT NOW()
      );
    `);

    // Migration for existing table
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS license_number VARCHAR(100);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS personal_email VARCHAR(150);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS company_email VARCHAR(150);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS specialization VARCHAR(100);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_terms BOOLEAN DEFAULT false;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_survey BOOLEAN DEFAULT false;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_contact BOOLEAN DEFAULT false;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT false;
    `);

    // Projects table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        project_id   SERIAL PRIMARY KEY,
        project_name VARCHAR(200) NOT NULL,
        location     VARCHAR(300),
        description  TEXT,
        engineer_id  INT REFERENCES users(user_id) ON DELETE SET NULL,
        contractor_id INT REFERENCES users(user_id) ON DELETE SET NULL,
        status       VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold')),
        created_at   TIMESTAMP DEFAULT NOW(),
        updated_at   TIMESTAMP DEFAULT NOW()
      );
    `);

    // Snags (Cracks) table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS snags (
        snag_id       SERIAL PRIMARY KEY,
        snag_code     VARCHAR(20) UNIQUE NOT NULL,
        project_id    INT REFERENCES projects(project_id) ON DELETE CASCADE,
        reported_by   INT REFERENCES users(user_id) ON DELETE SET NULL,
        location_desc VARCHAR(300) NOT NULL,
        crack_type    VARCHAR(50) CHECK (crack_type IN ('hairline', 'surface', 'structural')),
        severity      VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high')),
        description   TEXT,
        recommended_action TEXT,
        status        VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved')),
        ai_detected   BOOLEAN DEFAULT false,
        ai_confidence FLOAT,
        ai_result     JSONB,
        sent_to_contractor BOOLEAN DEFAULT false,
        sent_at       TIMESTAMP,
        assigned_to   INT REFERENCES users(user_id) ON DELETE SET NULL,
        latitude      DECIMAL(10, 8),
        longitude     DECIMAL(11, 8),
        created_at    TIMESTAMP DEFAULT NOW(),
        updated_at    TIMESTAMP DEFAULT NOW()
      );
    `);

    // Migration for existing table
    await pool.query(`
      ALTER TABLE snags ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
      ALTER TABLE snags ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
    `);

    // Images table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS images (
        image_id    SERIAL PRIMARY KEY,
        snag_id     INT REFERENCES snags(snag_id) ON DELETE CASCADE,
        image_url   VARCHAR(500) NOT NULL,
        file_name   VARCHAR(200),
        file_size   INT,
        uploaded_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Reports table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reports (
        report_id    SERIAL PRIMARY KEY,
        snag_id      INT REFERENCES snags(snag_id) ON DELETE CASCADE,
        report_data  JSONB,
        sent_to      INT REFERENCES users(user_id) ON DELETE SET NULL,
        sent_at      TIMESTAMP,
        acknowledged BOOLEAN DEFAULT false,
        ack_at       TIMESTAMP,
        created_at   TIMESTAMP DEFAULT NOW()
      );
    `);

    // Status updates / activity log table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS status_updates (
        update_id   SERIAL PRIMARY KEY,
        snag_id     INT REFERENCES snags(snag_id) ON DELETE CASCADE,
        updated_by  INT REFERENCES users(user_id) ON DELETE SET NULL,
        old_status  VARCHAR(30),
        new_status  VARCHAR(30),
        notes       TEXT,
        updated_at  TIMESTAMP DEFAULT NOW()
      );
    `);

    // Mail logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mail_logs (
        log_id        SERIAL PRIMARY KEY,
        recipient     VARCHAR(150) NOT NULL,
        subject       VARCHAR(255) NOT NULL,
        content       TEXT,
        snag_id       INT REFERENCES snags(snag_id) ON DELETE SET NULL,
        user_id       INT REFERENCES users(user_id) ON DELETE SET NULL,
        status        VARCHAR(50) DEFAULT 'sent',
        sent_at       TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('✅ All database tables created/verified successfully');
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
  }
};

module.exports = { pool, connectDB };
