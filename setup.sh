#!/bin/bash

echo "🚀 SHAAD - Self-Hosted AI Assistant Dashboard Setup"
echo "=================================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.backup .env
    echo "✅ .env file created. Please edit it with your configuration."
else
    echo "✅ .env file already exists."
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed."

# Start services
echo ""
echo "Starting SHAAD services..."
echo "========================="

# Start core services
echo "1. Starting PostgreSQL, Redis, Qdrant, and n8n..."
docker-compose up -d postgres redis qdrant n8n

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check service health
echo ""
echo "Checking service status..."
docker-compose ps

# Install dependencies
echo ""
echo "2. Installing dependencies..."
echo "📦 Installing backend dependencies..."
cd backend && npm install && cd ..

echo "📦 Installing frontend dependencies..."
cd frontend && npm install && cd ..

# Build applications
echo ""
echo "3. Building applications..."
echo "🏗️  Building backend..."
cd backend && npm run build && cd ..

echo "🏗️  Building frontend..."
cd frontend && npm run build && cd ..

# Setup n8n workflows
echo ""
echo "4. Setting up n8n workflows..."
echo "Please ensure n8n is running and accessible at http://localhost:5678"
echo "You may need to run: python3 scripts/setup_n8n_workflows.py"

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 Quick Start Options:"
echo ""
echo "Development Mode:"
echo "1. Edit .env file with your API keys"
echo "2. Start backend: cd backend && npm run dev"
echo "3. Start frontend: cd frontend && npm run dev"
echo "4. Access the dashboard at http://localhost:3000"
echo ""
echo "Production Mode:"
echo "1. Edit .env file with your API keys"
echo "2. Start with Docker: docker-compose --profile backend --profile frontend up -d"
echo "3. Access the dashboard at http://localhost:3000"
echo ""
echo "Available services:"
echo "- Frontend Dashboard: http://localhost:3000"
echo "- Backend API: http://localhost:3001"
echo "- n8n Workflows: http://localhost:5678"
echo "- Health check: http://localhost:3001/health"
echo ""
echo "Default admin credentials:"
echo "- Username: admin"
echo "- Password: Th3T3chG4m310!!!"
echo "⚠️  IMPORTANT: Change the admin password after first login!"