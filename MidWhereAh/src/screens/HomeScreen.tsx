import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../types/navigation';
import { LocationInput } from '../components/location/LocationInput';
import { UserLocationInput } from '../components/location/types';
import { GroupHeader, generateRandomGroupName } from '../components/groups/GroupHeader';
import { GroupNaming } from '../components/groups/GroupNaming';
import { PurpleTheme } from '../design/theme';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

export function HomeScreen({ navigation }: Props) {
  const [locations, setLocations] = useState<UserLocationInput[]>([]);
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [groupName, setGroupName] = useState(generateRandomGroupName());
  const [showGroupNaming, setShowGroupNaming] = useState(false);

  /**
   * Handle location changes from LocationInput component
   */
  const handleLocationsChange = (newLocations: UserLocationInput[]) => {
    setLocations(newLocations);
  };

  /**
   * Handle optimization start - navigate to optimization screen
   */
  const handleStartOptimization = (validatedLocations: UserLocationInput[]) => {
    navigation.navigate('Optimization', { userLocations: validatedLocations });
  };

  /**
   * Navigate to map screen
   */
  const handleViewMap = () => {
    navigation.navigate('Map');
  };

  /**
   * Handle group name changes
   */
  const handleGroupNameChange = (newName: string) => {
    setGroupName(newName);
  };

  /**
   * Show group naming modal
   */
  const handleEditGroupName = () => {
    setShowGroupNaming(true);
  };

  if (showLocationInput) {
    return (
      <LinearGradient
        colors={[...PurpleTheme.gradients.background.colors]}
        start={PurpleTheme.gradients.background.direction.start}
        end={PurpleTheme.gradients.background.direction.end}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => setShowLocationInput(false)}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
        
        {/* Group Header when there are locations */}
        {locations.length > 0 && (
          <GroupHeader
            groupName={groupName}
            members={locations}
            onEditName={handleEditGroupName}
            style={styles.groupHeader}
          />
        )}
        
        <LocationInput
          onLocationsChange={handleLocationsChange}
          onStartOptimization={handleStartOptimization}
          maxLocations={10}
          minLocations={2}
        />
        
        {/* Group Naming Modal */}
        <GroupNaming
          currentName={groupName}
          onNameChange={handleGroupNameChange}
          onComplete={() => setShowGroupNaming(false)}
          onCancel={() => setShowGroupNaming(false)}
          visible={showGroupNaming}
        />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[...PurpleTheme.gradients.background.colors]}
      start={PurpleTheme.gradients.background.direction.start}
      end={PurpleTheme.gradients.background.direction.end}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>MidWhereAh</Text>
        <Text style={styles.subtitle}>Find the perfect meeting point for everyone</Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.buttonWrapper} 
            onPress={() => setShowLocationInput(true)}
          >
            <LinearGradient
              colors={[...PurpleTheme.gradients.button.colors]}
              start={PurpleTheme.gradients.button.direction.start}
              end={PurpleTheme.gradients.button.direction.end}
              style={styles.button}
            >
              <Text style={styles.buttonText}>🚀 Start Location Input</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.buttonWrapper, styles.secondaryButton]} 
            onPress={handleViewMap}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>🗺️ View Map</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            🎯 Add your locations, select transport modes, and find the most equitable meeting point using Jain's Fairness Index
          </Text>
        </View>

        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>Features:</Text>
          <Text style={styles.featureText}>• 📍 Singapore address autocomplete</Text>
          <Text style={styles.featureText}>• 🚇 Multiple transport modes (MRT, Bus, Walking, Cycling, Driving)</Text>
          <Text style={styles.featureText}>• ⚖️ Equity-based optimization using Jain's Fairness Index</Text>
          <Text style={styles.featureText}>• 📊 Real-time fairness scoring and recommendations</Text>
          <Text style={styles.featureText}>• 🗺️ Real Google Maps travel times with intelligent caching</Text>
          <Text style={styles.featureText}>• 🎨 Beautiful purple theme with character avatars</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: PurpleTheme.colors.white,
    paddingHorizontal: PurpleTheme.spacing.md,
    paddingVertical: PurpleTheme.spacing.sm,
    borderRadius: PurpleTheme.borderRadius.button,
    ...PurpleTheme.shadows.sm,
  },
  backButtonText: {
    color: PurpleTheme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  groupHeader: {
    marginHorizontal: PurpleTheme.spacing.lg,
    marginBottom: PurpleTheme.spacing.md,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: PurpleTheme.spacing.lg,
  },
  title: {
    ...PurpleTheme.typography.styles.h1,
    color: PurpleTheme.colors.textPrimary,
    marginBottom: PurpleTheme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...PurpleTheme.typography.styles.bodyLarge,
    color: PurpleTheme.colors.textSecondary,
    marginBottom: PurpleTheme.spacing['2xl'],
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
    gap: PurpleTheme.spacing.md,
  },
  buttonWrapper: {
    borderRadius: PurpleTheme.borderRadius.button,
    overflow: 'hidden',
    ...PurpleTheme.shadows.button,
  },
  button: {
    paddingVertical: PurpleTheme.spacing.md,
    paddingHorizontal: PurpleTheme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    backgroundColor: PurpleTheme.colors.white,
    borderWidth: 2,
    borderColor: PurpleTheme.colors.primary,
    paddingVertical: PurpleTheme.spacing.md,
    paddingHorizontal: PurpleTheme.spacing.xl,
    alignItems: 'center',
    shadowColor: 'transparent',
  },
  buttonText: {
    ...PurpleTheme.typography.styles.button,
    color: PurpleTheme.colors.white,
  },
  secondaryButtonText: {
    color: PurpleTheme.colors.primary,
  },
  infoContainer: {
    backgroundColor: PurpleTheme.colors.white,
    padding: PurpleTheme.spacing.lg,
    borderRadius: PurpleTheme.borderRadius.card,
    marginTop: PurpleTheme.spacing['2xl'],
    marginBottom: PurpleTheme.spacing.xl,
    ...PurpleTheme.shadows.card,
  },
  infoText: {
    ...PurpleTheme.typography.styles.body,
    color: PurpleTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresContainer: {
    alignSelf: 'stretch',
    backgroundColor: PurpleTheme.colors.white,
    padding: PurpleTheme.spacing.lg,
    borderRadius: PurpleTheme.borderRadius.card,
    ...PurpleTheme.shadows.card,
  },
  featuresTitle: {
    ...PurpleTheme.typography.styles.h4,
    color: PurpleTheme.colors.textPrimary,
    marginBottom: PurpleTheme.spacing.md,
  },
  featureText: {
    ...PurpleTheme.typography.styles.body,
    color: PurpleTheme.colors.textSecondary,
    lineHeight: 24,
    marginBottom: PurpleTheme.spacing.xs,
  },
});