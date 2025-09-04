/**
 * LocationInput Component
 * Main component for user location input with transport mode selection
 * Singapore address autocomplete, validation, and optimization controls
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LocationInputProps } from './types';
import { useLocationInput } from './hooks/useLocationInput';
import { LocationItem } from './components/LocationItem';
import { AddLocationButton, CurrentLocationButton } from './components/AddLocationButton';
import { ACCESSIBILITY_LABELS } from './constants';

/**
 * Main LocationInput component with comprehensive functionality:
 * - Multiple location input with transport mode selection
 * - Singapore address autocomplete and validation
 * - Current location detection
 * - Form validation and optimization controls
 * - Smooth animations and accessibility support
 */
export const LocationInput: React.FC<LocationInputProps> = ({
  onLocationsChange,
  onStartOptimization,
  maxLocations = 10,
  minLocations = 2,
}) => {
  const {
    locations,
    formValidation,
    isLoading,
    addLocation,
    removeLocation,
    updateLocationAddress,
    updateLocationTransportMode,
    addCurrentLocation,
    startOptimization,
    canAddMoreLocations,
    canRemoveLocations,
  } = useLocationInput({
    onLocationsChange,
    onStartOptimization,
    maxLocations,
    minLocations,
  });

  /**
   * Handle optimization start with validation
   */
  const handleStartOptimization = () => {
    if (!formValidation.canStartOptimization) {
      Alert.alert(
        'Validation Required',
        formValidation.errors.join('\n\n'),
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Start Optimization',
      `Optimize meeting point for ${locations.length} locations?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start', onPress: startOptimization },
      ]
    );
  };

  /**
   * Render validation summary
   */
  const renderValidationSummary = () => {
    if (formValidation.isValid) {
      return (
        <View style={styles.validationSuccess}>
          <Text style={styles.validationSuccessText}>
            ✓ Ready for optimization ({locations.length} locations)
          </Text>
        </View>
      );
    }

    if (formValidation.errors.length > 0) {
      return (
        <View style={styles.validationErrors}>
          <Text style={styles.validationErrorTitle}>Please complete:</Text>
          {formValidation.errors.map((error, index) => (
            <Text key={index} style={styles.validationErrorText}>
              • {error}
            </Text>
          ))}
        </View>
      );
    }

    return null;
  };

  /**
   * Render action buttons
   */
  const renderActionButtons = () => (
    <View style={styles.actionButtonsContainer}>
      <View style={styles.addButtonsRow}>
        <AddLocationButton
          onPress={addLocation}
          disabled={!canAddMoreLocations || isLoading}
          style={styles.addLocationButton}
        />
        <CurrentLocationButton
          onPress={addCurrentLocation}
          disabled={!canAddMoreLocations || isLoading}
          style={styles.currentLocationButton}
        />
      </View>
      
      <TouchableOpacity
        style={[
          styles.optimizeButton,
          formValidation.canStartOptimization && styles.optimizeButtonEnabled,
          (!formValidation.canStartOptimization || isLoading) && styles.optimizeButtonDisabled,
        ]}
        onPress={handleStartOptimization}
        disabled={!formValidation.canStartOptimization || isLoading}
        accessibilityRole="button"
        accessibilityLabel={ACCESSIBILITY_LABELS.START_OPTIMIZATION_BUTTON}
        accessibilityHint="Start finding the optimal meeting point"
        accessibilityState={{ disabled: !formValidation.canStartOptimization || isLoading }}
      >
        <Text style={[
          styles.optimizeButtonText,
          formValidation.canStartOptimization && styles.optimizeButtonTextEnabled,
        ]}>
          {isLoading ? 'Processing...' : 'Find Optimal Meeting Point'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Add Your Locations</Text>
          <Text style={styles.subtitle}>
            Add 2-{maxLocations} locations in Singapore with your preferred transport modes
          </Text>
        </View>

        {/* Location Items */}
        <View style={styles.locationsContainer}>
          {locations.map((location, index) => (
            <LocationItem
              key={location.id}
              location={location}
              index={index}
              onRemove={removeLocation}
              onUpdateAddress={updateLocationAddress}
              onUpdateTransportMode={updateLocationTransportMode}
              isRemovable={canRemoveLocations}
            />
          ))}
        </View>

        {/* Validation Summary */}
        {renderValidationSummary()}

        {/* Action Buttons */}
        {renderActionButtons()}

        {/* Info Text */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            💡 Tip: Mix different transport modes to find the most equitable meeting point for everyone
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  locationsContainer: {
    marginBottom: 20,
  },
  validationSuccess: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  validationSuccessText: {
    fontSize: 16,
    color: '#047857',
    fontWeight: '600',
  },
  validationErrors: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  validationErrorTitle: {
    fontSize: 16,
    color: '#DC2626',
    fontWeight: '600',
    marginBottom: 8,
  },
  validationErrorText: {
    fontSize: 14,
    color: '#B91C1C',
    lineHeight: 20,
    marginBottom: 4,
  },
  actionButtonsContainer: {
    marginBottom: 24,
  },
  addButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  addLocationButton: {
    flex: 1,
  },
  currentLocationButton: {
    flex: 1,
  },
  optimizeButton: {
    backgroundColor: '#D1D5DB',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  optimizeButtonEnabled: {
    backgroundColor: '#059669',
    
    // Shadow for iOS
    shadowColor: '#059669',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    
    // Elevation for Android
    elevation: 8,
  },
  optimizeButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  optimizeButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  optimizeButtonTextEnabled: {
    color: '#FFFFFF',
  },
  infoContainer: {
    backgroundColor: '#EBF8FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
    textAlign: 'center',
  },
});