import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { UserProfile } from '../types/User';

export default function HomeScreen() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [todaysMeals, setTodaysMeals] = useState<any[]>([]);

  useEffect(() => {
    loadUserProfile();
    loadTodaysMeals();
  }, []);

  const loadUserProfile = async () => {
    try {
      const profileData = await AsyncStorage.getItem('userProfile');
      if (profileData) {
        setUserProfile(JSON.parse(profileData));
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadTodaysMeals = async () => {
    try {
      const today = new Date().toDateString();
      const mealsData = await AsyncStorage.getItem(`meals_${today}`);
      if (mealsData) {
        setTodaysMeals(JSON.parse(mealsData));
      }
    } catch (error) {
      console.error('Error loading today\'s meals:', error);
    }
  };

  const calculateBMR = () => {
    if (!userProfile) return 0;
    
    const { weight, height, age, gender } = userProfile;
    
    // Mifflin-St Jeor Equation
    if (gender === 'male') {
      return (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
      return (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }
  };

  const calculateTotalCalories = () => {
    if (!userProfile) return 0;
    
    const bmr = calculateBMR();
    const activityMultipliers = {
      'sedentary': 1.2,
      'lightly_active': 1.375,
      'moderately_active': 1.55,
      'very_active': 1.725,
      'extremely_active': 1.9
    };
    
    return Math.round(bmr * activityMultipliers[userProfile.activityLevel]);
  };

  const getTodaysCaloriesConsumed = () => {
    return todaysMeals.reduce((total, meal) => total + (meal.calories || 0), 0);
  };

  const renderQuickAction = (icon: string, title: string, subtitle: string, onPress: () => void) => (
    <TouchableOpacity style={styles.quickActionCard} onPress={onPress}>
      <Ionicons name={icon as any} size={24} color="#2E7D32" />
      <Text style={styles.quickActionTitle}>{title}</Text>
      <Text style={styles.quickActionSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );

  const renderCalorieProgress = () => {
    const targetCalories = calculateTotalCalories();
    const consumedCalories = getTodaysCaloriesConsumed();
    const remainingCalories = targetCalories - consumedCalories;
    const progressPercentage = Math.min((consumedCalories / targetCalories) * 100, 100);

    return (
      <View style={styles.calorieCard}>
        <Text style={styles.calorieCardTitle}>Heute's Kalorien</Text>
        <View style={styles.calorieProgressContainer}>
          <View style={styles.calorieProgressBar}>
            <View 
              style={[
                styles.calorieProgressFill, 
                { width: `${progressPercentage}%` }
              ]} 
            />
          </View>
          <Text style={styles.calorieProgressText}>
            {consumedCalories} / {targetCalories} kcal
          </Text>
        </View>
        <Text style={styles.remainingCalories}>
          {remainingCalories > 0 ? `${remainingCalories} kcal übrig` : 'Tagesziel erreicht!'}
        </Text>
      </View>
    );
  };

  if (!userProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Lade Profil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.greeting}>
            Hallo{userProfile.name ? ` ${userProfile.name}` : ''}! 👋
          </Text>
          <Text style={styles.subGreeting}>
            Bereit für deine heutigen Mahlzeiten?
          </Text>
        </View>

        {renderCalorieProgress()}

        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Schnellaktionen</Text>
          <View style={styles.quickActionsGrid}>
            {renderQuickAction(
              'restaurant-outline',
              'Inventar verwalten',
              'Lebensmittel hinzufügen',
              () => Alert.alert('Info', 'Navigiere zum Inventar Tab')
            )}
            {renderQuickAction(
              'sparkles-outline',
              'Rezepte generieren',
              'KI-Vorschläge erhalten',
              () => Alert.alert('Info', 'Navigiere zum Rezepte Tab')
            )}
            {renderQuickAction(
              'fitness-outline',
              'Ziel anpassen',
              'Profil bearbeiten',
              () => Alert.alert('Info', 'Navigiere zum Profil Tab')
            )}
            {renderQuickAction(
              'analytics-outline',
              'Statistiken',
              'Fortschritt anzeigen',
              () => Alert.alert('Info', 'Coming Soon!')
            )}
          </View>
        </View>

        <View style={styles.todaysMealsContainer}>
          <Text style={styles.sectionTitle}>Heutige Mahlzeiten</Text>
          {todaysMeals.length > 0 ? (
            todaysMeals.map((meal, index) => (
              <View key={index} style={styles.mealCard}>
                <Text style={styles.mealName}>{meal.name}</Text>
                <Text style={styles.mealCalories}>{meal.calories} kcal</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyMealsContainer}>
              <Ionicons name="restaurant-outline" size={48} color="#ccc" />
              <Text style={styles.emptyMealsText}>
                Noch keine Mahlzeiten heute
              </Text>
              <Text style={styles.emptyMealsSubtext}>
                Generiere Rezepte basierend auf deinem Inventar
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
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
  scrollContainer: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subGreeting: {
    fontSize: 16,
    color: '#666',
  },
  calorieCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calorieCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  calorieProgressContainer: {
    marginBottom: 8,
  },
  calorieProgressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 8,
  },
  calorieProgressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  calorieProgressText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333',
  },
  remainingCalories: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
  },
  quickActionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    backgroundColor: '#fff',
    width: '48%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  todaysMealsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  mealCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  mealCalories: {
    fontSize: 14,
    color: '#666',
  },
  emptyMealsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyMealsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptyMealsSubtext: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    marginTop: 8,
  },
});