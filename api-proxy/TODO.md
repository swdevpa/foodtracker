# API Proxy Security Improvements

## High Priority

### Rate Limiting Implementation
- [ ] Implement rate limiting using Cloudflare KV store
- [ ] Add per-IP and per-app rate limits
- [ ] Configure appropriate rate limit thresholds

### Production Storage
- [ ] Replace in-memory Map with Durable Objects for app registry
- [ ] Implement persistent key storage with proper TTL
- [ ] Add backup/recovery mechanisms for registered apps

## Medium Priority

### Request Security
- [ ] Add request size limits to prevent large payload attacks
- [ ] Implement input sanitization for all API requests
- [ ] Add request validation middleware

### Security Headers
- [ ] Add Content Security Policy (CSP) headers
- [ ] Implement HSTS (HTTP Strict Transport Security)
- [ ] Add X-Frame-Options and X-Content-Type-Options headers
- [ ] Configure proper cache control headers

### Monitoring & Logging
- [ ] Add structured logging for security events
- [ ] Implement metrics collection for authentication failures
- [ ] Add alerting for suspicious activity patterns

## Low Priority

### Additional Features
- [ ] Add API versioning support
- [ ] Implement request/response caching where appropriate
- [ ] Add health check monitoring with detailed status
- [ ] Consider adding API key rotation mechanism

## Currently Implemented ✅

- RSA-256 signature authentication
- CORS protection with configurable origins
- App attestation with Bundle ID validation
- Token expiration (1 hour TTL)
- TypeScript interfaces for type safety
- Proper error handling without information leakage
- HTTP method validation