# 🚀 Deploy ke VPS - Step by Step

## Bos, jalanin command ini di VPS lu:

### 1. SSH ke VPS

```bash
ssh ubuntu@YOUR_VPS_IP
# Use your SSH key or password
```

### 2. Download & Run Deploy Script

```bash
# Download script
curl -o deploy.sh https://raw.githubusercontent.com/YOUR_USERNAME/leonardo-cookie-api/main/deploy.sh

# Make executable
chmod +x deploy.sh

# Run deployment
bash deploy.sh
```

**Script ini akan:**
- ✅ Install Docker (kalau belum ada)
- ✅ Clone repo dari GitHub (private)
- ✅ Setup environment (.env dengan password random)
- ✅ Build Docker images
- ✅ Start containers (PostgreSQL + Redis + App)
- ✅ Run migrations
- ✅ Seed admin user
- ✅ Show credentials

**Estimasi waktu: 5-10 menit**

---

## Setelah Deploy Selesai:

### Test API

```bash
# Health check
curl http://YOUR_VPS_IP:3003/health

# Should return:
# {
#   "status": "healthy",
#   "leonardo_accounts": 34,
#   ...
# }
```

### Open Web UI

Browser:
```
http://YOUR_VPS_IP:3003/ui
```

Login dengan credentials yang ditampilkan saat deploy.

---

## Setup Domain (Optional)

Kalau mau pake domain (e.g., `api.leonardoai.yourdomain.com`):

### 1. Point DNS

Di domain provider lu, tambah A record:
```
api.leonardoai  →  YOUR_VPS_IP
```

### 2. Setup Nginx

```bash
# Install Nginx
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx -y

# Create config
sudo nano /etc/nginx/sites-available/leonardo-api
```

Paste:
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
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 120s;
    }
}
```

Enable:
```bash
sudo ln -s /etc/nginx/sites-available/leonardo-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Setup SSL

```bash
sudo certbot --nginx -d api.leonardoai.yourdomain.com
```

---

## Firewall (Oracle Cloud)

**Buka port 3003 di Oracle Cloud Console:**

1. Go to: Networking → Virtual Cloud Networks
2. Click your VCN → Security Lists → Default Security List
3. Add Ingress Rule:
   - Source: `0.0.0.0/0`
   - Protocol: TCP
   - Destination Port: `3003`

**Atau via iptables:**
```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3003 -j ACCEPT
sudo netfilter-persistent save
```

---

## Management Commands

```bash
# View logs
cd /opt/leonardo-cookie-api
sudo docker-compose -f docker-compose.prod.yml logs -f

# Restart
sudo docker-compose -f docker-compose.prod.yml restart

# Stop
sudo docker-compose -f docker-compose.prod.yml down

# Update (pull latest from GitHub)
cd /opt/leonardo-cookie-api
git pull
sudo docker-compose -f docker-compose.prod.yml up -d --build
```

---

## Troubleshooting

### Port 3003 already in use

```bash
# Check what's using port 3003
sudo lsof -i :3003

# Kill process if needed
sudo kill -9 <PID>
```

### Docker permission denied

```bash
sudo usermod -aG docker $USER
# Logout & login again
```

### Can't access from browser

1. Check firewall (Oracle Cloud + iptables)
2. Check container running: `sudo docker ps`
3. Check logs: `sudo docker-compose -f docker-compose.prod.yml logs app`

---

## Summary

**What's deployed:**
- ✅ Leonardo Cookie API (34 accounts)
- ✅ PostgreSQL database
- ✅ Redis cache
- ✅ Web UI
- ✅ Auto-rotating system

**Ports:**
- 3003: API & Web UI
- 5433: PostgreSQL (internal)
- 6380: Redis (internal)

**Isolated:**
- ✅ Separate Docker network
- ✅ Won't conflict with other projects
- ✅ Own database & Redis instances

---

Bos, tinggal SSH ke VPS dan run `bash deploy.sh` aja! 🚀
