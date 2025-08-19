/**
 * Production-ready LoadingSpinner component with purple theme
 * Features: size variants, smooth animations, optional text labels
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, ViewStyle } from 'react-native';
import { colors, typography, spacing } from '../../constants';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  text?: string;
  style?: ViewStyle;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = colors.brand.primary,
  text,
  style,
}) => {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spin = () => {
      spinValue.setValue(0);
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start(() => spin());
    };
    spin();
  }, [spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const sizeStyles = {
    sm: { width: 20, height: 20, borderWidth: 2 },
    md: { width: 32, height: 32, borderWidth: 3 },
    lg: { width: 48, height: 48, borderWidth: 4 },
  };

  const spinnerStyle = [
    styles.spinner,
    sizeStyles[size],
    {
      borderColor: `${color}20`, // 20% opacity for background
      borderTopColor: color,
      transform: [{ rotate: spin }],
    },
  ];

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={spinnerStyle} />
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    borderRadius: 50,
    borderStyle: 'solid',
  },
  text: {
    marginTop: spacing.sm,
    fontSize: typography.sizes.caption,
    color: colors.neutral.gray600,
    textAlign: 'center',
  },
});