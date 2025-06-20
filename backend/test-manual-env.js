const fs = require('fs');

console.log('=== Manual Environment Loading ===');

try {
  const envContent = fs.readFileSync('/home/shaad/ai-assistant-dashboard/.env', 'utf8');
  const lines = envContent.split('\n');
  
  lines.forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#') && line.includes('=')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=');
      process.env[key.trim()] = value.trim();
      
      if (key.trim() === 'POSTGRES_PASSWORD') {
        console.log('Manually set POSTGRES_PASSWORD:', value.trim());
      }
    }
  });
  
  console.log('Manual loading complete');
  console.log('POSTGRES_PASSWORD:', process.env.POSTGRES_PASSWORD ? 'SET' : 'NOT SET');
  console.log('POSTGRES_HOST:', process.env.POSTGRES_HOST);
  
} catch (error) {
  console.error('Manual loading failed:', error);
}
