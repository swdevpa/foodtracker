import { NutritionInfo } from '../../types/Food';
import { apiProxyManager } from './apiProxyManager';

interface USDAFoodSearchResponse {
  totalHits: number;
  currentPage: number;
  totalPages: number;
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

interface USDAFoodDetails {
  fdcId: number;
  description: string;
  dataType: string;
  foodNutrients: USDANutrient[];
  foodClass?: string;
  modifiedDate?: string;
  availableDate?: string;
  brandOwner?: string;
  brandName?: string;
  dataSource?: string;
  ingredients?: string;
  marketCountry?: string;
  foodCategory?: string;
  publishedDate?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
}

interface USDANutrient {
  nutrientId: number;
  nutrientName: string;
  nutrientNumber: string;
  unitName: string;
  value: number;
  rank?: number;
  indentLevel?: number;
  foodNutrientId?: number;
}

class USDAService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'https://api.nal.usda.gov/fdc/v1';
  }

  private async makeRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    try {
      return await apiProxyManager.proxyRequest(url.toString());
    } catch (error) {
      console.error('USDA API request failed:', error);
      throw error;
    }
  }

  async searchFoods(query: string, limit: number = 25): Promise<USDAFood[]> {
    try {
      const response: USDAFoodSearchResponse = await this.makeRequest('/foods/search', {
        query,
        dataType: ['Survey (FNDDS)', 'SR Legacy', 'Branded'],
        pageSize: limit,
        sortBy: 'dataType.keyword',
        sortOrder: 'asc'
      });
      
      return response.foods || [];
    } catch (error) {
      console.error('Error searching foods:', error);
      return [];
    }
  }

  async getFoodDetails(fdcId: number): Promise<USDAFoodDetails | null> {
    try {
      const response: USDAFoodDetails = await this.makeRequest(`/food/${fdcId}`);
      return response;
    } catch (error) {
      console.error('Error getting food details:', error);
      return null;
    }
  }

  async getFoodNutrition(fdcId: number): Promise<NutritionInfo | null> {
    try {
      const foodDetails = await this.getFoodDetails(fdcId);
      if (!foodDetails) return null;

      return this.convertUSDANutrientsToNutritionInfo(foodDetails.foodNutrients);
    } catch (error) {
      console.error('Error getting food nutrition:', error);
      return null;
    }
  }

  private convertUSDANutrientsToNutritionInfo(nutrients: USDANutrient[]): NutritionInfo {
    const nutritionMap = new Map(nutrients.map(n => [n.nutrientId, n.value]));

    // USDA Nutrient IDs (most common ones)
    const NUTRIENT_IDS = {
      ENERGY: 1008,           // Energy (kcal)
      PROTEIN: 1003,          // Protein (g)
      CARBS: 1005,           // Carbohydrate, by difference (g)
      FAT: 1004,             // Total lipid (fat) (g)
      FIBER: 1079,           // Fiber, total dietary (g)
      SUGAR: 2000,           // Sugars, total including NLEA (g)
      SODIUM: 1093,          // Sodium, Na (mg)
      CALCIUM: 1087,         // Calcium, Ca (mg)
      IRON: 1089,            // Iron, Fe (mg)
    };

    return {
      calories: nutritionMap.get(NUTRIENT_IDS.ENERGY) || 0,
      protein: nutritionMap.get(NUTRIENT_IDS.PROTEIN) || 0,
      carbs: nutritionMap.get(NUTRIENT_IDS.CARBS) || 0,
      fat: nutritionMap.get(NUTRIENT_IDS.FAT) || 0,
      fiber: nutritionMap.get(NUTRIENT_IDS.FIBER) || undefined,
      sugar: nutritionMap.get(NUTRIENT_IDS.SUGAR) || undefined,
      sodium: nutritionMap.get(NUTRIENT_IDS.SODIUM) || undefined,
      calcium: nutritionMap.get(NUTRIENT_IDS.CALCIUM) || undefined,
      iron: nutritionMap.get(NUTRIENT_IDS.IRON) || undefined,
    };
  }

  async searchAndGetNutrition(foodName: string): Promise<{
    fdcId: number;
    description: string;
    nutrition: NutritionInfo;
  } | null> {
    try {
      const searchResults = await this.searchFoods(foodName, 1);
      if (searchResults.length === 0) return null;

      const bestMatch = searchResults[0];
      const nutrition = await this.getFoodNutrition(bestMatch.fdcId);
      
      if (!nutrition) return null;

      return {
        fdcId: bestMatch.fdcId,
        description: bestMatch.description,
        nutrition
      };
    } catch (error) {
      console.error('Error searching and getting nutrition:', error);
      return null;
    }
  }

  async getBulkNutrition(fdcIds: number[]): Promise<Map<number, NutritionInfo>> {
    const nutritionMap = new Map<number, NutritionInfo>();
    
    try {
      // USDA API supports bulk requests with POST
      const foods: USDAFoodDetails[] = await apiProxyManager.proxyRequest(`${this.baseUrl}/foods`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fdcIds,
          format: 'abridged',
          nutrients: [1008, 1003, 1005, 1004, 1079, 2000, 1093, 1087, 1089] // Key nutrient IDs
        })
      });
      
      foods.forEach(food => {
        const nutrition = this.convertUSDANutrientsToNutritionInfo(food.foodNutrients);
        nutritionMap.set(food.fdcId, nutrition);
      });

    } catch (error) {
      console.error('Error getting bulk nutrition:', error);
    }

    return nutritionMap;
  }

  // Helper method to get similar foods based on category
  async getSimilarFoods(foodName: string, category?: string, limit: number = 10): Promise<USDAFood[]> {
    try {
      let query = foodName;
      if (category) {
        query += ` ${category}`;
      }

      return await this.searchFoods(query, limit);
    } catch (error) {
      console.error('Error getting similar foods:', error);
      return [];
    }
  }

  // Helper method to estimate nutrition for unknown foods based on similar foods
  async estimateNutrition(foodName: string, category?: string): Promise<NutritionInfo | null> {
    try {
      const similarFoods = await this.getSimilarFoods(foodName, category, 3);
      if (similarFoods.length === 0) return null;

      // Get nutrition for similar foods and average them
      const nutritionPromises = similarFoods.map(food => this.getFoodNutrition(food.fdcId));
      const nutritionResults = await Promise.all(nutritionPromises);
      
      const validNutrition = nutritionResults.filter(n => n !== null) as NutritionInfo[];
      if (validNutrition.length === 0) return null;

      // Average the nutrition values
      const avgNutrition: NutritionInfo = {
        calories: Math.round(validNutrition.reduce((sum, n) => sum + n.calories, 0) / validNutrition.length),
        protein: Math.round(validNutrition.reduce((sum, n) => sum + n.protein, 0) / validNutrition.length),
        carbs: Math.round(validNutrition.reduce((sum, n) => sum + n.carbs, 0) / validNutrition.length),
        fat: Math.round(validNutrition.reduce((sum, n) => sum + n.fat, 0) / validNutrition.length),
        fiber: validNutrition.some(n => n.fiber) ? 
          Math.round(validNutrition.reduce((sum, n) => sum + (n.fiber || 0), 0) / validNutrition.length) : undefined,
        sugar: validNutrition.some(n => n.sugar) ? 
          Math.round(validNutrition.reduce((sum, n) => sum + (n.sugar || 0), 0) / validNutrition.length) : undefined,
        sodium: validNutrition.some(n => n.sodium) ? 
          Math.round(validNutrition.reduce((sum, n) => sum + (n.sodium || 0), 0) / validNutrition.length) : undefined,
        calcium: validNutrition.some(n => n.calcium) ? 
          Math.round(validNutrition.reduce((sum, n) => sum + (n.calcium || 0), 0) / validNutrition.length) : undefined,
        iron: validNutrition.some(n => n.iron) ? 
          Math.round(validNutrition.reduce((sum, n) => sum + (n.iron || 0), 0) / validNutrition.length) : undefined,
      };

      return avgNutrition;
    } catch (error) {
      console.error('Error estimating nutrition:', error);
      return null;
    }
  }

  // Method to check if API is available
  async isApiAvailable(): Promise<boolean> {
    try {
      await this.makeRequest('/foods/search', { query: 'apple', pageSize: 1 });
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default new USDAService();