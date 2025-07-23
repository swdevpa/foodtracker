/**
 * API Proxy Manager Service
 * Simple, secure API proxy using swdev-pa API Proxy Manager
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

class ApiProxyManagerService {
  private config: ApiProxyConfig;

  constructor(config: ApiProxyConfig) {
    this.config = config;
  }

  private buildProxyUrl(targetUrl: string): string {
    const encodedUrl = encodeURIComponent(targetUrl);
    return `${this.config.baseUrl}/proxy/${this.config.projectId}?target_url=${encodedUrl}`;
  }

  private async makeRequest(request: ApiRequest) {
    const proxyUrl = this.buildProxyUrl(request.targetUrl);
    
    const response = await fetch(proxyUrl, {
      method: request.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...request.headers,
      },
      body: request.body ? JSON.stringify(request.body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`API Proxy Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Gemini API calls through proxy
  async generateWithGemini(contents: any, generationConfig?: any) {
    return this.makeRequest({
      targetUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      method: 'POST',
      body: {
        contents,
        generationConfig
      }
    });
  }

  // USDA API calls through proxy
  async searchFoods(query: string, pageSize: number = 25, dataType?: string[]) {
    const params = new URLSearchParams({
      query,
      pageSize: pageSize.toString(),
    });

    if (dataType && dataType.length > 0) {
      dataType.forEach(type => params.append('dataType', type));
    }

    return this.makeRequest({
      targetUrl: `https://api.nal.usda.gov/fdc/v1/foods/search?${params.toString()}`,
      method: 'GET'
    });
  }

  async getFoodNutrition(fdcId: number) {
    return this.makeRequest({
      targetUrl: `https://api.nal.usda.gov/fdc/v1/food/${fdcId}`,
      method: 'GET'
    });
  }

  // Generic API proxy method
  async proxyRequest(targetUrl: string, options?: RequestInit) {
    return this.makeRequest({
      targetUrl,
      method: options?.method || 'GET',
      headers: options?.headers as Record<string, string>,
      body: options?.body
    });
  }
}

// Configuration
const API_PROXY_CONFIG: ApiProxyConfig = {
  baseUrl: 'https://api-proxy-manager.swdev-pa.workers.dev',
  projectId: 'foodtracker-mdf47uug',
};

export const apiProxyManager = new ApiProxyManagerService(API_PROXY_CONFIG);
export default apiProxyManager;