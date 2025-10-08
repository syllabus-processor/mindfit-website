# DigitalOcean Deployment Guide

## Prerequisites

- DigitalOcean account
- `doctl` CLI installed and configured
- Docker installed locally for testing
- Domain DNS configured (mindfit.resonantgrid.dev → mindfitmentalhealth.com)

## Deployment Options

### Option 1: DigitalOcean App Platform (Recommended)

**Pros**: Managed service, auto-scaling, easy SSL, zero-downtime deploys  
**Cost**: ~$12-30/month depending on plan

#### Steps:

1. **Connect Repository**
   ```bash
   # Push to GitHub/GitLab first
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Create App via CLI**
   ```bash
   doctl apps create --spec deploy/digitalocean/app-spec.yaml
   ```

3. **Set Environment Variables** in DigitalOcean Dashboard:
   - `DATABASE_URL` - Managed PostgreSQL connection string
   - `SESSION_SECRET` - Generate secure random string
   - `EMRM_API_BASE_URL` - EMRM API endpoint
   - `EMRM_API_KEY` - EMRM API key (use encrypted secrets)

4. **Configure Custom Domain**
   - Add `mindfit.resonantgrid.dev` in App settings
   - Later add `mindfitmentalhealth.com`
   - SSL certificates auto-provisioned

#### Database Setup:
```bash
# Create managed PostgreSQL cluster
doctl databases create mindfit-db \
  --engine pg \
  --version 16 \
  --size db-s-1vcpu-1gb \
  --region nyc1

# Get connection string
doctl databases connection mindfit-db
```

### Option 2: Droplet + Docker (Self-Managed)

**Pros**: Full control, lower cost for small scale  
**Cost**: ~$6-12/month for basic droplet

#### Steps:

1. **Create Droplet**
   ```bash
   doctl compute droplet create mindfit-web \
     --image docker-20-04 \
     --size s-1vcpu-1gb \
     --region nyc1 \
     --ssh-keys <your-ssh-key-id>
   ```

2. **SSH into Droplet**
   ```bash
   ssh root@<droplet-ip>
   ```

3. **Clone Repository**
   ```bash
   git clone <your-repo-url> /opt/mindfit-website
   cd /opt/mindfit-website
   ```

4. **Configure Environment**
   ```bash
   # Create .env file
   cat > .env << EOF
   PGUSER=mindfit
   PGPASSWORD=$(openssl rand -base64 32)
   PGDATABASE=mindfit
   PGPORT=5432
   SESSION_SECRET=$(openssl rand -base64 32)
   EMRM_API_BASE_URL=https://emrm.mindfithealth.com/api
   EMRM_API_KEY=emrm_live_sk_...
   EOF
   ```

5. **Deploy with Docker Compose**
   ```bash
   docker-compose up -d
   ```

6. **Setup Nginx Reverse Proxy** (for SSL)
   ```bash
   # Install Nginx and Certbot
   apt update && apt install -y nginx certbot python3-certbot-nginx
   
   # Configure Nginx
   cat > /etc/nginx/sites-available/mindfit << 'EOF'
   server {
       server_name mindfit.resonantgrid.dev;
       
       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   EOF
   
   ln -s /etc/nginx/sites-available/mindfit /etc/nginx/sites-enabled/
   nginx -t && systemctl reload nginx
   
   # Get SSL certificate
   certbot --nginx -d mindfit.resonantgrid.dev
   ```

7. **Database Migrations**
   ```bash
   # Run inside app container
   docker exec mindfit-app npm run db:push
   ```

### Option 3: DigitalOcean Kubernetes (Scalable)

**Pros**: Production-grade, auto-scaling, high availability  
**Cost**: ~$30-100/month

See `deploy/kubernetes/` for manifests and setup guide.

## Environment Variables

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Secure random string (min 32 chars)

### Optional
- `EMRM_API_BASE_URL` - EMRM API endpoint
- `EMRM_API_KEY` - EMRM API key
- `NODE_ENV` - Set to `production`

### Managing Secrets
```bash
# DigitalOcean App Platform - use encrypted environment variables
doctl apps update <app-id> --spec app-spec.yaml

# Droplet - use Docker secrets or .env file with restricted permissions
chmod 600 .env
```

## Health Checks

The application exposes health check endpoints:

- `GET /` - Application health (returns 200 if running)
- Database connection verified on startup

## Monitoring & Logs

### App Platform
```bash
# View logs
doctl apps logs <app-id> --follow

# View deployments
doctl apps list-deployments <app-id>
```

### Droplet
```bash
# View application logs
docker-compose logs -f app

# View database logs
docker-compose logs -f postgres
```

## Backup Strategy

### Database Backups

**App Platform**: Automatic daily backups included with managed PostgreSQL

**Droplet**:
```bash
# Create backup script
cat > /opt/backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec mindfit-db pg_dump -U mindfit mindfit > /opt/backups/mindfit_$DATE.sql
gzip /opt/backups/mindfit_$DATE.sql
# Keep only last 7 days
find /opt/backups -name "mindfit_*.sql.gz" -mtime +7 -delete
EOF

chmod +x /opt/backup-db.sh

# Schedule with cron
crontab -e
# Add: 0 2 * * * /opt/backup-db.sh
```

## Scaling

### Horizontal Scaling (App Platform)
```bash
# Scale up
doctl apps update <app-id> --spec app-spec.yaml
# Update instance count in app-spec.yaml
```

### Vertical Scaling (Droplet)
```bash
# Resize droplet
doctl compute droplet-action resize <droplet-id> --size s-2vcpu-2gb
```

## CI/CD Integration

### GitHub Actions (Recommended)
```yaml
# .github/workflows/deploy.yml
name: Deploy to DigitalOcean

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: digitalocean/action-doctl@v2
        with:
          token: ${{ secrets.DIGITALOCEAN_TOKEN }}
      - run: doctl apps create-deployment <app-id>
```

## Troubleshooting

### App Won't Start
```bash
# Check logs
doctl apps logs <app-id>

# Verify environment variables
doctl apps spec get <app-id>
```

### Database Connection Issues
```bash
# Test connection
docker exec mindfit-app node -e "require('./dist/db').db.execute('SELECT 1')"
```

### SSL Certificate Issues
```bash
# Renew certificate
certbot renew --nginx

# Test auto-renewal
certbot renew --dry-run
```

## Cost Optimization

### Estimated Monthly Costs

**Staging (Beta)**:
- App Platform Basic: $12/month
- Managed PostgreSQL (Basic): $15/month
- **Total**: ~$27/month

**Production**:
- App Platform Pro: $30/month
- Managed PostgreSQL (Pro): $50/month  
- CDN (optional): ~$5/month
- **Total**: ~$85/month

### Cost Savings Tips
1. Use staging on Droplet ($6/month) + local PostgreSQL
2. Share database between staging/prod with separate schemas
3. Enable DigitalOcean CDN for static assets
4. Use reserved instances for predictable workloads

## Support

- DigitalOcean Docs: https://docs.digitalocean.com
- Community: https://www.digitalocean.com/community
- Status Page: https://status.digitalocean.com
