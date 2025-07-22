import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recipe, NutritionInfo, MealPlan } from '../types/Food';
import { UserProfile } from '../types/User';
import { NutritionCalculator } from '../utils/nutritionCalculator';
import appleHealthService, { NutritionEntry } from '../services/appleHealthService';

export interface DailyNutrition {
  date: string;
  meals: {
    breakfast?: Recipe;
    lunch?: Recipe;
    dinner?: Recipe;
    snacks: Recipe[];
  };
  totalNutrition: NutritionInfo;
  targetNutrition: NutritionInfo;
  progress: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  waterIntake: number; // in ml
  targetWaterIntake: number; // in ml
}

export const useNutritionTracking = (userProfile: UserProfile | null) => {
  const [dailyNutrition, setDailyNutrition] = useState<DailyNutrition | null>(null);
  const [weeklyData, setWeeklyData] = useState<DailyNutrition[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get today's date string
  const getTodayString = () => new Date().toISOString().split('T')[0];

  // Load daily nutrition data
  const loadDailyNutrition = async (date?: string) => {
    if (!userProfile) return;

    const targetDate = date || getTodayString();
    
    try {
      setIsLoading(true);
      
      // Load meals for the day
      const mealsKey = `meals_${targetDate}`;
      const mealsData = await AsyncStorage.getItem(mealsKey);
      const meals = mealsData ? JSON.parse(mealsData) : {
        breakfast: null,
        lunch: null,
        dinner: null,
        snacks: []
      };

      // Load water intake
      const waterKey = `water_${targetDate}`;
      const waterData = await AsyncStorage.getItem(waterKey);
      const waterIntake = waterData ? JSON.parse(waterData).amount : 0;

      // Calculate target nutrition
      const targetNutrition = NutritionCalculator.calculateTargetMacros(userProfile);
      const targetWaterIntake = NutritionCalculator.calculateWaterIntake(userProfile);

      // Calculate total nutrition from all meals
      const allRecipes = [
        meals.breakfast,
        meals.lunch,
        meals.dinner,
        ...meals.snacks
      ].filter(recipe => recipe !== null && recipe !== undefined);

      const totalNutrition = NutritionCalculator.calculateTotalNutrition(allRecipes);

      // Calculate progress
      const progress = NutritionCalculator.calculateNutritionProgress(totalNutrition, targetNutrition);

      const dailyData: DailyNutrition = {
        date: targetDate,
        meals,
        totalNutrition,
        targetNutrition,
        progress,
        waterIntake,
        targetWaterIntake
      };

      setDailyNutrition(dailyData);
    } catch (error) {
      console.error('Error loading daily nutrition:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load weekly nutrition data
  const loadWeeklyData = async () => {
    if (!userProfile) return;

    try {
      const weeklyData: DailyNutrition[] = [];
      const today = new Date();

      // Load last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateString = date.toISOString().split('T')[0];

        const mealsKey = `meals_${dateString}`;
        const waterKey = `water_${dateString}`;
        
        const [mealsData, waterData] = await Promise.all([
          AsyncStorage.getItem(mealsKey),
          AsyncStorage.getItem(waterKey)
        ]);

        const meals = mealsData ? JSON.parse(mealsData) : {
          breakfast: null,
          lunch: null,
          dinner: null,
          snacks: []
        };

        const waterIntake = waterData ? JSON.parse(waterData).amount : 0;

        const targetNutrition = NutritionCalculator.calculateTargetMacros(userProfile);
        const targetWaterIntake = NutritionCalculator.calculateWaterIntake(userProfile);

        const allRecipes = [
          meals.breakfast,
          meals.lunch,
          meals.dinner,
          ...meals.snacks
        ].filter(recipe => recipe !== null);

        const totalNutrition = NutritionCalculator.calculateTotalNutrition(allRecipes);
        const progress = NutritionCalculator.calculateNutritionProgress(totalNutrition, targetNutrition);

        weeklyData.push({
          date: dateString,
          meals,
          totalNutrition,
          targetNutrition,
          progress,
          waterIntake,
          targetWaterIntake
        });
      }

      setWeeklyData(weeklyData);
    } catch (error) {
      console.error('Error loading weekly data:', error);
    }
  };

  // Check if Health sync is enabled
  const isHealthSyncEnabled = async (): Promise<boolean> => {
    try {
      const settings = await AsyncStorage.getItem('healthSettings');
      if (settings) {
        const { enabled } = JSON.parse(settings);
        return enabled === true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  // Sync nutrition to Apple Health
  const syncNutritionToHealth = async (recipe: Recipe) => {
    const healthSyncEnabled = await isHealthSyncEnabled();
    if (!healthSyncEnabled) return;

    try {
      const nutritionEntry: NutritionEntry = {
        date: new Date(),
        calories: recipe.nutrition?.calories || 0,
        protein: recipe.nutrition?.protein || undefined,
        fat: recipe.nutrition?.fat || undefined,
        carbohydrates: recipe.nutrition?.carbs || undefined,
        fiber: recipe.nutrition?.fiber || undefined,
        sugar: recipe.nutrition?.sugar || undefined,
        sodium: recipe.nutrition?.sodium || undefined,
        calcium: recipe.nutrition?.calcium || undefined,
        iron: recipe.nutrition?.iron || undefined,
        vitaminC: recipe.nutrition?.vitaminC || undefined,
      };

      const success = await appleHealthService.saveMealToHealth(nutritionEntry);
      if (success) {
        console.log('Nährwerte erfolgreich zu Apple Health synchronisiert');
      }
    } catch (error) {
      console.error('Fehler bei Health-Synchronisation:', error);
    }
  };

  // Add a recipe to a specific meal
  const addMealRecipe = async (recipe: Recipe, mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
    const today = getTodayString();
    const mealsKey = `meals_${today}`;
    
    try {
      const existingData = await AsyncStorage.getItem(mealsKey);
      const meals = existingData ? JSON.parse(existingData) : {
        breakfast: null,
        lunch: null,
        dinner: null,
        snacks: []
      };

      if (mealType === 'snack') {
        meals.snacks = [...meals.snacks, recipe];
      } else {
        meals[mealType] = recipe;
      }

      await AsyncStorage.setItem(mealsKey, JSON.stringify(meals));
      
      // Sync to Apple Health
      await syncNutritionToHealth(recipe);
      
      await loadDailyNutrition(); // Refresh data
    } catch (error) {
      console.error('Error adding meal recipe:', error);
      throw error;
    }
  };

  // Remove a recipe from a specific meal
  const removeMealRecipe = async (mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack', recipeId?: string) => {
    const today = getTodayString();
    const mealsKey = `meals_${today}`;
    
    try {
      const existingData = await AsyncStorage.getItem(mealsKey);
      const meals = existingData ? JSON.parse(existingData) : {
        breakfast: null,
        lunch: null,
        dinner: null,
        snacks: []
      };

      if (mealType === 'snack' && recipeId) {
        meals.snacks = meals.snacks.filter((recipe: Recipe) => recipe.id !== recipeId);
      } else if (mealType !== 'snack') {
        meals[mealType] = null;
      }

      await AsyncStorage.setItem(mealsKey, JSON.stringify(meals));
      await loadDailyNutrition(); // Refresh data
    } catch (error) {
      console.error('Error removing meal recipe:', error);
      throw error;
    }
  };

  // Update water intake
  const updateWaterIntake = async (amount: number) => {
    const today = getTodayString();
    const waterKey = `water_${today}`;
    
    try {
      const existingData = await AsyncStorage.getItem(waterKey);
      const currentAmount = existingData ? JSON.parse(existingData).amount : 0;
      const newAmount = Math.max(0, currentAmount + amount);

      await AsyncStorage.setItem(waterKey, JSON.stringify({
        amount: newAmount,
        lastUpdated: new Date().toISOString()
      }));

      await loadDailyNutrition(); // Refresh data
    } catch (error) {
      console.error('Error updating water intake:', error);
      throw error;
    }
  };

  // Set absolute water intake
  const setWaterIntake = async (amount: number) => {
    const today = getTodayString();
    const waterKey = `water_${today}`;
    
    try {
      await AsyncStorage.setItem(waterKey, JSON.stringify({
        amount: Math.max(0, amount),
        lastUpdated: new Date().toISOString()
      }));

      await loadDailyNutrition(); // Refresh data
    } catch (error) {
      console.error('Error setting water intake:', error);
      throw error;
    }
  };

  // Get nutrition analysis
  const getNutritionAnalysis = () => {
    if (!dailyNutrition) return null;

    return NutritionCalculator.getNutritionAnalysis(
      dailyNutrition.totalNutrition,
      dailyNutrition.targetNutrition
    );
  };

  // Get weekly average
  const getWeeklyAverage = () => {
    if (weeklyData.length === 0) return null;

    const totalDays = weeklyData.length;
    const averages = {
      calories: Math.round(weeklyData.reduce((sum, day) => sum + day.totalNutrition.calories, 0) / totalDays),
      protein: Math.round(weeklyData.reduce((sum, day) => sum + day.totalNutrition.protein, 0) / totalDays),
      carbs: Math.round(weeklyData.reduce((sum, day) => sum + day.totalNutrition.carbs, 0) / totalDays),
      fat: Math.round(weeklyData.reduce((sum, day) => sum + day.totalNutrition.fat, 0) / totalDays),
      water: Math.round(weeklyData.reduce((sum, day) => sum + day.waterIntake, 0) / totalDays)
    };

    return averages;
  };

  // Get streak data (consecutive days meeting goals)
  const getStreakData = () => {
    if (weeklyData.length === 0) return { currentStreak: 0, longestStreak: 0 };

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    // Check from most recent day backwards
    for (let i = weeklyData.length - 1; i >= 0; i--) {
      const day = weeklyData[i];
      const metGoals = day.progress.calories >= 80 && day.progress.calories <= 120;

      if (metGoals) {
        tempStreak++;
        if (i === weeklyData.length - 1) {
          currentStreak = tempStreak;
        }
      } else {
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
        tempStreak = 0;
      }
    }

    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }

    return { currentStreak, longestStreak };
  };

  // Initialize data on profile change
  useEffect(() => {
    if (userProfile) {
      loadDailyNutrition();
      loadWeeklyData();
    }
  }, [userProfile]);

  return {
    dailyNutrition,
    weeklyData,
    isLoading,
    loadDailyNutrition,
    loadWeeklyData,
    addMealRecipe,
    removeMealRecipe,
    updateWaterIntake,
    setWaterIntake,
    getNutritionAnalysis,
    getWeeklyAverage,
    getStreakData
  };
};