import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Share,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useShoppingList } from '../hooks/useShoppingList';
import { Recipe, FoodItem } from '../types/Food';
import { ShoppingListItem } from '../types/ShoppingList';

export default function ShoppingListScreen() {
  const {
    currentList,
    isLoading,
    createShoppingList,
    generateFromRecipes,
    addItem,
    updateItem,
    removeItem,
    toggleItemChecked,
    clearCheckedItems,
    getShoppingStats,
    getItemsByCategory,
    exportList,
  } = useShoppingList();

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [recipeModalVisible, setRecipeModalVisible] = useState(false);
  const [availableRecipes, setAvailableRecipes] = useState<Recipe[]>([]);
  const [selectedRecipes, setSelectedRecipes] = useState<string[]>([]);
  const [inventory, setInventory] = useState<FoodItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('1');
  const [newItemUnit, setNewItemUnit] = useState('stk');
  const [newItemCategory, setNewItemCategory] = useState('other');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadRecipesAndInventory();
  }, []);

  const loadRecipesAndInventory = async () => {
    try {
      const [recipesData, inventoryData] = await Promise.all([
        AsyncStorage.getItem(`recipes_${new Date().toDateString()}`),
        AsyncStorage.getItem('inventory')
      ]);

      if (recipesData) {
        const recipes = JSON.parse(recipesData).map((recipe: any) => ({
          ...recipe,
          createdAt: new Date(recipe.createdAt),
        }));
        setAvailableRecipes(recipes);
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
      console.error('Error loading recipes and inventory:', error);
    }
  };

  const handleCreateNewList = () => {
    Alert.alert(
      'Neue Einkaufsliste',
      'Möchtest du eine neue leere Liste erstellen oder aus Rezepten generieren?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Leere Liste', onPress: () => createEmptyList() },
        { text: 'Aus Rezepten', onPress: () => setRecipeModalVisible(true) },
      ]
    );
  };

  const createEmptyList = async () => {
    try {
      await createShoppingList(`Einkaufsliste ${new Date().toLocaleDateString()}`);
    } catch (error) {
      Alert.alert('Fehler', 'Liste konnte nicht erstellt werden');
    }
  };

  const handleGenerateFromRecipes = async () => {
    if (selectedRecipes.length === 0) {
      Alert.alert('Keine Rezepte', 'Wähle mindestens ein Rezept aus');
      return;
    }

    setIsGenerating(true);
    try {
      const recipes = availableRecipes.filter(recipe => selectedRecipes.includes(recipe.id));
      await generateFromRecipes(recipes, inventory);
      setRecipeModalVisible(false);
      setSelectedRecipes([]);
    } catch (error) {
      Alert.alert('Fehler', 'Liste konnte nicht generiert werden');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddManualItem = async () => {
    if (!newItemName.trim()) {
      Alert.alert('Fehler', 'Bitte gib einen Namen ein');
      return;
    }

    try {
      await addItem({
        name: newItemName.trim(),
        amount: parseFloat(newItemAmount) || 1,
        unit: newItemUnit,
        category: newItemCategory,
        isChecked: false,
        recipeIds: [],
      });

      setNewItemName('');
      setNewItemAmount('1');
      setNewItemUnit('stk');
      setNewItemCategory('other');
      setAddModalVisible(false);
    } catch (error) {
      Alert.alert('Fehler', 'Element konnte nicht hinzugefügt werden');
    }
  };

  const handleRemoveItem = (item: ShoppingListItem) => {
    Alert.alert(
      'Element entfernen',
      `Möchtest du "${item.name}" von der Liste entfernen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Entfernen', style: 'destructive', onPress: () => removeItem(item.id) }
      ]
    );
  };

  const handleClearChecked = () => {
    const stats = getShoppingStats();
    if (!stats || stats.checkedItems === 0) return;

    Alert.alert(
      'Erledigte entfernen',
      `Möchtest du alle ${stats.checkedItems} erledigten Elemente entfernen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Entfernen', style: 'destructive', onPress: clearCheckedItems }
      ]
    );
  };

  const handleShare = async () => {
    try {
      const textContent = exportList('text');
      await Share.share({
        message: textContent,
        title: currentList?.name || 'Einkaufsliste'
      });
    } catch (error) {
      Alert.alert('Fehler', 'Liste konnte nicht geteilt werden');
    }
  };

  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      fruits: 'leaf-outline',
      vegetables: 'nutrition-outline',
      meat: 'restaurant-outline',
      dairy: 'water-outline',
      grains: 'barcode-outline',
      proteins: 'fitness-outline',
      snacks: 'fast-food-outline',
      beverages: 'wine-outline',
      spices: 'flower-outline',
      other: 'ellipsis-horizontal-outline',
    };
    return icons[category] || 'ellipsis-horizontal-outline';
  };

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      fruits: 'Obst',
      vegetables: 'Gemüse',
      meat: 'Fleisch',
      dairy: 'Milchprodukte',
      grains: 'Getreide',
      proteins: 'Proteine',
      snacks: 'Snacks',
      beverages: 'Getränke',
      spices: 'Gewürze',
      other: 'Sonstiges',
    };
    return labels[category] || 'Sonstiges';
  };

  const renderShoppingItem = ({ item }: { item: ShoppingListItem }) => (
    <TouchableOpacity
      style={[styles.shoppingItem, item.isChecked && styles.checkedItem]}
      onPress={() => toggleItemChecked(item.id)}
      onLongPress={() => handleRemoveItem(item)}
    >
      <View style={styles.itemLeft}>
        <TouchableOpacity
          style={[styles.checkbox, item.isChecked && styles.checkedBox]}
          onPress={() => toggleItemChecked(item.id)}
        >
          {item.isChecked && <Ionicons name="checkmark" size={16} color="#fff" />}
        </TouchableOpacity>
        
        <View style={styles.itemInfo}>
          <Text style={[styles.itemName, item.isChecked && styles.checkedText]}>
            {item.name}
          </Text>
          <Text style={styles.itemDetails}>
            {item.amount}{item.unit}
          </Text>
        </View>
      </View>

      <View style={styles.itemRight}>
        <Ionicons
          name={getCategoryIcon(item.category) as any}
          size={16}
          color={item.isChecked ? '#999' : '#666'}
        />
      </View>
    </TouchableOpacity>
  );

  const renderCategorySection = (category: string, items: ShoppingListItem[]) => (
    <View key={category} style={styles.categorySection}>
      <Text style={styles.categoryTitle}>
        <Ionicons name={getCategoryIcon(category) as any} size={16} color="#2E7D32" />
        {' '}{getCategoryLabel(category)} ({items.length})
      </Text>
      {items.map(item => (
        <View key={item.id}>
          {renderShoppingItem({ item })}
        </View>
      ))}
    </View>
  );

  const renderRecipeModal = () => (
    <Modal visible={recipeModalVisible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setRecipeModalVisible(false)}>
            <Text style={styles.modalCancelButton}>Abbrechen</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Rezepte wählen</Text>
          <TouchableOpacity 
            onPress={handleGenerateFromRecipes}
            disabled={isGenerating || selectedRecipes.length === 0}
          >
            <Text style={[
              styles.modalSaveButton,
              (isGenerating || selectedRecipes.length === 0) && styles.disabledButton
            ]}>
              {isGenerating ? 'Generiere...' : 'Erstellen'}
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={availableRecipes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.recipeItem,
                selectedRecipes.includes(item.id) && styles.selectedRecipeItem
              ]}
              onPress={() => {
                if (selectedRecipes.includes(item.id)) {
                  setSelectedRecipes(selectedRecipes.filter(id => id !== item.id));
                } else {
                  setSelectedRecipes([...selectedRecipes, item.id]);
                }
              }}
            >
              <View style={styles.recipeInfo}>
                <Text style={styles.recipeName}>{item.name}</Text>
                <Text style={styles.recipeDetails}>
                  {item.ingredients.length} Zutaten • {item.servings} Portionen
                </Text>
              </View>
              {selectedRecipes.includes(item.id) && (
                <Ionicons name="checkmark-circle" size={24} color="#2E7D32" />
              )}
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.recipeList}
        />
      </SafeAreaView>
    </Modal>
  );

  const renderAddModal = () => (
    <Modal visible={addModalVisible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setAddModalVisible(false)}>
            <Text style={styles.modalCancelButton}>Abbrechen</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Element hinzufügen</Text>
          <TouchableOpacity onPress={handleAddManualItem}>
            <Text style={styles.modalSaveButton}>Hinzufügen</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.addForm}>
          <Text style={styles.formLabel}>Name</Text>
          <TextInput
            style={styles.formInput}
            value={newItemName}
            onChangeText={setNewItemName}
            placeholder="z.B. Milch, Brot..."
          />

          <View style={styles.formRow}>
            <View style={styles.formHalf}>
              <Text style={styles.formLabel}>Menge</Text>
              <TextInput
                style={styles.formInput}
                value={newItemAmount}
                onChangeText={setNewItemAmount}
                keyboardType="numeric"
                placeholder="1"
              />
            </View>
            <View style={styles.formHalf}>
              <Text style={styles.formLabel}>Einheit</Text>
              <View style={styles.unitButtons}>
                {['stk', 'kg', 'g', 'l', 'ml'].map(unit => (
                  <TouchableOpacity
                    key={unit}
                    style={[
                      styles.unitButton,
                      newItemUnit === unit && styles.selectedUnitButton
                    ]}
                    onPress={() => setNewItemUnit(unit)}
                  >
                    <Text style={[
                      styles.unitButtonText,
                      newItemUnit === unit && styles.selectedUnitButtonText
                    ]}>
                      {unit}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <Text style={styles.formLabel}>Kategorie</Text>
          <View style={styles.categoryGrid}>
            {Object.keys({
              fruits: 'Obst',
              vegetables: 'Gemüse',
              meat: 'Fleisch',
              dairy: 'Milchprodukte',
              grains: 'Getreide',
              proteins: 'Proteine',
              snacks: 'Snacks',
              beverages: 'Getränke'
            }).map(category => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryButton,
                  newItemCategory === category && styles.selectedCategoryButton
                ]}
                onPress={() => setNewItemCategory(category)}
              >
                <Ionicons
                  name={getCategoryIcon(category) as any}
                  size={16}
                  color={newItemCategory === category ? '#fff' : '#2E7D32'}
                />
                <Text style={[
                  styles.categoryButtonText,
                  newItemCategory === category && styles.selectedCategoryButtonText
                ]}>
                  {getCategoryLabel(category)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text>Lade Einkaufsliste...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const stats = getShoppingStats();
  const itemsByCategory = getItemsByCategory();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Einkaufsliste</Text>
        <View style={styles.headerActions}>
          {currentList && (
            <>
              <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
                <Ionicons name="share-outline" size={20} color="#2E7D32" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton} onPress={() => setAddModalVisible(true)}>
                <Ionicons name="add" size={20} color="#2E7D32" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {currentList ? (
        <>
          {stats && (
            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>{currentList.name}</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.totalItems}</Text>
                  <Text style={styles.statLabel}>Gesamt</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.checkedItems}</Text>
                  <Text style={styles.statLabel}>Erledigt</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{Math.round(stats.progress)}%</Text>
                  <Text style={styles.statLabel}>Fortschritt</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>€{stats.estimatedCost}</Text>
                  <Text style={styles.statLabel}>Geschätzt</Text>
                </View>
              </View>
              
              {stats.progress > 0 && (
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${stats.progress}%` }]} />
                </View>
              )}

              {stats.checkedItems > 0 && (
                <TouchableOpacity style={styles.clearButton} onPress={handleClearChecked}>
                  <Text style={styles.clearButtonText}>
                    {stats.checkedItems} erledigte entfernen
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <FlatList
            data={Object.entries(itemsByCategory)}
            keyExtractor={([category]) => category}
            renderItem={({ item: [category, items] }) => renderCategorySection(category, items)}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="basket-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Keine Einkaufsliste</Text>
          <Text style={styles.emptySubtext}>
            Erstelle eine neue Liste oder generiere sie aus deinen Rezepten
          </Text>
          <TouchableOpacity style={styles.createButton} onPress={handleCreateNewList}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.createButtonText}>Neue Liste erstellen</Text>
          </TouchableOpacity>
        </View>
      )}

      {renderRecipeModal()}
      {renderAddModal()}
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
    marginBottom: 12,
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
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  clearButton: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ff6b35',
    borderRadius: 20,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  shoppingItem: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  checkedItem: {
    opacity: 0.6,
    backgroundColor: '#f5f5f5',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedBox: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  checkedText: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  itemDetails: {
    fontSize: 12,
    color: '#666',
  },
  itemRight: {
    marginLeft: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
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
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7D32',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
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
  modalCancelButton: {
    fontSize: 16,
    color: '#666',
  },
  modalSaveButton: {
    fontSize: 16,
    color: '#2E7D32',
    fontWeight: '600',
  },
  disabledButton: {
    color: '#ccc',
  },
  recipeList: {
    padding: 20,
  },
  recipeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedRecipeItem: {
    borderColor: '#2E7D32',
    backgroundColor: '#E8F5E8',
  },
  recipeInfo: {
    flex: 1,
  },
  recipeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  recipeDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  addForm: {
    padding: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  formHalf: {
    width: '48%',
  },
  unitButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  unitButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    marginRight: 4,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedUnitButton: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  unitButtonText: {
    fontSize: 12,
    color: '#333',
  },
  selectedUnitButtonText: {
    color: '#fff',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedCategoryButton: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  categoryButtonText: {
    fontSize: 11,
    color: '#333',
    marginLeft: 4,
  },
  selectedCategoryButtonText: {
    color: '#fff',
  },
});