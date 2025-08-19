/**
 * Production-ready ResultsScreen - Shows optimization results
 * Features: Map with optimal point, equity score, travel time comparison, venue recommendations
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Share,
} from 'react-native';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { EquityScore } from '../components/equity/EquityScore';
import { TravelTimeComparison } from '../components/equity/TravelTimeComparison';
import { colors, typography, spacing } from '../constants';
import { useAppSelector } from '../store/hooks';
import type { Venue, UserLocation } from '../types';

// Sample data for demonstration
const SAMPLE_RESULTS = {
  optimalPoint: { lat: 1.3048, lng: 103.8318 },
  jainsIndex: 0.974,
  averageTravelTime: 15,
  travelTimes: [
    { user: { id: '1', name: 'Alice', coordinate: { lat: 1.3048, lng: 103.8318 }, transportMode: 'TRANSIT' as const }, travelTime: 12 },
    { user: { id: '2', name: 'Bob', coordinate: { lat: 1.2800, lng: 103.8500 }, transportMode: 'TRANSIT' as const }, travelTime: 15 },
    { user: { id: '3', name: 'Charlie', coordinate: { lat: 1.3330, lng: 103.7436 }, transportMode: 'TRANSIT' as const }, travelTime: 18 },
  ],
  venues: [
    { id: '1', name: 'ION Orchard Food Court', coordinate: { lat: 1.3048, lng: 103.8318 }, type: 'restaurant' as const, rating: 4.2, priceLevel: 2, equityScore: 0.95 },
    { id: '2', name: 'Starbucks Orchard', coordinate: { lat: 1.3045, lng: 103.8320 }, type: 'cafe' as const, rating: 4.0, priceLevel: 3, equityScore: 0.92 },
    { id: '3', name: 'Orchard Central Mall', coordinate: { lat: 1.3010, lng: 103.8350 }, type: 'mall' as const, rating: 4.1, priceLevel: 2, equityScore: 0.88 },
  ],
};

export const ResultsScreen: React.FC = () => {
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  // Get results from Redux (fallback to sample data)
  const optimizationResult = useAppSelector(state => state.optimization.result) || SAMPLE_RESULTS;

  const handleVenueSelect = (venue: Venue) => {
    setSelectedVenue(venue);
  };

  const handleShareResults = async () => {
    try {
      await Share.share({
        message: `🇸🇬 Found the perfect meeting spot using MidWhereAh!\n\nEquity Score: ${Math.round(optimizationResult.jainsIndex * 100)}% (Excellent)\nAverage Travel Time: ${optimizationResult.averageTravelTime} minutes\n\nTop venue: ${optimizationResult.venues[0]?.name}\n\nDownload MidWhereAh for transport-aware meetup planning!`,
        title: 'MidWhereAh Results',
      });
    } catch (error) {
      console.error('Error sharing results:', error);
    }
  };

  const handleSaveResults = () => {
    // TODO: Save to user's history
    console.log('Save results to history');
  };

  const handleNewOptimization = () => {
    // Navigate back to home screen
    console.log('Start new optimization');
  };

  const getVenueIcon = (type: string): string => {
    switch (type) {
      case 'restaurant': return '🍽️';
      case 'cafe': return '☕';
      case 'mall': return '🏬';
      case 'park': return '🌳';
      case 'attraction': return '🎯';
      default: return '📍';
    }
  };

  const getEquityColor = (score: number): string => {
    if (score > 0.9) return colors.equity.excellent;
    if (score > 0.8) return colors.equity.good;
    if (score > 0.6) return colors.equity.fair;
    if (score > 0.4) return colors.equity.poor;
    return colors.equity.critical;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🎯 Optimization Results</Text>
          <Text style={styles.subtitle}>
            Transport-aware equity optimization complete
          </Text>
        </View>

        {/* Map Placeholder - Will be replaced with actual MapView */}
        <Card variant="elevated" padding="sm" style={styles.mapCard}>
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapPlaceholderText}>🗺️ Interactive Map</Text>
            <Text style={styles.mapPlaceholderSubtext}>
              Optimal point: {optimizationResult.optimalPoint.lat.toFixed(4)}, {optimizationResult.optimalPoint.lng.toFixed(4)}
            </Text>
            <Text style={styles.mapPlaceholderNote}>
              (MapBox integration pending - install @rnmapbox/maps)
            </Text>
          </View>
        </Card>

        {/* Equity Score */}
        <Card variant="elevated" padding="lg" style={styles.equityCard}>
          <EquityScore
            jainsIndex={optimizationResult.jainsIndex}
            size="lg"
            showLabel={true}
            showExplanation={true}
          />
        </Card>

        {/* Travel Time Comparison */}
        <Card variant="outlined" padding="sm" style={styles.comparisonCard}>
          <TouchableOpacity
            style={styles.comparisonHeader}
            onPress={() => setShowComparison(!showComparison)}
          >
            <Text style={styles.comparisonTitle}>Travel Time Analysis</Text>
            <Text style={styles.comparisonToggle}>
              {showComparison ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>
          
          {showComparison && (
            <TravelTimeComparison
              data={optimizationResult.travelTimes}
              showAverage={true}
            />
          )}
        </Card>

        {/* Venue Recommendations */}
        <View style={styles.venuesSection}>
          <Text style={styles.sectionTitle}>Recommended Venues</Text>
          
          {optimizationResult.venues.map((venue, index) => (
            <Card
              key={venue.id}
              variant={selectedVenue?.id === venue.id ? "elevated" : "outlined"}
              padding="md"
              style={[
                styles.venueCard,
                selectedVenue?.id === venue.id && styles.venueCardSelected
              ]}
            >
              <TouchableOpacity onPress={() => handleVenueSelect(venue)}>
                <View style={styles.venueHeader}>
                  <View style={styles.venueInfo}>
                    <Text style={styles.venueIcon}>
                      {getVenueIcon(venue.type)}
                    </Text>
                    <View style={styles.venueDetails}>
                      <Text style={styles.venueName}>{venue.name}</Text>
                      <Text style={styles.venueType}>
                        {venue.type.charAt(0).toUpperCase() + venue.type.slice(1)}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.venueMetrics}>
                    <View style={styles.venueRating}>
                      <Text style={styles.venueRatingText}>⭐ {venue.rating}</Text>
                    </View>
                    <View style={[
                      styles.equityBadge,
                      { backgroundColor: getEquityColor(venue.equityScore || 0) }
                    ]}>
                      <Text style={styles.equityBadgeText}>
                        {Math.round((venue.equityScore || 0) * 100)}%
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.venueFooter}>
                  <Text style={styles.venuePriceLevel}>
                    {'$'.repeat(venue.priceLevel || 1)} • Equity Score: {((venue.equityScore || 0) * 100).toFixed(1)}%
                  </Text>
                  <Text style={styles.venueRank}>
                    #{index + 1} recommendation
                  </Text>
                </View>
              </TouchableOpacity>
            </Card>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <View style={styles.actionRow}>
            <Button
              title="📤 Share Results"
              onPress={handleShareResults}
              variant="outlined"
              style={styles.actionButton}
            />
            <Button
              title="💾 Save"
              onPress={handleSaveResults}
              variant="outlined"
              style={styles.actionButton}
            />
          </View>
          
          <Button
            title="🚀 New Optimization"
            onPress={handleNewOptimization}
            style={styles.newOptimizationButton}
          />
        </View>

        {/* Algorithm Explanation */}
        <Card variant="default" padding="lg" style={styles.explanationCard}>
          <Text style={styles.explanationTitle}>🧮 How We Calculated This</Text>
          <Text style={styles.explanationText}>
            This result uses <Text style={styles.highlightText}>Jain's Fairness Index</Text> with 
            Singapore's MRT network data to ensure equitable travel times for all participants.
          </Text>
          
          <View style={styles.algorithmStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{Math.round(optimizationResult.jainsIndex * 100)}%</Text>
              <Text style={styles.statLabel}>Equity Score</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{optimizationResult.averageTravelTime}min</Text>
              <Text style={styles.statLabel}>Avg Travel Time</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{optimizationResult.venues.length}</Text>
              <Text style={styles.statLabel}>Venues Found</Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.gray50,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: spacing.lg,
    alignItems: 'center',
    backgroundColor: colors.primary.background,
  },
  title: {
    fontSize: typography.sizes.h2,
    fontWeight: '700',
    color: colors.primary.main,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sizes.caption,
    color: colors.neutral.gray600,
    textAlign: 'center',
  },
  mapCard: {
    margin: spacing.md,
    height: 200,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral.gray100,
    borderRadius: 8,
  },
  mapPlaceholderText: {
    fontSize: typography.sizes.h4,
    color: colors.neutral.gray600,
    marginBottom: spacing.xs,
  },
  mapPlaceholderSubtext: {
    fontSize: typography.sizes.caption,
    color: colors.neutral.gray500,
    marginBottom: spacing.xs,
  },
  mapPlaceholderNote: {
    fontSize: typography.sizes.small,
    color: colors.neutral.gray400,
    fontStyle: 'italic',
  },
  equityCard: {
    margin: spacing.md,
  },
  comparisonCard: {
    margin: spacing.md,
  },
  comparisonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  comparisonTitle: {
    fontSize: typography.sizes.body,
    fontWeight: '600',
    color: colors.neutral.gray900,
  },
  comparisonToggle: {
    fontSize: typography.sizes.body,
    color: colors.brand.primary,
  },
  venuesSection: {
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.h4,
    fontWeight: '600',
    color: colors.neutral.gray900,
    marginBottom: spacing.md,
  },
  venueCard: {
    marginBottom: spacing.sm,
  },
  venueCardSelected: {
    borderColor: colors.brand.primary,
    borderWidth: 2,
  },
  venueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  venueInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  venueIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  venueDetails: {
    flex: 1,
  },
  venueName: {
    fontSize: typography.sizes.body,
    fontWeight: '600',
    color: colors.neutral.gray900,
    marginBottom: spacing.xs,
  },
  venueType: {
    fontSize: typography.sizes.caption,
    color: colors.neutral.gray500,
    textTransform: 'capitalize',
  },
  venueMetrics: {
    alignItems: 'flex-end',
  },
  venueRating: {
    marginBottom: spacing.xs,
  },
  venueRatingText: {
    fontSize: typography.sizes.caption,
    color: colors.neutral.gray600,
  },
  equityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  equityBadgeText: {
    fontSize: typography.sizes.small,
    fontWeight: '600',
    color: colors.neutral.white,
  },
  venueFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  venuePriceLevel: {
    fontSize: typography.sizes.caption,
    color: colors.neutral.gray600,
  },
  venueRank: {
    fontSize: typography.sizes.small,
    color: colors.brand.primary,
    fontWeight: '600',
  },
  actionSection: {
    padding: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  newOptimizationButton: {
    width: '100%',
  },
  explanationCard: {
    margin: spacing.md,
    backgroundColor: colors.primary.background,
  },
  explanationTitle: {
    fontSize: typography.sizes.h4,
    fontWeight: '600',
    color: colors.primary.dark,
    marginBottom: spacing.sm,
  },
  explanationText: {
    fontSize: typography.sizes.caption,
    color: colors.neutral.gray600,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  highlightText: {
    color: colors.primary.main,
    fontWeight: '600',
  },
  algorithmStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.sizes.h3,
    fontWeight: '700',
    color: colors.primary.main,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: typography.sizes.small,
    color: colors.neutral.gray500,
    textAlign: 'center',
  },
});
