import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, UserLocation, OptimizationResult } from '../types/navigation';

type OptimizationScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Optimization'>;
type OptimizationScreenRouteProp = RouteProp<RootStackParamList, 'Optimization'>;

interface Props {
  navigation: OptimizationScreenNavigationProp;
  route: OptimizationScreenRouteProp;
}

export function OptimizationScreen({ navigation, route }: Props) {
  const { userLocations } = route.params;

  const handleOptimize = () => {
    // Mock optimization result
    const mockResult: OptimizationResult = {
      id: 'result-1',
      centerPoint: {
        latitude: 1.3241,
        longitude: 103.8480,
      },
      fairnessScore: 0.85,
      method: 'transport-aware',
      confidence: 0.92,
      timestamp: Date.now(),
    };

    navigation.navigate('Results', { optimizationResult: mockResult });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>Location Optimization</Text>
        <Text style={styles.subtitle}>Find the optimal meeting point</Text>

        <View style={styles.locationsContainer}>
          <Text style={styles.sectionTitle}>User Locations ({userLocations.length})</Text>
          {userLocations.map((location: UserLocation, index: number) => (
            <View key={location.id} style={styles.locationItem}>
              <Text style={styles.locationText}>
                📍 Location {index + 1}: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.algorithmsContainer}>
          <Text style={styles.sectionTitle}>Algorithm Options</Text>
          <View style={styles.algorithmItem}>
            <Text style={styles.algorithmTitle}>🚇 Transport-Aware</Text>
            <Text style={styles.algorithmDescription}>
              Considers public transport accessibility and equity
            </Text>
          </View>
          <View style={styles.algorithmItem}>
            <Text style={styles.algorithmTitle}>📊 Equity-Based</Text>
            <Text style={styles.algorithmDescription}>
              Uses Jain's Index for fair distance distribution
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.optimizeButton} onPress={handleOptimize}>
          <Text style={styles.optimizeButtonText}>🔍 Find Optimal Location</Text>
        </TouchableOpacity>
      </ScrollView>
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
  },
  contentContainer: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 30,
    textAlign: 'center',
  },
  locationsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  locationItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  locationText: {
    fontSize: 14,
    color: '#34495e',
  },
  algorithmsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  algorithmItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  algorithmTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  algorithmDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
  },
  optimizeButton: {
    backgroundColor: '#27ae60',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  optimizeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});