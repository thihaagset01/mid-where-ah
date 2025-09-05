import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import { useAppSelector } from '../store';
import { selectOptimizationResult } from '../store/optimization/optimizationSlice';
import { getEquityLevelColor, isAcceptableEquityLevel, requiresAttention } from '../algorithms/equity/equityLevel';

type ResultsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Results'>;
type ResultsScreenRouteProp = RouteProp<RootStackParamList, 'Results'>;

interface Props {
  navigation: ResultsScreenNavigationProp;
  route: ResultsScreenRouteProp;
}

export function ResultsScreen({ navigation }: Props) {
  const optimizationResult = useAppSelector(selectOptimizationResult);

  // If no optimization result is available, redirect to home
  if (!optimizationResult) {
    navigation.replace('Home');
    return null;
  }

  /**
   * Get equity level emoji based on level
   */
  const getEquityEmoji = (level: string): string => {
    switch (level) {
      case 'excellent': return '🎯';
      case 'good': return '✅';
      case 'fair': return '⚖️';
      case 'poor': return '⚠️';
      case 'critical': return '🚨';
      default: return '📊';
    }
  };

  /**
   * Format time for display
   */
  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${Math.round(minutes)}min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}min`;
  };

  /**
   * Render equity assessment section
   */
  const renderEquityAssessment = () => {
    const { equityAssessment } = optimizationResult;
    const colorCode = getEquityLevelColor(equityAssessment.level);
    
    return (
      <View style={styles.resultContainer}>
        <View style={styles.resultHeader}>
          <Text style={styles.resultTitle}>
            {getEquityEmoji(equityAssessment.level)} {equityAssessment.title}
          </Text>
          <View style={[styles.equityBadge, { backgroundColor: colorCode }]}>
            <Text style={styles.equityBadgeText}>
              {(optimizationResult.equityAnalysis.fairnessIndex * 100).toFixed(1)}% Fair
            </Text>
          </View>
        </View>

        <Text style={styles.equityDescription}>
          {equityAssessment.description}
        </Text>

        <View style={styles.metricsContainer}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Jain's Fairness Index</Text>
            <Text style={styles.metricValue}>
              {optimizationResult.equityAnalysis.fairnessIndex.toFixed(3)}
            </Text>
            <Text style={styles.metricSubtext}>(0-1 scale)</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Confidence</Text>
            <Text style={styles.metricValue}>
              {(optimizationResult.confidence * 100).toFixed(1)}%
            </Text>
            <Text style={styles.metricSubtext}>Data quality</Text>
          </View>
        </View>
      </View>
    );
  };

  /**
   * Render location details section
   */
  const renderLocationDetails = () => (
    <View style={styles.resultContainer}>
      <Text style={styles.sectionTitle}>📍 Optimal Meeting Point</Text>
      
      <View style={styles.coordinatesContainer}>
        <Text style={styles.coordinates}>
          {optimizationResult.optimalLocation.latitude.toFixed(6)}, {optimizationResult.optimalLocation.longitude.toFixed(6)}
        </Text>
        {optimizationResult.optimalLocation.address && (
          <Text style={styles.address}>
            {optimizationResult.optimalLocation.address}
          </Text>
        )}
      </View>

      <View style={styles.improvementContainer}>
        <Text style={styles.improvementLabel}>vs Geometric Center:</Text>
        <Text style={[
          styles.improvementValue,
          optimizationResult.improvementVsBaseline >= 0 ? styles.positiveImprovement : styles.negativeImprovement
        ]}>
          {optimizationResult.improvementVsBaseline >= 0 ? '+' : ''}{optimizationResult.improvementVsBaseline.toFixed(1)}%
        </Text>
      </View>
    </View>
  );

  /**
   * Render travel times section
   */
  const renderTravelTimes = () => (
    <View style={styles.resultContainer}>
      <Text style={styles.sectionTitle}>🚇 Travel Times Analysis</Text>
      
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Average</Text>
          <Text style={styles.statValue}>
            {formatTime(optimizationResult.equityAnalysis.meanTravelTime)}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Range</Text>
          <Text style={styles.statValue}>
            {formatTime(optimizationResult.equityAnalysis.standardDeviation * 2)}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Participants</Text>
          <Text style={styles.statValue}>
            {optimizationResult.equityAnalysis.sampleSize}
          </Text>
        </View>
      </View>

      <View style={styles.participantsContainer}>
        {optimizationResult.participantTravelTimes.map((participant, index) => (
          <View key={participant.id} style={styles.participantItem}>
            <Text style={styles.participantName}>
              {participant.locationName || `Participant ${index + 1}`}
            </Text>
            <Text style={styles.participantTime}>
              {formatTime(participant.travelTimeMinutes)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  /**
   * Render recommendations section
   */
  const renderRecommendations = () => (
    <View style={[
      styles.resultContainer,
      requiresAttention(optimizationResult.equityLevel) && styles.warningContainer
    ]}>
      <Text style={styles.sectionTitle}>💡 Recommendations</Text>
      <Text style={styles.recommendationText}>
        {optimizationResult.equityAssessment.recommendation}
      </Text>
      
      {requiresAttention(optimizationResult.equityLevel) && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            ⚠️ This location shows significant travel time inequality. Consider the suggestions above for a more fair meeting point.
          </Text>
        </View>
      )}
    </View>
  );

  /**
   * Render performance metrics
   */
  const renderPerformanceMetrics = () => (
    <View style={styles.performanceContainer}>
      <Text style={styles.performanceTitle}>⚡ Optimization Performance</Text>
      <Text style={styles.performanceText}>
        Completed in {optimizationResult.calculationTime}ms • Target: &lt;2000ms
      </Text>
      <Text style={styles.performanceText}>
        Processed at {optimizationResult.completedAt.toLocaleTimeString()}
      </Text>
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
        <Text style={styles.title}>🎯 Optimization Results</Text>
        <Text style={styles.subtitle}>
          Equity-based meeting point with Jain's Fairness Index
        </Text>

        {renderEquityAssessment()}
        {renderLocationDetails()}
        {renderTravelTimes()}
        {renderRecommendations()}

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
            <Text style={[styles.actionButtonText, styles.secondaryActionText]}>🏠 New Optimization</Text>
          </TouchableOpacity>
        </View>

        {renderPerformanceMetrics()}
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
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  warningContainer: {
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  resultHeader: {
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
    textAlign: 'center',
  },
  equityBadge: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  equityBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  equityDescription: {
    fontSize: 16,
    color: '#34495e',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  coordinatesContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  coordinates: {
    fontSize: 18,
    color: '#34495e',
    fontFamily: 'monospace',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    textAlign: 'center',
    marginBottom: 8,
  },
  address: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  improvementContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f2f6',
    padding: 12,
    borderRadius: 8,
  },
  improvementLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginRight: 8,
  },
  improvementValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  positiveImprovement: {
    color: '#27ae60',
  },
  negativeImprovement: {
    color: '#e74c3c',
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
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
  metricSubtext: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  participantsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  participantItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  participantName: {
    fontSize: 14,
    color: '#34495e',
    flex: 1,
  },
  participantTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  recommendationText: {
    fontSize: 15,
    color: '#34495e',
    lineHeight: 22,
    marginBottom: 12,
  },
  warningBox: {
    backgroundColor: '#fdf2f2',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  warningText: {
    fontSize: 14,
    color: '#c0392b',
    lineHeight: 20,
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
  performanceContainer: {
    backgroundColor: '#e8f4f8',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
    marginTop: 10,
  },
  performanceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 6,
  },
  performanceText: {
    fontSize: 12,
    color: '#34495e',
    lineHeight: 16,
  },
});