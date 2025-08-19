// src/components/common/Button.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, typography, spacing } from '../../constants';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  testID
}) => {
  const buttonStyle = [
    styles.base,
    styles[variant],
    styles[size],
    disabled && styles.disabled,
    style
  ];
  
  const textStyle = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    disabled && styles.disabledText
  ];
  
  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      accessibilityLabel={title}
    >
      <Text style={textStyle}>
        {loading ? 'Loading...' : title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  } as ViewStyle,
  
  // Variants
  primary: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  } as ViewStyle,
  
  secondary: {
    backgroundColor: colors.neutral.gray100,
    borderColor: colors.neutral.gray100,
  } as ViewStyle,
  
  outline: {
    backgroundColor: 'transparent',
    borderColor: colors.primary.main,
  } as ViewStyle,
  
  // Sizes
  small: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  } as ViewStyle,
  
  medium: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  } as ViewStyle,
  
  large: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  } as ViewStyle,
  
  // States
  disabled: {
    opacity: 0.6,
  } as ViewStyle,
  
  // Text styles
  text: {
    fontWeight: '600',
    textAlign: 'center',
  } as TextStyle,
  
  primaryText: {
    color: colors.neutral.white,
  } as TextStyle,
  
  secondaryText: {
    color: colors.neutral.gray900,
  } as TextStyle,
  
  outlineText: {
    color: colors.primary.main,
  } as TextStyle,
  
  smallText: {
    fontSize: typography.caption.fontSize,
  } as TextStyle,
  
  mediumText: {
    fontSize: typography.body.fontSize,
  } as TextStyle,
  
  largeText: {
    fontSize: typography.h3.fontSize,
  } as TextStyle,
  
  disabledText: {
    opacity: 0.8,
  } as TextStyle,
});