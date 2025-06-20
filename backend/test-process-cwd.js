const path = require('path');
const fs = require('fs');

console.log('=== Process.cwd() Test ===');
console.log('Process cwd:', process.cwd());
console.log('__dirname:', __dirname);

const testPath = path.join(process.cwd(), '../.env');
console.log('Resolved path:', testPath);
console.log('File exists:', fs.existsSync(testPath));

console.log('\n=== Environment Loading Test ===');
require('dotenv').config({ path: testPath });
console.log('POSTGRES_PASSWORD:', process.env.POSTGRES_PASSWORD ? 'LOADED' : 'NOT LOADED');
console.log('POSTGRES_HOST:', process.env.POSTGRES_HOST || 'NOT SET');
