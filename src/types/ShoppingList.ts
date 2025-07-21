export interface ShoppingListItem {
  id: string;
  name: string;
  amount: number;
  unit: string;
  category: string;
  isChecked: boolean;
  addedAt: Date;
  recipeIds: string[]; // Track which recipes need this item
}

export interface ShoppingList {
  id: string;
  name: string;
  items: ShoppingListItem[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface ShoppingListTemplate {
  id: string;
  name: string;
  items: Omit<ShoppingListItem, 'id' | 'isChecked' | 'addedAt' | 'recipeIds'>[];
  category: 'weekly' | 'monthly' | 'custom';
  createdAt: Date;
}