/**
 * TransportModeSelector Component
 * Visual selector for transport modes with large touch targets and accessibility
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { TransportModeSelectorProps } from '../types';
import { TRANSPORT_MODES, ACCESSIBILITY_LABELS } from '../constants';

/**
 * Transport mode selector with visual icons and colors
 * Supports large touch targets for accessibility
 */
export const TransportModeSelector: React.FC<TransportModeSelectorProps> = ({
  selectedMode,
  onModeSelect,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>Transport Mode</Text>
      <View style={styles.modesContainer}>
        {TRANSPORT_MODES.map((mode) => {
          const isSelected = mode.mode === selectedMode;
          
          return (
            <TouchableOpacity
              key={mode.mode}
              style={[
                styles.modeButton,
                isSelected && styles.selectedModeButton,
                { borderColor: mode.color },
                isSelected && { backgroundColor: mode.color },
              ]}
              onPress={() => onModeSelect(mode.mode)}
              accessibilityRole="button"
              accessibilityLabel={`${ACCESSIBILITY_LABELS.TRANSPORT_MODE_OPTION}: ${mode.label}`}
              accessibilityHint={mode.description}
              accessibilityState={{ selected: isSelected }}
            >
              <Text style={styles.modeIcon}>{mode.icon}</Text>
              <Text
                style={[
                  styles.modeLabel,
                  isSelected && styles.selectedModeLabel,
                ]}
              >
                {mode.label}
              </Text>
              <Text
                style={[
                  styles.modeDescription,
                  isSelected && styles.selectedModeDescription,
                ]}
              >
                {mode.description}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  modesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  modeButton: {
    flex: 1,
    minWidth: '45%',
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    minHeight: 100,
    
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    
    // Elevation for Android
    elevation: 2,
  },
  selectedModeButton: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  modeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  modeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
    textAlign: 'center',
  },
  selectedModeLabel: {
    color: '#FFFFFF',
  },
  modeDescription: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  selectedModeDescription: {
    color: '#F3F4F6',
  },
});