import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';
import { LocationInput } from '../components/location/LocationInput';
import { UserLocationInput } from '../components/location/types';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

export function HomeScreen({ navigation }: Props) {
  const [locations, setLocations] = useState<UserLocationInput[]>([]);
  const [showLocationInput, setShowLocationInput] = useState(false);

  /**
   * Handle location changes from LocationInput component
   */
  const handleLocationsChange = (newLocations: UserLocationInput[]) => {
    setLocations(newLocations);
  };

  /**
   * Handle optimization start - navigate to optimization screen
   */
  const handleStartOptimization = (validatedLocations: UserLocationInput[]) => {
    navigation.navigate('Optimization', { userLocations: validatedLocations });
  };

  /**
   * Navigate to map screen
   */
  const handleViewMap = () => {
    navigation.navigate('Map');
  };

  if (showLocationInput) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => setShowLocationInput(false)}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <LocationInput
          onLocationsChange={handleLocationsChange}
          onStartOptimization={handleStartOptimization}
          maxLocations={10}
          minLocations={2}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>MidWhereAh</Text>
        <Text style={styles.subtitle}>Find the perfect meeting point for everyone</Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => setShowLocationInput(true)}
          >
            <Text style={styles.buttonText}>🚀 Start Location Input</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]} 
            onPress={handleViewMap}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>🗺️ View Map</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            🎯 Add your locations, select transport modes, and find the most equitable meeting point using Jain's Fairness Index
          </Text>
        </View>

        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>Features:</Text>
          <Text style={styles.featureText}>• 📍 Singapore address autocomplete</Text>
          <Text style={styles.featureText}>• 🚇 Multiple transport modes (MRT, Bus, Walking, Cycling, Driving)</Text>
          <Text style={styles.featureText}>• ⚖️ Equity-based optimization using Jain's Fairness Index</Text>
          <Text style={styles.featureText}>• 📊 Real-time fairness scoring and recommendations</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: '#3498db',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#7f8c8d',
    marginBottom: 40,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
    gap: 16,
  },
  button: {
    backgroundColor: '#3498db',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#3498db',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#3498db',
  },
  infoContainer: {
    marginTop: 40,
    paddingHorizontal: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
    lineHeight: 20,
  },
  featuresContainer: {
    marginTop: 30,
    paddingHorizontal: 20,
    backgroundColor: '#ecf0f1',
    borderRadius: 12,
    padding: 16,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#34495e',
    lineHeight: 20,
    marginBottom: 4,
  },
});