/**
 * API Proxy Manager Service
 * Implementation for OpenFoodFacts APIs through swdev-pa API Proxy Manager
 */

import { openfoodfactsService } from './openfoodfactsService';
import { FoodProduct } from '@/types/Food';

interface ApiProxyConfig {
  baseUrl: string;
  projectId: string;
  apiKey?: string; // Optional API key for authentication
}

interface ApiRequest {
  targetUrl: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}

// OpenFoodFacts API Types
interface OpenFoodFactsSearchResult {
  products: any[];
}

interface OpenFoodFactsProduct {
  code: string;
  product_name: Record<string, string>;
  brands: string;
  categories: string;
  nutriments: Record<string, any>;
  allergens: string;
  additives: string;
  image_url: string;
  url: string;
}

// OpenFoodFacts is the sole API implementation in this service

type ApiProxyError = {
  status: number;
  statusText: string;
  url: string;
  body: string;
};

class ApiProxyManagerService {
  private config: ApiProxyConfig;

  constructor(config: ApiProxyConfig) {
    this.config = config;
  }

private buildProxyUrl(targetUrl: string): string {
    const encodedUrl = encodeURIComponent(targetUrl);
    return `${this.config.baseUrl}/proxy/${this.config.projectId}?target_url=${encodedUrl}`;
  }

  /**
   * Get API key from configuration
   */
  private getApiKeyHeader(): Record<string, string> {
    return this.config.apiKey ? { 'x-api-key': this.config.apiKey } : {};
  }

  private async makeRequest<T = any>(request: ApiRequest): Promise<T> {
    const proxyUrl = this.buildProxyUrl(request.targetUrl);
    
    try {
      const response = await fetch(proxyUrl, {
        method: request.method || 'GET',
headers: {
          'Content-Type': 'application/json',
          'expo-platform': 'ios', // Required by API Proxy Manager
          ...this.getApiKeyHeader(), // Add API key if configured
          ...request.headers,
        },
        body: request.body ? JSON.stringify(request.body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        const error: ApiProxyError = {
          status: response.status,
          statusText: response.statusText,
          url: proxyUrl,
          body: errorText
        };
        console.error(`API Proxy Error Details:`, error);
        throw new Error(`API Proxy Error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      if (error instanceof Error) {
        console.error('API Proxy Request Failed:', {
          url: proxyUrl,
          method: request.method || 'GET',
          error: error.message
        });
        throw error;
      }
      throw new Error('Unknown API Proxy error occurred');
    }
  }

  // === OPENFOODFACTS API METHODS ===
  
  /**
   * Search for foods in the OpenFoodFacts database
   */
  async searchFoods(query: string): Promise<FoodProduct[]> {
    const products = await openfoodfactsService.searchProducts(query);
    return products;
  }

  /**
   * Get detailed food information by Food ID
   */
  async getFoodDetails(foodId: string): Promise<FoodProduct> {
    const product = await openfoodfactsService.getProductById(foodId);
    return product || this.getDefaultFoodProduct();
  }

  /**
   * Get autocomplete suggestions for food search
   */
  async getFoodAutoComplete(expression: string): Promise<string[]> {
    const suggestions = await openfoodfactsService.getAutocompleteSuggestions(expression);
    return suggestions.suggestions;
  }

  /**
   * Get food categories/food groups from OpenFoodFacts
   */
  async getFoodCategories(): Promise<string[]> {
    const categories = await openfoodfactsService.getCategories();
    return categories.categories;
  }

  /**
   * Search foods by barcode using only OpenFoodFacts
   */
  async searchFoodsByBarcode(barcode: string): Promise<FoodProduct | null> {
    const openfoodfactsResult = await openfoodfactsService.getProductByBarcode(barcode);
    if (!openfoodfactsResult) {
      console.warn(`Product not found: ${barcode}`);
      return null;
    }
    return openfoodfactsResult;
  }

  /**
   * Get current configuration
   */
  getConfig(): ApiProxyConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ApiProxyConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
  
  /**
   * Returns a default FoodProduct object with empty values
   */
  private getDefaultFoodProduct(): FoodProduct {
    return {
      id: '',
      product_name: '',
      barcode: '',
      nutriments: {
        calories: 0,
        carbohydrates: 0,
        proteins: 0,
        fats: 0,
        fiber: 0,
        sugars: 0,
        sodium: 0,
        potassium: 0,
        cholesterol: 0,
        saturated_fat: 0,
        trans_fat: 0,
        monounsaturated_fat: 0,
        polyunsaturated_fat: 0,
        vitamin_a: 0,
        vitamin_c: 0,
        calcium: 0,
        iron: 0
      },
      brands: ['Unknown'],
      categories: ['Uncategorized'],
      allergens: [],
      additives: [],
      image_url: '',
      url: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
}

// Configuration
const API_PROXY_CONFIG: ApiProxyConfig = {
  baseUrl: 'https://api-proxy-manager.swdev-pa.workers.dev',
  projectId: 'foodtracker-mdf47uug',
  apiKey: process.env.OPENFOODFACTS_API_KEY, // API key from environment variables
};

export const apiProxyManager = new ApiProxyManagerService(API_PROXY_CONFIG);
export default apiProxyManager;
