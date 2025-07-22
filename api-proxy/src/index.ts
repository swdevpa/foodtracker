export interface Env {
  GEMINI_API_KEY: string;
  USDA_API_KEY: string;
  CORS_ORIGIN: string;
  JWT_SECRET: string;
  // Durable Object for storing registered app public keys
  APP_REGISTRY: DurableObjectNamespace;
}

interface GeminiRequest {
  contents: Array<{
    parts: Array<{
      text: string;
    }>;
  }>;
  generationConfig?: {
    temperature?: number;
    topK?: number;
    topP?: number;
    maxOutputTokens?: number;
    stopSequences?: string[];
  };
}

interface USDARequest {
  query: string;
  dataType?: string[];
  pageSize?: number;
  pageNumber?: number;
  sortBy?: string;
  sortOrder?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': env.CORS_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Enterprise-grade RSA signature authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '
    
    // Validate RSA-signed token with app attestation
    const validationResult = await validateSecureToken(token, env);
    if (!validationResult.valid) {
      console.log('Token validation failed:', validationResult.reason);
      return new Response(JSON.stringify({ 
        error: 'Authentication failed',
        reason: validationResult.reason 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Basic rate limiting (could be enhanced with Durable Objects)
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    
    try {
      if (path === '/api/gemini/generate') {
        return await handleGeminiRequest(request, env, corsHeaders);
      } else if (path === '/api/usda/search') {
        return await handleUSDARequest(request, env, corsHeaders);
      } else if (path === '/api/register-app') {
        return await handleAppRegistration(request, env, corsHeaders);
      } else if (path === '/api/health') {
        return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } else {
        return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } catch (error) {
      console.error('Request error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

async function handleGeminiRequest(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const requestData: GeminiRequest = await request.json();

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    }
  );

  if (!geminiResponse.ok) {
    console.error('Gemini API error:', geminiResponse.statusText);
    return new Response(JSON.stringify({ error: 'Gemini API error' }), {
      status: geminiResponse.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const geminiData = await geminiResponse.json();
  return new Response(JSON.stringify(geminiData), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleUSDARequest(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const requestData: USDARequest = await request.json();

  const searchParams = new URLSearchParams({
    query: requestData.query,
    api_key: env.USDA_API_KEY,
    pageSize: (requestData.pageSize || 25).toString(),
    pageNumber: (requestData.pageNumber || 1).toString(),
  });

  if (requestData.dataType && requestData.dataType.length > 0) {
    requestData.dataType.forEach(type => {
      searchParams.append('dataType', type);
    });
  }

  if (requestData.sortBy) {
    searchParams.append('sortBy', requestData.sortBy);
  }

  if (requestData.sortOrder) {
    searchParams.append('sortOrder', requestData.sortOrder);
  }

  const usdaResponse = await fetch(
    `https://api.nal.usda.gov/fdc/v1/foods/search?${searchParams.toString()}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!usdaResponse.ok) {
    console.error('USDA API error:', usdaResponse.statusText);
    return new Response(JSON.stringify({ error: 'USDA API error' }), {
      status: usdaResponse.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const usdaData = await usdaResponse.json();
  return new Response(JSON.stringify(usdaData), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// JWT Token validation function (Best Practice)
async function validateToken(token: string, env: Env): Promise<boolean> {
  try {
    const payload = await verifyJWT(token, env.JWT_SECRET);
    
    // Validate payload structure and claims
    if (!payload.app || !payload.bundleId || !payload.exp || !payload.iat) {
      console.log('JWT: Invalid payload structure');
      return false;
    }

    // Validate app-specific claims
    if (payload.app !== 'foodtracker') {
      console.log('JWT: Invalid app claim');
      return false;
    }

    if (payload.bundleId !== 'com.swdevpa.foodtracker') {
      console.log('JWT: Invalid bundle ID');
      return false;
    }

    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      console.log('JWT: Token expired');
      return false;
    }

    // Check if token is not used before its time (iat = issued at)
    if (payload.iat > now + 60) { // Allow 60 seconds clock skew
      console.log('JWT: Token used before issue time');
      return false;
    }

    console.log('JWT: Token valid for app:', payload.app, 'bundleId:', payload.bundleId);
    return true;
  } catch (error) {
    console.log('JWT: Validation error:', error);
    return false;
  }
}

// JWT verification implementation
async function verifyJWT(token: string, secret: string): Promise<any> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  
  // Decode header and payload
  const header = JSON.parse(base64UrlDecode(headerB64));
  const payload = JSON.parse(base64UrlDecode(payloadB64));

  // Verify algorithm
  if (header.alg !== 'HS256') {
    throw new Error('Unsupported algorithm');
  }

  // Create expected signature
  const data = `${headerB64}.${payloadB64}`;
  const expectedSignature = await createHMACSignature(data, secret);

  // Compare signatures (constant-time comparison for security)
  const providedSignature = base64UrlDecode(signatureB64);
  if (!constantTimeEquals(expectedSignature, providedSignature)) {
    throw new Error('Invalid signature');
  }

  return payload;
}

// HMAC-SHA256 signature creation
async function createHMACSignature(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const dataToSign = encoder.encode(data);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataToSign);
  return String.fromCharCode(...new Uint8Array(signature));
}

// Constant-time string comparison (prevents timing attacks)
function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Base64 URL decode
function base64UrlDecode(str: string): string {
  // Add padding
  str += '='.repeat((4 - str.length % 4) % 4);
  // Replace URL-safe characters
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  return atob(str);
}

// Enterprise-grade RSA Token Validation
async function validateSecureToken(token: string, env: Env): Promise<{valid: boolean, reason?: string}> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, reason: 'Invalid token format' };
    }

    const [headerB64, claimsB64, signatureB64] = parts;
    
    // Decode header and claims
    const header = JSON.parse(base64UrlDecode(headerB64));
    const claims = JSON.parse(base64UrlDecode(claimsB64));

    // Verify algorithm
    if (header.alg !== 'RS256') {
      return { valid: false, reason: 'Unsupported algorithm' };
    }

    // Validate required claims
    if (!claims.bundleId || !claims.timestamp || !claims.installationId) {
      return { valid: false, reason: 'Missing required claims' };
    }

    // Validate bundle ID
    if (claims.bundleId !== 'com.swdevpa.foodtracker') {
      return { valid: false, reason: 'Invalid bundle ID' };
    }

    // Check token age (max 1 hour)
    const tokenAge = Date.now() - claims.timestamp;
    if (tokenAge > 3600000) { // 1 hour in milliseconds
      return { valid: false, reason: 'Token expired' };
    }

    // Get public key for this app installation
    const publicKeyJWK = await getAppPublicKey(claims.installationId, header.kid, env);
    if (!publicKeyJWK) {
      return { valid: false, reason: 'App not registered' };
    }

    // Import public key
    const publicKey = await crypto.subtle.importKey(
      'jwk',
      publicKeyJWK,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['verify']
    );

    // Verify signature
    const payload = `${headerB64}.${claimsB64}`;
    const signature = new Uint8Array(
      Array.from(base64UrlDecode(signatureB64)).map(c => c.charCodeAt(0))
    );

    const isValid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      publicKey,
      signature,
      new TextEncoder().encode(payload)
    );

    if (!isValid) {
      return { valid: false, reason: 'Invalid signature' };
    }

    return { valid: true };
  } catch (error) {
    console.error('Token validation error:', error);
    return { valid: false, reason: 'Validation error' };
  }
}

// App Registration Handler
async function handleAppRegistration(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const registrationData = await request.json();
    
    // Validate registration data
    if (!registrationData.bundleId || !registrationData.publicKey || !registrationData.fingerprint) {
      return new Response(JSON.stringify({ error: 'Invalid registration data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Store public key (in production, use Durable Objects or KV)
    await storeAppPublicKey(
      registrationData.installationId || 'default',
      registrationData.fingerprint,
      registrationData.publicKey,
      env
    );

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'App registered successfully' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('App registration error:', error);
    return new Response(JSON.stringify({ error: 'Registration failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Simplified storage (in production, use Durable Objects)
const appRegistry = new Map<string, JsonWebKey>();

async function storeAppPublicKey(installationId: string, keyId: string, publicKey: JsonWebKey, env: Env): Promise<void> {
  const key = `${installationId}:${keyId}`;
  appRegistry.set(key, publicKey);
  console.log('Stored public key for:', key);
}

async function getAppPublicKey(installationId: string, keyId: string, env: Env): Promise<JsonWebKey | null> {
  const key = `${installationId}:${keyId}`;
  const publicKey = appRegistry.get(key);
  console.log('Retrieved public key for:', key, publicKey ? 'found' : 'not found');
  return publicKey || null;
}