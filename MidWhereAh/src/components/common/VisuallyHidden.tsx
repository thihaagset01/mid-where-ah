import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

interface VisuallyHiddenProps {
  children: React.ReactNode;
  style?: ViewStyle | TextStyle;
  as?: 'view' | 'text';
}

/**
 * VisuallyHidden component for screen reader only content
 * 
 * This component renders content that is accessible to screen readers
 * but visually hidden from sighted users. Useful for providing additional
 * context or instructions for assistive technology users.
 * 
 * Based on WCAG guidelines for visually hidden content.
 */
export const VisuallyHidden: React.FC<VisuallyHiddenProps> = ({
  children,
  style,
  as = 'view',
}) => {
  const combinedStyle = [styles.visuallyHidden, style];

  if (as === 'text') {
    return (
      <Text style={combinedStyle} accessible={true}>
        {children}
      </Text>
    );
  }

  return (
    <View style={combinedStyle} accessible={true}>
      {typeof children === 'string' ? (
        <Text accessible={true}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
};

/**
 * Hook to conditionally render content only for screen readers
 */
export const useVisuallyHidden = (screenReaderOnly: boolean) => {
  return screenReaderOnly ? VisuallyHidden : React.Fragment;
};

/**
 * Styles that make content visually hidden but accessible to screen readers
 * 
 * These styles ensure that:
 * - Content is not visible to sighted users
 * - Content is still accessible to screen readers
 * - Content doesn't affect layout
 * - Content can still receive focus if needed
 */
const styles = StyleSheet.create({
  visuallyHidden: {
    position: 'absolute',
    left: -10000,
    top: 'auto',
    width: 1,
    height: 1,
    overflow: 'hidden',
    // Alternative approach using opacity (less reliable for screen readers)
    // opacity: 0,
    // Alternative approach using clipping
    // clip: 'rect(0 0 0 0)',
  } as ViewStyle,
});

export default VisuallyHidden;