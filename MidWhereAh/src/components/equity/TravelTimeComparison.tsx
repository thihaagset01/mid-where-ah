/**
 * Production-ready TravelTimeComparison component
 * Features: Horizontal bar chart, color-coded bars, average line indicator, user info
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, ViewStyle } from 'react-native';
import { colors, typography, spacing } from '../../constants';
import type { UserLocation } from '../../types';

export interface TravelTimeData {
  user: UserLocation;
  travelTime: number; // minutes
}

export interface TravelTimeComparisonProps {
  data: TravelTimeData[];
  style?: ViewStyle;
  showAverage?: boolean;
  maxBarWidth?: number;
}

export const TravelTimeComparison: React.FC<TravelTimeComparisonProps> = ({
  data,
  style,
  showAverage = true,
  maxBarWidth = 200,
}) => {
  const animatedValues = useRef(
    data.map(() => new Animated.Value(0))
  ).current;

  const maxTime = Math.max(...data.map(d => d.travelTime));
  const averageTime = data.reduce((sum, d) => sum + d.travelTime, 0) / data.length;

  useEffect(() => {
    const animations = animatedValues.map((animatedValue, index) => {
      return Animated.timing(animatedValue, {
        toValue: data[index]?.travelTime || 0,
        duration: 1000 + index * 200, // Stagger animations
        useNativeDriver: false,
      });
    });

    Animated.stagger(100, animations).start();
  }, [data, animatedValues]);

  const getBarColor = (travelTime: number): string => {
    const ratio = travelTime / averageTime;
    
    if (ratio <= 0.8) return colors.equity.excellent; // Much faster than average
    if (ratio <= 1.0) return colors.equity.good;      // Close to average
    if (ratio <= 1.3) return colors.equity.fair;      // Moderately slower
    if (ratio <= 1.6) return colors.equity.poor;      // Much slower
    return colors.equity.critical;                     // Extremely slow
  };

  const getTransportIcon = (transportMode: string): string => {
    switch (transportMode) {
      case 'TRANSIT': return '🚇';
      case 'WALKING': return '🚶';
      case 'DRIVING': return '🚗';
      case 'CYCLING': return '🚴';
      default: return '📍';
    }
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>Travel Time Comparison</Text>
      
      <View style={styles.chartContainer}>
        {data.map((item, index) => {
          const barWidth = animatedValues[index]?.interpolate({
            inputRange: [0, maxTime || 1],
            outputRange: [0, maxBarWidth],
            extrapolate: 'clamp',
          });

          return (
            <View key={item.user.id} style={styles.barRow}>
              <View style={styles.userInfo}>
                <Text style={styles.userIcon}>
                  {getTransportIcon(item.user.transportMode)}
                </Text>
                <Text style={styles.userName}>
                  {item.user.name || `User ${index + 1}`}
                </Text>
                <Text style={styles.transportMode}>
                  {item.user.transportMode.toLowerCase()}
                </Text>
              </View>
              
              <View style={styles.barContainer}>
                <Animated.View
                  style={[
                    styles.bar,
                    {
                      width: barWidth,
                      backgroundColor: getBarColor(item.travelTime),
                    },
                  ]}
                />
                <Text style={styles.timeLabel}>
                  {item.travelTime}min
                </Text>
              </View>
            </View>
          );
        })}

        {/* Average line indicator */}
        {showAverage && (
          <View style={styles.averageContainer}>
            <View
              style={[
                styles.averageLine,
                {
                  left: (averageTime / maxTime) * maxBarWidth + 120, // Offset for user info width
                },
              ]}
            />
            <Text
              style={[
                styles.averageLabel,
                {
                  left: (averageTime / maxTime) * maxBarWidth + 115,
                },
              ]}
            >
              Avg: {averageTime.toFixed(1)}min
            </Text>
          </View>
        )}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: colors.equity.excellent }]} />
          <Text style={styles.legendText}>Much faster</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: colors.equity.good }]} />
          <Text style={styles.legendText}>Close to average</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: colors.equity.fair }]} />
          <Text style={styles.legendText}>Moderately slower</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: colors.equity.poor }]} />
          <Text style={styles.legendText}>Much slower</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  title: {
    fontSize: typography.sizes.h4,
    fontWeight: '600',
    color: colors.neutral.gray900,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  chartContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    minHeight: 40,
  },
  userInfo: {
    width: 120,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  userIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  userName: {
    fontSize: typography.sizes.caption,
    fontWeight: '600',
    color: colors.neutral.gray900,
    flex: 1,
  },
  transportMode: {
    fontSize: typography.sizes.small,
    color: colors.neutral.gray500,
    textTransform: 'capitalize',
  },
  barContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bar: {
    height: 24,
    borderRadius: 12,
    marginRight: spacing.sm,
  },
  timeLabel: {
    fontSize: typography.sizes.caption,
    fontWeight: '600',
    color: colors.neutral.gray600,
    minWidth: 50,
  },
  averageContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    zIndex: 1,
  },
  averageLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: colors.brand.primary,
    opacity: 0.8,
  },
  averageLabel: {
    position: 'absolute',
    top: -25,
    fontSize: typography.sizes.small,
    color: colors.brand.primary,
    fontWeight: '600',
    backgroundColor: colors.neutral.white,
    paddingHorizontal: spacing.xs,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
    marginBottom: spacing.xs,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.xs,
  },
  legendText: {
    fontSize: typography.sizes.small,
    color: colors.neutral.gray600,
  },
});