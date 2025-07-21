import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, ActivityLevel, HealthGoal, JobActivity, WorkoutIntensity } from '../types/User';

interface Props {
  navigation: any;
}

export default function OnboardingScreen({ navigation }: Props) {
  const [currentStep, setCurrentStep] = useState(1);
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    name: '',
    age: 0,
    gender: 'male',
    height: 0,
    weight: 0,
    activityLevel: 'moderately_active',
    healthGoal: 'maintenance',
    jobActivity: 'sedentary',
    workoutFrequency: 3,
    workoutIntensity: 'moderate',
  });

  const totalSteps = 4;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeOnboarding = async () => {
    try {
      const completeProfile: UserProfile = {
        ...profile,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as UserProfile;

      await AsyncStorage.setItem('userProfile', JSON.stringify(completeProfile));
      await AsyncStorage.setItem('onboardingComplete', 'true');
      navigation.replace('Main');
    } catch (error) {
      Alert.alert('Fehler', 'Profil konnte nicht gespeichert werden');
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[...Array(totalSteps)].map((_, index) => (
        <View
          key={index}
          style={[
            styles.stepDot,
            index + 1 === currentStep ? styles.activeStepDot : null,
            index + 1 < currentStep ? styles.completedStepDot : null,
          ]}
        />
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Persönliche Informationen</Text>
      
      <Text style={styles.label}>Name (optional)</Text>
      <TextInput
        style={styles.input}
        value={profile.name}
        onChangeText={(text) => setProfile({ ...profile, name: text })}
        placeholder="Dein Name"
      />

      <Text style={styles.label}>Alter</Text>
      <TextInput
        style={styles.input}
        value={profile.age ? profile.age.toString() : ''}
        onChangeText={(text) => setProfile({ ...profile, age: parseInt(text) || 0 })}
        placeholder="25"
        keyboardType="numeric"
      />

      <Text style={styles.label}>Geschlecht</Text>
      <View style={styles.buttonGroup}>
        {(['male', 'female', 'other'] as const).map((gender) => (
          <TouchableOpacity
            key={gender}
            style={[
              styles.optionButton,
              profile.gender === gender ? styles.selectedOption : null,
            ]}
            onPress={() => setProfile({ ...profile, gender })}
          >
            <Text style={[
              styles.optionText,
              profile.gender === gender ? styles.selectedOptionText : null,
            ]}>
              {gender === 'male' ? 'Männlich' : gender === 'female' ? 'Weiblich' : 'Andere'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Körperliche Daten</Text>
      
      <Text style={styles.label}>Größe (cm)</Text>
      <TextInput
        style={styles.input}
        value={profile.height ? profile.height.toString() : ''}
        onChangeText={(text) => setProfile({ ...profile, height: parseInt(text) || 0 })}
        placeholder="175"
        keyboardType="numeric"
      />

      <Text style={styles.label}>Gewicht (kg)</Text>
      <TextInput
        style={styles.input}
        value={profile.weight ? profile.weight.toString() : ''}
        onChangeText={(text) => setProfile({ ...profile, weight: parseInt(text) || 0 })}
        placeholder="70"
        keyboardType="numeric"
      />
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Aktivität & Beruf</Text>
      
      <Text style={styles.label}>Berufliche Aktivität</Text>
      <View style={styles.buttonGroup}>
        {([
          { key: 'sedentary', label: 'Sitzend' },
          { key: 'standing', label: 'Stehend' },
          { key: 'physical', label: 'Körperlich aktiv' }
        ] as const).map((job) => (
          <TouchableOpacity
            key={job.key}
            style={[
              styles.optionButton,
              profile.jobActivity === job.key ? styles.selectedOption : null,
            ]}
            onPress={() => setProfile({ ...profile, jobActivity: job.key })}
          >
            <Text style={[
              styles.optionText,
              profile.jobActivity === job.key ? styles.selectedOptionText : null,
            ]}>
              {job.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Sport pro Woche</Text>
      <TextInput
        style={styles.input}
        value={profile.workoutFrequency ? profile.workoutFrequency.toString() : ''}
        onChangeText={(text) => setProfile({ ...profile, workoutFrequency: parseInt(text) || 0 })}
        placeholder="3"
        keyboardType="numeric"
      />
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Gesundheitsziel</Text>
      
      <View style={styles.buttonGroup}>
        {([
          { key: 'weight_loss', label: 'Gewichtsabnahme' },
          { key: 'maintenance', label: 'Gewicht halten' },
          { key: 'weight_gain', label: 'Gewichtszunahme' },
          { key: 'muscle_gain', label: 'Muskelaufbau' }
        ] as const).map((goal) => (
          <TouchableOpacity
            key={goal.key}
            style={[
              styles.optionButton,
              profile.healthGoal === goal.key ? styles.selectedOption : null,
            ]}
            onPress={() => setProfile({ ...profile, healthGoal: goal.key })}
          >
            <Text style={[
              styles.optionText,
              profile.healthGoal === goal.key ? styles.selectedOptionText : null,
            ]}>
              {goal.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      default: return renderStep1();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <Text style={styles.title}>Profil erstellen</Text>
        <Text style={styles.subtitle}>
          Lass uns dein Profil erstellen für personalisierte Rezeptvorschläge
        </Text>

        {renderStepIndicator()}
        {renderCurrentStep()}
      </ScrollView>

      <View style={styles.buttonContainer}>
        {currentStep > 1 && (
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Zurück</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>
            {currentStep === totalSteps ? 'Fertig' : 'Weiter'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
    color: '#2E7D32',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 4,
  },
  activeStepDot: {
    backgroundColor: '#2E7D32',
  },
  completedStepDot: {
    backgroundColor: '#4CAF50',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#fafafa',
  },
  buttonGroup: {
    marginBottom: 16,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#fafafa',
  },
  selectedOption: {
    borderColor: '#2E7D32',
    backgroundColor: '#E8F5E8',
  },
  optionText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
  },
  selectedOptionText: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    color: '#666',
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 8,
    marginLeft: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    color: '#fff',
  },
});