import AppleHealthKit, { HealthValue, HealthKitPermissions } from 'react-native-health';
import { Platform } from 'react-native';

export interface HealthData {
  weight?: number;
  height?: number;
  age?: number;
  activityLevel?: number;
  dailyCalories?: number;
  steps?: number;
  activeEnergyBurned?: number;
  restingEnergyBurned?: number;
}

export interface NutritionEntry {
  date: Date;
  calories: number;
  protein?: number;
  fat?: number;
  carbohydrates?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  calcium?: number;
  iron?: number;
  vitaminC?: number;
}

class AppleHealthService {
  private isInitialized: boolean = false;

  // Simplified permissions based on NotJust.dev guide
  private permissions: HealthKitPermissions = {
    permissions: {
      read: [
        AppleHealthKit.Constants.Permissions.Height,
        AppleHealthKit.Constants.Permissions.Weight,
        AppleHealthKit.Constants.Permissions.DateOfBirth,
        AppleHealthKit.Constants.Permissions.Steps,
        AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
        AppleHealthKit.Constants.Permissions.BasalEnergyBurned,
      ],
      write: [
        AppleHealthKit.Constants.Permissions.EnergyConsumed,
        AppleHealthKit.Constants.Permissions.Protein,
        AppleHealthKit.Constants.Permissions.FatTotal,
        AppleHealthKit.Constants.Permissions.Carbohydrates,
      ],
    },
  };

  async isHealthDataAvailable(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      console.log('Apple Health ist nur auf iOS verfügbar');
      return false;
    }

    return new Promise((resolve) => {
      AppleHealthKit.isAvailable((error: Object, results: boolean) => {
        if (error) {
          console.error('Fehler beim Prüfen der HealthKit Verfügbarkeit:', error);
          resolve(false);
        } else {
          console.log('HealthKit verfügbar:', results);
          resolve(results);
        }
      });
    });
  }

  async initialize(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      console.log('Apple Health ist nur auf iOS verfügbar');
      return false;
    }

    // First check if HealthKit is available
    const available = await this.isHealthDataAvailable();
    if (!available) {
      console.log('HealthKit ist auf diesem Gerät nicht verfügbar');
      return false;
    }

    return new Promise((resolve) => {
      AppleHealthKit.initHealthKit(this.permissions, (error: string) => {
        if (error) {
          console.error('Apple Health Initialisierung fehlgeschlagen:', error);
          this.isInitialized = false;
          resolve(false);
        } else {
          console.log('Apple Health erfolgreich initialisiert');
          this.isInitialized = true;
          resolve(true);
        }
      });
    });
  }

  async getHealthData(): Promise<HealthData | null> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return null;
    }

    const healthData: HealthData = {};

    try {
      // Gewicht abrufen
      await new Promise<void>((resolve) => {
        AppleHealthKit.getLatestWeight({}, (error: string, results: HealthValue) => {
          if (!error && results) {
            healthData.weight = results.value;
            console.log('Gewicht abgerufen:', results.value);
          } else if (error) {
            console.log('Gewicht konnte nicht abgerufen werden:', error);
          }
          resolve();
        });
      });

      // Größe abrufen
      await new Promise<void>((resolve) => {
        AppleHealthKit.getLatestHeight({}, (error: string, results: HealthValue) => {
          if (!error && results) {
            healthData.height = results.value * 100; // Convert m to cm
            console.log('Größe abgerufen:', results.value * 100, 'cm');
          } else if (error) {
            console.log('Größe konnte nicht abgerufen werden:', error);
          }
          resolve();
        });
      });

      // Alter berechnen
      await new Promise<void>((resolve) => {
        AppleHealthKit.getDateOfBirth({}, (error: string, results: any) => {
          if (!error && results) {
            const birthDate = new Date(results.value);
            const today = new Date();
            const age = today.getFullYear() - birthDate.getFullYear();
            healthData.age = age;
            console.log('Alter berechnet:', age);
          } else if (error) {
            console.log('Geburtsdatum konnte nicht abgerufen werden:', error);
          }
          resolve();
        });
      });

      // Schritte heute - simplified approach
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      await new Promise<void>((resolve) => {
        const options = {
          startDate: startOfDay.toISOString(),
          endDate: new Date().toISOString(),
        };

        AppleHealthKit.getStepCount(options, (error: string, results: HealthValue) => {
          if (!error && results) {
            healthData.steps = results.value;
            console.log('Schritte abgerufen:', results.value);
          } else if (error) {
            console.log('Schritte konnten nicht abgerufen werden:', error);
          }
          resolve();
        });
      });

      console.log('Finale Gesundheitsdaten:', healthData);
      return healthData;
    } catch (error) {
      console.error('Fehler beim Abrufen der Health-Daten:', error);
      return null;
    }
  }

  async saveMealToHealth(nutritionEntry: NutritionEntry): Promise<boolean> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return false;
    }

    try {
      // Simplified: Only save calories for now
      if (nutritionEntry.calories) {
        await new Promise<void>((resolve, reject) => {
          const options = {
            value: nutritionEntry.calories,
            unit: AppleHealthKit.Constants.Units.kilocalorie,
            startDate: nutritionEntry.date.toISOString(),
            endDate: nutritionEntry.date.toISOString(),
          };

          AppleHealthKit.saveFood(options, (error: string) => {
            if (error) {
              console.error('Fehler beim Speichern der Kalorien:', error);
              reject(error);
            } else {
              console.log('Kalorien erfolgreich gespeichert:', nutritionEntry.calories);
              resolve();
            }
          });
        });
      }

      return true;
    } catch (error) {
      console.error('Fehler beim Speichern in Apple Health:', error);
      return false;
    }
  }

  async requestPermissions(): Promise<boolean> {
    return this.initialize();
  }
}

export default new AppleHealthService();