const path = require('path');

console.log('Current working directory:', process.cwd());
console.log('__dirname would be:', __dirname);
console.log('Resolved path with ../:', path.resolve(__dirname, '../.env'));
console.log('Resolved path with ../../:', path.resolve(__dirname, '../../.env'));

const fs = require('fs');
console.log('File exists at ../:', fs.existsSync(path.resolve(__dirname, '../.env')));
console.log('File exists at ../../:', fs.existsSync(path.resolve(__dirname, '../../.env')));
