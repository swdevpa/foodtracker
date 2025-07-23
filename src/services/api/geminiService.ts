import { FoodItem, Recipe, MealType, NutritionInfo } from '../../types/Food';
import { UserProfile } from '../../types/User';
import { NutritionCalculator } from '../health/nutritionCalculator';
import { apiProxyManager } from './apiProxyManager';

class GeminiService {
  constructor() {
    // API keys are now managed server-side by API Proxy Manager
  }

  private calculateTargetNutrition(userProfile: UserProfile): {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } {
    return NutritionCalculator.calculateTargetMacros(userProfile);
  }

  async generateRecipes(
    userProfile: UserProfile,
    availableFood: FoodItem[],
    mealTypes: MealType[],
    servings: number = 1
  ): Promise<Recipe[]> {
    const targetNutrition = this.calculateTargetNutrition(userProfile);

    const foodInventory = availableFood.map(food => ({
      name: food.name,
      quantity: food.quantity,
      unit: food.unit,
      category: food.category,
      location: food.location
    }));

    const prompt = `
Du bist ein KI-Ernährungsassistent. Erstelle personalisierte Rezepte basierend auf folgenden Informationen:

BENUTZERPROFIL:
- Alter: ${userProfile.age}
- Geschlecht: ${userProfile.gender}
- Gewicht: ${userProfile.weight}kg
- Größe: ${userProfile.height}cm
- Aktivitätslevel: ${userProfile.activityLevel}
- Gesundheitsziel: ${userProfile.healthGoal}
- Berufliche Aktivität: ${userProfile.jobActivity}
- Sport pro Woche: ${userProfile.workoutFrequency}x

TÄGLICHE NÄHRSTOFFZIELE:
- Kalorien: ${targetNutrition.calories} kcal
- Protein: ${targetNutrition.protein}g
- Kohlenhydrate: ${targetNutrition.carbs}g
- Fett: ${targetNutrition.fat}g

VERFÜGBARE LEBENSMITTEL:
${JSON.stringify(foodInventory, null, 2)}

GEWÜNSCHTE MAHLZEITEN:
${mealTypes.join(', ')}

PORTIONEN: ${servings}

ANFORDERUNGEN:
1. Erstelle nur Rezepte mit verfügbaren Lebensmitteln
2. Jedes Rezept soll realistische Mengenangaben haben
3. Berücksichtige die Nährstoffziele des Benutzers
4. Gib für jedes Rezept die genauen Nährstoffwerte an
5. Schreibe klare, einfach zu befolgende Anweisungen
6. Berücksichtige Zubereitungszeit und Schwierigkeit

AUSGABEFORMAT (JSON):
{
  "recipes": [
    {
      "name": "Rezeptname",
      "description": "Kurze Beschreibung des Gerichts",
      "mealType": "breakfast|lunch|dinner|snack",
      "prepTime": 15,
      "cookTime": 20,
      "servings": ${servings},
      "ingredients": [
        {
          "name": "Lebensmittelname",
          "amount": 150,
          "unit": "g"
        }
      ],
      "instructions": [
        "Schritt 1: ...",
        "Schritt 2: ..."
      ],
      "nutrition": {
        "calories": 450,
        "protein": 25,
        "carbs": 35,
        "fat": 18,
        "fiber": 8,
        "sugar": 5,
        "sodium": 400
      }
    }
  ]
}

Erstelle bitte ${mealTypes.length} Rezept(e) für die gewünschten Mahlzeiten.
`;

    try {
      const result = await apiProxyManager.generateWithGemini([{
        role: 'user',
        parts: [{ text: prompt }]
      }], {
        temperature: 0.7,
        candidateCount: 1,
        maxOutputTokens: 2048,
      });
      
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Gemini response');
      }

      const parsedResponse = JSON.parse(jsonMatch[0]);
      
      // Convert to Recipe objects
      const recipes: Recipe[] = parsedResponse.recipes.map((recipe: any) => ({
        id: Date.now().toString() + Math.random(),
        name: recipe.name,
        description: recipe.description,
        mealType: recipe.mealType,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        ingredients: recipe.ingredients.map((ing: any) => {
          // Find matching food item from inventory
          const foodItem = availableFood.find(food => 
            food.name.toLowerCase().includes(ing.name.toLowerCase()) ||
            ing.name.toLowerCase().includes(food.name.toLowerCase())
          );
          
          return {
            foodItem: foodItem || {
              id: 'unknown',
              name: ing.name,
              category: 'other',
              quantity: ing.amount,
              unit: ing.unit,
              location: 'pantry',
              addedAt: new Date(),
              updatedAt: new Date(),
            },
            amount: ing.amount,
            unit: ing.unit,
            nutritionContribution: {
              calories: Math.round((recipe.nutrition.calories * ing.amount) / 100),
              protein: Math.round((recipe.nutrition.protein * ing.amount) / 100),
              carbs: Math.round((recipe.nutrition.carbs * ing.amount) / 100),
              fat: Math.round((recipe.nutrition.fat * ing.amount) / 100),
            }
          };
        }),
        instructions: recipe.instructions,
        totalNutrition: recipe.nutrition,
        createdAt: new Date(),
      }));

      return recipes;
    } catch (error) {
      console.error('Error generating recipes with Gemini:', error);
      throw new Error('Failed to generate recipes. Please try again.');
    }
  }

  async getCookingTips(recipe: Recipe, userProfile: UserProfile): Promise<string[]> {
    
    const prompt = `
Gib 3-5 kurze, praktische Kochtipps für folgendes Rezept:

REZEPT: ${recipe.name}
BESCHREIBUNG: ${recipe.description}
ZUTATEN: ${recipe.ingredients.map(ing => `${ing.amount}${ing.unit} ${ing.foodItem.name}`).join(', ')}
ZUBEREITUNGSZEIT: ${recipe.prepTime + recipe.cookTime} Minuten

BENUTZERPROFIL:
- Gesundheitsziel: ${userProfile.healthGoal}
- Aktivitätslevel: ${userProfile.activityLevel}

Konzentriere dich auf:
- Zeitersparnis und Effizienz
- Nährstoff-Optimierung
- Geschmacksverbesserung
- Zubereitungstechniken

Antwort als einfache Liste, ein Tipp pro Zeile, max. 20 Wörter pro Tipp.
`;

    try {
      const result = await apiProxyManager.generateWithGemini([{
        role: 'user',
        parts: [{ text: prompt }]
      }]);
      
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      return text.split('\n').filter(tip => tip.trim().length > 0).slice(0, 5);
    } catch (error) {
      console.error('Error getting cooking tips:', error);
      return ['Verwende frische Zutaten für besten Geschmack', 'Bereite Zutaten vor dem Kochen vor'];
    }
  }

  async analyzeMealBalance(recipes: Recipe[], targetNutrition: any): Promise<{
    analysis: string;
    recommendations: string[];
  }> {
    const totalNutrition = recipes.reduce((total, recipe) => ({
      calories: total.calories + recipe.totalNutrition.calories,
      protein: total.protein + recipe.totalNutrition.protein,
      carbs: total.carbs + recipe.totalNutrition.carbs,
      fat: total.fat + recipe.totalNutrition.fat,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
    
    const prompt = `
Analysiere die Nährstoffbilanz folgender Tagesmahlzeiten:

IST-WERTE:
- Kalorien: ${totalNutrition.calories} kcal
- Protein: ${totalNutrition.protein}g
- Kohlenhydrate: ${totalNutrition.carbs}g
- Fett: ${totalNutrition.fat}g

ZIELWERTE:
- Kalorien: ${targetNutrition.calories} kcal
- Protein: ${targetNutrition.protein}g
- Kohlenhydrate: ${targetNutrition.carbs}g
- Fett: ${targetNutrition.fat}g

MAHLZEITEN:
${recipes.map(r => `${r.name} (${r.mealType}): ${r.totalNutrition.calories} kcal`).join('\n')}

Gib eine kurze Analyse (max. 100 Wörter) und 2-3 konkrete Verbesserungsvorschläge.

Format:
ANALYSE: [Deine Bewertung]
EMPFEHLUNGEN:
- [Empfehlung 1]
- [Empfehlung 2]
- [Empfehlung 3]
`;

    try {
      const result = await apiProxyManager.generateWithGemini([{
        role: 'user',
        parts: [{ text: prompt }]
      }]);
      
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      const analysisMatch = text.match(/ANALYSE:\s*(.+?)(?=EMPFEHLUNGEN:|$)/s);
      const recommendationsMatch = text.match(/EMPFEHLUNGEN:\s*([\s\S]*)/);
      
      return {
        analysis: analysisMatch?.[1]?.trim() || 'Analyse nicht verfügbar',
        recommendations: recommendationsMatch?.[1]
          ?.split('\n')
          ?.filter(line => line.trim().startsWith('-'))
          ?.map(line => line.replace('-', '').trim())
          ?.slice(0, 3) || []
      };
    } catch (error) {
      console.error('Error analyzing meal balance:', error);
      return {
        analysis: 'Analyse momentan nicht verfügbar',
        recommendations: ['Stelle sicher, dass alle Makronährstoffe ausgewogen sind']
      };
    }
  }
}

export default new GeminiService();