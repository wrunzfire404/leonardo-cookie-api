const bcrypt = require('bcrypt');
const pool = require('./src/config/database.js');

async function updatePassword() {
  try {
    const hash = await bcrypt.hash('reza1254', 10);
    console.log('Generated hash:', hash);
    
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING email',
      [hash, 'admin@example.com']
    );
    
    console.log('✅ Password updated for:', result.rows[0].email);
    console.log('New password: reza1254');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updatePassword();
