import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, ActivityLevel, HealthGoal, JobActivity } from '../types/User';
import appleHealthService, { HealthData } from '../services/health/appleHealthService';

export default function ProfileScreen() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});
  const [healthKitEnabled, setHealthKitEnabled] = useState(false);
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [isLoadingHealthData, setIsLoadingHealthData] = useState(false);

  useEffect(() => {
    loadUserProfile();
    loadSettings();
  }, []);

  const loadUserProfile = async () => {
    try {
      const profileData = await AsyncStorage.getItem('userProfile');
      if (profileData) {
        const profile = JSON.parse(profileData);
        setUserProfile(profile);
        setEditedProfile(profile);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('appSettings');
      if (settings) {
        const parsedSettings = JSON.parse(settings);
        setHealthKitEnabled(parsedSettings.healthKitEnabled || false);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveProfile = async () => {
    try {
      const updatedProfile: UserProfile = {
        ...userProfile!,
        ...editedProfile,
        updatedAt: new Date(),
      };

      await AsyncStorage.setItem('userProfile', JSON.stringify(updatedProfile));
      setUserProfile(updatedProfile);
      setIsEditing(false);
      Alert.alert('Erfolg', 'Profil erfolgreich aktualisiert!');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Fehler', 'Profil konnte nicht gespeichert werden');
    }
  };

  const saveSettings = async (key: string, value: any) => {
    try {
      const existingSettings = await AsyncStorage.getItem('appSettings');
      const settings = existingSettings ? JSON.parse(existingSettings) : {};
      settings[key] = value;
      await AsyncStorage.setItem('appSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const toggleHealthKit = async (enabled: boolean) => {
    if (enabled) {
      // Check if Apple Health is available first
      const isAvailable = await appleHealthService.isHealthDataAvailable();
      if (!isAvailable) {
        Alert.alert(
          'Apple Health nicht verfügbar',
          'Apple Health ist auf diesem Gerät nicht verfügbar oder wird nicht unterstützt.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Request permissions and initialize Apple Health
      setIsLoadingHealthData(true);
      try {
        const success = await appleHealthService.requestPermissions();
        if (success) {
          setHealthKitEnabled(true);
          await saveSettings('healthKitEnabled', true);
          
          // Try to load health data
          const data = await appleHealthService.getHealthData();
          if (data) {
            setHealthData(data);
            Alert.alert(
              'Apple Health verbunden',
              'Gesundheitsdaten wurden erfolgreich synchronisiert!',
              [{ text: 'OK' }]
            );
          } else {
            Alert.alert(
              'Apple Health verbunden',
              'Verbindung erfolgreich, aber keine Daten verfügbar. Stelle sicher, dass du Daten in der Health App eingetragen hast.',
              [{ text: 'OK' }]
            );
          }
        } else {
          Alert.alert(
            'Verbindung fehlgeschlagen',
            'Die Verbindung zu Apple Health konnte nicht hergestellt werden. Bitte erlaube den Zugriff in den Einstellungen.',
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        console.error('Fehler bei Apple Health Integration:', error);
        Alert.alert(
          'Fehler',
          'Ein Fehler ist bei der Verbindung zu Apple Health aufgetreten.',
          [{ text: 'OK' }]
        );
      } finally {
        setIsLoadingHealthData(false);
      }
    } else {
      setHealthKitEnabled(false);
      await saveSettings('healthKitEnabled', false);
      setHealthData(null);
    }
  };

  const calculateBMR = () => {
    if (!userProfile) return 0;
    
    const { weight, height, age, gender } = userProfile;
    
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

  const calculateBMI = () => {
    if (!userProfile) return 0;
    const heightInM = userProfile.height / 100;
    return userProfile.weight / (heightInM * heightInM);
  };

  const getBMICategory = (bmi: number): { category: string; color: string } => {
    if (bmi < 18.5) return { category: 'Untergewicht', color: '#3498db' };
    if (bmi < 25) return { category: 'Normalgewicht', color: '#27ae60' };
    if (bmi < 30) return { category: 'Übergewicht', color: '#f39c12' };
    return { category: 'Adipositas', color: '#e74c3c' };
  };

  const clearAllData = () => {
    Alert.alert(
      'Alle Daten löschen',
      'Möchtest du wirklich alle App-Daten löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                'userProfile',
                'inventory',
                'appSettings'
              ]);
              
              // Clear all daily data
              const keys = await AsyncStorage.getAllKeys();
              const dailyKeys = keys.filter(key => 
                key.startsWith('recipes_') || key.startsWith('meals_')
              );
              if (dailyKeys.length > 0) {
                await AsyncStorage.multiRemove(dailyKeys);
              }
              
              Alert.alert('Erfolg', 'Alle Daten wurden gelöscht. Bitte starte die App neu.');
            } catch (error) {
              Alert.alert('Fehler', 'Daten konnten nicht gelöscht werden');
            }
          }
        }
      ]
    );
  };

  const renderStatCard = (title: string, value: string, unit: string, icon: string, color: string = '#2E7D32') => (
    <View style={styles.statCard}>
      <Ionicons name={icon as any} size={24} color={color} />
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statUnit}>{unit}</Text>
    </View>
  );

  const renderEditableField = (
    label: string,
    value: string | number,
    key: keyof UserProfile,
    keyboardType: 'default' | 'numeric' = 'default',
    suffix?: string
  ) => (
    <View style={styles.editField}>
      <Text style={styles.editLabel}>{label}</Text>
      <View style={styles.editInputContainer}>
        <TextInput
          style={styles.editInput}
          value={value.toString()}
          onChangeText={(text) => {
            const newValue = keyboardType === 'numeric' ? 
              (parseInt(text) || 0) : text;
            setEditedProfile({ ...editedProfile, [key]: newValue });
          }}
          keyboardType={keyboardType}
        />
        {suffix && <Text style={styles.inputSuffix}>{suffix}</Text>}
      </View>
    </View>
  );

  const renderOptionSelector = (
    label: string,
    options: { key: string; label: string }[],
    selectedValue: string,
    onSelect: (value: string) => void
  ) => (
    <View style={styles.selectorContainer}>
      <Text style={styles.editLabel}>{label}</Text>
      <View style={styles.optionGrid}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.optionButton,
              selectedValue === option.key && styles.selectedOptionButton,
            ]}
            onPress={() => onSelect(option.key)}
          >
            <Text
              style={[
                styles.optionButtonText,
                selectedValue === option.key && styles.selectedOptionButtonText,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (!userProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Lade Profil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const bmi = calculateBMI();
  const bmiInfo = getBMICategory(bmi);
  const bmr = calculateBMR();
  const totalCalories = calculateTotalCalories();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profil</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => {
            if (isEditing) {
              saveProfile();
            } else {
              setIsEditing(true);
            }
          }}
        >
          <Ionicons 
            name={isEditing ? "checkmark" : "pencil"} 
            size={20} 
            color="#2E7D32" 
          />
          <Text style={styles.editButtonText}>
            {isEditing ? 'Speichern' : 'Bearbeiten'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {!isEditing && (
          <>
            <View style={styles.statsContainer}>
              <Text style={styles.sectionTitle}>Deine Statistiken</Text>
              <View style={styles.statsGrid}>
                {renderStatCard('BMI', bmi.toFixed(1), bmiInfo.category, 'fitness-outline', bmiInfo.color)}
                {renderStatCard('BMR', bmr.toFixed(0), 'kcal/Tag', 'flame-outline')}
                {renderStatCard('Kalorienbedarf', totalCalories.toString(), 'kcal/Tag', 'restaurant-outline')}
              </View>
            </View>

            <View style={styles.profileInfoContainer}>
              <Text style={styles.sectionTitle}>Persönliche Daten</Text>
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Name</Text>
                  <Text style={styles.infoValue}>{userProfile.name || 'Nicht gesetzt'}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Alter</Text>
                  <Text style={styles.infoValue}>{userProfile.age} Jahre</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Größe</Text>
                  <Text style={styles.infoValue}>{userProfile.height} cm</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Gewicht</Text>
                  <Text style={styles.infoValue}>{userProfile.weight} kg</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Geschlecht</Text>
                  <Text style={styles.infoValue}>
                    {userProfile.gender === 'male' ? 'Männlich' : 
                     userProfile.gender === 'female' ? 'Weiblich' : 'Andere'}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Ziel</Text>
                  <Text style={styles.infoValue}>
                    {userProfile.healthGoal === 'weight_loss' ? 'Abnehmen' :
                     userProfile.healthGoal === 'weight_gain' ? 'Zunehmen' :
                     userProfile.healthGoal === 'muscle_gain' ? 'Muskelaufbau' : 'Gewicht halten'}
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}

        {isEditing && (
          <View style={styles.editContainer}>
            <Text style={styles.sectionTitle}>Profil bearbeiten</Text>
            
            {renderEditableField('Name', editedProfile.name || '', 'name')}
            {renderEditableField('Alter', editedProfile.age || 0, 'age', 'numeric', 'Jahre')}
            {renderEditableField('Größe', editedProfile.height || 0, 'height', 'numeric', 'cm')}
            {renderEditableField('Gewicht', editedProfile.weight || 0, 'weight', 'numeric', 'kg')}
            {renderEditableField('Sport pro Woche', editedProfile.workoutFrequency || 0, 'workoutFrequency', 'numeric', 'mal')}

            {renderOptionSelector(
              'Geschlecht',
              [
                { key: 'male', label: 'Männlich' },
                { key: 'female', label: 'Weiblich' },
                { key: 'other', label: 'Andere' }
              ],
              editedProfile.gender || 'male',
              (value) => setEditedProfile({ ...editedProfile, gender: value as any })
            )}

            {renderOptionSelector(
              'Gesundheitsziel',
              [
                { key: 'weight_loss', label: 'Abnehmen' },
                { key: 'maintenance', label: 'Gewicht halten' },
                { key: 'weight_gain', label: 'Zunehmen' },
                { key: 'muscle_gain', label: 'Muskelaufbau' }
              ],
              editedProfile.healthGoal || 'maintenance',
              (value) => setEditedProfile({ ...editedProfile, healthGoal: value as HealthGoal })
            )}

            {renderOptionSelector(
              'Berufliche Aktivität',
              [
                { key: 'sedentary', label: 'Sitzend' },
                { key: 'standing', label: 'Stehend' },
                { key: 'physical', label: 'Körperlich aktiv' }
              ],
              editedProfile.jobActivity || 'sedentary',
              (value) => setEditedProfile({ ...editedProfile, jobActivity: value as JobActivity })
            )}

            {renderOptionSelector(
              'Aktivitätslevel',
              [
                { key: 'sedentary', label: 'Wenig aktiv' },
                { key: 'lightly_active', label: 'Leicht aktiv' },
                { key: 'moderately_active', label: 'Mäßig aktiv' },
                { key: 'very_active', label: 'Sehr aktiv' },
                { key: 'extremely_active', label: 'Extrem aktiv' }
              ],
              editedProfile.activityLevel || 'moderately_active',
              (value) => setEditedProfile({ ...editedProfile, activityLevel: value as ActivityLevel })
            )}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setIsEditing(false);
                setEditedProfile(userProfile);
              }}
            >
              <Text style={styles.cancelButtonText}>Abbrechen</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.settingsContainer}>
          <Text style={styles.sectionTitle}>Einstellungen</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="fitness-outline" size={20} color="#333" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Apple Health</Text>
                <Text style={styles.settingSubtitle}>Gesundheitsdaten synchronisieren</Text>
              </View>
            </View>
            <Switch
              value={healthKitEnabled}
              onValueChange={toggleHealthKit}
              trackColor={{ false: '#767577', true: '#4CAF50' }}
              thumbColor={healthKitEnabled ? '#2E7D32' : '#f4f3f4'}
            />
          </View>

          <TouchableOpacity style={styles.dangerButton} onPress={clearAllData}>
            <Ionicons name="trash-outline" size={20} color="#fff" />
            <Text style={styles.dangerButtonText}>Alle Daten löschen</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.appInfoContainer}>
          <Text style={styles.appInfoText}>FoodTracker v1.0.0</Text>
          <Text style={styles.appInfoSubtext}>KI-gestützte Ernährungsplanung</Text>
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
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtonText: {
    color: '#2E7D32',
    fontWeight: '600',
    marginLeft: 4,
  },
  scrollContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  statCard: {
    backgroundColor: '#fff',
    width: '31%',
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
  statTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statUnit: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  profileInfoContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  infoGrid: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  editContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  editField: {
    marginBottom: 16,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  editInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  editInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  inputSuffix: {
    fontSize: 14,
    color: '#666',
    paddingRight: 12,
  },
  selectorContainer: {
    marginBottom: 16,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  optionButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedOptionButton: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  optionButtonText: {
    fontSize: 14,
    color: '#333',
  },
  selectedOptionButtonText: {
    color: '#fff',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  settingsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  settingItem: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  dangerButton: {
    backgroundColor: '#e74c3c',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  dangerButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  appInfoContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  appInfoText: {
    fontSize: 14,
    color: '#666',
  },
  appInfoSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
});