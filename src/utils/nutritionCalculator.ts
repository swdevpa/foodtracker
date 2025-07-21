import { UserProfile } from '../types/User';
import { Recipe, NutritionInfo, MealPlan } from '../types/Food';

export class NutritionCalculator {
  
  /**
   * Calculate Basal Metabolic Rate using Mifflin-St Jeor Equation
   */
  static calculateBMR(profile: UserProfile): number {
    const { weight, height, age, gender } = profile;
    
    if (gender === 'male') {
      return (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
      return (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }
  }

  /**
   * Calculate Total Daily Energy Expenditure
   */
  static calculateTDEE(profile: UserProfile): number {
    const bmr = this.calculateBMR(profile);
    
    const activityMultipliers = {
      'sedentary': 1.2,
      'lightly_active': 1.375,
      'moderately_active': 1.55,
      'very_active': 1.725,
      'extremely_active': 1.9
    };
    
    return bmr * activityMultipliers[profile.activityLevel];
  }

  /**
   * Calculate target calories based on health goal
   */
  static calculateTargetCalories(profile: UserProfile): number {
    const tdee = this.calculateTDEE(profile);
    
    switch (profile.healthGoal) {
      case 'weight_loss':
        return Math.round(tdee * 0.8); // 20% deficit
      case 'weight_gain':
        return Math.round(tdee * 1.2); // 20% surplus
      case 'muscle_gain':
        return Math.round(tdee * 1.15); // 15% surplus
      case 'maintenance':
      default:
        return Math.round(tdee);
    }
  }

  /**
   * Calculate target macronutrients based on health goal
   */
  static calculateTargetMacros(profile: UserProfile): {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } {
    const calories = this.calculateTargetCalories(profile);
    
    // Macro distribution based on health goal
    let proteinRatio: number, carbRatio: number, fatRatio: number;
    
    switch (profile.healthGoal) {
      case 'muscle_gain':
        proteinRatio = 0.30; // 30% protein
        carbRatio = 0.45;    // 45% carbs
        fatRatio = 0.25;     // 25% fat
        break;
      case 'weight_loss':
        proteinRatio = 0.35; // 35% protein
        carbRatio = 0.35;    // 35% carbs
        fatRatio = 0.30;     // 30% fat
        break;
      case 'weight_gain':
        proteinRatio = 0.25; // 25% protein
        carbRatio = 0.50;    // 50% carbs
        fatRatio = 0.25;     // 25% fat
        break;
      case 'maintenance':
      default:
        proteinRatio = 0.25; // 25% protein
        carbRatio = 0.45;    // 45% carbs
        fatRatio = 0.30;     // 30% fat
        break;
    }

    return {
      calories,
      protein: Math.round((calories * proteinRatio) / 4), // 4 kcal per gram
      carbs: Math.round((calories * carbRatio) / 4),      // 4 kcal per gram
      fat: Math.round((calories * fatRatio) / 9),         // 9 kcal per gram
    };
  }

  /**
   * Calculate BMI
   */
  static calculateBMI(profile: UserProfile): number {
    const heightInM = profile.height / 100;
    return profile.weight / (heightInM * heightInM);
  }

  /**
   * Get BMI category and color
   */
  static getBMICategory(bmi: number): { category: string; color: string; description: string } {
    if (bmi < 18.5) {
      return { 
        category: 'Untergewicht', 
        color: '#3498db',
        description: 'Möglicherweise zu wenig Körpergewicht'
      };
    }
    if (bmi < 25) {
      return { 
        category: 'Normalgewicht', 
        color: '#27ae60',
        description: 'Idealer Gewichtsbereich'
      };
    }
    if (bmi < 30) {
      return { 
        category: 'Übergewicht', 
        color: '#f39c12',
        description: 'Leichtes Übergewicht'
      };
    }
    return { 
      category: 'Adipositas', 
      color: '#e74c3c',
      description: 'Deutliches Übergewicht'
    };
  }

  /**
   * Calculate total nutrition from multiple recipes
   */
  static calculateTotalNutrition(recipes: Recipe[]): NutritionInfo {
    return recipes.reduce((total, recipe) => ({
      calories: total.calories + recipe.totalNutrition.calories,
      protein: total.protein + recipe.totalNutrition.protein,
      carbs: total.carbs + recipe.totalNutrition.carbs,
      fat: total.fat + recipe.totalNutrition.fat,
      fiber: (total.fiber || 0) + (recipe.totalNutrition.fiber || 0),
      sugar: (total.sugar || 0) + (recipe.totalNutrition.sugar || 0),
      sodium: (total.sodium || 0) + (recipe.totalNutrition.sodium || 0),
      calcium: (total.calcium || 0) + (recipe.totalNutrition.calcium || 0),
      iron: (total.iron || 0) + (recipe.totalNutrition.iron || 0),
    }), {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
      calcium: 0,
      iron: 0,
    });
  }

  /**
   * Calculate nutrition progress percentage
   */
  static calculateNutritionProgress(
    consumed: NutritionInfo, 
    target: NutritionInfo
  ): {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } {
    return {
      calories: target.calories > 0 ? Math.round((consumed.calories / target.calories) * 100) : 0,
      protein: target.protein > 0 ? Math.round((consumed.protein / target.protein) * 100) : 0,
      carbs: target.carbs > 0 ? Math.round((consumed.carbs / target.carbs) * 100) : 0,
      fat: target.fat > 0 ? Math.round((consumed.fat / target.fat) * 100) : 0,
    };
  }

  /**
   * Get nutrition status and recommendations
   */
  static getNutritionAnalysis(
    consumed: NutritionInfo,
    target: NutritionInfo
  ): {
    status: 'under' | 'optimal' | 'over';
    message: string;
    recommendations: string[];
  } {
    const progress = this.calculateNutritionProgress(consumed, target);
    const recommendations: string[] = [];

    // Analyze overall calorie intake
    let status: 'under' | 'optimal' | 'over' = 'optimal';
    let message = '';

    if (progress.calories < 80) {
      status = 'under';
      message = 'Du hast heute noch nicht genug Kalorien zu dir genommen.';
      recommendations.push('Füge eine weitere Mahlzeit oder einen Snack hinzu');
    } else if (progress.calories > 120) {
      status = 'over';
      message = 'Du hast dein Kalorienziel bereits überschritten.';
      recommendations.push('Achte bei den nächsten Mahlzeiten auf kleinere Portionen');
    } else {
      message = 'Du liegst gut im Bereich deines Kalorienziels.';
    }

    // Protein analysis
    if (progress.protein < 80) {
      recommendations.push('Mehr proteinreiche Lebensmittel wie Fleisch, Fisch oder Hülsenfrüchte');
    } else if (progress.protein > 130) {
      recommendations.push('Reduziere etwas den Proteinanteil in den nächsten Mahlzeiten');
    }

    // Carbs analysis
    if (progress.carbs < 70) {
      recommendations.push('Füge mehr gesunde Kohlenhydrate wie Vollkornprodukte hinzu');
    } else if (progress.carbs > 130) {
      recommendations.push('Reduziere Kohlenhydrate und erhöhe Gemüse-Anteil');
    }

    // Fat analysis
    if (progress.fat < 70) {
      recommendations.push('Gesunde Fette wie Nüsse, Avocado oder Olivenöl hinzufügen');
    } else if (progress.fat > 130) {
      recommendations.push('Achte auf versteckte Fette in Fertigprodukten');
    }

    return {
      status,
      message,
      recommendations: recommendations.slice(0, 3) // Max 3 recommendations
    };
  }

  /**
   * Calculate ideal weight range based on height
   */
  static calculateIdealWeightRange(height: number): { min: number; max: number } {
    const heightInM = height / 100;
    const minBMI = 18.5;
    const maxBMI = 24.9;
    
    return {
      min: Math.round(minBMI * (heightInM * heightInM)),
      max: Math.round(maxBMI * (heightInM * heightInM))
    };
  }

  /**
   * Estimate calories burned based on activity
   */
  static estimateCaloriesBurned(
    profile: UserProfile,
    activityType: 'walking' | 'running' | 'cycling' | 'strength_training' | 'swimming',
    durationMinutes: number
  ): number {
    const weight = profile.weight;
    
    // MET values (Metabolic Equivalent of Task)
    const metValues = {
      walking: 3.5,      // moderate pace
      running: 8.0,      // 8 km/h
      cycling: 6.0,      // moderate effort
      strength_training: 4.0,
      swimming: 7.0      // moderate effort
    };
    
    const met = metValues[activityType];
    return Math.round((met * weight * durationMinutes) / 60);
  }

  /**
   * Calculate water intake recommendation
   */
  static calculateWaterIntake(profile: UserProfile): number {
    // Base calculation: 35ml per kg body weight
    let waterIntake = profile.weight * 35;
    
    // Adjust for activity level
    if (profile.activityLevel === 'very_active' || profile.activityLevel === 'extremely_active') {
      waterIntake *= 1.2; // 20% more for high activity
    } else if (profile.activityLevel === 'moderately_active') {
      waterIntake *= 1.1; // 10% more for moderate activity
    }
    
    return Math.round(waterIntake); // in ml
  }

  /**
   * Get meal timing recommendations
   */
  static getMealTimingRecommendations(profile: UserProfile): {
    breakfast: string;
    lunch: string;
    dinner: string;
    snacks: string[];
  } {
    // Basic recommendations based on activity and goals
    const isHighActivity = profile.activityLevel === 'very_active' || profile.activityLevel === 'extremely_active';
    const isMuscleGain = profile.healthGoal === 'muscle_gain';
    
    return {
      breakfast: isHighActivity ? '7:00-8:00' : '8:00-9:00',
      lunch: '12:00-13:00',
      dinner: profile.healthGoal === 'weight_loss' ? '18:00-19:00' : '19:00-20:00',
      snacks: isMuscleGain ? ['10:00', '15:00', '21:00'] : ['15:00']
    };
  }
}