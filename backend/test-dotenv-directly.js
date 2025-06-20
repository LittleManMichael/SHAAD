console.log('=== Direct dotenv Test ===');

// Test 1: Basic dotenv functionality
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Test if dotenv is working at all
const testResult = dotenv.config({ path: '/home/shaad/ai-assistant-dashboard/.env' });
console.log('dotenv.config result:', testResult);

// Test 2: Manual file reading
console.log('\n=== Manual File Reading ===');
const envContent = fs.readFileSync('/home/shaad/ai-assistant-dashboard/.env', 'utf8');
console.log('File content length:', envContent.length);
console.log('First 200 chars:', envContent.substring(0, 200));

// Test 3: Parse manually
console.log('\n=== Manual Parsing ===');
const lines = envContent.split('\n');
lines.forEach((line, index) => {
  if (line.includes('POSTGRES_PASSWORD')) {
    console.log(`Line ${index + 1}: "${line}"`);
    console.log('Line length:', line.length);
    console.log('Includes =:', line.includes('='));
  }
});

// Test 4: Check process.env after loading
console.log('\n=== Process.env Check ===');
console.log('POSTGRES_PASSWORD in process.env:', 'POSTGRES_PASSWORD' in process.env);
console.log('POSTGRES_PASSWORD value:', process.env.POSTGRES_PASSWORD);
