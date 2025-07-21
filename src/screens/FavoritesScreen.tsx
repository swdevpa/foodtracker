import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Recipe, MealType, FoodItem } from '../types/Food';
import { useFavorites } from '../hooks/useFavorites';
import { useShoppingList } from '../hooks/useShoppingList';

interface Props {
  navigation: any;
}

export default function FavoritesScreen({ navigation }: Props) {
  const {
    favorites,
    isLoading,
    removeFromFavorites,
    searchFavorites,
    getFavoritesByMealType,
    getFavoritesStats,
    clearAllFavorites,
    exportFavorites
  } = useFavorites();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMealType, setSelectedMealType] = useState<MealType | 'all'>('all');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [inventory, setInventory] = useState<FoodItem[]>([]);
  const [showShoppingModal, setShowShoppingModal] = useState(false);
  const [selectedFavoritesForShopping, setSelectedFavoritesForShopping] = useState<string[]>([]);

  const { generateFromRecipes } = useShoppingList();

  // Filter favorites based on search and meal type
  const getFilteredFavorites = () => {
    let filtered = favorites;

    if (selectedMealType !== 'all') {
      filtered = getFavoritesByMealType(selectedMealType);
    }

    if (searchQuery.trim()) {
      filtered = searchFavorites(searchQuery);
    }

    return filtered;
  };

  const filteredFavorites = getFilteredFavorites();
  const stats = getFavoritesStats();

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

  const handleRemoveFavorite = (recipeId: string, recipeName: string) => {
    Alert.alert(
      'Favorit entfernen',
      `Möchtest du "${recipeName}" aus den Favoriten entfernen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Entfernen',
          style: 'destructive',
          onPress: () => removeFromFavorites(recipeId)
        }
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Alle Favoriten löschen',
      'Möchtest du wirklich alle Favoriten löschen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: clearAllFavorites
        }
      ]
    );
  };

  const handleExportFavorites = async () => {
    try {
      const exportData = exportFavorites();
      await Share.share({
        message: exportData,
        title: 'Meine Lieblingsrezepte'
      });
    } catch (error) {
      Alert.alert('Fehler', 'Favoriten konnten nicht exportiert werden');
    }
  };

  const renderMealTypeFilter = () => (
    <View style={styles.filterContainer}>
      <Text style={styles.filterLabel}>Filter:</Text>
      <View style={styles.mealTypeFilter}>
        {(['all', 'breakfast', 'lunch', 'dinner', 'snack'] as const).map((mealType) => (
          <TouchableOpacity
            key={mealType}
            style={[
              styles.filterButton,
              selectedMealType === mealType && styles.selectedFilterButton
            ]}
            onPress={() => setSelectedMealType(mealType)}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedMealType === mealType && styles.selectedFilterButtonText
              ]}
            >
              {mealType === 'all' ? 'Alle' : getMealTypeLabel(mealType as MealType)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStatsCard = () => (
    <View style={styles.statsCard}>
      <Text style={styles.statsTitle}>Deine Favoriten</Text>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Gesamt</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.averageCalories}</Text>
          <Text style={styles.statLabel}>Ø Kalorien</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.averageProtein}g</Text>
          <Text style={styles.statLabel}>Ø Protein</Text>
        </View>
        {stats.mostPopularMealType && (
          <View style={styles.statItem}>
            <Ionicons 
              name={getMealTypeIcon(stats.mostPopularMealType as MealType) as any} 
              size={20} 
              color="#2E7D32" 
            />
            <Text style={styles.statLabel}>Beliebteste</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderFavoriteItem = ({ item }: { item: Recipe }) => {
    const totalTime = item.prepTime + item.cookTime;

    return (
      <View style={styles.recipeCard}>
        <View style={styles.recipeHeader}>
          <View style={styles.recipeInfo}>
            <Ionicons
              name={getMealTypeIcon(item.mealType) as any}
              size={20}
              color="#2E7D32"
              style={styles.mealTypeIcon}
            />
            <Text style={styles.recipeMealType}>
              {getMealTypeLabel(item.mealType)}
            </Text>
          </View>
          <View style={styles.recipeActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('RecipeDetail', { recipe: item })}
            >
              <Ionicons name="eye-outline" size={20} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleRemoveFavorite(item.id, item.name)}
            >
              <Ionicons name="heart" size={20} color="#e74c3c" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.recipeName}>{item.name}</Text>
        <Text style={styles.recipeDescription} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.recipeDetails}>
          <View style={styles.recipeDetailItem}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.recipeDetailText}>{totalTime} Min</Text>
          </View>
          <View style={styles.recipeDetailItem}>
            <Ionicons name="people-outline" size={16} color="#666" />
            <Text style={styles.recipeDetailText}>{item.servings} Portionen</Text>
          </View>
          <View style={styles.recipeDetailItem}>
            <Ionicons name="restaurant-outline" size={16} color="#666" />
            <Text style={styles.recipeDetailText}>{item.ingredients.length} Zutaten</Text>
          </View>
        </View>

        <View style={styles.nutritionSummary}>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>{item.totalNutrition.calories}</Text>
            <Text style={styles.nutritionLabel}>kcal</Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>{item.totalNutrition.protein}g</Text>
            <Text style={styles.nutritionLabel}>Protein</Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>{item.totalNutrition.carbs}g</Text>
            <Text style={styles.nutritionLabel}>Carbs</Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>{item.totalNutrition.fat}g</Text>
            <Text style={styles.nutritionLabel}>Fett</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="heart-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>
        {searchQuery.trim() ? 'Keine passenden Favoriten' : 'Noch keine Favoriten'}
      </Text>
      <Text style={styles.emptySubtext}>
        {searchQuery.trim() 
          ? 'Versuche einen anderen Suchbegriff'
          : 'Markiere Rezepte als Favoriten, um sie hier zu finden'
        }
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Lade Favoriten...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Favoriten</Text>
        <View style={styles.headerActions}>
          {favorites.length > 0 && (
            <>
              <TouchableOpacity style={styles.headerButton} onPress={() => setShowShoppingModal(true)}>
                <Ionicons name="basket-outline" size={20} color="#2E7D32" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton} onPress={handleExportFavorites}>
                <Ionicons name="share-outline" size={20} color="#2E7D32" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton} onPress={handleClearAll}>
                <Ionicons name="trash-outline" size={20} color="#e74c3c" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {favorites.length > 0 && (
        <>
          {renderStatsCard()}
          
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Favoriten durchsuchen..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close" size={20} color="#666" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {renderMealTypeFilter()}
        </>
      )}

      <FlatList
        data={filteredFavorites}
        keyExtractor={(item) => item.id}
        renderItem={renderFavoriteItem}
        contentContainerStyle={[
          styles.listContainer,
          filteredFavorites.length === 0 && styles.emptyListContainer
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  statsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  filterContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  mealTypeFilter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#fff',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedFilterButton: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#666',
  },
  selectedFilterButtonText: {
    color: '#fff',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyListContainer: {
    flex: 1,
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
  recipeActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 4,
    marginLeft: 8,
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
  recipeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  recipeDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipeDetailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  nutritionSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
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
});