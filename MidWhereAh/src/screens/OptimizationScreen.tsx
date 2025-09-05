import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import { UserLocationInput } from '../components/location/types';
import { startOptimization, OptimizationProgress, OptimizationResult } from '../services/optimization';

type OptimizationScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Optimization'>;
type OptimizationScreenRouteProp = RouteProp<RootStackParamList, 'Optimization'>;

interface Props {
  navigation: OptimizationScreenNavigationProp;
  route: OptimizationScreenRouteProp;
}

export function OptimizationScreen({ navigation, route }: Props) {
  const { userLocations } = route.params;
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [progress, setProgress] = useState<OptimizationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle progress updates from optimization service
   */
  const handleProgress = (progressUpdate: OptimizationProgress) => {
    setProgress(progressUpdate);
  };

  /**
   * Start the optimization process
   */
  const handleOptimize = async () => {
    setIsOptimizing(true);
    setError(null);
    setProgress(null);

    try {
      const result: OptimizationResult = await startOptimization(userLocations, handleProgress);
      
      // Navigate to results screen with the optimization result
      navigation.replace('Results', { optimizationResult: result });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Optimization failed');
      setIsOptimizing(false);
    }
  };

  /**
   * Auto-start optimization when screen loads
   */
  useEffect(() => {
    // Small delay to show the screen first
    const timer = setTimeout(() => {
      handleOptimize();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  /**
   * Render progress indicator
   */
  const renderProgress = () => {
    if (!progress) {
      return (
        <View style={styles.progressContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.progressText}>Initializing optimization...</Text>
        </View>
      );
    }

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progress.progress}%` }]} />
        </View>
        <Text style={styles.progressPercentage}>{progress.progress}%</Text>
        <Text style={styles.progressMessage}>{progress.message}</Text>
        <View style={styles.stageIndicator}>
          <Text style={[
            styles.stageText,
            progress.stage === 'initializing' && styles.activeStage
          ]}>
            Initializing
          </Text>
          <Text style={[
            styles.stageText,
            progress.stage === 'calculating' && styles.activeStage
          ]}>
            Calculating
          </Text>
          <Text style={[
            styles.stageText,
            progress.stage === 'analyzing' && styles.activeStage
          ]}>
            Analyzing
          </Text>
          <Text style={[
            styles.stageText,
            progress.stage === 'complete' && styles.activeStage
          ]}>
            Complete
          </Text>
        </View>
      </View>
    );
  };

  /**
   * Render error state
   */
  const renderError = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>⚠️ Optimization Failed</Text>
      <Text style={styles.errorMessage}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={handleOptimize}>
        <Text style={styles.retryButtonText}>🔄 Retry Optimization</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.retryButton, styles.backToHomeButton]} 
        onPress={() => navigation.navigate('Home')}
      >
        <Text style={[styles.retryButtonText, styles.backToHomeText]}>🏠 Back to Home</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>🎯 Finding Optimal Location</Text>
        <Text style={styles.subtitle}>
          Using Jain's Fairness Index for equitable travel times
        </Text>

        <View style={styles.locationsContainer}>
          <Text style={styles.sectionTitle}>📍 Input Locations ({userLocations.length})</Text>
          {userLocations.map((location: UserLocationInput, index: number) => (
            <View key={location.id} style={styles.locationItem}>
              <Text style={styles.locationText}>
                {index + 1}. {location.address}
              </Text>
              <Text style={styles.transportMode}>
                🚇 {location.transportMode}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.algorithmsContainer}>
          <Text style={styles.sectionTitle}>🔬 Optimization Process</Text>
          <View style={styles.algorithmItem}>
            <Text style={styles.algorithmTitle}>⚖️ Equity Analysis</Text>
            <Text style={styles.algorithmDescription}>
              Using Jain's Fairness Index to ensure fair travel time distribution
            </Text>
          </View>
          <View style={styles.algorithmItem}>
            <Text style={styles.algorithmTitle}>🚇 Transport-Aware</Text>
            <Text style={styles.algorithmDescription}>
              Considers different transport modes and Singapore infrastructure
            </Text>
          </View>
          <View style={styles.algorithmItem}>
            <Text style={styles.algorithmTitle}>📊 Performance Optimized</Text>
            <Text style={styles.algorithmDescription}>
              Target: &lt;2 seconds with real-time progress tracking
            </Text>
          </View>
        </View>

        {/* Show appropriate content based on state */}
        {error ? renderError() : renderProgress()}
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
    fontWeight: '500',
  },
  transportMode: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 2,
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
  progressContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#ecf0f1',
    borderRadius: 4,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3498db',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 16,
  },
  progressMessage: {
    fontSize: 16,
    color: '#34495e',
    textAlign: 'center',
    marginBottom: 20,
  },
  stageIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
  },
  stageText: {
    fontSize: 12,
    color: '#bdc3c7',
    fontWeight: '500',
  },
  activeStage: {
    color: '#3498db',
    fontWeight: 'bold',
  },
  errorContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backToHomeButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#3498db',
  },
  backToHomeText: {
    color: '#3498db',
  },
});