const { pool } = require('../config/database');

const createTables = async () => {
  try {
    console.log('🔨 Starting database initialization...\n');

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Users table created');

    // Create bookings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        booking_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        booking_date DATE NOT NULL,
        space_number INTEGER NOT NULL,
        vehicle_registration VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        cancelled_at TIMESTAMP,
        cancelled_by INTEGER REFERENCES users(user_id),
        cancellation_reason TEXT,
        CONSTRAINT unique_space_date UNIQUE (space_number, booking_date, cancelled_at),
        CHECK (cancelled_at IS NULL OR cancelled_at >= created_at)
      );
    `);
    console.log('✅ Bookings table created');

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_active ON bookings(booking_date) WHERE cancelled_at IS NULL;
    `);
    console.log('✅ Indexes created');

    // Create config table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS config (
        config_id SERIAL PRIMARY KEY,
        config_key VARCHAR(100) UNIQUE NOT NULL,
        config_value VARCHAR(255) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by INTEGER REFERENCES users(user_id)
      );
    `);
    console.log('✅ Config table created');

    // Insert default configuration
    await pool.query(`
      INSERT INTO config (config_key, config_value)
      VALUES 
        ('total_spaces', '50'),
        ('booking_window_hours', '24')
      ON CONFLICT (config_key) DO NOTHING;
    `);
    console.log('✅ Default configuration inserted');

    console.log('\n🎉 Database initialization completed successfully!');
    console.log('\n📝 Next step: Run "npm run seed-db" to add demo data\n');
    
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  } finally {
    await pool.end();
  }
};

createTables();