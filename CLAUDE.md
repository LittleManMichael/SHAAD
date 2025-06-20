# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SHAAD (AI Assistant Dashboard) is a TypeScript-based platform integrating AI assistants (Claude and OpenAI) with workflow automation capabilities via n8n. The project uses a microservices architecture with Docker Compose.

## Development Commands

### Running the Project

```bash
# Quick setup script (recommended for first-time setup)
./setup.sh

# Development mode (run components separately)
cd backend && npm run dev    # Backend on port 3001
cd frontend && npm run dev   # Frontend on port 3000

# Production mode (Docker containers)
docker-compose --profile backend --profile frontend up -d

# Core services only (PostgreSQL, Redis, Qdrant, n8n)
docker-compose up -d
```

### Frontend Development

```bash
# Install frontend dependencies
cd frontend && npm install

# Run frontend in development mode
npm run dev

# Build frontend for production
npm run build

# Preview production build
npm run preview
```

### Build and Type Checking

```bash
# Build TypeScript to JavaScript
npm run build

# Type check without emitting files
npm run type-check

# Clean build directory
npm run clean
```

### Testing and Code Quality

```bash
# Run tests
npm test

# Run ESLint
npm run lint
```

### Database Commands

```bash
# Access PostgreSQL
docker exec -it ai-assistant-dashboard-postgres-1 psql -U shaad_user -d shaad_db

# View database logs
docker-compose logs -f postgres
```

## Architecture

### Technology Stack
- **Frontend**: React 18 with TypeScript, Material-UI, Vite
- **Backend**: Node.js with Express.js and TypeScript
- **Databases**: PostgreSQL (main), Redis (cache), Qdrant (vectors)
- **AI Services**: Anthropic Claude SDK, OpenAI SDK
- **Authentication**: JWT with bcrypt password hashing
- **Real-time**: WebSocket support (planned)
- **Workflow Automation**: n8n

### Key Directories
- `/frontend/src/` - React frontend source code
  - `components/` - Reusable React components
  - `pages/` - Main page components (Login, Dashboard)
  - `contexts/` - React contexts (Auth, Snackbar)
  - `services/` - API service classes
  - `types/` - TypeScript type definitions
- `/backend/src/` - Backend source code
  - `controllers/` - Request handlers
  - `services/` - Business logic and AI integrations
  - `middleware/` - Auth, validation, error handling
  - `routes/` - API route definitions
  - `models/` - Data models
  - `types/` - TypeScript type definitions

### Database Schema
- `users` - User accounts with roles (admin/user)
- `conversations` - AI conversation threads
- `messages` - Individual messages with AI provider tracking
- `workflow_executions` - n8n workflow execution history
- `api_keys` - Encrypted API key storage
- `chat_sessions` - WebSocket session management

### Path Aliases
The project uses TypeScript path aliases prefixed with `@/`:
- `@/config` → `src/config`
- `@/controllers` → `src/controllers`
- `@/services` → `src/services`
- etc.

### Environment Variables
Copy `.env.backup` to `.env` and configure:
- Database credentials (PostgreSQL, Redis)
- API keys (ANTHROPIC_API_KEY, OPENAI_API_KEY)
- JWT_SECRET for authentication
- Service URLs and ports

### API Endpoints
- Health: `GET /health`
- Auth: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`
- Conversations: `/api/conversations` (GET, POST, PUT, DELETE)
- Messages: `/api/conversations/:id/messages` (GET, POST, DELETE)
- Status: `GET /api/status`

### Security Features
- Helmet.js for security headers
- Input validation with express-validator
- Rate limiting support
- Encrypted password and API key storage
- CORS configuration

## Common Development Tasks

### Adding a New API Endpoint
1. Create controller in `backend/src/controllers/`
2. Add route in `backend/src/routes/`
3. Add validation middleware if needed
4. Update TypeScript types in `backend/src/types/`

### Adding a New Frontend Component
1. Create component in `frontend/src/components/`
2. Add proper TypeScript interfaces
3. Use Material-UI components for consistency
4. Add proper error handling and loading states

### Working with AI Services
- Claude integration: `backend/src/services/ai/claude.service.ts`
- OpenAI integration: `backend/src/services/ai/openai.service.ts`
- AI Orchestrator: `backend/src/services/ai/orchestrator.service.ts`

### Database Operations
- Use existing models in `backend/src/models/`
- Transactions are supported via PostgreSQL
- Redis is used for caching and session management
- Vector operations via Qdrant service

### Testing Approach
- Backend: Jest with ts-jest for TypeScript support
- Frontend: Testing Library with Jest (planned)
- Mock external services (AI APIs, databases) in tests

## Frontend Architecture

### React Context Pattern
- `AuthContext`: Global authentication state
- `SnackbarContext`: Global notification system
- Each context includes custom hooks for easy consumption

### Component Structure
- **Pages**: Top-level route components (`Login`, `Dashboard`)
- **Components**: Reusable UI components with proper prop interfaces
- **Services**: API communication classes with error handling

### Material-UI Theming
- Dark theme for modern AI assistant appearance
- Consistent spacing and typography
- Responsive design for mobile and desktop

## Important Notes

- Frontend uses React 18 with TypeScript and Material-UI
- Backend handles AI orchestration with Claude as primary and OpenAI for specialized tasks
- Vector database stores conversation context for memory
- Default admin credentials: username "admin", password "Th3T3chG4m310!!!"
- All timestamps use timezone-aware format
- n8n workflows can be triggered from conversations
- WebSocket support planned for real-time chat