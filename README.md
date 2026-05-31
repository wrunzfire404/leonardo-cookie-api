# 🍪 Leonardo Cookie API System

Production-ready Leonardo AI API dengan **cookie-based rotating accounts**.

**Auth Method:** Cookies (bukan API keys) - **GRATIS!** ✅

## Features

- 🍪 **Cookie-Based Auth** - Rotating Leonardo cookies (7 accounts)
- 🔄 **Auto Rotating** - Round-robin account selection
- 🔑 **API Key System** - Generate & manage user API keys
- ⚡ **Rate Limiting** - Per-key rate limits dengan Redis
- 📊 **Usage Tracking** - Track setiap generation
- 🎨 **Web UI** - Simple testing interface
- 🚀 **Production Ready** - Docker, PostgreSQL, Redis

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment

```bash
cp .env.example .env
# Edit .env jika perlu
```

### 3. Verify Cookies

Pastikan `leonardo_cookies.json` ada di parent directory:
```
C:\Tools\canva leonardo\leonardo_cookies.json
```

File ini sudah ada dengan 7 accounts! ✅

### 4. Run

**With Docker:**
```bash
docker-compose up -d
npm run migrate
npm run seed
```

**Without Docker (local):**
```bash
# Start PostgreSQL & Redis dulu
npm run migrate
npm run seed
npm run dev
```

### 5. Open Web UI

```
http://localhost:3000/ui
```

**Default login:**
- Email: `admin@example.com`
- Password: `admin123`

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register

### API Keys
- `POST /api/keys` - Generate API key
- `GET /api/keys` - List keys

### Leonardo Generation (require API key)
- `POST /api/generate` - Generate image
- `GET /api/generation/:id` - Check status
- `GET /api/models` - List models
- `GET /api/test-cookies` - Test cookies (debug)

## Generate Image Example

```bash
# 1. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# 2. Generate API key
curl -X POST http://localhost:3000/api/keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Key"}'

# 3. Generate image
curl -X POST http://localhost:3000/api/generate \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "a beautiful cat",
    "model": "phoenix",
    "width": 1024,
    "height": 1024
  }'

# 4. Check status
curl http://localhost:3000/api/generation/1 \
  -H "X-API-Key: YOUR_API_KEY"
```

## Available Models

- `phoenix` - Phoenix (default, high quality)
- `leonardo-diffusion` - Leonardo Diffusion XL
- `kino-xl` - Kino XL (cinematic)
- `anime-xl` - Anime XL
- `leonardo-creative` - Leonardo Creative

## Cookie Rotating

System otomatis rotate 7 Leonardo accounts:

1. Request masuk
2. Pilih account berikutnya (round-robin)
3. Kirim request dengan cookies account tersebut
4. Kalau rate limited (429) → coba account lain
5. Kalau unauthorized (401) → coba account lain
6. Ulangi sampai berhasil

**User ga perlu tau account mana yang dipake!** ✅

## Accounts

System load dari `leonardo_cookies.json`:

```json
[
  {
    "email": "rinsuryanegara93@solgateskit.net",
    "cookies": { ... }
  },
  {
    "email": "gilang518@aeiron.xyz",
    "cookies": { ... }
  },
  ...
]
```

Total: **7 accounts** ✅

## Testing

### Via Web UI
1. Open http://localhost:3000/ui
2. Login
3. Generate API key
4. Generate image
5. Wait for result

### Via curl
See examples above

### Test Cookies
```bash
curl http://localhost:3000/api/test-cookies \
  -H "X-API-Key: YOUR_API_KEY"
```

Response:
```json
{
  "success": true,
  "account": "rinsuryanegara93@solgateskit.net",
  "user": {
    "id": "...",
    "username": "...",
    "user_details": {
      "subscriptionTokens": 8500,
      ...
    }
  }
}
```

## Environment Variables

```env
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=leonardo_cookie_api
DB_USER=postgres
DB_PASSWORD=postgres

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your_secret_key

# Leonardo Cookies
LEONARDO_COOKIES_PATH=../../leonardo_cookies.json

# Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
```

## Docker

```bash
docker-compose up -d
```

## Troubleshooting

### Cookies not working
- Check `leonardo_cookies.json` exists
- Verify cookies are not expired
- Try different account

### Rate limited
- System will auto-rotate to next account
- If all accounts rate limited, wait a few minutes

### Database connection failed
```bash
docker-compose ps postgres
docker-compose logs postgres
```

## Next Steps

1. ✅ Test via Web UI
2. ✅ Verify rotating works (check different accounts used)
3. ✅ Test all models
4. ✅ Ready to integrate with Telegram bot!

## License

MIT
