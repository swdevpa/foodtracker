import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ShoppingList, ShoppingListItem } from '../types/ShoppingList';
import { Recipe, FoodItem } from '../types/Food';

export const useShoppingList = () => {
  const [currentList, setCurrentList] = useState<ShoppingList | null>(null);
  const [allLists, setAllLists] = useState<ShoppingList[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load current shopping list
  const loadCurrentList = async () => {
    try {
      setIsLoading(true);
      const currentListData = await AsyncStorage.getItem('currentShoppingList');
      if (currentListData) {
        const parsedList = JSON.parse(currentListData);
        parsedList.createdAt = new Date(parsedList.createdAt);
        parsedList.updatedAt = new Date(parsedList.updatedAt);
        parsedList.items = parsedList.items.map((item: any) => ({
          ...item,
          addedAt: new Date(item.addedAt),
        }));
        setCurrentList(parsedList);
      }
    } catch (error) {
      console.error('Error loading current shopping list:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load all shopping lists
  const loadAllLists = async () => {
    try {
      const allListsData = await AsyncStorage.getItem('shoppingLists');
      if (allListsData) {
        const parsedLists = JSON.parse(allListsData).map((list: any) => ({
          ...list,
          createdAt: new Date(list.createdAt),
          updatedAt: new Date(list.updatedAt),
          items: list.items.map((item: any) => ({
            ...item,
            addedAt: new Date(item.addedAt),
          })),
        }));
        setAllLists(parsedLists);
      }
    } catch (error) {
      console.error('Error loading all shopping lists:', error);
    }
  };

  // Save current shopping list
  const saveCurrentList = async (list: ShoppingList) => {
    try {
      await AsyncStorage.setItem('currentShoppingList', JSON.stringify(list));
      setCurrentList(list);
    } catch (error) {
      console.error('Error saving current shopping list:', error);
      throw error;
    }
  };

  // Save all shopping lists
  const saveAllLists = async (lists: ShoppingList[]) => {
    try {
      await AsyncStorage.setItem('shoppingLists', JSON.stringify(lists));
      setAllLists(lists);
    } catch (error) {
      console.error('Error saving all shopping lists:', error);
      throw error;
    }
  };

  // Create new shopping list
  const createShoppingList = async (name: string) => {
    const newList: ShoppingList = {
      id: Date.now().toString(),
      name,
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    };

    // Deactivate current list if exists
    if (currentList) {
      const updatedCurrentList = { ...currentList, isActive: false };
      const updatedAllLists = allLists.map(list => 
        list.id === currentList.id ? updatedCurrentList : list
      );
      await saveAllLists([...updatedAllLists, newList]);
    } else {
      await saveAllLists([...allLists, newList]);
    }

    await saveCurrentList(newList);
    return newList;
  };

  // Generate shopping list from recipes
  const generateFromRecipes = async (recipes: Recipe[], inventory: FoodItem[], listName?: string) => {
    try {
      // Calculate required ingredients
      const requiredIngredients = new Map<string, {
        name: string;
        totalAmount: number;
        unit: string;
        category: string;
        recipeIds: string[];
      }>();

      recipes.forEach(recipe => {
        recipe.ingredients.forEach(ingredient => {
          const key = ingredient.foodItem.name.toLowerCase();
          const existing = requiredIngredients.get(key);
          
          if (existing) {
            existing.totalAmount += ingredient.amount;
            existing.recipeIds.push(recipe.id);
          } else {
            requiredIngredients.set(key, {
              name: ingredient.foodItem.name,
              totalAmount: ingredient.amount,
              unit: ingredient.unit,
              category: ingredient.foodItem.category,
              recipeIds: [recipe.id],
            });
          }
        });
      });

      // Check against inventory
      const shoppingItems: ShoppingListItem[] = [];
      
      requiredIngredients.forEach(required => {
        const inventoryItem = inventory.find(item => 
          item.name.toLowerCase() === required.name.toLowerCase()
        );
        
        const availableAmount = inventoryItem?.quantity || 0;
        const neededAmount = Math.max(0, required.totalAmount - availableAmount);
        
        if (neededAmount > 0) {
          shoppingItems.push({
            id: Date.now().toString() + Math.random(),
            name: required.name,
            amount: Math.ceil(neededAmount), // Round up for shopping
            unit: required.unit,
            category: required.category,
            isChecked: false,
            addedAt: new Date(),
            recipeIds: required.recipeIds,
          });
        }
      });

      // Create the shopping list
      const newList: ShoppingList = {
        id: Date.now().toString(),
        name: listName || `Rezepte vom ${new Date().toLocaleDateString()}`,
        items: shoppingItems,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      };

      // Deactivate current list
      if (currentList) {
        const updatedCurrentList = { ...currentList, isActive: false };
        const updatedAllLists = allLists.map(list => 
          list.id === currentList.id ? updatedCurrentList : list
        );
        await saveAllLists([...updatedAllLists, newList]);
      } else {
        await saveAllLists([...allLists, newList]);
      }

      await saveCurrentList(newList);
      return newList;
    } catch (error) {
      console.error('Error generating shopping list from recipes:', error);
      throw error;
    }
  };

  // Add item to current list
  const addItem = async (item: Omit<ShoppingListItem, 'id' | 'addedAt'>) => {
    if (!currentList) return;

    const newItem: ShoppingListItem = {
      ...item,
      id: Date.now().toString() + Math.random(),
      addedAt: new Date(),
    };

    const updatedList = {
      ...currentList,
      items: [...currentList.items, newItem],
      updatedAt: new Date(),
    };

    await saveCurrentList(updatedList);
  };

  // Update item in current list
  const updateItem = async (itemId: string, updates: Partial<ShoppingListItem>) => {
    if (!currentList) return;

    const updatedList = {
      ...currentList,
      items: currentList.items.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      ),
      updatedAt: new Date(),
    };

    await saveCurrentList(updatedList);
  };

  // Remove item from current list
  const removeItem = async (itemId: string) => {
    if (!currentList) return;

    const updatedList = {
      ...currentList,
      items: currentList.items.filter(item => item.id !== itemId),
      updatedAt: new Date(),
    };

    await saveCurrentList(updatedList);
  };

  // Toggle item checked status
  const toggleItemChecked = async (itemId: string) => {
    if (!currentList) return;

    const item = currentList.items.find(i => i.id === itemId);
    if (!item) return;

    await updateItem(itemId, { isChecked: !item.isChecked });
  };

  // Clear checked items
  const clearCheckedItems = async () => {
    if (!currentList) return;

    const updatedList = {
      ...currentList,
      items: currentList.items.filter(item => !item.isChecked),
      updatedAt: new Date(),
    };

    await saveCurrentList(updatedList);
  };

  // Get shopping statistics
  const getShoppingStats = () => {
    if (!currentList) return null;

    const totalItems = currentList.items.length;
    const checkedItems = currentList.items.filter(item => item.isChecked).length;
    const progress = totalItems > 0 ? (checkedItems / totalItems) * 100 : 0;
    
    const categoryCounts = currentList.items.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const estimatedCost = currentList.items.reduce((total, item) => {
      // Simple cost estimation based on category and amount
      const baseCosts: Record<string, number> = {
        'fruits': 3,
        'vegetables': 2,
        'meat': 8,
        'dairy': 4,
        'grains': 1.5,
        'proteins': 6,
        'snacks': 3,
        'beverages': 2,
        'spices': 5,
        'other': 3,
      };
      
      const costPerUnit = baseCosts[item.category] || 3;
      return total + (item.amount * costPerUnit);
    }, 0);

    return {
      totalItems,
      checkedItems,
      progress,
      categoryCounts,
      estimatedCost: Math.round(estimatedCost * 100) / 100,
    };
  };

  // Group items by category
  const getItemsByCategory = () => {
    if (!currentList) return {};

    return currentList.items.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, ShoppingListItem[]>);
  };

  // Export shopping list
  const exportList = (format: 'text' | 'json' = 'text') => {
    if (!currentList) return '';

    if (format === 'json') {
      return JSON.stringify(currentList, null, 2);
    }

    // Text format
    let text = `${currentList.name}\n`;
    text += `Erstellt: ${currentList.createdAt.toLocaleDateString()}\n\n`;
    
    const itemsByCategory = getItemsByCategory();
    Object.entries(itemsByCategory).forEach(([category, items]) => {
      text += `${category.toUpperCase()}:\n`;
      items.forEach(item => {
        const status = item.isChecked ? '✓' : '☐';
        text += `${status} ${item.amount}${item.unit} ${item.name}\n`;
      });
      text += '\n';
    });

    return text;
  };

  // Initialize
  useEffect(() => {
    loadCurrentList();
    loadAllLists();
  }, []);

  return {
    currentList,
    allLists,
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
    loadCurrentList,
    loadAllLists,
  };
};