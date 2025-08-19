/**
 * Production-ready Input component with purple theme
 * Features: floating labels, validation states, search variant, icons
 */

import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, typography, spacing } from '../../constants';

export interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  variant?: 'default' | 'search' | 'outline';
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  secureTextEntry?: boolean;
  editable?: boolean;
  style?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  variant = 'default',
  leftIcon,
  rightIcon,
  onRightIconPress,
  multiline = false,
  numberOfLines = 1,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoCorrect = true,
  secureTextEntry = false,
  editable = true,
  style,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const labelAnimation = useRef(new Animated.Value(value ? 1 : 0)).current;
  const inputRef = useRef<TextInput>(null);

  const hasValue = value.length > 0;
  const hasError = !!error;
  const isSearchVariant = variant === 'search';

  // Animate label position
  React.useEffect(() => {
    Animated.timing(labelAnimation, {
      toValue: isFocused || hasValue ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused, hasValue, labelAnimation]);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleLabelPress = () => {
    inputRef.current?.focus();
  };

  const labelStyle = {
    position: 'absolute' as const,
    left: leftIcon ? 44 : spacing.md,
    top: labelAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [20, 4],
    }),
    fontSize: labelAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [typography.sizes.body, typography.sizes.caption],
    }),
    color: labelAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [
        hasError ? colors.equity.critical : colors.neutral.gray500,
        hasError ? colors.equity.critical : 
        isFocused ? colors.brand.primary : colors.neutral.gray600
      ],
    }),
  };

  const containerStyle = [
    styles.container,
    isSearchVariant && styles.searchContainer,
    style,
  ];

  const inputContainerStyle = [
    styles.inputContainer,
    isFocused && styles.inputContainerFocused,
    hasError && styles.inputContainerError,
    isSearchVariant && styles.searchInputContainer,
    !editable && styles.inputContainerDisabled,
  ];

  const inputStyle = [
    styles.input,
    leftIcon && styles.inputWithLeftIcon,
    rightIcon && styles.inputWithRightIcon,
    multiline && styles.multilineInput,
    isSearchVariant && styles.searchInput,
  ];

  return (
    <View style={containerStyle}>
      <View style={inputContainerStyle}>
        {leftIcon && (
          <View style={styles.leftIconContainer}>
            <Text style={styles.icon}>{leftIcon}</Text>
          </View>
        )}
        
        <View style={styles.inputWrapper}>
          <Animated.Text
            style={labelStyle}
            onPress={handleLabelPress}
            suppressHighlighting
          >
            {label}
          </Animated.Text>
          
          <TextInput
            ref={inputRef}
            style={inputStyle}
            value={value}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={isFocused ? placeholder : ''}
            placeholderTextColor={colors.neutral.gray400}
            multiline={multiline}
            numberOfLines={numberOfLines}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            autoCorrect={autoCorrect}
            secureTextEntry={secureTextEntry}
            editable={editable}
            selectionColor={colors.brand.primary}
          />
        </View>

        {rightIcon && (
          <TouchableOpacity
            style={styles.rightIconContainer}
            onPress={onRightIconPress}
            activeOpacity={0.7}
          >
            <Text style={styles.icon}>{rightIcon}</Text>
          </TouchableOpacity>
        )}
      </View>

      {hasError && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  searchContainer: {
    marginBottom: spacing.sm,
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: colors.neutral.gray300,
    borderRadius: 8,
    backgroundColor: colors.neutral.white,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputContainerFocused: {
    borderColor: colors.brand.primary,
    borderWidth: 2,
  },
  inputContainerError: {
    borderColor: colors.equity.critical,
    borderWidth: 2,
  },
  inputContainerDisabled: {
    backgroundColor: colors.neutral.gray100,
    borderColor: colors.neutral.gray200,
  },
  searchInputContainer: {
    borderRadius: 24,
    backgroundColor: colors.neutral.gray50,
    borderColor: colors.neutral.gray200,
  },
  leftIconContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightIconContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
    color: colors.neutral.gray500,
  },
  inputWrapper: {
    flex: 1,
    position: 'relative',
    paddingTop: spacing.sm,
  },
  input: {
    fontSize: typography.sizes.body,
    color: colors.neutral.gray900,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    minHeight: 24,
  },
  inputWithLeftIcon: {
    paddingLeft: 0,
  },
  inputWithRightIcon: {
    paddingRight: 0,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  searchInput: {
    paddingTop: 0,
    paddingBottom: 0,
    minHeight: 40,
  },
  errorText: {
    fontSize: typography.sizes.caption,
    color: colors.equity.critical,
    marginTop: spacing.xs,
    marginLeft: spacing.md,
  },
});