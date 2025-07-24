/**
 * Food Types
 */

export type FoodCategory = 'fruits' | 'vegetables' | 'meat' | 'dairy' | 'grains' | 'proteins' | 'snacks' | 'beverages' | 'spices' | 'other';

export type FoodUnit = 'g' | 'kg' | 'ml' | 'l' | 'pieces';

export type FoodLocation = 'fridge' | 'freezer' | 'pantry' | 'counter';

export interface FoodItem {
  id: string;
  name: string;
  category: FoodCategory;
  quantity: number;
  unit: FoodUnit;
  location: FoodLocation;
  addedAt: Date;
  updatedAt: Date;
  expirationDate?: Date;
}

export interface FoodProduct {
  id: string;
  product_name: string;
  barcode: string;
  brands: string[];
  categories: string[];
  nutriments: {
    calories: number;
    carbohydrates: number;
    proteins: number;
    fats: number;
    fiber: number;
    sugars: number;
    sodium: number;
    potassium: number;
    cholesterol: number;
    saturated_fat: number;
    trans_fat: number;
    monounsaturated_fat: number;
    polyunsaturated_fat: number;
    vitamin_a: number;
    vitamin_c: number;
    calcium: number;
    iron: number;
  };
  allergens: string[];
  additives: string[];
  image_url: string;
  url: string;
  created_at: string;
  updated_at: string;
}
