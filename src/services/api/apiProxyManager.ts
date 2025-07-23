/**
 * API Proxy Manager Service
 * Complete implementation for Gemini and USDA APIs through swdev-pa API Proxy Manager
 */

interface ApiProxyConfig {
  baseUrl: string;
  projectId: string;
}

interface ApiRequest {
  targetUrl: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}

// Gemini API Types
interface GeminiContent {
  parts: Array<{
    text?: string;
    inlineData?: {
      mimeType: string;
      data: string;
    };
  }>;
  role?: 'user' | 'model';
}

interface GeminiGenerationConfig {
  temperature?: number;
  topK?: number;
  topP?: number;
  maxOutputTokens?: number;
  stopSequences?: string[];
  candidateCount?: number;
}

interface GeminiSafetySettings {
  category: string;
  threshold: string;
}

interface GeminiResponse {
  candidates: Array<{
    content: GeminiContent;
    finishReason: string;
    index: number;
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  promptFeedback?: {
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  };
}

// FatSecret API Types
interface FatSecretSearchResult {
  foods: {
    food: FatSecretFood[];
    max_results: string;
    page_number: string;
    total_results: string;
  };
}

interface FatSecretFood {
  food_id: string;
  food_name: string;
  food_type: string;
  food_url: string;
  brand_name?: string;
}

interface FatSecretNutrient {
  calories: string;
  carbohydrate: string;
  protein: string;
  fat: string;
  saturated_fat?: string;
  polyunsaturated_fat?: string;
  monounsaturated_fat?: string;
  trans_fat?: string;
  cholesterol?: string;
  sodium?: string;
  potassium?: string;
  fiber?: string;
  sugar?: string;
  vitamin_a?: string;
  vitamin_c?: string;
  calcium?: string;
  iron?: string;
}

interface FatSecretServing {
  serving_id: string;
  serving_description: string;
  serving_url: string;
  metric_serving_amount?: string;
  metric_serving_unit?: string;
  number_of_units?: string;
  measurement_description: string;
  calories: string;
  carbohydrate: string;
  protein: string;
  fat: string;
  saturated_fat?: string;
  polyunsaturated_fat?: string;
  monounsaturated_fat?: string;
  trans_fat?: string;
  cholesterol?: string;
  sodium?: string;
  potassium?: string;
  fiber?: string;
  sugar?: string;
  vitamin_a?: string;
  vitamin_c?: string;
  calcium?: string;
  iron?: string;
}

interface FatSecretFoodDetail {
  food: {
    food_id: string;
    food_name: string;
    food_type: string;
    food_url: string;
    brand_name?: string;
    servings: {
      serving: FatSecretServing | FatSecretServing[];
    };
  };
}

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

