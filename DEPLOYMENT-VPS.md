# Leonardo Cookie API - VPS Deployment Guide

## Prerequisites

- VPS dengan Docker installed
- Domain/subdomain (e.g., api.leonardoai.yourdomain.com)
- SSH access

## Deployment Steps

### 1. Upload Project ke VPS

```bash
# Dari local
cd "C:\Tools\canva leonardo\leonardo-cookie-api"
tar -czf leonardo-api.tar.gz .

# Upload via SCP
scp leonardo-api.tar.gz user@your-vps-ip:/opt/

# SSH ke VPS
ssh user@your-vps-ip

# Extract
cd /opt
tar -xzf leonardo-api.tar.gz -C leonardo-cookie-api
cd leonardo-cookie-api
```

### 2. Setup Environment

```bash
# Copy production env
cp .env.production .env

# Edit dengan password yang kuat
nano .env
```

**Edit:**
```env
DB_PASSWORD=your_strong_password_here
JWT_SECRET=your_random_secret_key_here
ADMIN_PASSWORD=your_admin_password
```

### 3. Deploy dengan Docker

```bash
# Build & start
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Run migrations
docker exec leonardo-api npm run migrate

# Seed admin user
docker exec leonardo-api npm run seed
```

### 4. Setup Nginx

```bash
# Install Nginx (if not installed)
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx -y

# Create config
sudo nano /etc/nginx/sites-available/leonardo-api
```

**Paste:**
```nginx
server {
    listen 80;
    server_name api.leonardoai.yourdomain.com;

    location / {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeout untuk Leonardo (bisa lama)
        proxy_read_timeout 120s;
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
    }
}
```

**Enable:**
```bash
sudo ln -s /etc/nginx/sites-available/leonardo-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Setup SSL

```bash
sudo certbot --nginx -d api.leonardoai.yourdomain.com
```

### 6. Test

```bash
# Health check
curl https://api.leonardoai.yourdomain.com/health

# Should return:
# {
#   "status": "healthy",
#   "leonardo_accounts": 34,
#   ...
# }
```

## Port Mapping

**External (Nginx) → Internal (Docker):**
- Port 80/443 (Nginx) → Port 3003 (Host) → Port 3000 (Container)
- PostgreSQL: Port 5433 (Host) → Port 5432 (Container)
- Redis: Port 6380 (Host) → Port 6379 (Container)

**Ga akan bentrok dengan project lain!** ✅

## Management Commands

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f app

# Restart
docker-compose -f docker-compose.prod.yml restart

# Stop
docker-compose -f docker-compose.prod.yml down

# Update
git pull
docker-compose -f docker-compose.prod.yml up -d --build

# Backup database
docker exec leonardo-postgres pg_dump -U postgres leonardo_cookie_api > backup.sql
```

## Firewall (Oracle Cloud)

**Buka port di Oracle Cloud Console:**
1. Networking → Virtual Cloud Networks
2. Security Lists → Default Security List
3. Add Ingress Rule:
   - Source: 0.0.0.0/0
   - Protocol: TCP
   - Destination Port: 80, 443

**Atau via iptables:**
```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

## Monitoring

```bash
# Check containers
docker ps

# Check resources
docker stats

# Check Nginx
sudo systemctl status nginx

# Check logs
sudo tail -f /var/log/nginx/access.log
```

## Troubleshooting

### Container not starting
```bash
docker-compose -f docker-compose.prod.yml logs app
```

### Database connection failed
```bash
docker exec leonardo-postgres psql -U postgres -c "SELECT 1;"
```

### Nginx 502 Bad Gateway
```bash
# Check app running
curl http://localhost:3003/health

# Check Nginx config
sudo nginx -t
```

## Security Checklist

- [ ] Change DB_PASSWORD
- [ ] Change JWT_SECRET
- [ ] Change ADMIN_PASSWORD
- [ ] Enable firewall
- [ ] Setup SSL (certbot)
- [ ] Disable root SSH login
- [ ] Setup fail2ban
- [ ] Regular backups

## Cost

**VPS Oracle (Free Tier):**
- 8 vCPU, 32GB RAM
- **Cost: FREE!** 🎉

**Domain:**
- ~$10/year

**Total: ~$1/month** 💰
