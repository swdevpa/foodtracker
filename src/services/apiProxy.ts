/**
 * API Proxy Service - For Production Use
 * 
 * This service should be used in production to proxy API calls through your backend.
 * Never expose API keys directly in React Native apps!
 */

interface BackendConfig {
  baseUrl: string;
  apiKey?: string; // Your app's API key for your backend
}

class ApiProxyService {
  private config: BackendConfig;

  constructor(config: BackendConfig) {
    this.config = config;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Proxy for Gemini API calls
  async generateRecipes(userProfile: any, inventory: any, mealTypes: any, servings: number) {
    return this.makeRequest('/api/recipes/generate', {
      method: 'POST',
      body: JSON.stringify({
        userProfile,
        inventory,
        mealTypes,
        servings
      })
    });
  }

  // Proxy for USDA API calls  
  async searchFoods(query: string, limit: number = 25) {
    return this.makeRequest('/api/nutrition/search', {
      method: 'POST',
      body: JSON.stringify({ query, limit })
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

// Production configuration - replace with your backend URL
const PRODUCTION_CONFIG: BackendConfig = {
  baseUrl: 'https://your-backend-api.com',
  apiKey: 'your-app-api-key', // Different from Gemini/USDA keys!
};

// Development configuration - uses direct API calls
const DEVELOPMENT_CONFIG: BackendConfig = {
  baseUrl: 'http://localhost:3000', // Your local development server
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