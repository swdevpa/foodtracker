export interface UserProfile {
  id: string;
  name?: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  height: number; // cm
  weight: number; // kg
  activityLevel: ActivityLevel;
  healthGoal: HealthGoal;
  jobActivity: JobActivity;
  workoutFrequency: number; // times per week
  workoutIntensity: WorkoutIntensity;
  createdAt: Date;
  updatedAt: Date;
}

export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active';

export type HealthGoal = 'weight_loss' | 'weight_gain' | 'muscle_gain' | 'maintenance';

export type JobActivity = 'sedentary' | 'standing' | 'physical';

export type WorkoutIntensity = 'light' | 'moderate' | 'vigorous';

export interface UserPreferences {
  userId: string;
  allergies: string[];
  dislikes: string[];
  dietaryRestrictions: string[];
  preferredCuisines: string[];
  mealPreferences: {
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
    snacks: boolean;
  };
}