import { FoodProduct } from '@/types/Food';

const OPENFOODFACTS_API_URL = 'https://de.openfoodfacts.org/api/v2';

export const openfoodfactsService = {
  /**
   * Fetches product nutritional data by barcode
   * @param barcode Product barcode/EAN
   * @returns Parsed nutritional data or null if not found
   */
  async getProductByBarcode(barcode: string): Promise<FoodProduct | null> {
    try {
      const response = await fetch(`${OPENFOODFACTS_API_URL}/product/${barcode}.json`);
      
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return openfoodfactsService.parseProductData(data);
    } catch (error) {
      console.error('OpenFoodFacts API Error:', error);
      return null;
    }
  },

  /**
   * Search products in OpenFoodFacts database
   */
  async searchProducts(query: string): Promise<FoodProduct[]> {
    try {
      // Use the correct OpenFoodFacts search endpoint with better parameters
      const searchUrl = `${OPENFOODFACTS_API_URL}/search?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&fields=code,product_name,brands,categories,nutriments,allergens,additives,image_url&page_size=50&sort_by=product_name`;
      
      console.log('OpenFoodFacts search URL:', searchUrl);
      
      const response = await fetch(searchUrl);
      
      if (!response.ok) {
        console.error('OpenFoodFacts API response not ok:', response.status, response.statusText);
        return [];
      }

      const data = await response.json();
      console.log('OpenFoodFacts search response:', data);
      
      if (!data.products || !Array.isArray(data.products)) {
        console.warn('No products found in OpenFoodFacts response');
        return [];
      }
      
      const parsedProducts = data.products.map((product: any) => openfoodfactsService.parseProductData({ product }));
      
      // Filter and sort by relevance to search query
      return openfoodfactsService.filterAndSortByRelevance(parsedProducts, query);
    } catch (error) {
      console.error('OpenFoodFacts search error:', error);
      return [];
    }
  },

  /**
   * Search foods (alias for searchProducts for compatibility)
   */
  async searchFoods(query: string): Promise<FoodProduct[]> {
    return this.searchProducts(query);
  },

  /**
   * Get product by OpenFoodFacts ID
   */
  async getProductById(productId: string): Promise<FoodProduct | null> {
    try {
      const response = await fetch(`${OPENFOODFACTS_API_URL}/product/${productId}.json`);
      
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return openfoodfactsService.parseProductData(data);
    } catch (error) {
      console.error('OpenFoodFacts get product error:', error);
      return null;
    }
  },

  /**
   * Get autocomplete suggestions
   */
  async getAutocompleteSuggestions(expression: string): Promise<{ suggestions: string[] }> {
    try {
      const response = await fetch(`${OPENFOODFACTS_API_URL}/search/autocomplete?query=${encodeURIComponent(expression)}`);
      
      if (!response.ok) {
        return { suggestions: [] };
      }

      const data = await response.json();
      return { suggestions: data };
    } catch (error) {
      console.error('Autocomplete error:', error);
      return { suggestions: [] };
    }
  },

  /**
   * Get food categories from OpenFoodFacts
   */
  async getCategories(): Promise<{ categories: string[] }> {
    try {
      const response = await fetch(`${OPENFOODFACTS_API_URL}/categories.json`);
      
      if (!response.ok) {
        return { categories: [] };
      }

      const data = await response.json();
      return { categories: data };
    } catch (error) {
      console.error('Categories error:', error);
      return { categories: [] };
    }
  },

  /**
   * Parses OpenFoodFacts API response into our FoodProduct format
   */
  parseProductData(rawData: any): FoodProduct {
    return {
      id: rawData.product.id || rawData.product.code,
      product_name: (rawData.product && rawData.product.product_name && 
        (typeof rawData.product.product_name === 'string' ? rawData.product.product_name : 
        rawData.product.product_name['de-DE'] || 
        rawData.product.product_name['en-US'] || 
        rawData.product.product_name['fr-FR'] || 
        rawData.product.product_name['es-ES'] || 
        rawData.product.product_name)) || 'Unbekanntes Produkt',
      barcode: rawData.product.code,
      brands: (rawData.product.brands && typeof rawData.product.brands === 'string' ? rawData.product.brands.split(',').filter((brand: string) => brand.trim()) : []) || ['Unknown'],
      categories: (rawData.product.categories && typeof rawData.product.categories === 'string' ? rawData.product.categories.split(',').filter((cat: string) => cat.trim()) : []) || ['Uncategorized'],
      nutriments: {
        calories: (rawData.product && rawData.product.nutriments && parseFloat(rawData.product.nutriments.energy)) || 0,
        carbohydrates: (rawData.product && rawData.product.nutriments && parseFloat(rawData.product.nutriments.carbohydrates)) || 0,
        proteins: (rawData.product && rawData.product.nutriments && parseFloat(rawData.product.nutriments.proteins)) || 0,
        fats: (rawData.product && rawData.product.nutriments && parseFloat(rawData.product.nutriments.fat)) || 0,
        fiber: (rawData.product && rawData.product.nutriments && parseFloat(rawData.product.nutriments.fiber)) || 0,
        sugars: (rawData.product && rawData.product.nutriments && parseFloat(rawData.product.nutriments.sugars)) || 0,
        sodium: (rawData.product && rawData.product.nutriments && parseFloat(rawData.product.nutriments.sodium)) || 0,
        potassium: (rawData.product && rawData.product.nutriments && parseFloat(rawData.product.nutriments.potassium)) || 0,
        cholesterol: (rawData.product && rawData.product.nutriments && parseFloat(rawData.product.nutriments.cholesterol)) || 0,
        saturated_fat: (rawData.product && rawData.product.nutriments && parseFloat(rawData.product.nutriments['saturated-fat'])) || 0,
        trans_fat: (rawData.product && rawData.product.nutriments && parseFloat(rawData.product.nutriments['trans-fat'])) || 0,
        monounsaturated_fat: (rawData.product && rawData.product.nutriments && parseFloat(rawData.product.nutriments['monounsaturated-fat'])) || 0,
        polyunsaturated_fat: (rawData.product && rawData.product.nutriments && parseFloat(rawData.product.nutriments['polyunsaturated-fat'])) || 0,
        vitamin_a: (rawData.product && rawData.product.nutriments && parseFloat(rawData.product.nutriments['vitamin-a'])) || 0,
        vitamin_c: (rawData.product && rawData.product.nutriments && parseFloat(rawData.product.nutriments['vitamin-c'])) || 0,
        calcium: (rawData.product && rawData.product.nutriments && parseFloat(rawData.product.nutriments.calcium)) || 0,
        iron: (rawData.product && rawData.product.nutriments && parseFloat(rawData.product.nutriments.iron)) || 0
      },
      allergens: (rawData.product.allergens && typeof rawData.product.allergens === 'string' ? rawData.product.allergens.split(',').filter((allergen: string) => allergen.trim()) : []) || [],
      additives: (rawData.product.additives && typeof rawData.product.additives === 'string' ? rawData.product.additives.split(',').filter((additive: string) => additive.trim()) : []) || [],
      image_url: rawData.product.image_url || '',
      url: rawData.product.url || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  },

  /**
   * Filter and sort products by relevance to search query
   */
  filterAndSortByRelevance(products: FoodProduct[], query: string): FoodProduct[] {
    const lowercaseQuery = query.toLowerCase().trim();
    
    return products
      .map(product => ({
        product,
        relevanceScore: openfoodfactsService.calculateRelevanceScore(product, lowercaseQuery)
      }))
      .filter(item => item.relevanceScore > 0) // Only keep products with some relevance
      .sort((a, b) => b.relevanceScore - a.relevanceScore) // Sort by relevance (highest first)
      .map(item => item.product)
      .slice(0, 20); // Limit to top 20 most relevant results
  },

  /**
   * Calculate relevance score for a product based on search query
   */
  calculateRelevanceScore(product: FoodProduct, query: string): number {
    let score = 0;
    const productName = product.product_name.toLowerCase();
    const categories = product.categories.join(' ').toLowerCase();
    const brands = product.brands.join(' ').toLowerCase();
    
    // Exact match in product name gets highest score
    if (productName.includes(query)) {
      score += 100;
      // Bonus for exact word match
      if (productName.split(' ').includes(query)) {
        score += 50;
      }
      // Bonus for starting with query
      if (productName.startsWith(query)) {
        score += 30;
      }
    }
    
    // Match in categories
    if (categories.includes(query)) {
      score += 20;
    }
    
    // Match in brands
    if (brands.includes(query)) {
      score += 10;
    }
    
    // Partial matches (for queries like "apfel" matching "apfelsaft")
    if (query.length > 3) {
      const queryParts = query.split(' ');
      queryParts.forEach(part => {
        if (part.length > 2 && productName.includes(part)) {
          score += 5;
        }
      });
    }
    
    return score;
  },

  /**
   * Converts nutritional data to our format
   */
  parseNutrients(nutriments: any): Record<string, any> {
    return {
      calories: parseFloat(nutriments.energy) || 0,
      carbohydrates: parseFloat(nutriments.carbohydrates) || 0,
      proteins: parseFloat(nutriments.proteins) || 0,
      fats: parseFloat(nutriments.fat) || 0,
      fiber: parseFloat(nutriments.fiber) || 0,
      sugars: parseFloat(nutriments.sugars) || 0,
      sodium: parseFloat(nutriments.sodium) || 0,
      potassium: parseFloat(nutriments.potassium) || 0,
      cholesterol: parseFloat(nutriments.cholesterol) || 0,
      saturated_fat: parseFloat(nutriments['saturated-fat']) || 0,
      trans_fat: parseFloat(nutriments['trans-fat']) || 0,
      monounsaturated_fat: parseFloat(nutriments['monounsaturated-fat']) || 0,
      polyunsaturated_fat: parseFloat(nutriments['polyunsaturated-fat']) || 0,
      vitamin_a: parseFloat(nutriments['vitamin-a']) || 0,
      vitamin_c: parseFloat(nutriments['vitamin-c']) || 0,
      calcium: parseFloat(nutriments.calcium) || 0,
      iron: parseFloat(nutriments.iron) || 0
    };
  }
};
