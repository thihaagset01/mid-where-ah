/**
 * LocationInput Component Usage Example
 * Demonstrates how to integrate the LocationInput component in the MidWhereAh app
 */

import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { LocationInput } from '../src/components/location';
import { UserLocationInput } from '../src/components/location/types';

/**
 * Example screen showing how to use LocationInput component
 */
export const LocationInputExample: React.FC = () => {
  const [locations, setLocations] = useState<UserLocationInput[]>([]);

  /**
   * Handle location changes from the LocationInput component
   */
  const handleLocationsChange = (newLocations: UserLocationInput[]) => {
    setLocations(newLocations);
    console.log('Locations updated:', newLocations);
  };

  /**
   * Handle optimization start - would integrate with the existing algorithm
   */
  const handleStartOptimization = (validatedLocations: UserLocationInput[]) => {
    Alert.alert(
      'Starting Optimization',
      `Processing ${validatedLocations.length} locations...`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Continue',
          onPress: () => {
            // This is where you would call the existing optimization algorithm
            console.log('Starting optimization with locations:', validatedLocations);
            
            // Example: Convert to the format expected by existing algorithms
            const algorithmInput = validatedLocations.map(loc => ({
              id: loc.id,
              latitude: loc.coordinate?.latitude || 0,
              longitude: loc.coordinate?.longitude || 0,
              transportMode: loc.transportMode,
            }));
            
            console.log('Algorithm input format:', algorithmInput);
            
            // In a real implementation, you would:
            // 1. Navigate to loading screen
            // 2. Call the optimization algorithm
            // 3. Navigate to results screen with the optimal point
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <LocationInput
        onLocationsChange={handleLocationsChange}
        onStartOptimization={handleStartOptimization}
        maxLocations={10}
        minLocations={2}
      />
    </View>
  );
};

/**
 * Example of integrating with React Navigation
 */
export const NavigationExample = {
  // Add this to your navigation stack
  LocationInputScreen: LocationInputExample,
  
  // Example navigation to results
  navigateToResults: (optimizationResult: any) => {
    // navigation.navigate('Results', { optimizationResult });
  },
};

/**
 * Example of using with Redux/State Management
 */
export const ReduxIntegrationExample = {
  // Action creators
  updateUserLocations: (locations: UserLocationInput[]) => ({
    type: 'UPDATE_USER_LOCATIONS',
    payload: locations,
  }),
  
  startOptimization: (locations: UserLocationInput[]) => ({
    type: 'START_OPTIMIZATION',
    payload: locations,
  }),
  
  // Selector
  selectUserLocations: (state: any) => state.userLocations || [],
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
});

/**
 * Configuration Example for Production
 */
export const ProductionSetup = {
  // Add to your app.json or environment configuration
  googlePlacesApiKey: 'YOUR_GOOGLE_PLACES_API_KEY',
  
  // Update the constants.ts file with your API key
  // SINGAPORE_PLACES_CONFIG: {
  //   ...SINGAPORE_PLACES_CONFIG,
  //   key: process.env.GOOGLE_PLACES_API_KEY,
  // },
};

/**
 * Integration with Existing Algorithms
 * 
 * The LocationInput component outputs UserLocationInput[] which can be easily
 * converted to the format expected by the existing algorithms:
 * 
 * // Convert LocationInput output to algorithm input
 * const convertForAlgorithm = (locations: UserLocationInput[]) => {
 *   return locations
 *     .filter(loc => loc.isValid && loc.coordinate)
 *     .map(loc => ({
 *       id: loc.id,
 *       latitude: loc.coordinate!.latitude,
 *       longitude: loc.coordinate!.longitude,
 *       transportMode: loc.transportMode,
 *       address: loc.address,
 *     }));
 * };
 * 
 * // Call existing optimization algorithm
 * import { optimizeLocation } from '../algorithms/...';
 * 
 * const algorithmInput = convertForAlgorithm(validatedLocations);
 * const result = await optimizeLocation(algorithmInput);
 */