import { NutritionInfo } from '../../types/Food';
import { apiProxyManager } from './apiProxyManager';

// Re-export types from apiProxyManager for consistency
export type {
  FatSecretSearchResult,
  FatSecretFood,
  FatSecretFoodDetail,
  FatSecretServing
} from './apiProxyManager';

class FatSecretService {
  async searchFoods(query: string, limit: number = 25): Promise<any[]> {
    try {
      const response = await apiProxyManager.searchFoods(query, {
        maxResults: limit,
        pageNumber: 0
      });
      
      if (response.foods && response.foods.food) {
        // Handle both single food and array of foods
        const foods = Array.isArray(response.foods.food) 
          ? response.foods.food 
          : [response.foods.food];
        
        return foods;
      }
      
      return [];
    } catch (error) {
      console.error('Error searching FatSecret foods:', error);
      return [];
    }
  }

  async getFoodDetails(foodId: string): Promise<any | null> {
    try {
      const response = await apiProxyManager.getFoodDetails(foodId);
      return response;
    } catch (error) {
      console.error('Error getting FatSecret food details:', error);
      return null;
    }
  }

  async getFoodNutrition(foodId: string): Promise<NutritionInfo | null> {
    try {
      const foodDetails = await this.getFoodDetails(foodId);
      if (!foodDetails || !foodDetails.food) return null;

      return this.convertFatSecretNutrientsToNutritionInfo(foodDetails.food);
    } catch (error) {
      console.error('Error getting FatSecret food nutrition:', error);
      return null;
    }
  }

  private convertFatSecretNutrientsToNutritionInfo(food: any): NutritionInfo {
    // Get the first serving for nutritional information
    let serving = food.servings?.serving;
    
    // Handle both single serving and array of servings
    if (Array.isArray(serving)) {
      serving = serving[0]; // Use first serving
    }
    
    if (!serving) {
      // Fallback if no serving info is available
      return {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      };
    }

    return {
      calories: parseFloat(serving.calories) || 0,
      protein: parseFloat(serving.protein) || 0,
      carbs: parseFloat(serving.carbohydrate) || 0,
      fat: parseFloat(serving.fat) || 0,
      fiber: serving.fiber ? parseFloat(serving.fiber) : undefined,
      sugar: serving.sugar ? parseFloat(serving.sugar) : undefined,
      sodium: serving.sodium ? parseFloat(serving.sodium) : undefined,
      calcium: serving.calcium ? parseFloat(serving.calcium) : undefined,
      iron: serving.iron ? parseFloat(serving.iron) : undefined,
    };
  }

  async searchAndGetNutrition(foodName: string): Promise<{
    foodId: string;
    description: string;
    nutrition: NutritionInfo;
  } | null> {
    try {
      const searchResults = await this.searchFoods(foodName, 1);
      if (searchResults.length === 0) return null;

      const bestMatch = searchResults[0];
      const nutrition = await this.getFoodNutrition(bestMatch.food_id);
      
      if (!nutrition) return null;

      return {
        foodId: bestMatch.food_id,
        description: bestMatch.food_name,
        nutrition
      };
    } catch (error) {
      console.error('Error searching and getting nutrition:', error);
      return null;
    }
  }

  async getBulkNutrition(foodIds: string[]): Promise<Map<string, NutritionInfo>> {
    const nutritionMap = new Map<string, NutritionInfo>();
    
    try {
      // FatSecret doesn't have bulk API, so we need to make individual requests
      const nutritionPromises = foodIds.map(async (foodId) => {
        const nutrition = await this.getFoodNutrition(foodId);
        if (nutrition) {
          nutritionMap.set(foodId, nutrition);
        }
      });
      
      await Promise.all(nutritionPromises);
    } catch (error) {
      console.error('Error getting bulk nutrition:', error);
    }

    return nutritionMap;
  }

  async getSimilarFoods(foodName: string, category?: string, limit: number = 10): Promise<any[]> {
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

  async estimateNutrition(foodName: string, category?: string): Promise<NutritionInfo | null> {
    try {
      const similarFoods = await this.getSimilarFoods(foodName, category, 3);
      if (similarFoods.length === 0) return null;

      // Get nutrition for similar foods and average them
      const nutritionPromises = similarFoods.map(food => this.getFoodNutrition(food.food_id));
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

  async searchFoodsByBarcode(barcode: string): Promise<any | null> {
    try {
      const response = await apiProxyManager.searchFoodsByBarcode(barcode);
      return response;
    } catch (error) {
      console.error('Error searching foods by barcode:', error);
      return null;
    }
  }

  async getFoodAutoComplete(expression: string): Promise<string[]> {
    try {
      const response = await apiProxyManager.getFoodAutoComplete(expression);
      if (response.suggestions && response.suggestions.suggestion) {
        return Array.isArray(response.suggestions.suggestion) 
          ? response.suggestions.suggestion 
          : [response.suggestions.suggestion];
      }
      return [];
    } catch (error) {
      console.error('Error getting autocomplete:', error);
      return [];
    }
  }

  async isApiAvailable(): Promise<boolean> {
    try {
      await this.searchFoods('apple', 1);
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default new FatSecretService();