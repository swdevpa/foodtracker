import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import appleHealthService, { HealthData } from '../services/appleHealthService';

export default function HealthScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [isHealthEnabled, setIsHealthEnabled] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [hasPermissions, setHasPermissions] = useState(false);

  useEffect(() => {
    checkHealthAvailability();
    loadHealthSettings();
  }, []);

  const checkHealthAvailability = async () => {
    const available = await appleHealthService.isHealthDataAvailable();
    setIsAvailable(available);
    
    // Zusätzliche Prüfung für Expo Go
    const isExpoGo = __DEV__ && !available;
    if (isExpoGo) {
      console.log('Health-Funktionen sind in Expo Go nicht verfügbar. Nutze EAS Build für vollständige Unterstützung.');
    }
  };

  const loadHealthSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('healthSettings');
      if (settings) {
        const { enabled } = JSON.parse(settings);
        setIsHealthEnabled(enabled);
        if (enabled) {
          loadHealthData();
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden der Health-Einstellungen:', error);
    }
  };

  const saveHealthSettings = async (enabled: boolean) => {
    try {
      await AsyncStorage.setItem('healthSettings', JSON.stringify({ enabled }));
      setIsHealthEnabled(enabled);
    } catch (error) {
      console.error('Fehler beim Speichern der Health-Einstellungen:', error);
    }
  };

  const requestPermissions = async () => {
    setIsLoading(true);
    try {
      const granted = await appleHealthService.requestPermissions();
      if (granted) {
        setHasPermissions(true);
        await saveHealthSettings(true);
        await loadHealthData();
        Alert.alert(
          'Erfolg',
          'Apple Health wurde erfolgreich verbunden! Du kannst jetzt deine Gesundheitsdaten synchronisieren.'
        );
      } else {
        Alert.alert(
          'Berechtigung verweigert',
          'Um Apple Health zu nutzen, erlaube bitte den Zugriff auf deine Gesundheitsdaten in den Einstellungen.'
        );
      }
    } catch (error) {
      Alert.alert('Fehler', 'Verbindung zu Apple Health fehlgeschlagen.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadHealthData = async () => {
    setIsLoading(true);
    try {
      const data = await appleHealthService.getHealthData();
      setHealthData(data);
      setHasPermissions(true);
    } catch (error) {
      console.error('Fehler beim Laden der Health-Daten:', error);
      Alert.alert('Fehler', 'Gesundheitsdaten konnten nicht geladen werden.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleHealthSync = async (enabled: boolean) => {
    if (enabled && !hasPermissions) {
      await requestPermissions();
    } else {
      await saveHealthSettings(enabled);
      if (!enabled) {
        setHealthData(null);
      } else {
        await loadHealthData();
      }
    }
  };

  const formatValue = (value: number | undefined, unit: string, decimals: number = 0): string => {
    if (value === undefined || value === null) return 'Nicht verfügbar';
    return `${value.toFixed(decimals)} ${unit}`;
  };

  const calculateBMI = (): string => {
    if (!healthData?.weight || !healthData?.height) return 'Nicht verfügbar';
    const heightInMeters = healthData.height / 100;
    const bmi = healthData.weight / (heightInMeters * heightInMeters);
    return bmi.toFixed(1);
  };

  const getBMICategory = (): string => {
    if (!healthData?.weight || !healthData?.height) return '';
    const heightInMeters = healthData.height / 100;
    const bmi = healthData.weight / (heightInMeters * heightInMeters);
    
    if (bmi < 18.5) return 'Untergewicht';
    if (bmi < 25) return 'Normalgewicht';
    if (bmi < 30) return 'Übergewicht';
    return 'Adipositas';
  };

  const renderHealthCard = (
    icon: string,
    title: string,
    value: string,
    subtitle?: string,
    color: string = '#2E7D32'
  ) => (
    <View style={styles.healthCard}>
      <View style={styles.healthCardHeader}>
        <Ionicons name={icon as any} size={24} color={color} />
        <Text style={styles.healthCardTitle}>{title}</Text>
      </View>
      <Text style={styles.healthCardValue}>{value}</Text>
      {subtitle && <Text style={styles.healthCardSubtitle}>{subtitle}</Text>}
    </View>
  );

  if (!isAvailable) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Ionicons name="heart-dislike-outline" size={64} color="#ccc" />
          <Text style={styles.unavailableText}>
            Apple Health ist nicht verfügbar
          </Text>
          <Text style={styles.unavailableSubtext}>
            {__DEV__ 
              ? 'Apple Health funktioniert nur in kompilierten Apps (EAS Build). In Expo Go ist diese Funktion nicht verfügbar.'
              : 'Diese Funktion ist nur auf iOS-Geräten mit installierter Health App verfügbar.'
            }
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Apple Health</Text>
          <Text style={styles.subtitle}>
            Synchronisiere deine Gesundheitsdaten
          </Text>
        </View>

        <View style={styles.settingsCard}>
          <View style={styles.settingsHeader}>
            <Ionicons name="heart" size={24} color="#2E7D32" />
            <Text style={styles.settingsTitle}>Health-Synchronisation</Text>
            <Switch
              value={isHealthEnabled}
              onValueChange={toggleHealthSync}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={isHealthEnabled ? '#2E7D32' : '#f4f3f4'}
            />
          </View>
          <Text style={styles.settingsDescription}>
            Importiere Gewicht, Größe und Aktivitätsdaten aus Apple Health für personalisierte Empfehlungen
          </Text>
        </View>

        {isHealthEnabled && (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Körperdaten</Text>
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={loadHealthData}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#2E7D32" />
                  ) : (
                    <Ionicons name="refresh" size={20} color="#2E7D32" />
                  )}
                </TouchableOpacity>
              </View>
              
              <View style={styles.healthGrid}>
                {renderHealthCard(
                  'scale-outline',
                  'Gewicht',
                  formatValue(healthData?.weight, 'kg', 1),
                  undefined,
                  '#FF6B6B'
                )}
                {renderHealthCard(
                  'resize-outline',
                  'Größe',
                  formatValue(healthData?.height, 'cm'),
                  undefined,
                  '#4ECDC4'
                )}
                {renderHealthCard(
                  'calendar-outline',
                  'Alter',
                  formatValue(healthData?.age, 'Jahre'),
                  undefined,
                  '#45B7D1'
                )}
                {renderHealthCard(
                  'fitness-outline',
                  'BMI',
                  calculateBMI(),
                  getBMICategory(),
                  '#96CEB4'
                )}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tägliche Aktivität</Text>
              <View style={styles.healthGrid}>
                {renderHealthCard(
                  'walk-outline',
                  'Schritte',
                  formatValue(healthData?.steps, 'Schritte'),
                  'Heute',
                  '#FFA07A'
                )}
                {renderHealthCard(
                  'flame-outline',
                  'Aktive Kalorien',
                  formatValue(healthData?.activeEnergyBurned, 'kcal'),
                  'Verbrannt heute',
                  '#FF6347'
                )}
                {renderHealthCard(
                  'bed-outline',
                  'Ruheumsatz',
                  formatValue(healthData?.restingEnergyBurned, 'kcal'),
                  'Grundumsatz heute',
                  '#DDA0DD'
                )}
              </View>
            </View>

            {!healthData && !isLoading && (
              <View style={styles.noDataContainer}>
                <Ionicons name="information-circle-outline" size={48} color="#ccc" />
                <Text style={styles.noDataText}>Keine Gesundheitsdaten gefunden</Text>
                <Text style={styles.noDataSubtext}>
                  Stelle sicher, dass du Daten in der Apple Health App eingetragen hast
                </Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={loadHealthData}
                >
                  <Text style={styles.retryButtonText}>Erneut versuchen</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {!isHealthEnabled && (
          <View style={styles.onboardingContainer}>
            <Ionicons name="heart-outline" size={64} color="#2E7D32" />
            <Text style={styles.onboardingTitle}>
              Verbinde Apple Health
            </Text>
            <Text style={styles.onboardingDescription}>
              Synchronisiere deine Körperdaten und Aktivitäten für personalisierte Ernährungsempfehlungen und automatisches Tracking deiner Nährstoffziele.
            </Text>
            <TouchableOpacity
              style={styles.connectButton}
              onPress={() => toggleHealthSync(true)}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="heart" size={20} color="#fff" />
                  <Text style={styles.connectButtonText}>Mit Health verbinden</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  unavailableText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
  unavailableSubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
    textAlign: 'center',
  },
  settingsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingsTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
  },
  settingsDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshButton: {
    padding: 8,
  },
  healthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  healthCard: {
    backgroundColor: '#fff',
    width: '48%',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  healthCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  healthCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  healthCardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  healthCardSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noDataText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  onboardingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  onboardingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  onboardingDescription: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  connectButton: {
    backgroundColor: '#2E7D32',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
});