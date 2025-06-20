# 📋 SHAAD - Self-Hosted AI Assistant Dashboard

**⚠️ Alpha Version - In Active Development**

SHAAD is an experimental self-hosted AI assistant platform currently in alpha development. This project aims to provide a comprehensive dashboard for interacting with AI models, managing conversations, and automating workflows.

## 🚧 Current Status

This project is in **early alpha** and not ready for production use. We're actively developing core features and learning along the way.

### ✅ Working Features
- Discord bot with file monitoring
- Real-time project change notifications
- Todo list management
- Basic project structure

### 🔄 In Development
- Backend API with Express.js
- Frontend dashboard with React
- AI integration (Claude/OpenAI)
- WebSocket real-time communication
- Database integration

## 🛠️ Project Structure

```
shaad/
├── frontend/              # React dashboard (in development)
├── backend/               # Node.js API server
├── discord-bot/           # Discord integration (working)
├── docs/                  # Documentation
└── scripts/               # Utility scripts
```

## 🚀 Quick Start (Development Only)

### Discord Bot Setup

The Discord bot is currently the most functional component:

```bash
cd discord-bot
npm install
cp .env.example .env  # Configure your Discord bot token
npm run build
npm start
```

### Development Environment

```bash
# Backend (mock server currently)
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

## 📋 Todo Progress

Check our comprehensive todo list in Discord using `!shaad todo` or view the project board for current development priorities.

## 🤝 Contributing

This is currently a personal learning project, but feedback and suggestions are welcome! Feel free to:
- Open issues for bugs or suggestions
- Share ideas for improvements
- Learn along with the development process

## 🛡️ Security Notice

This is alpha software with known security considerations:
- Do not use in production
- Keep API keys and tokens secure
- Review code before deployment

## 📝 License

This project is currently under development. License to be determined.

## 🙏 Acknowledgments

- Built with assistance from Claude (Anthropic)
- Inspired by the need for self-hosted AI solutions
- Learning project focused on full-stack development

---

**Note**: This README reflects the current alpha state. Documentation will be expanded as the project develops.