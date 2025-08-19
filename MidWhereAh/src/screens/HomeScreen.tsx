/**
 * Production-ready HomeScreen - Main app interface
 * Features: Location input, Find Meeting Point button, recent groups, purple theme
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Card } from '../components/common/Card';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { MapView } from '../components/maps/MapView';
import { colors, typography, spacing } from '../constants';
import { useAppSelector, useAppDispatch } from '../store/hooks';

export const HomeScreen: React.FC = () => {
  const [locationInput, setLocationInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const dispatch = useAppDispatch();

  // Get state from Redux
  const { user } = useAppSelector(state => state.auth);
  // Temporary mock data for groups until Redux is fully set up
  const recentGroups = [
    { id: '1', name: 'Team Lunch', memberCount: 5, lastMeeting: 'Yesterday' },
    { id: '2', name: 'Project Meeting', memberCount: 8, lastMeeting: 'Last week' },
  ];

  const handleLocationSearch = () => {
    if (!locationInput.trim()) return;
    
    setIsSearching(true);
    // TODO: Implement location search with MapBox/OneMap
    setTimeout(() => {
      setIsSearching(false);
      // Navigate to optimization screen
    }, 2000);
  };

  const handleQuickStart = () => {
    // Navigate to location input with map
    console.log('Quick start - open map for location selection');
    setShowMap(true);
  };

  const [showMap, setShowMap] = useState(false);
  
  const handleViewMap = () => {
    setShowMap(true);
  };
  
  const handleCloseMap = () => {
    setShowMap(false);
  };

  const handleJoinGroup = (groupId: string) => {
    // Navigate to group details
    console.log('Join group:', groupId);
  };

  return (
    <SafeAreaView style={styles.container}>
      {showMap ? (
        <View style={styles.mapContainer}>
          <MapView 
            style={styles.map}
            userLocations={[]} 
            showUserLocation={true}
          />
          <TouchableOpacity 
            style={styles.closeMapButton}
            onPress={handleCloseMap}
          >
            <Text style={styles.closeMapButtonText}>Close Map</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>🇸🇬 MidWhereAh</Text>
            <Text style={styles.subtitle}>
              Find the perfect meeting spot using transport-aware equity optimization
            </Text>
            {user && (
              <Text style={styles.welcomeText}>
                Welcome back, {user.displayName || 'User'}!
              </Text>
            )}
          </View>

          {/* Location Input Section */}
          <Card variant="elevated" padding="lg" style={styles.inputSection}>
          <Text style={styles.sectionTitle}>Where are you meeting?</Text>
          
          <Input
            label="Search location or address"
            value={locationInput}
            onChangeText={setLocationInput}
            placeholder="e.g., Orchard Road, Marina Bay..."
            variant="search"
            leftIcon="🔍"
            rightIcon={locationInput ? "✕" : undefined}
            onRightIconPress={() => setLocationInput('')}
          />

          <View style={styles.buttonRow}>
            <Button
              title={isSearching ? "Searching..." : "🚀 Find Meeting Point"}
              onPress={handleLocationSearch}
              loading={isSearching}
              disabled={!locationInput.trim()}
              style={styles.primaryButton}
            />
            
            <Button
              title="📍 Use Map"
              onPress={handleQuickStart}
              variant="outline"
              style={styles.secondaryButton}
            />
          </View>
        </Card>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.actionCard} onPress={handleQuickStart}>
              <Text style={styles.actionIcon}>🗺️</Text>
              <Text style={styles.actionTitle}>Map Selection</Text>
              <Text style={styles.actionSubtitle}>Pick locations on map</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionCard}>
              <Text style={styles.actionIcon}>👥</Text>
              <Text style={styles.actionTitle}>Create Group</Text>
              <Text style={styles.actionSubtitle}>Invite friends to join</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionCard}>
              <Text style={styles.actionIcon}>📊</Text>
              <Text style={styles.actionTitle}>View Analytics</Text>
              <Text style={styles.actionSubtitle}>See equity insights</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionCard}>
              <Text style={styles.actionIcon}>⚙️</Text>
              <Text style={styles.actionTitle}>Settings</Text>
              <Text style={styles.actionSubtitle}>Preferences & profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Groups */}
        {recentGroups && recentGroups.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={styles.sectionTitle}>Recent Groups</Text>
            
            {recentGroups.slice(0, 3).map((group: {id: string, name: string, memberCount: number, lastMeeting: string}) => (
              <Card key={group.id} variant="default" padding="md" style={styles.groupCard}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupName}>{group.name}</Text>
                  <Text style={styles.groupMembers}>
                    {group.memberCount} members
                  </Text>
                </View>
                
                <Text style={styles.groupDescription}>
                  Last meeting: {group.lastMeeting || 'No meetings yet'}
                </Text>
                
                <Button
                  title="Join Meeting"
                  onPress={() => handleJoinGroup(group.id)}
                  variant="outline"
                  style={styles.joinButton}
                />
              </Card>
            ))}
          </View>
        )}

        {/* Algorithm Explanation */}
        <Card variant="default" padding="lg" style={styles.explanationCard}>
          <Text style={styles.explanationTitle}>🧮 How MidWhereAh Works</Text>
          <Text style={styles.explanationText}>
            Unlike other apps that use simple geometric midpoints, MidWhereAh uses 
            <Text style={styles.highlightText}> transport-aware equity optimization</Text> 
            based on Singapore's MRT network and Jain's Fairness Index.
          </Text>
          
          <View style={styles.featureList}>
            <Text style={styles.featureItem}>✅ Real MRT travel times</Text>
            <Text style={styles.featureItem}>✅ Peak hour adjustments</Text>
            <Text style={styles.featureItem}>✅ Weather considerations</Text>
            <Text style={styles.featureItem}>✅ Accessibility weighting</Text>
          </View>
        </Card>

        {/* Direct Map Access Button */}
        <Button
          title="View Singapore Map"
          onPress={handleViewMap}
          variant="primary"
          style={styles.mapButton}
        />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.gray50,
  },
  scrollContent: {
    padding: spacing.md,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  closeMapButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: colors.primary.main,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  closeMapButtonText: {
    color: colors.neutral.white,
    fontWeight: 'bold',
  },
  mapButton: {
    marginTop: spacing.md,
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
    fontSize: typography.sizes.h1,
    fontWeight: '700',
    color: colors.primary.main,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sizes.caption,
    color: colors.neutral.gray600,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  welcomeText: {
    fontSize: typography.sizes.body,
    color: colors.primary.dark,
    fontWeight: '600',
  },
  inputSection: {
    margin: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.h4,
    fontWeight: '600',
    color: colors.neutral.gray900,
    marginBottom: spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  primaryButton: {
    flex: 2,
  },
  secondaryButton: {
    flex: 1,
  },
  quickActions: {
    padding: spacing.md,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.neutral.white,
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  actionTitle: {
    fontSize: typography.sizes.caption,
    fontWeight: '600',
    color: colors.neutral.gray900,
    marginBottom: spacing.xs,
  },
  actionSubtitle: {
    fontSize: typography.sizes.small,
    color: colors.neutral.gray500,
    textAlign: 'center',
  },
  recentSection: {
    padding: spacing.md,
  },
  groupCard: {
    marginBottom: spacing.sm,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  groupName: {
    fontSize: typography.sizes.body,
    fontWeight: '600',
    color: colors.neutral.gray900,
  },
  groupMembers: {
    fontSize: typography.sizes.small,
    color: colors.neutral.gray500,
  },
  groupDescription: {
    fontSize: typography.sizes.caption,
    color: colors.neutral.gray600,
    marginBottom: spacing.sm,
  },
  joinButton: {
    alignSelf: 'flex-start',
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
    marginBottom: spacing.sm,
  },
  highlightText: {
    color: colors.primary.main,
    fontWeight: '600',
  },
  featureList: {
    gap: spacing.xs,
  },
  featureItem: {
    fontSize: typography.sizes.caption,
    color: colors.neutral.gray600,
  },
});
