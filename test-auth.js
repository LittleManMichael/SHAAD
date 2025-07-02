// Test authentication directly
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'shaad_db',
  user: 'shaad_user',
  password: 'PTh3T3chG4m310!!!',
});

async function testAuth() {
  try {
    // Get user from database
    const result = await pool.query('SELECT username, password_hash FROM users WHERE username = $1', ['admin']);
    
    if (result.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }
    
    const user = result.rows[0];
    console.log('👤 User found:', user.username);
    console.log('🔐 Password hash:', user.password_hash);
    
    // Test password verification
    const passwords = ['password', 'Th3T3chG4m310!!!'];
    
    for (const pwd of passwords) {
      console.log(`\n🔍 Testing password: "${pwd}"`);
      const isValid = await bcrypt.compare(pwd, user.password_hash);
      console.log(`✅ Valid: ${isValid}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testAuth();