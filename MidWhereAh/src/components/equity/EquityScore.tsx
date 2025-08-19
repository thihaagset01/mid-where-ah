/**
 * Production-ready EquityScore component
 * Features: Circular progress for Jain's Index, color-coded by equity level, explanations
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, ViewStyle } from 'react-native';
import { colors, typography, spacing } from '../../constants';

export interface EquityScoreProps {
  jainsIndex: number; // 0-1
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showExplanation?: boolean;
  style?: ViewStyle;
}

export const EquityScore: React.FC<EquityScoreProps> = ({
  jainsIndex,
  size = 'md',
  showLabel = true,
  showExplanation = false,
  style,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  
  // Clamp jainsIndex to 0-1 range
  const clampedIndex = Math.max(0, Math.min(1, jainsIndex));
  const percentage = Math.round(clampedIndex * 100);

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: clampedIndex,
      duration: 1500,
      useNativeDriver: false,
    }).start();
  }, [clampedIndex, animatedValue]);

  const getEquityLevel = (index: number): {
    level: string;
    color: string;
    description: string;
  } => {
    if (index > 0.9) return {
      level: 'EXCELLENT',
      color: colors.equity.excellent,
      description: 'Highly equitable - all users have similar travel times'
    };
    if (index > 0.8) return {
      level: 'GOOD',
      color: colors.equity.good,
      description: 'Good equity - minor differences in travel times'
    };
    if (index > 0.6) return {
      level: 'FAIR',
      color: colors.equity.fair,
      description: 'Moderate equity - some users travel significantly longer'
    };
    if (index > 0.4) return {
      level: 'POOR',
      color: colors.equity.poor,
      description: 'Poor equity - major differences in travel times'
    };
    return {
      level: 'CRITICAL',
      color: colors.equity.critical,
      description: 'Very unfair - some users travel much longer than others'
    };
  };

  const equity = getEquityLevel(clampedIndex);

  const sizeConfig = {
    sm: { radius: 30, strokeWidth: 4, fontSize: typography.sizes.caption },
    md: { radius: 50, strokeWidth: 6, fontSize: typography.sizes.h4 },
    lg: { radius: 70, strokeWidth: 8, fontSize: typography.sizes.h3 },
  };

  const config = sizeConfig[size];
  const circumference = 2 * Math.PI * config.radius;
  
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={[styles.container, style]}>
      <View style={styles.circleContainer}>
        {/* Background circle */}
        <View
          style={[
            styles.circle,
            {
              width: config.radius * 2 + config.strokeWidth * 2,
              height: config.radius * 2 + config.strokeWidth * 2,
              borderRadius: config.radius + config.strokeWidth,
              borderWidth: config.strokeWidth,
              borderColor: colors.neutral.gray200,
            },
          ]}
        />
        
        {/* Progress circle */}
        <Animated.View
          style={[
            styles.progressCircle,
            {
              width: config.radius * 2 + config.strokeWidth * 2,
              height: config.radius * 2 + config.strokeWidth * 2,
              borderRadius: config.radius + config.strokeWidth,
              borderWidth: config.strokeWidth,
              borderColor: equity.color,
              transform: [{ rotate: '-90deg' }],
            },
          ]}
        />

        {/* Center content */}
        <View style={styles.centerContent}>
          <Text style={[styles.percentage, { fontSize: config.fontSize }]}>
            {percentage}%
          </Text>
          {showLabel && (
            <Text style={[styles.equityLevel, { color: equity.color }]}>
              {equity.level}
            </Text>
          )}
        </View>
      </View>

      {showExplanation && (
        <View style={styles.explanationContainer}>
          <Text style={styles.explanationTitle}>Equity Analysis</Text>
          <Text style={styles.explanationText}>{equity.description}</Text>
          <Text style={styles.jainsIndexText}>
            Jain's Fairness Index: {clampedIndex.toFixed(3)}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  circleContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
  progressCircle: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentage: {
    fontWeight: '700',
    color: colors.neutral.gray900,
  },
  equityLevel: {
    fontSize: typography.sizes.caption,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  explanationContainer: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  explanationTitle: {
    fontSize: typography.sizes.body,
    fontWeight: '600',
    color: colors.neutral.gray900,
    marginBottom: spacing.xs,
  },
  explanationText: {
    fontSize: typography.sizes.caption,
    color: colors.neutral.gray600,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  jainsIndexText: {
    fontSize: typography.sizes.small,
    color: colors.neutral.gray500,
    fontFamily: 'monospace',
  },
});