const { Client, GatewayIntentBits } = require('discord.js');

console.log('🔍 Testing Discord connection...');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', (readyClient) => {
  console.log(`✅ Bot is ready! Logged in as ${readyClient.user.tag}`);
  console.log(`📊 Bot is in ${client.guilds.cache.size} servers`);
  
  // List channels in the target server
  const guild = client.guilds.cache.get('1384957075959840940');
  if (guild) {
    console.log(`🏠 Found server: ${guild.name}`);
    console.log(`📋 Available channels:`);
    guild.channels.cache.forEach(channel => {
      if (channel.isTextBased()) {
        console.log(`  - #${channel.name} (${channel.id})`);
      }
    });
    
    // Send a test message
    const generalChannel = guild.channels.cache.find(ch => 
      ch.name === 'general' && ch.isTextBased()
    );
    
    if (generalChannel) {
      generalChannel.send('🤖 SHAAD Discord Bot test connection successful!')
        .then(() => {
          console.log('✅ Test message sent!');
          process.exit(0);
        })
        .catch(err => {
          console.error('❌ Failed to send message:', err.message);
          process.exit(1);
        });
    } else {
      console.log('⚠️  No general channel found, but connection successful');
      process.exit(0);
    }
  } else {
    console.log('❌ Bot not in target server');
    process.exit(1);
  }
});

client.on('error', error => {
  console.error('❌ Discord error:', error);
  process.exit(1);
});

setTimeout(() => {
  console.log('⏰ Connection timeout after 15 seconds');
  process.exit(1);
}, 15000);

console.log('🔑 Attempting to login...');
client.login('MTM4NDk1OTE4MDgzODAxMDkxMA.GP8VQk.kkR4KYxOiOqD8f2pyjqLFjB42v_W9cCsjpYQko');