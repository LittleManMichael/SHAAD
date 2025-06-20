const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'shaad_db',
  user: 'shaad_user',
  password: 'PTh3T3chG4m310!!!',
});

async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW(), version()');
    console.log('✅ Database connected successfully!');
    console.log('Time:', result.rows[0].now);
    console.log('Version:', result.rows[0].version);
    
    const users = await client.query('SELECT username, email, role FROM users');
    console.log('Users:', users.rows);
    
    client.release();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();