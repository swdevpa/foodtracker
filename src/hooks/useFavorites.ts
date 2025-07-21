import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recipe } from '../types/Food';

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Load favorites from storage
  const loadFavorites = async () => {
    try {
      setIsLoading(true);
      const favoritesData = await AsyncStorage.getItem('favoriteRecipes');
      if (favoritesData) {
        const parsedFavorites = JSON.parse(favoritesData).map((recipe: any) => ({
          ...recipe,
          createdAt: new Date(recipe.createdAt),
        }));
        setFavorites(parsedFavorites);
        
        // Create set of IDs for quick lookup
        const ids = new Set(parsedFavorites.map((recipe: Recipe) => recipe.id));
        setFavoriteIds(ids);
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Save favorites to storage
  const saveFavorites = async (updatedFavorites: Recipe[]) => {
    try {
      await AsyncStorage.setItem('favoriteRecipes', JSON.stringify(updatedFavorites));
      setFavorites(updatedFavorites);
      
      // Update IDs set
      const ids = new Set(updatedFavorites.map(recipe => recipe.id));
      setFavoriteIds(ids);
    } catch (error) {
      console.error('Error saving favorites:', error);
      throw error;
    }
  };

  // Add recipe to favorites
  const addToFavorites = async (recipe: Recipe) => {
    if (favoriteIds.has(recipe.id)) {
      return; // Already in favorites
    }

    const updatedFavorites = [...favorites, recipe];
    await saveFavorites(updatedFavorites);
  };

  // Remove recipe from favorites
  const removeFromFavorites = async (recipeId: string) => {
    const updatedFavorites = favorites.filter(recipe => recipe.id !== recipeId);
    await saveFavorites(updatedFavorites);
  };

  // Toggle favorite status
  const toggleFavorite = async (recipe: Recipe) => {
    if (favoriteIds.has(recipe.id)) {
      await removeFromFavorites(recipe.id);
    } else {
      await addToFavorites(recipe);
    }
  };

  // Check if recipe is favorite
  const isFavorite = (recipeId: string): boolean => {
    return favoriteIds.has(recipeId);
  };

  // Get favorites by meal type
  const getFavoritesByMealType = (mealType?: string) => {
    if (!mealType) return favorites;
    return favorites.filter(recipe => recipe.mealType === mealType);
  };

  // Search favorites
  const searchFavorites = (query: string) => {
    if (!query.trim()) return favorites;
    
    const lowercaseQuery = query.toLowerCase();
    return favorites.filter(recipe => 
      recipe.name.toLowerCase().includes(lowercaseQuery) ||
      recipe.description.toLowerCase().includes(lowercaseQuery) ||
      recipe.ingredients.some(ingredient => 
        ingredient.foodItem.name.toLowerCase().includes(lowercaseQuery)
      )
    );
  };

  // Get most recent favorites
  const getRecentFavorites = (limit: number = 5) => {
    return [...favorites]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  };

  // Get favorites statistics
  const getFavoritesStats = () => {
    const totalFavorites = favorites.length;
    const mealTypeCount = favorites.reduce((acc, recipe) => {
      acc[recipe.mealType] = (acc[recipe.mealType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const averageCalories = totalFavorites > 0 
      ? Math.round(favorites.reduce((sum, recipe) => sum + recipe.totalNutrition.calories, 0) / totalFavorites)
      : 0;

    const averageProtein = totalFavorites > 0
      ? Math.round(favorites.reduce((sum, recipe) => sum + recipe.totalNutrition.protein, 0) / totalFavorites)
      : 0;

    return {
      total: totalFavorites,
      mealTypeCount,
      averageCalories,
      averageProtein,
      mostPopularMealType: Object.entries(mealTypeCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null
    };
  };

  // Clear all favorites
  const clearAllFavorites = async () => {
    await saveFavorites([]);
  };

  // Export favorites for backup
  const exportFavorites = () => {
    return JSON.stringify(favorites, null, 2);
  };

  // Import favorites from backup
  const importFavorites = async (favoritesJson: string) => {
    try {
      const importedFavorites = JSON.parse(favoritesJson).map((recipe: any) => ({
        ...recipe,
        createdAt: new Date(recipe.createdAt),
      }));
      
      // Merge with existing favorites, avoiding duplicates
      const existingIds = new Set(favorites.map(r => r.id));
      const newFavorites = importedFavorites.filter((r: Recipe) => !existingIds.has(r.id));
      
      const mergedFavorites = [...favorites, ...newFavorites];
      await saveFavorites(mergedFavorites);
      
      return newFavorites.length; // Return number of new favorites added
    } catch (error) {
      console.error('Error importing favorites:', error);
      throw new Error('Invalid favorites format');
    }
  };

  // Load favorites on hook initialization
  useEffect(() => {
    loadFavorites();
  }, []);

  return {
    favorites,
    favoriteIds,
    isLoading,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    isFavorite,
    getFavoritesByMealType,
    searchFavorites,
    getRecentFavorites,
    getFavoritesStats,
    clearAllFavorites,
    exportFavorites,
    importFavorites,
    loadFavorites
  };
};