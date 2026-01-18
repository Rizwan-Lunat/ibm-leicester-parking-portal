const bcrypt = require('bcrypt');
const { pool } = require('../config/database');

const seedData = async () => {
  try {
    console.log('🌱 Starting database seeding...\n');
    
    // Hash passwords (matching README documentation)
    const userPassword = await bcrypt.hash('password123', 10);
    const adminPassword = await bcrypt.hash('admin123', 10);
    
    // Insert demo users
    await pool.query(`
      INSERT INTO users (name, email, password_hash, phone, role)
      VALUES 
        ('John Doe', 'john.doe@ibm.com', $1, '07700900123', 'user'),
        ('Jane Smith', 'jane.smith@ibm.com', $1, '07700900124', 'user'),
        ('Mike Johnson', 'mike.johnson@ibm.com', $1, '07700900125', 'user'),
        ('Sarah Williams', 'sarah.williams@ibm.com', $1, '07700900126', 'user'),
        ('Emma Brown', 'emma.brown@ibm.com', $1, '07700900127', 'user'),
        ('Admin User', 'admin@ibm.com', $2, '07700900100', 'admin')
      ON CONFLICT (email) DO NOTHING;
    `, [userPassword, adminPassword]);
    
    console.log('✅ Demo users created');
    console.log('   Regular users: password123');
    console.log('   Admin user: admin123');
    
    // Get user IDs for creating bookings
    const usersResult = await pool.query('SELECT user_id, email FROM users WHERE role = \'user\' ORDER BY user_id LIMIT 5');
    const users = usersResult.rows;
    
    if (users.length >= 5) {
      // Create bookings for today (Sunday 18th Jan) and tomorrow (Monday 19th Jan)
      const bookings = [
        // Sunday 18th January 2026 - Today
        { userId: users[0].user_id, date: '2026-01-18', space: 1, reg: 'AB12 CDE' },
        { userId: users[1].user_id, date: '2026-01-18', space: 2, reg: 'FG34 HIJ' },
        { userId: users[2].user_id, date: '2026-01-18', space: 3, reg: 'KL56 MNO' },
        { userId: users[3].user_id, date: '2026-01-18', space: 5, reg: 'UV90 WXY' },
        { userId: users[4].user_id, date: '2026-01-18', space: 7, reg: 'ZA12 BCD' },
        
        // Monday 19th January 2026 - Tomorrow
        { userId: users[0].user_id, date: '2026-01-19', space: 1, reg: 'AB12 CDE' },
        { userId: users[1].user_id, date: '2026-01-19', space: 4, reg: 'FG34 HIJ' },
        { userId: users[2].user_id, date: '2026-01-19', space: 6, reg: 'KL56 MNO' },
        { userId: users[3].user_id, date: '2026-01-19', space: 8, reg: 'UV90 WXY' },
        { userId: users[4].user_id, date: '2026-01-19', space: 10, reg: 'ZA12 BCD' },
      ];
      
      // Insert all bookings
      for (const booking of bookings) {
        await pool.query(`
          INSERT INTO bookings (user_id, booking_date, space_number, vehicle_registration)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT DO NOTHING;
        `, [booking.userId, booking.date, booking.space, booking.reg]);
      }
      
      console.log('✅ Sample bookings created');
      console.log('   - 2026-01-18 (Sunday - Today): 5 bookings');
      console.log('   - 2026-01-19 (Monday - Tomorrow): 5 bookings');
      console.log('   Total: 10 bookings across 2 days');
    }
    
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📝 You can now start the server with: npm run dev\n');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await pool.end();
  }
};

seedData();
