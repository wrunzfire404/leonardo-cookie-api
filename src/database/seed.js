import pool from '../config/database.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

async function seed() {
  try {
    console.log('🌱 Seeding database...');
    
    const email = process.env.ADMIN_EMAIL || 'admin@example.com';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const passwordHash = await bcrypt.hash(password, 10);
    
    await pool.query(
      `INSERT INTO users (email, password_hash, is_admin) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (email) DO NOTHING`,
      [email, passwordHash, true]
    );
    
    console.log('✅ Admin user created:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('   ⚠️  Change password in production!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
