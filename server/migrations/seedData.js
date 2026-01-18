const bcrypt = require('bcrypt');
const { pool } = require('../config/database');

const seedData = async () => {
  try {
    console.log('🌱 Starting database seeding...\n');
    
    // Hash passwords (matching README documentation)
    const userPassword = await bcrypt.hash('Password123!', 10);
    const adminPassword = await bcrypt.hash('Admin123!', 10);
    
    // Generate 30 users with varied names
    const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'Emma', 'James', 'Emily', 'David', 'Sophie', 'Daniel',
                        'Olivia', 'Thomas', 'Charlotte', 'Matthew', 'Amelia', 'Andrew', 'Lucy', 'Ryan', 'Grace', 'Jack',
                        'Hannah', 'Benjamin', 'Chloe', 'Samuel', 'Ella', 'Alexander', 'Mia', 'William', 'Ava'];
    
    const lastNames = ['Smith', 'Jones', 'Williams', 'Brown', 'Taylor', 'Davies', 'Wilson', 'Evans', 'Thomas', 'Roberts',
                       'Johnson', 'Walker', 'Wright', 'Robinson', 'Thompson', 'White', 'Hughes', 'Edwards', 'Green', 'Hall',
                       'Wood', 'Harris', 'Martin', 'Jackson', 'Clarke', 'Lewis', 'Scott', 'Cooper', 'King'];
    
    console.log('👥 Creating 30 users...');
    
    // Create user insert values
    const userValues = [];
    const userParams = [];
    let paramCounter = 1;
    
    for (let i = 0; i < 29; i++) {
      const firstName = firstNames[i];
      const lastName = lastNames[i];
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@ibm.com`;
      const phone = `07700${String(900000 + i).padStart(6, '0')}`;
      
      userValues.push(`($${paramCounter}, $${paramCounter + 1}, $${paramCounter + 2}, $${paramCounter + 3}, $${paramCounter + 4})`);
      userParams.push(firstName + ' ' + lastName, email, userPassword, phone, 'user');
      paramCounter += 5;
    }
    
    // Add admin user
    userValues.push(`($${paramCounter}, $${paramCounter + 1}, $${paramCounter + 2}, $${paramCounter + 3}, $${paramCounter + 4})`);
    userParams.push('Admin User', 'admin@ibm.com', adminPassword, '07700900100', 'admin');
    
    // Insert all users
    await pool.query(`
      INSERT INTO users (name, email, password_hash, phone, role)
      VALUES ${userValues.join(', ')}
      ON CONFLICT (email) DO NOTHING;
    `, userParams);
    
    console.log('✅ 30 users created (29 regular + 1 admin)');
    console.log('   Regular users: Password123!');
    console.log('   Admin user: Admin123!');
    
    // Get user IDs for creating bookings
    const usersResult = await pool.query('SELECT user_id FROM users WHERE role = \'user\' ORDER BY user_id');
    const users = usersResult.rows;
    
    if (users.length > 0) {
      console.log('\n📅 Creating bookings from 7th Dec 2025 to 19th Jan 2026...');
      
      const bookings = [];
      const startDate = new Date('2025-12-07');
      const endDate = new Date('2026-01-19');
      
      // Vehicle registrations for variety
      const vehiclePrefixes = ['AB', 'CD', 'EF', 'GH', 'IJ', 'KL', 'MN', 'OP', 'QR', 'ST', 'UV', 'WX', 'YZ'];
      
      // Assign each user a booking frequency pattern
      // Patterns: daily (70%), frequent (50%), occasional (30%), rare (10%)
      const userPatterns = users.map(() => {
        const rand = Math.random();
        if (rand < 0.3) return 0.70;  // 30% are daily parkers
        if (rand < 0.6) return 0.50;  // 30% are frequent parkers
        if (rand < 0.85) return 0.30; // 25% are occasional parkers
        return 0.10;                   // 15% are rare parkers
      });
      
      // Generate bookings for each weekday
      let currentDate = new Date(startDate);
      let totalBookings = 0;
      
      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        
        // Only weekdays (Monday-Friday)
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          const dateStr = currentDate.toISOString().split('T')[0];
          const usedSpaces = new Set();
          
          // Each user decides if they book today based on their pattern
          users.forEach((user, index) => {
            const bookingProbability = userPatterns[index];
            
            if (Math.random() < bookingProbability) {
              // Get random space number (1-60) that hasn't been used today
              let spaceNumber;
              let attempts = 0;
              do {
                spaceNumber = Math.floor(Math.random() * 60) + 1;
                attempts++;
              } while (usedSpaces.has(spaceNumber) && attempts < 100);
              
              if (attempts < 100) {
                usedSpaces.add(spaceNumber);
                
                // Generate random vehicle registration
                const prefix = vehiclePrefixes[Math.floor(Math.random() * vehiclePrefixes.length)];
                const numbers = String(Math.floor(Math.random() * 90) + 10);
                const suffix = String.fromCharCode(65 + Math.floor(Math.random() * 26)) +
                              String.fromCharCode(65 + Math.floor(Math.random() * 26)) +
                              String.fromCharCode(65 + Math.floor(Math.random() * 26));
                const registration = `${prefix}${numbers} ${suffix}`;
                
                bookings.push({
                  userId: user.user_id,
                  date: dateStr,
                  space: spaceNumber,
                  reg: registration
                });
                totalBookings++;
              }
            }
          });
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      console.log(`   Inserting ${totalBookings} bookings...`);
      
      // Insert bookings in batches for better performance
      const batchSize = 100;
      for (let i = 0; i < bookings.length; i += batchSize) {
        const batch = bookings.slice(i, i + batchSize);
        
        for (const booking of batch) {
          await pool.query(`
            INSERT INTO bookings (user_id, booking_date, space_number, vehicle_registration)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT DO NOTHING;
          `, [booking.userId, booking.date, booking.space, booking.reg]);
        }
        
        if (i % 500 === 0 && i > 0) {
          console.log(`   Progress: ${i}/${totalBookings} bookings inserted...`);
        }
      }
      
      console.log(`✅ ${totalBookings} bookings created`);
      console.log('   Date range: 7th Dec 2025 - 19th Jan 2026');
      console.log('   Patterns: 30% daily parkers, 30% frequent, 25% occasional, 15% rare');
      console.log('   Weekdays only (Mon-Fri)');
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
