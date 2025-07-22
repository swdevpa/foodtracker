/**
 * JWT Authentication Utility
 * Best Practice: Client-side JWT generation for API authentication
 */

interface JWTHeader {
  alg: string;
  typ: string;
}

interface JWTPayload {
  app: string;
  version: string;
  bundleId: string;
  iat: number; // issued at
  exp: number; // expires at
  jti: string; // unique token ID
}

class JWTAuthService {
  private readonly SECRET_KEY = 'REPLACE_WITH_YOUR_SECURE_SECRET'; // Must match Cloudflare Worker secret
  private readonly ALGORITHM = 'HS256';
  private readonly TOKEN_VALIDITY = 24 * 60 * 60; // 24 hours in seconds

  /**
   * Generate JWT token for API authentication
   */
  async generateToken(): Promise<string> {
    const header: JWTHeader = {
      alg: this.ALGORITHM,
      typ: 'JWT'
    };

    const now = Math.floor(Date.now() / 1000);
    const payload: JWTPayload = {
      app: 'foodtracker',
      version: '1.0.0',
      bundleId: 'com.swdevpa.foodtracker',
      iat: now,
      exp: now + this.TOKEN_VALIDITY,
      jti: this.generateUniqueId()
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
    
    const signature = await this.createSignature(`${encodedHeader}.${encodedPayload}`);
    
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * Check if current token is still valid (not expired)
   */
  isTokenValid(token: string): boolean {
    try {
      const [, payloadBase64] = token.split('.');
      const payload = JSON.parse(this.base64UrlDecode(payloadBase64)) as JWTPayload;
      
      const now = Math.floor(Date.now() / 1000);
      return payload.exp > now;
    } catch {
      return false;
    }
  }

  /**
   * Get current valid token or generate new one
   */
  async getValidToken(): Promise<string> {
    // In production, you'd store this in secure storage
    const storedToken = global.__FOODTRACKER_JWT_TOKEN;
    
    if (storedToken && this.isTokenValid(storedToken)) {
      return storedToken;
    }

    const newToken = await this.generateToken();
    global.__FOODTRACKER_JWT_TOKEN = newToken;
    return newToken;
  }

  private async createSignature(data: string): Promise<string> {
    // For React Native, we use a simple HMAC-like approach
    // In production, you'd use react-native-crypto or similar
    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.SECRET_KEY);
    const dataToSign = encoder.encode(data);
    
    // Simple hash-based signature (not cryptographically secure)
    // Replace with proper HMAC-SHA256 in production
    const hashBuffer = await crypto.subtle.digest('SHA-256', 
      new Uint8Array([...keyData, ...dataToSign])
    );
    
    return this.base64UrlEncode(String.fromCharCode(...new Uint8Array(hashBuffer)));
  }

  private base64UrlEncode(str: string): string {
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  private base64UrlDecode(str: string): string {
    // Add padding
    str += '='.repeat((4 - str.length % 4) % 4);
    // Replace URL-safe characters
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    return atob(str);
  }

  private generateUniqueId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// Global token storage (in production, use encrypted storage)
declare global {
  var __FOODTRACKER_JWT_TOKEN: string | undefined;
}

export const jwtAuth = new JWTAuthService();
export default jwtAuth;