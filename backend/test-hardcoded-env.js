require('dotenv').config({ path: '/home/shaad/ai-assistant-dashboard/.env' });

console.log('=== Hardcoded .env Test ===');
console.log('POSTGRES_HOST:', process.env.POSTGRES_HOST);
console.log('POSTGRES_DB:', process.env.POSTGRES_DB);
console.log('POSTGRES_USER:', process.env.POSTGRES_USER);
console.log('POSTGRES_PASSWORD:', process.env.POSTGRES_PASSWORD ? 'SET' : 'NOT SET');
console.log('REDIS_PASSWORD:', process.env.REDIS_PASSWORD ? 'SET' : 'NOT SET');
