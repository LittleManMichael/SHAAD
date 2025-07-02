#!/bin/bash

echo "🔐 Step 1: Authenticating..."
AUTH_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}')

# Extract token (basic extraction without jq)
TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Authentication failed"
  echo "$AUTH_RESPONSE"
  exit 1
fi

echo "✅ Authenticated successfully"
echo "🔑 Token: ${TOKEN:0:20}..."

echo ""
echo "📝 Step 2: Creating conversation..."
CONV_RESPONSE=$(curl -s -X POST http://localhost:3001/api/conversations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title": "AI Test Conversation"}')

echo "📊 Conversation response: $CONV_RESPONSE"

# Extract conversation ID
CONV_ID=$(echo "$CONV_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$CONV_ID" ]; then
  echo "❌ Failed to create conversation"
  exit 1
fi

echo "✅ Conversation created: $CONV_ID"

echo ""
echo "🤖 Step 3: Sending message to AI..."
MESSAGE_RESPONSE=$(curl -s -X POST "http://localhost:3001/api/conversations/$CONV_ID/messages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"content": "Hello! Can you help me test the AI integration? Please respond with a simple greeting."}')

echo "📩 Message response: $MESSAGE_RESPONSE"

echo ""
echo "✅ AI Integration test completed!"