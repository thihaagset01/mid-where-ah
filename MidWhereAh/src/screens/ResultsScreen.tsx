import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';

type ResultsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Results'>;
type ResultsScreenRouteProp = RouteProp<RootStackParamList, 'Results'>;

interface Props {
  navigation: ResultsScreenNavigationProp;
  route: ResultsScreenRouteProp;
}

export function ResultsScreen({ navigation, route }: Props) {
  const { optimizationResult } = route.params;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>Optimization Results</Text>
        <Text style={styles.subtitle}>Here's your optimal meeting point</Text>

        <View style={styles.resultContainer}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultTitle}>🎯 Optimal Location Found</Text>
            <Text style={styles.confidence}>
              Confidence: {(optimizationResult.confidence * 100).toFixed(1)}%
            </Text>
          </View>

          <View style={styles.coordinatesContainer}>
            <Text style={styles.coordinatesTitle}>📍 Coordinates</Text>
            <Text style={styles.coordinates}>
              {optimizationResult.centerPoint.latitude.toFixed(6)}, {optimizationResult.centerPoint.longitude.toFixed(6)}
            </Text>
          </View>

          <View style={styles.metricsContainer}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Fairness Score</Text>
              <Text style={styles.metricValue}>
                {(optimizationResult.fairnessScore * 100).toFixed(1)}%
              </Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Algorithm</Text>
              <Text style={styles.metricValue}>{optimizationResult.method}</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => navigation.navigate('Map')}
          >
            <Text style={styles.actionButtonText}>🗺️ View on Map</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.secondaryAction]} 
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={[styles.actionButtonText, styles.secondaryActionText]}>🏠 Back to Home</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            This location has been calculated to minimize travel time inequality among all participants using equity-based algorithms.
          </Text>
        </View>
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
  resultContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  resultHeader: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#27ae60',
    marginBottom: 8,
  },
  confidence: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '600',
  },
  coordinatesContainer: {
    marginBottom: 20,
  },
  coordinatesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  coordinates: {
    fontSize: 18,
    color: '#34495e',
    fontFamily: 'monospace',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    textAlign: 'center',
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metric: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  actionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    backgroundColor: '#3498db',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryAction: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#3498db',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryActionText: {
    color: '#3498db',
  },
  infoContainer: {
    backgroundColor: '#e8f4f8',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  infoText: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 20,
    textAlign: 'center',
  },
});