  private async makeRequest<T = any>(request: ApiRequest): Promise<T> {
    const proxyUrl = this.buildProxyUrl(request.targetUrl);
    
    try {
      const response = await fetch(proxyUrl, {
        method: request.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'expo-platform': 'ios', // Required by API Proxy Manager
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

  // === GEMINI API METHODS ===
  
  /**
   * Generate content using Gemini Pro model
   */
  async generateWithGemini(
    contents: GeminiContent | GeminiContent[],
    generationConfig?: GeminiGenerationConfig,
    safetySettings?: GeminiSafetySettings[]
  ): Promise<GeminiResponse> {
    const body: any = {
      contents: Array.isArray(contents) ? contents : [contents]
    };
    
    if (generationConfig) {
      body.generationConfig = generationConfig;
    }
    
    if (safetySettings) {
      body.safetySettings = safetySettings;
    }

    return this.makeRequest<GeminiResponse>({
      targetUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent',
      method: 'POST',
      body
    });
  }

  /**
   * Generate content using Gemini Flash model (faster, lighter)
   */
  async generateWithGeminiFlash(
    contents: GeminiContent | GeminiContent[],
    generationConfig?: GeminiGenerationConfig,
    safetySettings?: GeminiSafetySettings[]
  ): Promise<GeminiResponse> {
    const body: any = {
      contents: Array.isArray(contents) ? contents : [contents]
    };
    
    if (generationConfig) {
      body.generationConfig = generationConfig;
    }
    
    if (safetySettings) {
      body.safetySettings = safetySettings;
    }

    return this.makeRequest<GeminiResponse>({
      targetUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
      method: 'POST',
      body
    });
  }

  /**
   * Count tokens for given content
   */
  async countTokens(
    contents: GeminiContent | GeminiContent[],
    model: 'gemini-1.5-pro' | 'gemini-1.5-flash' = 'gemini-1.5-pro'
  ): Promise<{ totalTokens: number }> {
    return this.makeRequest<{ totalTokens: number }>({
      targetUrl: `https://generativelanguage.googleapis.com/v1beta/models/${model}:countTokens`,
      method: 'POST',
      body: {
        contents: Array.isArray(contents) ? contents : [contents]
      }
    });
  }

  /**
   * Generate embeddings using Gemini
   */
  async generateEmbeddings(
    content: string,
    taskType: 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT' | 'SEMANTIC_SIMILARITY' | 'CLASSIFICATION' | 'CLUSTERING' = 'RETRIEVAL_DOCUMENT'
  ): Promise<{ embedding: { values: number[] } }> {
    return this.makeRequest<{ embedding: { values: number[] } }>({
      targetUrl: 'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent',
      method: 'POST',
      body: {
        content: {
          parts: [{ text: content }]
        },
        taskType
      }
    });
  }

  /**
   * Batch generate embeddings
   */
  async batchGenerateEmbeddings(
    requests: Array<{
      content: string;
      taskType?: 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT' | 'SEMANTIC_SIMILARITY' | 'CLASSIFICATION' | 'CLUSTERING';
    }>
  ): Promise<{ embeddings: Array<{ values: number[] }> }> {
    return this.makeRequest<{ embeddings: Array<{ values: number[] }> }>({
      targetUrl: 'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents',
      method: 'POST',
      body: {
        requests: requests.map(req => ({
          content: {
            parts: [{ text: req.content }]
          },
          taskType: req.taskType || 'RETRIEVAL_DOCUMENT'
        }))
      }
    });
  }

  // === FATSECRET API METHODS ===
  
  /**
   * Search for foods in the FatSecret database
   */
  async searchFoods(
    query: string,
    options: {
      pageNumber?: number;
      maxResults?: number;
    } = {}
  ): Promise<FatSecretSearchResult> {
    const params = new URLSearchParams({
      method: 'foods.search',
      format: 'json',
      search_expression: query,
      page_number: (options.pageNumber || 0).toString(),
      max_results: (options.maxResults || 50).toString(),
    });

    return this.makeRequest<FatSecretSearchResult>({
      targetUrl: `https://platform.fatsecret.com/rest/server.api?${params.toString()}`,
      method: 'GET'
    });
  }

  /**
   * Get detailed food information by Food ID
   */
  async getFoodDetails(foodId: string): Promise<FatSecretFoodDetail> {
    const params = new URLSearchParams({
      method: 'food.get.v4',
      format: 'json',
      food_id: foodId,
    });

    return this.makeRequest<FatSecretFoodDetail>({
      targetUrl: `https://platform.fatsecret.com/rest/server.api?${params.toString()}`,
      method: 'GET'
    });
  }

  /**
   * Search foods by barcode
   */
  async searchFoodsByBarcode(barcode: string): Promise<FatSecretFoodDetail> {
    const params = new URLSearchParams({
      method: 'food.find_id_for_barcode',
      format: 'json',
      barcode: barcode,
    });

    return this.makeRequest<FatSecretFoodDetail>({
      targetUrl: `https://platform.fatsecret.com/rest/server.api?${params.toString()}`,
      method: 'GET'
    });
  }

  /**
   * Get autocomplete suggestions for food search
   */
  async getFoodAutoComplete(expression: string): Promise<{
    suggestions: {
      suggestion: string[];
    };
  }> {
    const params = new URLSearchParams({
      method: 'foods.autocomplete',
      format: 'json',
      expression: expression,
    });

    return this.makeRequest({
      targetUrl: `https://platform.fatsecret.com/rest/server.api?${params.toString()}`,
      method: 'GET'
    });
  }

  /**
   * Get food categories/food groups from FatSecret
   */
  async getFoodCategories(): Promise<{
    food_categories: {
      food_category: Array<{
        food_category_id: string;
        food_category_name: string;
        food_category_description: string;
      }>;
    };
  }> {
    const params = new URLSearchParams({
      method: 'food_categories.get',
      format: 'json',
    });

    return this.makeRequest({
      targetUrl: `https://platform.fatsecret.com/rest/server.api?${params.toString()}`,
      method: 'GET'
    });
  }

  /**
   * Alias for getFoodDetails to maintain backwards compatibility
   */
  async getFoodNutrition(foodId: string): Promise<FatSecretFoodDetail> {
    return this.getFoodDetails(foodId);
  }

  // === UTILITY METHODS ===
  
  /**
   * Generic API proxy method for custom requests
   */
  async proxyRequest<T = any>(
    targetUrl: string, 
    options?: RequestInit
  ): Promise<T> {
    return this.makeRequest<T>({
      targetUrl,
      method: options?.method || 'GET',
      headers: options?.headers as Record<string, string>,
      body: options?.body
    });
  }

  /**
   * Health check for the API Proxy Manager
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      const response = await fetch(`${this.config.baseUrl}/health`);
      if (response.ok) {
        return {
          status: 'healthy',
          timestamp: new Date().toISOString()
        };
      }
      throw new Error(`Health check failed: ${response.status}`);
    } catch (error) {
      console.error('API Proxy Manager health check failed:', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString()
      };
    }
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
}

// Configuration
const API_PROXY_CONFIG: ApiProxyConfig = {
  baseUrl: 'https://api-proxy-manager.swdev-pa.workers.dev',
  projectId: 'foodtracker-mdf47uug',
};

export const apiProxyManager = new ApiProxyManagerService(API_PROXY_CONFIG);
export default apiProxyManager;