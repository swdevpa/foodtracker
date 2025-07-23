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

// USDA API Types
interface USDASearchResult {
  totalHits: number;
  currentPage: number;
  totalPages: number;
  pageList: number[];
  foodSearchCriteria: {
    query: string;
    dataType: string[];
    pageSize: number;
    pageNumber: number;
    sortBy: string;
    sortOrder: string;
  };
  foods: USDAFood[];
}

interface USDAFood {
  fdcId: number;
  description: string;
  dataType: string;
  gtinUpc?: string;
  publishedDate: string;
  brandOwner?: string;
  brandName?: string;
  ingredients?: string;
  marketCountry?: string;
  foodCategory?: string;
  modifiedDate?: string;
  dataSource?: string;
  packageWeight?: string;
  servingSizeUnit?: string;
  servingSize?: number;
  householdServingFullText?: string;
  allHighlightFields?: string;
  score?: number;
}

interface USDANutrient {
  id: number;
  number: string;
  name: string;
  rank: number;
  unitName: string;
}

interface USDAFoodNutrient {
  type: string;
  id: number;
  nutrient: USDANutrient;
  amount: number;
}

interface USDAFoodDetail {
  fdcId: number;
  description: string;
  dataType: string;
  publicationDate: string;
  foodNutrients: USDAFoodNutrient[];
  foodClass?: string;
  modifiedDate?: string;
  availableDate?: string;
  brandOwner?: string;
  brandName?: string;
  dataSource?: string;
  ingredients?: string;
  marketCountry?: string;
  foodCategory?: string;
  allHighlightFields?: string;
  score?: number;
  microbes?: any[];
  foodComponents?: any[];
  foodAttributes?: any[];
  foodPortions?: any[];
  inputFoods?: any[];
  wweiaFoodCategory?: any;
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

  // === USDA API METHODS ===
  
  /**
   * Search for foods in the USDA database
   */
  async searchFoods(
    query: string,
    options: {
      pageSize?: number;
      pageNumber?: number;
      dataType?: ('Branded' | 'Foundation' | 'Survey' | 'SR Legacy')[];
      sortBy?: 'dataType.keyword' | 'description.keyword' | 'fdcId' | 'publishedDate';
      sortOrder?: 'asc' | 'desc';
      brandOwner?: string;
      tradeChannel?: string[];
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<USDASearchResult> {
    const params = new URLSearchParams({
      query,
      pageSize: (options.pageSize || 25).toString(),
      pageNumber: (options.pageNumber || 1).toString(),
    });

    if (options.dataType && options.dataType.length > 0) {
      options.dataType.forEach(type => params.append('dataType', type));
    }

    if (options.sortBy) {
      params.append('sortBy', options.sortBy);
    }

    if (options.sortOrder) {
      params.append('sortOrder', options.sortOrder);
    }

    if (options.brandOwner) {
      params.append('brandOwner', options.brandOwner);
    }

    if (options.tradeChannel && options.tradeChannel.length > 0) {
      options.tradeChannel.forEach(channel => params.append('tradeChannel', channel));
    }

    if (options.startDate) {
      params.append('startDate', options.startDate);
    }

    if (options.endDate) {
      params.append('endDate', options.endDate);
    }

    return this.makeRequest<USDASearchResult>({
      targetUrl: `https://api.nal.usda.gov/fdc/v1/foods/search?${params.toString()}`,
      method: 'GET'
    });
  }

  /**
   * Get detailed food information by FDC ID
   */
  async getFoodDetails(
    fdcId: number,
    nutrients?: number[]
  ): Promise<USDAFoodDetail> {
    let url = `https://api.nal.usda.gov/fdc/v1/food/${fdcId}`;
    
    if (nutrients && nutrients.length > 0) {
      const params = new URLSearchParams();
      nutrients.forEach(nutrientId => params.append('nutrients', nutrientId.toString()));
      url += `?${params.toString()}`;
    }

    return this.makeRequest<USDAFoodDetail>({
      targetUrl: url,
      method: 'GET'
    });
  }

  /**
   * Get multiple foods by FDC IDs
   */
  async getFoodsByIds(
    fdcIds: number[],
    nutrients?: number[]
  ): Promise<USDAFoodDetail[]> {
    const body: any = {
      fdcIds,
      format: 'abridged'
    };

    if (nutrients && nutrients.length > 0) {
      body.nutrients = nutrients;
    }

    return this.makeRequest<USDAFoodDetail[]>({
      targetUrl: 'https://api.nal.usda.gov/fdc/v1/foods',
      method: 'POST',
      body
    });
  }

  /**
   * Get list of available nutrients
   */
  async getNutrients(
    pageSize: number = 50,
    pageNumber: number = 1
  ): Promise<{
    nutrients: USDANutrient[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }> {
    const params = new URLSearchParams({
      pageSize: pageSize.toString(),
      pageNumber: pageNumber.toString()
    });

    return this.makeRequest({
      targetUrl: `https://api.nal.usda.gov/fdc/v1/nutrients?${params.toString()}`,
      method: 'GET'
    });
  }

  /**
   * Search foods by UPC/GTIN code
   */
  async searchFoodsByGtin(gtin: string): Promise<USDASearchResult> {
    return this.searchFoods('', {
      pageSize: 25,
      dataType: ['Branded']
    }).then(async () => {
      // Note: Direct GTIN search requires different endpoint approach
      const params = new URLSearchParams({
        gtinUpc: gtin,
        pageSize: '25'
      });
      
      return this.makeRequest<USDASearchResult>({
        targetUrl: `https://api.nal.usda.gov/fdc/v1/foods/search?${params.toString()}`,
        method: 'GET'
      });
    });
  }

  /**
   * Get food categories/food groups
   */
  async getFoodCategories(): Promise<{
    foodCategories: Array<{
      id: number;
      code: string;
      description: string;
    }>;
  }> {
    return this.makeRequest({
      targetUrl: 'https://api.nal.usda.gov/fdc/v1/food-categories',
      method: 'GET'
    });
  }

  /**
   * Alias for getFoodDetails to maintain backwards compatibility
   */
  async getFoodNutrition(fdcId: number): Promise<USDAFoodDetail> {
    return this.getFoodDetails(fdcId);
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