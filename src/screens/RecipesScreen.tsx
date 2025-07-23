import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FoodItem, Recipe, MealType } from '../types/Food';
import { UserProfile } from '../types/User';
import geminiService from '../services/api/geminiService';
import { useFavorites } from '../hooks/useFavorites';

export default function RecipesScreen() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [inventory, setInventory] = useState<FoodItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedMealTypes, setSelectedMealTypes] = useState<MealType[]>(['breakfast', 'lunch', 'dinner']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [recipeModalVisible, setRecipeModalVisible] = useState(false);
  const [servings, setServings] = useState(2);

  const { toggleFavorite, isFavorite } = useFavorites();

  useEffect(() => {
    loadUserData();
    loadRecipes();
  }, []);

  const loadUserData = async () => {
    try {
      const [profileData, inventoryData] = await Promise.all([
        AsyncStorage.getItem('userProfile'),
        AsyncStorage.getItem('inventory')
      ]);

      if (profileData) {
        setUserProfile(JSON.parse(profileData));
      }

      if (inventoryData) {
        const parsedInventory = JSON.parse(inventoryData).map((item: any) => ({
          ...item,
          addedAt: new Date(item.addedAt),
          updatedAt: new Date(item.updatedAt),
          expirationDate: item.expirationDate ? new Date(item.expirationDate) : undefined,
        }));
        setInventory(parsedInventory);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadRecipes = async () => {
    try {
      const today = new Date().toDateString();
      const recipesData = await AsyncStorage.getItem(`recipes_${today}`);
      if (recipesData) {
        const parsedRecipes = JSON.parse(recipesData).map((recipe: any) => ({
          ...recipe,
          createdAt: new Date(recipe.createdAt),
        }));
        setRecipes(parsedRecipes);
      }
    } catch (error) {
      console.error('Error loading recipes:', error);
    }
  };

  const saveRecipes = async (newRecipes: Recipe[]) => {
    try {
      const today = new Date().toDateString();
      await AsyncStorage.setItem(`recipes_${today}`, JSON.stringify(newRecipes));
      setRecipes(newRecipes);
    } catch (error) {
      console.error('Error saving recipes:', error);
    }
  };

  const generateRecipes = async () => {
    if (!userProfile) {
      Alert.alert('Fehler', 'Benutzerprofil nicht gefunden');
      return;
    }

    if (inventory.length === 0) {
      Alert.alert('Inventar leer', 'Füge zuerst Lebensmittel zu deinem Inventar hinzu');
      return;
    }

    if (selectedMealTypes.length === 0) {
      Alert.alert('Keine Mahlzeiten', 'Wähle mindestens eine Mahlzeit aus');
      return;
    }

    setIsGenerating(true);

    try {
      const generatedRecipes = await geminiService.generateRecipes(
        userProfile,
        inventory,
        selectedMealTypes,
        servings
      );

      if (generatedRecipes.length > 0) {
        await saveRecipes([...recipes, ...generatedRecipes]);
        Alert.alert('Erfolg!', `${generatedRecipes.length} Rezept(e) generiert`);
      } else {
        Alert.alert('Keine Rezepte', 'Keine passenden Rezepte gefunden. Versuche andere Zutaten.');
      }
    } catch (error) {
      console.error('Error generating recipes:', error);
      Alert.alert('Fehler', 'Rezepte konnten nicht generiert werden. Prüfe deine Internetverbindung.');
    } finally {
      setIsGenerating(false);
    }
  };

  const clearRecipes = () => {
    Alert.alert(
      'Rezepte löschen',
      'Möchtest du alle heutigen Rezepte löschen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: () => saveRecipes([])
        }
      ]
    );
  };

  const showRecipeDetails = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setRecipeModalVisible(true);
  };

  const getMealTypeIcon = (mealType: MealType): string => {
    const icons = {
      breakfast: 'sunny-outline',
      lunch: 'restaurant-outline',
      dinner: 'moon-outline',
      snack: 'fast-food-outline'
    };
    return icons[mealType];
  };

  const getMealTypeLabel = (mealType: MealType): string => {
    const labels = {
      breakfast: 'Frühstück',
      lunch: 'Mittagessen',
      dinner: 'Abendessen',
      snack: 'Snack'
    };
    return labels[mealType];
  };

  const renderMealTypeSelector = () => (
    <View style={styles.mealTypeContainer}>
      <Text style={styles.sectionTitle}>Gewünschte Mahlzeiten</Text>
      <View style={styles.mealTypeGrid}>
        {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map(mealType => (
          <TouchableOpacity
            key={mealType}
            style={[
              styles.mealTypeButton,
              selectedMealTypes.includes(mealType) && styles.selectedMealType
            ]}
            onPress={() => {
              if (selectedMealTypes.includes(mealType)) {
                setSelectedMealTypes(selectedMealTypes.filter(m => m !== mealType));
              } else {
                setSelectedMealTypes([...selectedMealTypes, mealType]);
              }
            }}
          >
            <Ionicons
              name={getMealTypeIcon(mealType) as any}
              size={24}
              color={selectedMealTypes.includes(mealType) ? '#fff' : '#2E7D32'}
            />
            <Text style={[
              styles.mealTypeText,
              selectedMealTypes.includes(mealType) && styles.selectedMealTypeText
            ]}>
              {getMealTypeLabel(mealType)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderServingsSelector = () => (
    <View style={styles.servingsContainer}>
      <Text style={styles.sectionTitle}>Portionen</Text>
      <View style={styles.servingsButtons}>
        {[1, 2, 3, 4].map(count => (
          <TouchableOpacity
            key={count}
            style={[
              styles.servingButton,
              servings === count && styles.selectedServingButton
            ]}
            onPress={() => setServings(count)}
          >
            <Text style={[
              styles.servingButtonText,
              servings === count && styles.selectedServingButtonText
            ]}>
              {count}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderRecipeCard = (recipe: Recipe) => {
    const totalTime = recipe.prepTime + recipe.cookTime;

    return (
      <TouchableOpacity
        key={recipe.id}
        style={styles.recipeCard}
        onPress={() => showRecipeDetails(recipe)}
      >
        <View style={styles.recipeHeader}>
          <View style={styles.recipeInfo}>
            <Ionicons
              name={getMealTypeIcon(recipe.mealType) as any}
              size={20}
              color="#2E7D32"
              style={styles.mealTypeIcon}
            />
            <Text style={styles.recipeMealType}>
              {getMealTypeLabel(recipe.mealType)}
            </Text>
          </View>
          <View style={styles.recipeHeaderRight}>
            <View style={styles.recipeTime}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={styles.recipeTimeText}>{totalTime} Min</Text>
            </View>
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={(e) => {
                e.stopPropagation();
                toggleFavorite(recipe);
              }}
            >
              <Ionicons
                name={isFavorite(recipe.id) ? "heart" : "heart-outline"}
                size={20}
                color={isFavorite(recipe.id) ? "#ff4444" : "#666"}
              />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.recipeName}>{recipe.name}</Text>
        <Text style={styles.recipeDescription} numberOfLines={2}>
          {recipe.description}
        </Text>

        <View style={styles.nutritionSummary}>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>{recipe.totalNutrition.calories}</Text>
            <Text style={styles.nutritionLabel}>kcal</Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>{recipe.totalNutrition.protein}g</Text>
            <Text style={styles.nutritionLabel}>Protein</Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>{recipe.totalNutrition.carbs}g</Text>
            <Text style={styles.nutritionLabel}>Carbs</Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>{recipe.totalNutrition.fat}g</Text>
            <Text style={styles.nutritionLabel}>Fett</Text>
          </View>
        </View>

        <View style={styles.recipeFooter}>
          <Text style={styles.ingredientCount}>
            {recipe.ingredients.length} Zutaten
          </Text>
          <Text style={styles.servingCount}>
            {recipe.servings} Portionen
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderRecipeModal = () => (
    <Modal
      visible={recipeModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setRecipeModalVisible(false)}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Rezept Details</Text>
          <View style={{ width: 24 }} />
        </View>

        {selectedRecipe && (
          <ScrollView style={styles.modalContent}>
            <View style={styles.recipeDetailHeader}>
              <Text style={styles.recipeDetailName}>{selectedRecipe.name}</Text>
              <Text style={styles.recipeDetailDescription}>{selectedRecipe.description}</Text>
              
              <View style={styles.recipeDetailMeta}>
                <View style={styles.recipeMetaItem}>
                  <Ionicons name="time-outline" size={16} color="#666" />
                  <Text style={styles.recipeMetaText}>
                    {selectedRecipe.prepTime + selectedRecipe.cookTime} Min
                  </Text>
                </View>
                <View style={styles.recipeMetaItem}>
                  <Ionicons name="people-outline" size={16} color="#666" />
                  <Text style={styles.recipeMetaText}>
                    {selectedRecipe.servings} Portionen
                  </Text>
                </View>
                <View style={styles.recipeMetaItem}>
                  <Ionicons name={getMealTypeIcon(selectedRecipe.mealType) as any} size={16} color="#666" />
                  <Text style={styles.recipeMetaText}>
                    {getMealTypeLabel(selectedRecipe.mealType)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.nutritionDetailContainer}>
              <Text style={styles.sectionTitle}>Nährstoffe (gesamt)</Text>
              <View style={styles.nutritionDetailGrid}>
                <View style={styles.nutritionDetailItem}>
                  <Text style={styles.nutritionDetailValue}>{selectedRecipe.totalNutrition.calories}</Text>
                  <Text style={styles.nutritionDetailLabel}>Kalorien</Text>
                </View>
                <View style={styles.nutritionDetailItem}>
                  <Text style={styles.nutritionDetailValue}>{selectedRecipe.totalNutrition.protein}g</Text>
                  <Text style={styles.nutritionDetailLabel}>Protein</Text>
                </View>
                <View style={styles.nutritionDetailItem}>
                  <Text style={styles.nutritionDetailValue}>{selectedRecipe.totalNutrition.carbs}g</Text>
                  <Text style={styles.nutritionDetailLabel}>Kohlenhydrate</Text>
                </View>
                <View style={styles.nutritionDetailItem}>
                  <Text style={styles.nutritionDetailValue}>{selectedRecipe.totalNutrition.fat}g</Text>
                  <Text style={styles.nutritionDetailLabel}>Fett</Text>
                </View>
                {selectedRecipe.totalNutrition.fiber && (
                  <View style={styles.nutritionDetailItem}>
                    <Text style={styles.nutritionDetailValue}>{selectedRecipe.totalNutrition.fiber}g</Text>
                    <Text style={styles.nutritionDetailLabel}>Ballaststoffe</Text>
                  </View>
                )}
                {selectedRecipe.totalNutrition.sodium && (
                  <View style={styles.nutritionDetailItem}>
                    <Text style={styles.nutritionDetailValue}>{selectedRecipe.totalNutrition.sodium}mg</Text>
                    <Text style={styles.nutritionDetailLabel}>Natrium</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.ingredientsContainer}>
              <Text style={styles.sectionTitle}>Zutaten</Text>
              {selectedRecipe.ingredients.map((ingredient, index) => (
                <View key={index} style={styles.ingredientItem}>
                  <Text style={styles.ingredientAmount}>
                    {ingredient.amount}{ingredient.unit}
                  </Text>
                  <Text style={styles.ingredientName}>{ingredient.foodItem.name}</Text>
                </View>
              ))}
            </View>

            <View style={styles.instructionsContainer}>
              <Text style={styles.sectionTitle}>Zubereitung</Text>
              {selectedRecipe.instructions.map((instruction, index) => (
                <View key={index} style={styles.instructionItem}>
                  <View style={styles.instructionNumber}>
                    <Text style={styles.instructionNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.instructionText}>{instruction}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );

  const inventoryCount = inventory.length;
  const availableIngredients = inventory.filter(item => item.quantity > 0).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>KI Rezepte</Text>
        {recipes.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={clearRecipes}>
            <Ionicons name="trash-outline" size={20} color="#ff4444" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.inventoryStatus}>
          <View style={styles.statusItem}>
            <Ionicons name="restaurant-outline" size={20} color="#2E7D32" />
            <Text style={styles.statusText}>
              {availableIngredients} von {inventoryCount} Zutaten verfügbar
            </Text>
          </View>
          {inventoryCount === 0 && (
            <Text style={styles.statusWarning}>
              Füge Lebensmittel zu deinem Inventar hinzu!
            </Text>
          )}
        </View>

        {renderMealTypeSelector()}
        {renderServingsSelector()}

        <View style={styles.generateContainer}>
          <TouchableOpacity
            style={[
              styles.generateButton,
              (isGenerating || inventoryCount === 0) && styles.disabledButton
            ]}
            onPress={generateRecipes}
            disabled={isGenerating || inventoryCount === 0}
          >
            {isGenerating ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="sparkles" size={20} color="#fff" />
            )}
            <Text style={styles.generateButtonText}>
              {isGenerating ? 'Generiere Rezepte...' : 'KI Rezepte generieren'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.recipesContainer}>
          {recipes.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>
                Heutige Rezepte ({recipes.length})
              </Text>
              {recipes.map(renderRecipeCard)}
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="restaurant-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Noch keine Rezepte generiert</Text>
              <Text style={styles.emptySubtext}>
                Wähle deine gewünschten Mahlzeiten und lass die KI personalisierte Rezepte erstellen
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {renderRecipeModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  clearButton: {
    padding: 8,
  },
  scrollContainer: {
    flex: 1,
  },
  inventoryStatus: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  statusWarning: {
    fontSize: 14,
    color: '#ff6b35',
    marginTop: 8,
    fontStyle: 'italic',
  },
  mealTypeContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  mealTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  mealTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#2E7D32',
  },
  selectedMealType: {
    backgroundColor: '#2E7D32',
  },
  mealTypeText: {
    fontSize: 14,
    color: '#2E7D32',
    marginLeft: 8,
    fontWeight: '600',
  },
  selectedMealTypeText: {
    color: '#fff',
  },
  servingsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  servingsButtons: {
    flexDirection: 'row',
  },
  servingButton: {
    backgroundColor: '#fff',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  selectedServingButton: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  servingButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  selectedServingButtonText: {
    color: '#fff',
  },
  generateContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  generateButton: {
    backgroundColor: '#2E7D32',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  recipesContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  recipeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recipeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealTypeIcon: {
    marginRight: 4,
  },
  recipeMealType: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '600',
  },
  recipeHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipeTime: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  recipeTimeText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  favoriteButton: {
    padding: 4,
    borderRadius: 20,
  },
  recipeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  recipeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  nutritionSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginBottom: 12,
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#666',
  },
  recipeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ingredientCount: {
    fontSize: 12,
    color: '#666',
  },
  servingCount: {
    fontSize: 12,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    flex: 1,
  },
  recipeDetailHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recipeDetailName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  recipeDetailDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  recipeDetailMeta: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  recipeMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipeMetaText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  nutritionDetailContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  nutritionDetailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  nutritionDetailItem: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  nutritionDetailValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  nutritionDetailLabel: {
    fontSize: 12,
    color: '#666',
  },
  ingredientsContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  ingredientAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    width: 80,
  },
  ingredientName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  instructionsContainer: {
    padding: 20,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  instructionNumber: {
    backgroundColor: '#2E7D32',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  instructionNumberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  instructionText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 20,
  },
});