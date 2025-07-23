import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FoodItem, FoodCategory, FoodUnit, FoodLocation } from '../types/Food';
import fatSecretService from '../services/api/fatSecretService';

export default function InventoryScreen() {
  const [inventory, setInventory] = useState<FoodItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<FoodItem[]>([]);
  const [inventorySearchQuery, setInventorySearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<FoodLocation | 'all'>('all');
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [foodSearchModalVisible, setFoodSearchModalVisible] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [fatSecretSearchQuery, setFatSecretSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [newItem, setNewItem] = useState<Partial<FoodItem>>({
    name: '',
    category: 'other',
    quantity: 1,
    unit: 'g',
    location: 'fridge',
  });

  useEffect(() => {
    loadInventory();
  }, []);

  useEffect(() => {
    filterInventory();
  }, [inventory, inventorySearchQuery, selectedLocation]);

  const loadInventory = async () => {
    try {
      const inventoryData = await AsyncStorage.getItem('inventory');
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
      console.error('Error loading inventory:', error);
    }
  };

  const saveInventory = async (updatedInventory: FoodItem[]) => {
    try {
      await AsyncStorage.setItem('inventory', JSON.stringify(updatedInventory));
      setInventory(updatedInventory);
    } catch (error) {
      console.error('Error saving inventory:', error);
    }
  };

  const filterInventory = () => {
    let filtered = inventory;

    if (inventorySearchQuery.trim() !== '') {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(inventorySearchQuery.toLowerCase())
      );
    }

    if (selectedLocation !== 'all') {
      filtered = filtered.filter(item => item.location === selectedLocation);
    }

    setFilteredInventory(filtered);
  };

  // FatSecret Food Search Functions
  const searchFatSecretFoods = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await fatSecretService.searchFoods(query, 20);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching FatSecret foods:', error);
      Alert.alert('Fehler', 'Lebensmittel-Suche fehlgeschlagen');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const selectFatSecretFood = async (fatSecretFood: any) => {
    setSelectedFood(fatSecretFood);
    
    // Try to get nutrition info
    try {
      const nutrition = await fatSecretService.getFoodNutrition(fatSecretFood.food_id);
      
      // Auto-categorize based on food name/category
      const category = categorizeFatSecretFood(fatSecretFood);
      
      setNewItem({
        name: fatSecretFood.food_name,
        category,
        quantity: 1,
        unit: 'g',
        location: 'fridge',
        foodId: fatSecretFood.food_id,
        nutritionPer100g: nutrition,
      });
      
      setFoodSearchModalVisible(false);
      setAddModalVisible(true);
    } catch (error) {
      console.error('Error getting nutrition info:', error);
      // Continue without nutrition info
      const category = categorizeFatSecretFood(fatSecretFood);
      
      setNewItem({
        name: fatSecretFood.food_name,
        category,
        quantity: 1,
        unit: 'g',
        location: 'fridge',
        foodId: fatSecretFood.food_id,
      });
      
      setFoodSearchModalVisible(false);
      setAddModalVisible(true);
    }
  };

  const categorizeFatSecretFood = (fatSecretFood: any): FoodCategory => {
    const name = fatSecretFood.food_name.toLowerCase();
    const type = fatSecretFood.food_type?.toLowerCase() || '';
    const brand = fatSecretFood.brand_name?.toLowerCase() || '';
    
    if (name.includes('milk') || name.includes('cheese') || name.includes('yogurt') || name.includes('butter') || name.includes('cream')) {
      return 'dairy';
    }
    if (name.includes('meat') || name.includes('beef') || name.includes('chicken') || name.includes('pork') || name.includes('lamb') || name.includes('bacon')) {
      return 'meat';
    }
    if (name.includes('apple') || name.includes('banana') || name.includes('orange') || name.includes('grape') || name.includes('berry') || name.includes('fruit')) {
      return 'fruits';
    }
    if (name.includes('carrot') || name.includes('broccoli') || name.includes('spinach') || name.includes('tomato') || name.includes('lettuce') || name.includes('vegetable')) {
      return 'vegetables';
    }
    if (name.includes('bread') || name.includes('rice') || name.includes('pasta') || name.includes('wheat') || name.includes('cereal') || name.includes('oat')) {
      return 'grains';
    }
    if (name.includes('egg') || name.includes('fish') || name.includes('tofu') || name.includes('salmon') || name.includes('tuna') || name.includes('protein')) {
      return 'proteins';
    }
    if (name.includes('juice') || name.includes('water') || name.includes('soda') || name.includes('coffee') || name.includes('tea') || name.includes('drink')) {
      return 'beverages';
    }
    if (name.includes('chip') || name.includes('cookie') || name.includes('candy') || name.includes('chocolate') || name.includes('snack') || name.includes('cake')) {
      return 'snacks';
    }
    if (name.includes('salt') || name.includes('pepper') || name.includes('herb') || name.includes('spice') || name.includes('seasoning')) {
      return 'spices';
    }
    
    return 'other';
  };

  const addItem = () => {
    if (!newItem.name?.trim()) {
      Alert.alert('Fehler', 'Bitte gib einen Namen für das Lebensmittel ein');
      return;
    }

    const item: FoodItem = {
      id: Date.now().toString(),
      name: newItem.name.trim(),
      category: newItem.category || 'other',
      quantity: newItem.quantity || 1,
      unit: newItem.unit || 'g',
      location: newItem.location || 'fridge',
      addedAt: new Date(),
      updatedAt: new Date(),
      expirationDate: newItem.expirationDate,
    };

    const updatedInventory = [...inventory, item];
    saveInventory(updatedInventory);

    setNewItem({
      name: '',
      category: 'other',
      quantity: 1,
      unit: 'g',
      location: 'fridge',
    });
    setAddModalVisible(false);
  };

  const deleteItem = (itemId: string) => {
    Alert.alert(
      'Löschen bestätigen',
      'Möchtest du dieses Lebensmittel wirklich löschen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: () => {
            const updatedInventory = inventory.filter(item => item.id !== itemId);
            saveInventory(updatedInventory);
          },
        },
      ]
    );
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      deleteItem(itemId);
      return;
    }

    const updatedInventory = inventory.map(item =>
      item.id === itemId
        ? { ...item, quantity: newQuantity, updatedAt: new Date() }
        : item
    );
    saveInventory(updatedInventory);
  };

  const getCategoryIcon = (category: FoodCategory): string => {
    const iconMap: Record<FoodCategory, string> = {
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
    return iconMap[category];
  };

  const getLocationIcon = (location: FoodLocation): string => {
    const iconMap: Record<FoodLocation, string> = {
      fridge: 'snow-outline',
      freezer: 'cube-outline',
      pantry: 'home-outline',
      counter: 'storefront-outline',
    };
    return iconMap[location];
  };

  const getLocationLabel = (location: FoodLocation): string => {
    const labelMap: Record<FoodLocation, string> = {
      fridge: 'Kühlschrank',
      freezer: 'Gefrierfach',
      pantry: 'Vorratsschrank',
      counter: 'Arbeitsplatte',
    };
    return labelMap[location];
  };

  const renderInventoryItem = ({ item }: { item: FoodItem }) => (
    <View style={styles.inventoryItem}>
      <View style={styles.itemHeader}>
        <View style={styles.itemInfo}>
          <Ionicons 
            name={getCategoryIcon(item.category) as any} 
            size={24} 
            color="#2E7D32" 
            style={styles.categoryIcon}
          />
          <View style={styles.itemDetails}>
            <Text style={styles.itemName}>{item.name}</Text>
            <View style={styles.itemMetadata}>
              <Ionicons 
                name={getLocationIcon(item.location) as any} 
                size={14} 
                color="#666" 
              />
              <Text style={styles.itemLocation}>
                {getLocationLabel(item.location)}
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteItem(item.id)}
        >
          <Ionicons name="trash-outline" size={20} color="#ff4444" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.quantityContainer}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateQuantity(item.id, item.quantity - 1)}
        >
          <Ionicons name="remove" size={16} color="#666" />
        </TouchableOpacity>
        
        <Text style={styles.quantity}>
          {item.quantity} {item.unit}
        </Text>
        
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateQuantity(item.id, item.quantity + 1)}
        >
          <Ionicons name="add" size={16} color="#666" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderLocationFilter = () => (
    <View style={styles.locationFilter}>
      {(['all', 'fridge', 'freezer', 'pantry', 'counter'] as const).map((location) => (
        <TouchableOpacity
          key={location}
          style={[
            styles.locationButton,
            selectedLocation === location && styles.selectedLocationButton,
          ]}
          onPress={() => setSelectedLocation(location)}
        >
          <Text
            style={[
              styles.locationButtonText,
              selectedLocation === location && styles.selectedLocationButtonText,
            ]}
          >
            {location === 'all' ? 'Alle' : getLocationLabel(location)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderAddModal = () => (
    <Modal
      visible={addModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setAddModalVisible(false)}>
            <Text style={styles.modalCancelButton}>Abbrechen</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Lebensmittel hinzufügen</Text>
          <TouchableOpacity onPress={addItem}>
            <Text style={styles.modalSaveButton}>Hinzufügen</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.modalContent}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={newItem.name}
            onChangeText={(text) => setNewItem({ ...newItem, name: text })}
            placeholder="z.B. Äpfel, Milch, Brot..."
          />

          <Text style={styles.label}>Kategorie</Text>
          <View style={styles.categoryGrid}>
            {(['fruits', 'vegetables', 'meat', 'dairy', 'grains', 'proteins', 'snacks', 'beverages'] as FoodCategory[]).map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryOption,
                  newItem.category === category && styles.selectedCategoryOption,
                ]}
                onPress={() => setNewItem({ ...newItem, category })}
              >
                <Ionicons 
                  name={getCategoryIcon(category) as any} 
                  size={20} 
                  color={newItem.category === category ? '#fff' : '#2E7D32'} 
                />
                <Text style={[
                  styles.categoryOptionText,
                  newItem.category === category && styles.selectedCategoryOptionText,
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.quantityRow}>
            <View style={styles.quantityInput}>
              <Text style={styles.label}>Menge</Text>
              <TextInput
                style={styles.input}
                value={newItem.quantity?.toString()}
                onChangeText={(text) => setNewItem({ ...newItem, quantity: parseFloat(text) || 1 })}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.unitInput}>
              <Text style={styles.label}>Einheit</Text>
              <View style={styles.unitButtons}>
                {(['g', 'kg', 'ml', 'l', 'pieces'] as FoodUnit[]).map((unit) => (
                  <TouchableOpacity
                    key={unit}
                    style={[
                      styles.unitButton,
                      newItem.unit === unit && styles.selectedUnitButton,
                    ]}
                    onPress={() => setNewItem({ ...newItem, unit })}
                  >
                    <Text style={[
                      styles.unitButtonText,
                      newItem.unit === unit && styles.selectedUnitButtonText,
                    ]}>
                      {unit}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <Text style={styles.label}>Lagerort</Text>
          <View style={styles.locationGrid}>
            {(['fridge', 'freezer', 'pantry', 'counter'] as FoodLocation[]).map((location) => (
              <TouchableOpacity
                key={location}
                style={[
                  styles.locationOption,
                  newItem.location === location && styles.selectedLocationOption,
                ]}
                onPress={() => setNewItem({ ...newItem, location })}
              >
                <Ionicons 
                  name={getLocationIcon(location) as any} 
                  size={20} 
                  color={newItem.location === location ? '#fff' : '#2E7D32'} 
                />
                <Text style={[
                  styles.locationOptionText,
                  newItem.location === location && styles.selectedLocationOptionText,
                ]}>
                  {getLocationLabel(location)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );

  const renderFoodSearchModal = () => (
    <Modal
      visible={foodSearchModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => {
            setFoodSearchModalVisible(false);
            setFatSecretSearchQuery('');
            setSearchResults([]);
          }}>
            <Text style={styles.modalCancelButton}>Abbrechen</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Lebensmittel suchen</Text>
          <View style={{ width: 80 }} />
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="z.B. Äpfel, Milch, Brot..."
              value={fatSecretSearchQuery}
              onChangeText={(text) => {
                setFatSecretSearchQuery(text);
                if (text.length > 2) {
                  searchFatSecretFoods(text);
                } else {
                  setSearchResults([]);
                }
              }}
              autoFocus
            />
            {isSearching && (
              <ActivityIndicator size="small" color="#2E7D32" />
            )}
          </View>
        </View>

        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.food_id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.searchResultItem}
              onPress={() => selectFatSecretFood(item)}
            >
              <View style={styles.searchResultInfo}>
                <Text style={styles.searchResultName} numberOfLines={2}>
                  {item.food_name}
                </Text>
                <Text style={styles.searchResultCategory}>
                  {item.food_type || 'Keine Kategorie'}
                </Text>
                {item.brand_name && (
                  <Text style={styles.searchResultBrand}>
                    {item.brand_name}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.searchResultsList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            !isSearching && fatSecretSearchQuery.length > 2 ? (
              <View style={styles.emptySearchContainer}>
                <Ionicons name="search-outline" size={48} color="#ccc" />
                <Text style={styles.emptySearchText}>
                  Keine Ergebnisse gefunden
                </Text>
                <Text style={styles.emptySearchSubtext}>
                  Versuche andere Suchbegriffe
                </Text>
              </View>
            ) : fatSecretSearchQuery.length <= 2 ? (
              <View style={styles.emptySearchContainer}>
                <Ionicons name="restaurant-outline" size={48} color="#ccc" />
                <Text style={styles.emptySearchText}>
                  FatSecret Lebensmittel-Datenbank
                </Text>
                <Text style={styles.emptySearchSubtext}>
                  Suche nach Millionen von Lebensmitteln mit detaillierten Nährstoffangaben
                </Text>
              </View>
            ) : null
          }
        />
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mein Inventar</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => setFoodSearchModalVisible(true)}
          >
            <Ionicons name="search" size={20} color="#2E7D32" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setAddModalVisible(true)}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Inventar durchsuchen..."
            value={inventorySearchQuery}
            onChangeText={setInventorySearchQuery}
          />
        </View>
      </View>

      {renderLocationFilter()}

      <FlatList
        data={filteredInventory}
        keyExtractor={(item) => item.id}
        renderItem={renderInventoryItem}
        contentContainerStyle={styles.inventoryList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="restaurant-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Dein Inventar ist leer</Text>
            <Text style={styles.emptySubtext}>
              Füge Lebensmittel hinzu, um personalisierte Rezepte zu erhalten
            </Text>
          </View>
        }
      />

      {renderAddModal()}
      {renderFoodSearchModal()}
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchButton: {
    backgroundColor: '#E8F5E8',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  addButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
  locationFilter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  locationButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#fff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedLocationButton: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  locationButtonText: {
    fontSize: 12,
    color: '#666',
  },
  selectedLocationButtonText: {
    color: '#fff',
  },
  inventoryList: {
    paddingHorizontal: 20,
  },
  inventoryItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemLocation: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  deleteButton: {
    padding: 4,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantity: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 16,
    color: '#333',
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
  modalCancelButton: {
    fontSize: 16,
    color: '#666',
  },
  modalSaveButton: {
    fontSize: 16,
    color: '#2E7D32',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
    marginBottom: 16,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedCategoryOption: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  categoryOptionText: {
    fontSize: 12,
    color: '#333',
    marginLeft: 4,
  },
  selectedCategoryOptionText: {
    color: '#fff',
  },
  quantityRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  quantityInput: {
    flex: 1,
    marginRight: 16,
  },
  unitInput: {
    flex: 1,
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
  locationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    width: '48%',
  },
  selectedLocationOption: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  locationOptionText: {
    fontSize: 12,
    color: '#333',
    marginLeft: 4,
  },
  selectedLocationOptionText: {
    color: '#fff',
  },
  searchResultsList: {
    padding: 20,
  },
  searchResultItem: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  searchResultCategory: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  searchResultBrand: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  emptySearchContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptySearchText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySearchSubtext: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    marginTop: 8,
  },
});