# SHAAD Production Deployment Guide

## Current Status: Ready for Production Deployment

SHAAD is now fully configured with production-ready infrastructure including subdomain routing, SSL/TLS support, and comprehensive services.

## 🏗️ Architecture Overview

### Subdomain Structure
- **Frontend**: `myshaad.com` → React application
- **Backend API**: `api.myshaad.com` → Node.js/Express API  
- **Workflow Automation**: `n8n.myshaad.com` → n8n workflow engine

### Services Running
- ✅ **PostgreSQL**: Database with multiple schemas (main, n8n)
- ✅ **Redis**: Caching and session storage
- ✅ **Qdrant**: Vector database for AI features
- ✅ **n8n**: Workflow automation engine
- ✅ **Backend API**: TypeScript/Express with AI integration
- ✅ **Frontend**: React with Material-UI
- ✅ **Discord Bot**: Monitoring and integration
- ✅ **Nginx**: Reverse proxy with SSL support

## 🚀 Deployment Steps

### 1. DNS Configuration

Configure your DNS provider to point the following domains to your server's IP address:

```
A    myshaad.com          → YOUR_SERVER_IP
A    api.myshaad.com      → YOUR_SERVER_IP  
A    n8n.myshaad.com      → YOUR_SERVER_IP
```

### 2. Switch to Production Ports

Run the production switch script:

```bash
cd /home/shaad/ai-assistant-dashboard
./switch-to-production.sh
```

This will:
- Switch nginx from ports 8080/8443 to standard 80/443
- Test all subdomain configurations
- Show deployment status

### 3. SSL Certificate Setup

Once DNS is configured and domains are accessible, obtain SSL certificates:

```bash
cd /home/shaad/ai-assistant-dashboard
./ssl-setup.sh
```

Choose option 3 for full setup, which will:
- Obtain Let's Encrypt certificates for all subdomains
- Enable HTTPS redirects
- Update all environment variables to use HTTPS
- Set up automatic certificate renewal

## 🔧 Manual Configuration (if needed)

### Current Test URLs (port 8080)
```bash
# Frontend
curl -H "Host: myshaad.com" http://localhost:8080

# Backend API
curl -H "Host: api.myshaad.com" http://localhost:8080/health

# n8n
curl -H "Host: n8n.myshaad.com" http://localhost:8080/healthz
```

### Production URLs (after deployment)
- **Frontend**: https://myshaad.com
- **Backend API**: https://api.myshaad.com
- **n8n Interface**: https://n8n.myshaad.com

## 🔐 Security Configuration

### SSL/TLS Features
- ✅ Let's Encrypt certificates for all subdomains
- ✅ Automatic certificate renewal (cron job)
- ✅ HTTPS redirects from HTTP
- ✅ Security headers (HSTS, XSS protection, etc.)
- ✅ Modern TLS configuration (TLS 1.2+)

### Rate Limiting
- ✅ API endpoints: 10 requests/second
- ✅ Auth endpoints: 5 requests/minute
- ✅ Burst handling configured

### Authentication
- ✅ JWT-based authentication for API
- ✅ Basic auth for n8n (admin/n8nTh3T3chG4m310!!!)
- ✅ Encrypted password storage
- ✅ CORS configuration

## 📊 Monitoring & Health Checks

### Health Check Endpoints
```bash
# Backend health
GET https://api.myshaad.com/health

# Backend status (detailed)
GET https://api.myshaad.com/api/status

# n8n health
GET https://n8n.myshaad.com/healthz
```

### Discord Bot Monitoring
The Discord bot provides real-time monitoring of:
- ✅ System health and metrics
- ✅ Service status (PostgreSQL, Redis, Backend, nginx)
- ✅ Code changes and git commits
- ✅ Performance metrics (CPU, memory, disk)

## 🔄 Backup & Maintenance

### Database Backups
```bash
# PostgreSQL backup
docker exec shaad_postgres pg_dump -U shaad_user shaad_db > backup.sql

# n8n workflow backup
docker exec shaad_postgres pg_dump -U shaad_user -n n8n shaad_db > n8n_backup.sql
```

### SSL Certificate Renewal
Automatic renewal is configured via cron job:
```bash
# Manual renewal if needed
./renew-ssl.sh
```

### Log Monitoring
```bash
# View service logs
docker logs shaad_backend --tail 50
docker logs shaad_frontend --tail 50  
docker logs shaad_n8n --tail 50
docker logs shaad_nginx --tail 50
```

## 🛠️ Troubleshooting

### Common Issues

1. **502 Bad Gateway**: Check if backend services are running
2. **SSL Certificate Issues**: Ensure domains point to your server
3. **CORS Errors**: Verify CORS_ORIGIN in environment variables
4. **Database Connection**: Check PostgreSQL credentials

### Service Management
```bash
# Restart all services
docker compose --profile backend --profile frontend restart

# Restart specific service
docker restart shaad_backend
docker restart shaad_frontend
docker restart shaad_n8n

# View service status
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

## 📱 Access Credentials

### n8n Workflow Engine
- **URL**: https://n8n.myshaad.com
- **Username**: admin
- **Password**: n8nTh3T3chG4m310!!!

### Database Access
- **PostgreSQL**: localhost:5432
- **Database**: shaad_db
- **Username**: shaad_user
- **Password**: PTh3T3chG4m310!!!

### Default Admin Account
- **Username**: admin
- **Password**: Th3T3chG4m310!!!

## 🚦 Firewall Configuration

Ensure the following ports are open:
```bash
# HTTP/HTTPS
80/tcp   (HTTP)
443/tcp  (HTTPS)

# SSH (if needed)
22/tcp   (SSH)

# Development (optional, can be closed in production)
3000/tcp (Frontend dev)
3001/tcp (Backend dev)
5678/tcp (n8n dev)
```

## 🎯 Production Checklist

- [ ] DNS configured for all subdomains
- [ ] SSL certificates obtained and configured
- [ ] Services running on standard ports (80/443)
- [ ] Firewall configured
- [ ] Backups configured
- [ ] Monitoring alerts set up
- [ ] Environment variables secured
- [ ] Default passwords changed

## 📚 Additional Resources

- **Backend API Documentation**: Check `/api/status` endpoint
- **n8n Workflows**: See `/n8n-workflows/` directory
- **Discord Bot Setup**: See Discord bot configuration files
- **Environment Configuration**: See `.env` file

---

**SHAAD** (Self-Hosted AI Assistant Dashboard) v1.0.1 - Production Ready 🚀