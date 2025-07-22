# FoodTracker API Proxy (Cloudflare Worker)

Dieser Cloudflare Worker fungiert als sicherer Proxy für API-Aufrufe zu Gemini AI und USDA Food Data Central.

## Setup

### 1. Dependencies installieren
```bash
cd api-proxy
npm install
```

### 2. Cloudflare Account konfigurieren
```bash
wrangler login
```

### 3. Secrets setzen
```bash
wrangler secret put GEMINI_API_KEY
wrangler secret put USDA_API_KEY
```

### 4. Worker deployen
```bash
npm run deploy
```

## API Endpoints

### Health Check
- **GET** `/api/health`
- Überprüft ob der Worker läuft

### Gemini AI Proxy
- **POST** `/api/gemini/generate`
- Body: `{ contents, generationConfig? }`
- Proxied zu Google Gemini API

### USDA Food Search Proxy  
- **POST** `/api/usda/search`
- Body: `{ query, pageSize?, dataType? }`
- Proxied zu USDA FoodData Central API

## Authentication

Alle Requests benötigen einen `Authorization: Bearer <token>` Header.

## CORS

Worker ist konfiguriert für CORS - setze `CORS_ORIGIN` in `wrangler.toml`.

## Deployment

Der Worker wird automatisch deployed wenn Änderungen gepusht werden.

## Monitoring

- Logs: `npm run tail`
- Dashboard: [Cloudflare Workers Dashboard](https://dash.cloudflare.com)

## Sicherheit

- API Keys werden als Cloudflare Secrets gespeichert
- Basic Authentication über Bearer Token
- Rate Limiting (kann erweitert werden)
- CORS-Schutz