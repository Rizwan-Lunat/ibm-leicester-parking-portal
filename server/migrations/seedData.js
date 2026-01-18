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
      console.log('📅 Creating bookings from 7th Dec 2025 to 19th Jan 2026...\n');
      
      const bookings = [];
      const startDate = new Date('2025-12-07');
      const endDate = new Date('2026-01-19');
      
      // Vehicle registrations for variety
      const vehicles = ['AB12 CDE', 'FG34 HIJ', 'KL56 MNO', 'UV90 WXY', 'ZA12 BCD'];
      
      // Generate bookings for each day (weekdays only - Mon-Fri)
      let currentDate = new Date(startDate);
      let totalBookings = 0;
      
      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
        
        // Only create bookings for weekdays (Monday-Friday)
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          const dateStr = currentDate.toISOString().split('T')[0];
          
          // Random number of bookings per day (between 3-8 bookings)
          const numBookings = Math.floor(Math.random() * 6) + 3;
          const usedSpaces = new Set();
          
          for (let i = 0; i < numBookings && i < users.length; i++) {
            // Get random space number (1-60) that hasn't been used today
            let spaceNumber;
            do {
              spaceNumber = Math.floor(Math.random() * 60) + 1;
            } while (usedSpaces.has(spaceNumber));
            
            usedSpaces.add(spaceNumber);
            
            bookings.push({
              userId: users[i % users.length].user_id,
              date: dateStr,
              space: spaceNumber,
              reg: vehicles[i % vehicles.length]
            });
            totalBookings++;
          }
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      console.log(`   Inserting ${totalBookings} bookings...`);
      
      // Insert all bookings in batches
      for (const booking of bookings) {
        await pool.query(`
          INSERT INTO bookings (user_id, booking_date, space_number, vehicle_registration)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT DO NOTHING;
        `, [booking.userId, booking.date, booking.space, booking.reg]);
      }
      
      console.log(`✅ ${totalBookings} bookings created across weekdays`);
      console.log('   Date range: 7th Dec 2025 - 19th Jan 2026');
      console.log('   Pattern: Weekdays only (Mon-Fri), 3-8 bookings per day');
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
