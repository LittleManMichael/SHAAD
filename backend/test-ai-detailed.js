// Detailed AI test to capture exact error
const axios = require('axios');

async function testAI() {
  try {
    console.log('🔐 Step 1: Authenticating...');
    const authResponse = await axios.post('http://localhost:3001/api/auth/login', {
      username: 'admin',
      password: 'password'
    });
    
    const token = authResponse.data.accessToken;
    console.log('✅ Authenticated successfully');
    
    console.log('\n📝 Step 2: Creating conversation...');
    const convResponse = await axios.post(
      'http://localhost:3001/api/conversations',
      { title: 'AI Debug Test' },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const conversationId = convResponse.data.data.id;
    console.log('✅ Conversation created:', conversationId);
    
    console.log('\n🤖 Step 3: Sending message to AI...');
    try {
      const messageResponse = await axios.post(
        `http://localhost:3001/api/conversations/${conversationId}/messages`,
        { content: 'Hello! Please respond with a simple greeting.' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('✅ AI Response:', messageResponse.data);
    } catch (messageError) {
      console.error('❌ Message Error:', messageError.response?.data || messageError.message);
      if (messageError.response?.data?.error) {
        console.error('📝 Error details:', messageError.response.data);
      }
    }
    
  } catch (error) {
    console.error('❌ Test Error:', error.response?.data || error.message);
  }
}

testAI();