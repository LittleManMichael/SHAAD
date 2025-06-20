const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

console.log('=== Environment Variables Test ===');
console.log('Working Directory:', process.cwd());
console.log('Env file path:', path.join(__dirname, '../../.env'));
console.log('POSTGRES_HOST:', process.env.POSTGRES_HOST);
console.log('POSTGRES_DB:', process.env.POSTGRES_DB);
console.log('POSTGRES_USER:', process.env.POSTGRES_USER);
console.log('POSTGRES_PASSWORD:', process.env.POSTGRES_PASSWORD ? 'SET (length: ' + process.env.POSTGRES_PASSWORD.length + ')' : 'NOT SET');
console.log('REDIS_PASSWORD:', process.env.REDIS_PASSWORD ? 'SET' : 'NOT SET');

// Also check if .env file exists
const fs = require('fs');
const envPath = path.join(__dirname, '../../.env');
console.log('.env file exists:', fs.existsSync(envPath));
if (fs.existsSync(envPath)) {
  console.log('.env file size:', fs.statSync(envPath).size, 'bytes');
}
