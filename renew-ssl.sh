#!/bin/bash
cd /home/shaad/ai-assistant-dashboard
docker run --rm \
    -v /home/shaad/ai-assistant-dashboard/nginx/ssl:/etc/letsencrypt \
    -v /home/shaad/ai-assistant-dashboard/nginx/certbot-webroot:/var/www/certbot \
    certbot/certbot:latest renew
docker restart shaad_nginx
