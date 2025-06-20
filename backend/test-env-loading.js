const path = require('path');
const fs = require('fs');

console.log('=== Path Resolution Test ===');
console.log('Current directory:', __dirname);
console.log('Process cwd:', process.cwd());

const testPaths = [
  '../.env',
  '../../.env',
  '../../../.env',
  '/home/shaad/ai-assistant-dashboard/.env'
];

testPaths.forEach(testPath => {
  const resolved = path.resolve(__dirname, testPath);
  const exists = fs.existsSync(resolved);
  console.log(`Path ${testPath} -> ${resolved} (exists: ${exists})`);
});

console.log('\n=== Test Environment Loading ===');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
console.log('POSTGRES_PASSWORD:', process.env.POSTGRES_PASSWORD ? 'LOADED' : 'NOT LOADED');
console.log('POSTGRES_HOST:', process.env.POSTGRES_HOST || 'NOT SET');
