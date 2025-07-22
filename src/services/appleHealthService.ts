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
  private hasPermissions: boolean = false;

  // Apple Health Permissions
  private permissions: HealthKitPermissions = {
    permissions: {
      read: [
        AppleHealthKit.Constants.Permissions.Height,
        AppleHealthKit.Constants.Permissions.Weight,
        AppleHealthKit.Constants.Permissions.DateOfBirth,
        AppleHealthKit.Constants.Permissions.Steps,
        AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
        AppleHealthKit.Constants.Permissions.BasalEnergyBurned,
        AppleHealthKit.Constants.Permissions.DietaryEnergyConsumed,
      ],
      write: [
        AppleHealthKit.Constants.Permissions.DietaryEnergyConsumed,
        AppleHealthKit.Constants.Permissions.DietaryProtein,
        AppleHealthKit.Constants.Permissions.DietaryFatTotal,
        AppleHealthKit.Constants.Permissions.DietaryCarbohydrates,
        AppleHealthKit.Constants.Permissions.DietaryFiber,
        AppleHealthKit.Constants.Permissions.DietarySugar,
        AppleHealthKit.Constants.Permissions.DietarySodium,
        AppleHealthKit.Constants.Permissions.DietaryCalcium,
        AppleHealthKit.Constants.Permissions.DietaryIron,
        AppleHealthKit.Constants.Permissions.DietaryVitaminC,
      ],
    },
  };

  async initialize(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      console.log('Apple Health ist nur auf iOS verfügbar');
      return false;
    }

    return new Promise((resolve) => {
      AppleHealthKit.initHealthKit(this.permissions, (error: string) => {
        if (error) {
          console.error('Apple Health Initialisierung fehlgeschlagen:', error);
          this.isInitialized = false;
          this.hasPermissions = false;
          resolve(false);
        } else {
          console.log('Apple Health erfolgreich initialisiert');
          this.isInitialized = true;
          this.hasPermissions = true;
          resolve(true);
        }
      });
    });
  }

  async getHealthData(): Promise<HealthData | null> {
    if (!this.isInitialized || !this.hasPermissions) {
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
          }
          resolve();
        });
      });

      // Größe abrufen
      await new Promise<void>((resolve) => {
        AppleHealthKit.getLatestHeight({}, (error: string, results: HealthValue) => {
          if (!error && results) {
            healthData.height = results.value;
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
            healthData.age = today.getFullYear() - birthDate.getFullYear();
          }
          resolve();
        });
      });

      // Schritte heute
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      await new Promise<void>((resolve) => {
        AppleHealthKit.getStepCount(
          {
            startDate: startOfDay.toISOString(),
            endDate: new Date().toISOString(),
          },
          (error: string, results: HealthValue) => {
            if (!error && results) {
              healthData.steps = results.value;
            }
            resolve();
          }
        );
      });

      // Aktive Kalorien heute
      await new Promise<void>((resolve) => {
        AppleHealthKit.getActiveEnergyBurned(
          {
            startDate: startOfDay.toISOString(),
            endDate: new Date().toISOString(),
          },
          (error: string, results: HealthValue[]) => {
            if (!error && results) {
              const totalActive = results.reduce((sum, item) => sum + item.value, 0);
              healthData.activeEnergyBurned = totalActive;
            }
            resolve();
          }
        );
      });

      // Ruheumsatz
      await new Promise<void>((resolve) => {
        AppleHealthKit.getBasalEnergyBurned(
          {
            startDate: startOfDay.toISOString(),
            endDate: new Date().toISOString(),
          },
          (error: string, results: HealthValue[]) => {
            if (!error && results) {
              const totalResting = results.reduce((sum, item) => sum + item.value, 0);
              healthData.restingEnergyBurned = totalResting;
            }
            resolve();
          }
        );
      });

      return healthData;
    } catch (error) {
      console.error('Fehler beim Abrufen der Health-Daten:', error);
      return null;
    }
  }

  async saveMealToHealth(nutritionEntry: NutritionEntry): Promise<boolean> {
    if (!this.isInitialized || !this.hasPermissions) {
      const initialized = await this.initialize();
      if (!initialized) return false;
    }

    try {
      const promises: Promise<boolean>[] = [];

      // Kalorien speichern
      if (nutritionEntry.calories) {
        promises.push(this.saveSingleNutrient(
          AppleHealthKit.Constants.Permissions.DietaryEnergyConsumed,
          nutritionEntry.calories,
          'kcal',
          nutritionEntry.date
        ));
      }

      // Protein speichern
      if (nutritionEntry.protein) {
        promises.push(this.saveSingleNutrient(
          AppleHealthKit.Constants.Permissions.DietaryProtein,
          nutritionEntry.protein,
          'g',
          nutritionEntry.date
        ));
      }

      // Fett speichern
      if (nutritionEntry.fat) {
        promises.push(this.saveSingleNutrient(
          AppleHealthKit.Constants.Permissions.DietaryFatTotal,
          nutritionEntry.fat,
          'g',
          nutritionEntry.date
        ));
      }

      // Kohlenhydrate speichern
      if (nutritionEntry.carbohydrates) {
        promises.push(this.saveSingleNutrient(
          AppleHealthKit.Constants.Permissions.DietaryCarbohydrates,
          nutritionEntry.carbohydrates,
          'g',
          nutritionEntry.date
        ));
      }

      // Ballaststoffe speichern
      if (nutritionEntry.fiber) {
        promises.push(this.saveSingleNutrient(
          AppleHealthKit.Constants.Permissions.DietaryFiber,
          nutritionEntry.fiber,
          'g',
          nutritionEntry.date
        ));
      }

      // Zucker speichern
      if (nutritionEntry.sugar) {
        promises.push(this.saveSingleNutrient(
          AppleHealthKit.Constants.Permissions.DietarySugar,
          nutritionEntry.sugar,
          'g',
          nutritionEntry.date
        ));
      }

      // Natrium speichern
      if (nutritionEntry.sodium) {
        promises.push(this.saveSingleNutrient(
          AppleHealthKit.Constants.Permissions.DietarySodium,
          nutritionEntry.sodium,
          'mg',
          nutritionEntry.date
        ));
      }

      // Calcium speichern
      if (nutritionEntry.calcium) {
        promises.push(this.saveSingleNutrient(
          AppleHealthKit.Constants.Permissions.DietaryCalcium,
          nutritionEntry.calcium,
          'mg',
          nutritionEntry.date
        ));
      }

      // Eisen speichern
      if (nutritionEntry.iron) {
        promises.push(this.saveSingleNutrient(
          AppleHealthKit.Constants.Permissions.DietaryIron,
          nutritionEntry.iron,
          'mg',
          nutritionEntry.date
        ));
      }

      // Vitamin C speichern
      if (nutritionEntry.vitaminC) {
        promises.push(this.saveSingleNutrient(
          AppleHealthKit.Constants.Permissions.DietaryVitaminC,
          nutritionEntry.vitaminC,
          'mg',
          nutritionEntry.date
        ));
      }

      const results = await Promise.all(promises);
      const allSuccessful = results.every(result => result === true);

      if (allSuccessful) {
        console.log('Nährwerte erfolgreich in Apple Health gespeichert');
      } else {
        console.warn('Einige Nährwerte konnten nicht in Apple Health gespeichert werden');
      }

      return allSuccessful;
    } catch (error) {
      console.error('Fehler beim Speichern in Apple Health:', error);
      return false;
    }
  }

  private saveSingleNutrient(
    type: string,
    value: number,
    unit: string,
    date: Date
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const options = {
        value,
        unit,
        startDate: date.toISOString(),
        endDate: date.toISOString(),
      };

      AppleHealthKit.saveFood(options, (error: string) => {
        if (error) {
          console.error(`Fehler beim Speichern von ${type}:`, error);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }

  async isHealthDataAvailable(): Promise<boolean> {
    if (Platform.OS !== 'ios') return false;
    
    return new Promise((resolve) => {
      AppleHealthKit.isAvailable((error: string, available: boolean) => {
        if (error) {
          resolve(false);
        } else {
          resolve(available);
        }
      });
    });
  }

  async requestPermissions(): Promise<boolean> {
    return this.initialize();
  }
}

export default new AppleHealthService();