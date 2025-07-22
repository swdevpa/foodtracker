/**
 * API Proxy Service - Enterprise Security with RSA Authentication
 * 
 * This service uses asymmetric cryptography for maximum security.
 * Best Practice: Zero secrets in app code, RSA signature-based authentication!
 */

import { secureAuth } from '../utils/secureAuth';

interface BackendConfig {
  baseUrl: string;
  useSecureAuth: boolean;
}

class ApiProxyService {
  private config: BackendConfig;

  constructor(config: BackendConfig) {
    this.config = config;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    // Get RSA-signed token for authentication (enterprise security)
    let authHeader = {};
    if (this.config.useSecureAuth) {
      try {
        const token = await secureAuth.generateSecureToken();
        authHeader = { 'Authorization': `Bearer ${token}` };
      } catch (error) {
        console.error('Secure token generation failed:', error);
        throw new Error('Authentication failed');
      }
    }
    
    const headers = {
      'Content-Type': 'application/json',
      ...authHeader,
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token validation failed, regenerate and retry once
        if (this.config.useSecureAuth) {
          console.log('Authentication failed, regenerating token...');
          const newToken = await secureAuth.generateSecureToken();
          
          const retryResponse = await fetch(url, {
            ...options,
            headers: {
              ...headers,
              'Authorization': `Bearer ${newToken}`
            }
          });
          
          if (!retryResponse.ok) {
            throw new Error(`API Error: ${retryResponse.status} ${retryResponse.statusText}`);
          }
          
          return retryResponse.json();
        }
      }
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Proxy for Gemini API calls
  async generateWithGemini(contents: any, generationConfig?: any) {
    return this.makeRequest('/gemini/generate', {
      method: 'POST',
      body: JSON.stringify({
        contents,
        generationConfig
      })
    });
  }

  // Proxy for USDA API calls  
  async searchFoods(query: string, pageSize: number = 25, dataType?: string[]) {
    return this.makeRequest('/usda/search', {
      method: 'POST',
      body: JSON.stringify({ 
        query, 
        pageSize,
        dataType
      })
    });
  }

  async getFoodNutrition(fdcId: number) {
    return this.makeRequest(`/api/nutrition/food/${fdcId}`);
  }

  // Analytics & Usage tracking
  async logApiUsage(endpoint: string, tokens?: number, cost?: number) {
    return this.makeRequest('/api/usage/log', {
      method: 'POST',
      body: JSON.stringify({
        endpoint,
        tokens,
        cost,
        timestamp: new Date().toISOString()
      })
    });
  }
}

// For development only - use direct API calls
const isDevelopment = __DEV__;

// Production configuration - RSA authenticated Cloudflare Worker (Enterprise Security)
const PRODUCTION_CONFIG: BackendConfig = {
  baseUrl: 'https://foodtracker-api-proxy.swdev-pa.workers.dev',
  useSecureAuth: true, // Enterprise RSA signature-based authentication
};

// Development configuration - direct API calls (development only)
const DEVELOPMENT_CONFIG: BackendConfig = {
  baseUrl: 'http://localhost:3000', // Your local development server
  useSecureAuth: false, // Skip secure auth for local development
};

export const apiProxy = new ApiProxyService(
  isDevelopment ? DEVELOPMENT_CONFIG : PRODUCTION_CONFIG
);

// Example backend implementation (Node.js/Express):
/*
// server.js
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(express.json());

// Secure API keys on server
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const USDA_API_KEY = process.env.USDA_API_KEY;

app.post('/api/recipes/generate', async (req, res) => {
  try {
    const { userProfile, inventory, mealTypes, servings } = req.body;
    
    // Rate limiting per user
    const userId = req.user.id; // from auth middleware
    const canMakeRequest = await checkRateLimit(userId);
    
    if (!canMakeRequest) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }
    
    // Make API call with server-side key
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const recipes = await generateRecipesWithGemini(model, userProfile, inventory, mealTypes, servings);
    
    // Log usage for monitoring
    await logUsage(userId, 'recipe-generation', recipes.length);
    
    res.json({ recipes });
  } catch (error) {
    console.error('Recipe generation error:', error);
    res.status(500).json({ error: 'Failed to generate recipes' });
  }
});

app.listen(3000, () => {
  console.log('API Proxy server running on port 3000');
});
*/

export default apiProxy;