const bcrypt = require('bcrypt');
const { pool } = require('../config/database');

const seedData = async () => {
  try {
    console.log('🌱 Starting database seeding...\n');
    
    // Hash passwords (matching README documentation)
    const userPassword = await bcrypt.hash('Password123!', 10);
    const adminPassword = await bcrypt.hash('Admin123!', 10);
    
    // First 5 users match README documentation
    const testUsers = [
      { name: 'John Doe', email: 'john.doe@ibm.com', phone: '07700900123' },
      { name: 'Jane Smith', email: 'jane.smith@ibm.com', phone: '07700900124' },
      { name: 'Mike Johnson', email: 'mike.johnson@ibm.com', phone: '07700900125' },
      { name: 'Sarah Williams', email: 'sarah.williams@ibm.com', phone: '07700900126' },
      { name: 'Emma Brown', email: 'emma.brown@ibm.com', phone: '07700900127' }
    ];
    
    console.log('👥 Creating 30 users (first 5 match README test accounts)...');
    
    // Insert first 5 test users
    for (const user of testUsers) {
      await pool.query(`
        INSERT INTO users (name, email, password_hash, phone, role)
        VALUES ($1, $2, $3, $4, 'user')
        ON CONFLICT (email) DO NOTHING;
      `, [user.name, user.email, userPassword, user.phone]);
    }
    
    // Generate 24 more users with varied names
    const firstNames = ['James', 'Emily', 'David', 'Sophie', 'Daniel', 'Olivia', 'Thomas', 'Charlotte', 'Matthew', 'Amelia',
                        'Andrew', 'Lucy', 'Ryan', 'Grace', 'Jack', 'Hannah', 'Benjamin', 'Chloe', 'Samuel', 'Ella',
                        'Alexander', 'Mia', 'William', 'Ava'];
    
    const lastNames = ['Davies', 'Wilson', 'Evans', 'Thomas', 'Roberts', 'Walker', 'Wright', 'Robinson', 'Thompson', 'White',
                       'Hughes', 'Edwards', 'Green', 'Hall', 'Wood', 'Harris', 'Martin', 'Jackson', 'Clarke', 'Lewis',
                       'Scott', 'Cooper', 'King', 'Moore'];
    
    for (let i = 0; i < 24; i++) {
      const name = `${firstNames[i]} ${lastNames[i]}`;
      const email = `${firstNames[i].toLowerCase()}.${lastNames[i].toLowerCase()}@ibm.com`;
      const phone = `07700${String(900128 + i).padStart(6, '0')}`;
      
      await pool.query(`
        INSERT INTO users (name, email, password_hash, phone, role)
        VALUES ($1, $2, $3, $4, 'user')
        ON CONFLICT (email) DO NOTHING;
      `, [name, email, userPassword, phone]);
    }
    
    // Insert admin user
    await pool.query(`
      INSERT INTO users (name, email, password_hash, phone, role)
      VALUES ('Admin User', 'admin@ibm.com', $1, '07700900100', 'admin')
      ON CONFLICT (email) DO NOTHING;
    `, [adminPassword]);
    
    console.log('✅ 30 users created (29 regular + 1 admin)');
    console.log('   Regular users: Password123!');
    console.log('   Admin user: Admin123!');
    
    // Get user IDs for creating bookings
    const usersResult = await pool.query('SELECT user_id FROM users WHERE role = \'user\' ORDER BY user_id');
    const userRecords = usersResult.rows;
    
    if (userRecords.length > 0) {
      console.log('\n📅 Creating bookings from 7th Dec 2025 to 19th Jan 2026...');
      
      const startDate = new Date('2025-12-07');
      const endDate = new Date('2026-01-19');
      
      // Vehicle registrations for variety
      const vehiclePrefixes = ['AB', 'CD', 'EF', 'GH', 'IJ', 'KL', 'MN', 'OP', 'QR', 'ST', 'UV', 'WX', 'YZ'];
      
      // Assign each user a booking frequency pattern
      const userPatterns = userRecords.map(() => {
        const rand = Math.random();
        if (rand < 0.3) return 0.70;  // 30% are daily parkers
        if (rand < 0.6) return 0.50;  // 30% are frequent parkers
        if (rand < 0.85) return 0.30; // 25% are occasional parkers
        return 0.10;                   // 15% are rare parkers
      });
      
      let totalBookings = 0;
      let currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        
        // Only weekdays (Monday-Friday)
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          const dateStr = currentDate.toISOString().split('T')[0];
          const usedSpaces = new Set();
          
          // Each user decides if they book today based on their pattern
          for (let i = 0; i < userRecords.length; i++) {
            const bookingProbability = userPatterns[i];
            
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
                
                await pool.query(`
                  INSERT INTO bookings (user_id, booking_date, space_number, vehicle_registration)
                  VALUES ($1, $2, $3, $4)
                  ON CONFLICT DO NOTHING;
                `, [userRecords[i].user_id, dateStr, spaceNumber, registration]);
                
                totalBookings++;
              }
            }
          }
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
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
