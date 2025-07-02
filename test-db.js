// Simple database connectivity test
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'shaad_db',
  user: 'shaad_user',
  password: 'PTh3T3chG4m310!!!',
});

async function testDatabase() {
  try {
    console.log('🔌 Testing database connection...');
    
    // Test connection
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL');
    
    // Test query
    const result = await client.query('SELECT COUNT(*) as user_count FROM users');
    console.log('✅ Query successful:', result.rows[0]);
    
    // Test specific user
    const adminUser = await client.query('SELECT username, email, role FROM users WHERE username = $1', ['admin']);
    console.log('✅ Admin user found:', adminUser.rows[0]);
    
    client.release();
    console.log('✅ Database test completed successfully');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  } finally {
    await pool.end();
  }
}

testDatabase();