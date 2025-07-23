export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  category: FoodCategory;
  quantity: number;
  unit: FoodUnit;
  expirationDate?: Date;
  location: FoodLocation;
  foodId?: string; // FatSecret Food ID
  nutritionPer100g?: NutritionInfo;
  addedAt: Date;
  updatedAt: Date;
}

export type FoodCategory = 
  | 'fruits'
  | 'vegetables' 
  | 'meat'
  | 'dairy'
  | 'grains'
  | 'proteins'
  | 'snacks'
  | 'beverages'
  | 'spices'
  | 'other';

export type FoodUnit = 
  | 'g'
  | 'kg' 
  | 'ml'
  | 'l'
  | 'pieces'
  | 'cups'
  | 'tbsp'
  | 'tsp';

export type FoodLocation = 
  | 'fridge'
  | 'freezer'
  | 'pantry'
  | 'counter';

export interface NutritionInfo {
  calories: number; // per 100g
  protein: number; // g
  carbs: number; // g
  fat: number; // g
  fiber?: number; // g
  sugar?: number; // g
  sodium?: number; // mg
  calcium?: number; // mg
  iron?: number; // mg
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  ingredients: RecipeIngredient[];
  instructions: string[];
  prepTime: number; // minutes
  cookTime: number; // minutes
  servings: number;
  mealType: MealType;
  totalNutrition: NutritionInfo;
  createdAt: Date;
}

export interface RecipeIngredient {
  foodItem: FoodItem;
  amount: number;
  unit: FoodUnit;
  nutritionContribution: NutritionInfo;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealPlan {
  id: string;
  userId: string;
  date: Date;
  meals: {
    breakfast?: Recipe;
    lunch?: Recipe;
    dinner?: Recipe;
    snacks: Recipe[];
  };
  totalNutrition: NutritionInfo;
  createdAt: Date;
}