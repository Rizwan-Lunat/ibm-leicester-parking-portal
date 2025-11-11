const bcrypt = require('bcrypt');
const { pool } = require('../config/database');

const seedData = async () => {
  try {
    console.log('🌱 Starting database seeding...\n');

    // Hash passwords
    const userPassword = await bcrypt.hash('Password123!', 10);
    const adminPassword = await bcrypt.hash('Admin123!', 10);

    // Insert demo users
    await pool.query(`
      INSERT INTO users (name, email, password_hash, phone, role)
      VALUES 
        ('John Doe', 'john.doe@ibm.com', $1, '07700900123', 'user'),
        ('Jane Smith', 'jane.smith@ibm.com', $1, '07700900124', 'user'),
        ('Mike Johnson', 'mike.johnson@ibm.com', $1, '07700900125', 'user'),
        ('Sarah Williams', 'sarah.williams@ibm.com', $1, '07700900126', 'user'),
        ('Admin User', 'admin@ibm.com', $2, '07700900100', 'admin')
      ON CONFLICT (email) DO NOTHING;
    `, [userPassword, adminPassword]);
    console.log('✅ Demo users created');
    console.log('   Standard user: john.doe@ibm.com / Password123!');
    console.log('   Admin user: admin@ibm.com / Admin123!');

    // Get user IDs for creating bookings
    const usersResult = await pool.query('SELECT user_id, email FROM users ORDER BY user_id LIMIT 4');
    const users = usersResult.rows;

    if (users.length > 0) {
      // Create sample bookings (today and next few days)
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      const dayAfter = new Date(today);
      dayAfter.setDate(dayAfter.getDate() + 2);
      const dayAfterStr = dayAfter.toISOString().split('T')[0];

      // Insert bookings with correct parameter order
      await pool.query(`
        INSERT INTO bookings (user_id, booking_date, space_number, vehicle_registration)
        VALUES 
          ($1, $2, 1, 'AB12 CDE'),
          ($3, $4, 2, 'FG34 HIJ'),
          ($5, $6, 3, 'KL56 MNO'),
          ($7, $8, 5, 'AB12 CDE'),
          ($9, $10, 10, 'PQ78 RST'),
          ($11, $12, 2, 'FG34 HIJ'),
          ($13, $14, 15, 'KL56 MNO')
        ON CONFLICT DO NOTHING;
      `, [
        users[0].user_id, todayStr,      // Booking 1: User 1, today
        users[1].user_id, todayStr,      // Booking 2: User 2, today
        users[2].user_id, todayStr,      // Booking 3: User 3, today
        users[0].user_id, tomorrowStr,   // Booking 4: User 1, tomorrow
        users[3].user_id, tomorrowStr,   // Booking 5: User 4, tomorrow
        users[1].user_id, dayAfterStr,   // Booking 6: User 2, day after
        users[2].user_id, dayAfterStr    // Booking 7: User 3, day after
      ]);
      console.log('✅ Sample bookings created');
      console.log(`   - ${todayStr}: 3 bookings`);
      console.log(`   - ${tomorrowStr}: 2 bookings`);
      console.log(`   - ${dayAfterStr}: 2 bookings`);
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