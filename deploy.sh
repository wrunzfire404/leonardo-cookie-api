#!/bin/bash

# Leonardo Cookie API - VPS Deployment Script
# Run this on your VPS: bash deploy.sh

set -e

echo "========================================="
echo "  Leonardo Cookie API - VPS Deployment"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://github.com/wrunzfire404/leonardo-cookie-api.git"
INSTALL_DIR="/opt/leonardo-cookie-api"
PORT=3003

echo -e "${YELLOW}[1/8]${NC} Checking prerequisites..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker not found!${NC} Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo -e "${GREEN}Docker installed!${NC}"
else
    echo -e "${GREEN}Docker found!${NC}"
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}Installing Docker Compose...${NC}"
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}Docker Compose installed!${NC}"
else
    echo -e "${GREEN}Docker Compose found!${NC}"
fi

echo ""
echo -e "${YELLOW}[2/8]${NC} Cloning repository..."

# Clone or update repository
if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}Directory exists, pulling latest changes...${NC}"
    cd $INSTALL_DIR
    git pull
else
    echo -e "${YELLOW}Cloning repository...${NC}"
    sudo git clone $REPO_URL $INSTALL_DIR
    sudo chown -R $USER:$USER $INSTALL_DIR
    cd $INSTALL_DIR
fi

echo -e "${GREEN}Repository ready!${NC}"
echo ""

echo -e "${YELLOW}[3/8]${NC} Setting up environment..."

# Create .env file if not exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    
    # Generate random passwords
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
    ADMIN_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)
    
    cat > .env << EOF
# Production Environment
NODE_ENV=production
PORT=3000

# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=leonardo_cookie_api
DB_USER=postgres
DB_PASSWORD=$DB_PASSWORD

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# JWT
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=30d

# Leonardo Cookies
LEONARDO_COOKIES_PATH=/app/leonardo_cookies.json

# Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=$ADMIN_PASSWORD
EOF

    echo -e "${GREEN}.env file created!${NC}"
    echo ""
    echo -e "${GREEN}=== SAVE THESE CREDENTIALS ===${NC}"
    echo -e "Admin Email: ${GREEN}admin@example.com${NC}"
    echo -e "Admin Password: ${GREEN}$ADMIN_PASSWORD${NC}"
    echo -e "${YELLOW}(Save this password, it won't be shown again!)${NC}"
    echo ""
    read -p "Press Enter to continue..."
else
    echo -e "${GREEN}.env file already exists!${NC}"
fi

echo ""
echo -e "${YELLOW}[4/8]${NC} Building Docker images..."
sudo docker-compose -f docker-compose.prod.yml build

echo ""
echo -e "${YELLOW}[5/8]${NC} Starting containers..."
sudo docker-compose -f docker-compose.prod.yml up -d

echo ""
echo -e "${YELLOW}[6/8]${NC} Waiting for database to be ready..."
sleep 10

echo ""
echo -e "${YELLOW}[7/8]${NC} Running database migrations..."
sudo docker exec leonardo-api npm run migrate

echo ""
echo -e "${YELLOW}[8/8]${NC} Seeding admin user..."
sudo docker exec leonardo-api npm run seed

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo -e "API URL: ${GREEN}http://$(curl -s ifconfig.me):$PORT${NC}"
echo -e "Health Check: ${GREEN}http://$(curl -s ifconfig.me):$PORT/health${NC}"
echo -e "Web UI: ${GREEN}http://$(curl -s ifconfig.me):$PORT/ui${NC}"
echo ""
echo -e "Leonardo Accounts: ${GREEN}34${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Setup Nginx reverse proxy (optional)"
echo "2. Setup SSL with Let's Encrypt (optional)"
echo "3. Configure firewall to allow port $PORT"
echo ""
echo -e "${YELLOW}Management commands:${NC}"
echo "  View logs: sudo docker-compose -f docker-compose.prod.yml logs -f"
echo "  Restart: sudo docker-compose -f docker-compose.prod.yml restart"
echo "  Stop: sudo docker-compose -f docker-compose.prod.yml down"
echo ""
