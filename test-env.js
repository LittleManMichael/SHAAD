require('dotenv').config({ path: '../../.env' });

console.log('=== Environment Variables Test ===');
console.log('POSTGRES_PASSWORD:', process.env.POSTGRES_PASSWORD ? 'SET (length: ' + process.env.POSTGRES_PASSWORD.length + ')' : 'NOT SET');
console.log('POSTGRES_USER:', process.env.POSTGRES_USER);
console.log('POSTGRES_DB:', process.env.POSTGRES_DB);
console.log('POSTGRES_HOST:', process.env.POSTGRES_HOST);
console.log('REDIS_PASSWORD:', process.env.REDIS_PASSWORD ? 'SET' : 'NOT SET');
