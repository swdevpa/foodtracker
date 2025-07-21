import { Recipe } from './Food';

export interface MealPlan {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  days: MealPlanDay[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export interface MealPlanDay {
  date: Date;
  meals: DayMeals;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  notes?: string;
}

export interface DayMeals {
  breakfast?: PlannedMeal;
  lunch?: PlannedMeal;
  dinner?: PlannedMeal;
  snacks: PlannedMeal[];
}

export interface PlannedMeal {
  id: string;
  recipe: Recipe;
  servings: number;
  scheduledTime?: string; // "08:00", "12:30", etc.
  status: 'planned' | 'prepared' | 'consumed' | 'skipped';
  prepDate?: Date; // When to prep this meal
  notes?: string;
}

export interface MealPrepTask {
  id: string;
  mealPlanId: string;
  recipe: Recipe;
  servings: number;
  prepDate: Date;
  estimatedPrepTime: number; // in minutes
  ingredients: {
    name: string;
    amount: number;
    unit: string;
  }[];
  instructions: string[];
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: Date;
}

export interface MealPlanTemplate {
  id: string;
  name: string;
  description: string;
  duration: number; // days
  mealTypes: ('breakfast' | 'lunch' | 'dinner' | 'snack')[];
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  tags: string[]; // 'weight-loss', 'muscle-gain', 'vegetarian', etc.
  difficulty: 'easy' | 'medium' | 'hard';
  createdAt: Date;
}

export type MealPlanGoal = 'weight_loss' | 'weight_gain' | 'muscle_gain' | 'maintenance' | 'custom';

export interface MealPlanPreferences {
  goal: MealPlanGoal;
  targetCalories: number;
  mealsPerDay: number;
  prepDays: string[]; // ['sunday', 'wednesday']
  avoidIngredients: string[];
  preferredCuisines: string[];
  maxPrepTime: number; // minutes per session
  budgetRange: 'low' | 'medium' | 'high';
}