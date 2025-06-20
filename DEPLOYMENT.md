# 🚀 SHAAD Deployment Guide

## Current Status ✅

Your SHAAD system is now running and ready for nginx configuration!

### Services Running:
- **Frontend**: http://localhost:3002 (React dashboard)
- **Backend**: http://localhost:3001 (Mock API with demo data)
- **PostgreSQL**: localhost:5432 (Database ready)
- **Redis**: localhost:6379 (Cache ready)
- **Qdrant**: localhost:6333 (Vector DB ready)
- **n8n**: http://localhost:5678 (Workflow automation)

## 🌐 Nginx Setup for https://myshaad.com

### Step 1: Copy Nginx Configuration

```bash
# Copy the nginx configuration
sudo cp /home/shaad/ai-assistant-dashboard/nginx/shaad.conf /etc/nginx/sites-available/shaad

# Enable the site
sudo ln -sf /etc/nginx/sites-available/shaad /etc/nginx/sites-enabled/shaad

# Remove default if it exists
sudo rm -f /etc/nginx/sites-enabled/default
```

### Step 2: Update SSL Certificate Paths

Edit `/etc/nginx/sites-available/shaad` and update these lines with your actual certificate paths:

```nginx
ssl_certificate /path/to/your/myshaad.com.crt;
ssl_certificate_key /path/to/your/myshaad.com.key;
```

### Step 3: Test and Reload Nginx

```bash
# Test nginx configuration
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx
```

## 🧪 Testing Your Setup

### 1. Access the Dashboard
- Visit: https://myshaad.com
- You should see the SHAAD login page with dark theme

### 2. Login Credentials (Demo Mode)
- **Username**: admin (or any username)
- **Password**: admin (or any password)
- The mock server accepts any credentials for testing

### 3. Test the Interface
- ✅ Login and see the dashboard
- ✅ Create a new conversation
- ✅ Send messages and get AI responses
- ✅ Navigate between conversations
- ✅ Test responsive design on mobile

## 🔄 Service Management

### View Service Status
```bash
docker compose -f docker-compose.simple.yml ps
```

### View Logs
```bash
# Backend logs
docker logs shaad_backend_simple -f

# Frontend logs  
docker logs shaad_frontend_simple -f
```

### Restart Services
```bash
cd /home/shaad/ai-assistant-dashboard
docker compose -f docker-compose.simple.yml restart
```

### Stop Services
```bash
docker compose -f docker-compose.simple.yml down
```

## 🔧 Configuration

### Environment Variables
Edit `/home/shaad/ai-assistant-dashboard/.env`:

```bash
# Frontend URL (update for production)
VITE_API_URL=https://myshaad.com/api
VITE_WS_URL=wss://myshaad.com

# Add your AI API keys when ready
ANTHROPIC_API_KEY=your_claude_api_key
OPENAI_API_KEY=your_openai_api_key
```

### Database Connection (When Ready)
To switch from mock server to real database:

1. Fix the backend TypeScript issues
2. Update docker-compose.simple.yml to use `test-server.js` instead of `mock-server.js`
3. Restart the backend service

## 🎯 Current Features (Demo Mode)

### ✅ Working Features:
- 🔐 Authentication (accepts any credentials)
- 💬 Chat interface with message history
- 📱 Responsive design (mobile/desktop)
- 🎨 Dark theme UI
- 📝 Conversation management
- 🔄 Real-time message sending
- 📊 Mock AI responses

### 🚧 Coming Next:
- 🤖 Real Claude AI integration
- 🔗 n8n workflow execution
- 💾 Database persistence
- 🧠 Vector memory system
- 🔊 Voice input/output

## 🆘 Troubleshooting

### If https://myshaad.com doesn't work:

1. **Check nginx status**: `sudo systemctl status nginx`
2. **Check nginx logs**: `sudo tail -f /var/log/nginx/error.log`
3. **Verify services are running**: `docker compose -f docker-compose.simple.yml ps`
4. **Test local access**: `curl http://localhost:3002`

### If you see connection errors:

1. **Check firewall**: Ensure ports 3001 and 3002 are accessible
2. **Check DNS**: Verify myshaad.com points to your server
3. **Check SSL**: Ensure certificate paths are correct

## 📞 Testing Instructions

1. **Open browser** → https://myshaad.com
2. **Login** with any username/password
3. **Test chat**:
   - Click "New Conversation"
   - Type: "Hello SHAAD!"
   - See the demo AI response
4. **Test features**:
   - Create multiple conversations
   - Switch between them
   - Test logout/login
   - Try on mobile device

## 🎉 Success!

If you can access https://myshaad.com and see the SHAAD interface, congratulations! Your AI assistant dashboard is running successfully.

The system is now ready for:
- Frontend testing and UI feedback
- Adding real AI integration
- Connecting workflows
- Production deployment

---

**Next Steps**: Once you confirm the frontend is working via nginx, we can integrate the real Claude AI and database functionality!