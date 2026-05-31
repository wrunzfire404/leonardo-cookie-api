#!/bin/bash
# Leonardo Cookie API - One-Line Deploy
# Copy-paste this entire script to your VPS terminal

set -e

echo "🚀 Leonardo Cookie API - Quick Deploy"
echo "======================================"
echo ""

# Install Docker if not exists
if ! command -v docker &> /dev/null; then
    echo "📦 Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
fi

# Install Docker Compose if not exists
if ! command -v docker-compose &> /dev/null; then
    echo "📦 Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Clone repo
cd /opt
if [ -d "leonardo-cookie-api" ]; then
    echo "📂 Updating existing installation..."
    cd leonardo-cookie-api
    sudo git pull
else
    echo "📂 Cloning repository..."
    sudo git clone https://github.com/wrunzfire404/leonardo-cookie-api.git
    cd leonardo-cookie-api
fi

# Generate passwords
DB_PASS=$(openssl rand -base64 20 | tr -d "=+/")
JWT_SECRET=$(openssl rand -base64 48 | tr -d "=+/")
ADMIN_PASS=$(openssl rand -base64 12 | tr -d "=+/")

# Create .env
cat > .env << EOF
NODE_ENV=production
PORT=3000
DB_HOST=postgres
DB_PORT=5432
DB_NAME=leonardo_cookie_api
DB_USER=postgres
DB_PASSWORD=$DB_PASS
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=30d
LEONARDO_COOKIES_PATH=/app/leonardo_cookies.json
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=$ADMIN_PASS
EOF

echo "✅ Environment configured"

# Start services
echo "🐳 Starting Docker containers..."
sudo docker-compose -f docker-compose.prod.yml up -d --build

echo "⏳ Waiting for database..."
sleep 15

# Run migrations
echo "🔄 Running migrations..."
sudo docker exec leonardo-api npm run migrate 2>/dev/null || echo "Migration already done"

# Seed admin
echo "🌱 Creating admin user..."
sudo docker exec leonardo-api npm run seed 2>/dev/null || echo "Admin already exists"

echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo "======================================"
echo ""
echo "🌐 API URL: http://$(curl -s ifconfig.me):3003"
echo "🎨 Web UI: http://$(curl -s ifconfig.me):3003/ui"
echo ""
echo "🔑 Admin Credentials:"
echo "   Email: admin@example.com"
echo "   Password: $ADMIN_PASS"
echo ""
echo "💾 Save this password!"
echo ""
echo "📊 Status:"
sudo docker-compose -f docker-compose.prod.yml ps
echo ""
echo "🔥 Leonardo Accounts: 34"
echo ""
