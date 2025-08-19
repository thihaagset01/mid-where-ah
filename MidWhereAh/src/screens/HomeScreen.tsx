/**
 * Production-ready HomeScreen - Main app interface
 * Features: Two address inputs, map background, bottom navigation with floating action button
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Card } from '../components/common/Card';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { MapView } from '../components/maps/MapView';
import { colors, typography, spacing } from '../constants';
import { useAppSelector, useAppDispatch } from '../store/hooks';

export const HomeScreen: React.FC = () => {
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const dispatch = useAppDispatch();

  // Get state from Redux
  const { user } = useAppSelector(state => state.auth);

  const handleAddressSearch = () => {
    // TODO: Implement location search with Google Maps/OneMap
    console.log('Searching for addresses:', address1, address2);
  };

  const handleAddLocation = () => {
    // Open a new screen to add a location
    console.log('Add location pressed');
  };
  
  // Navigation handlers
  const handleHomePress = () => console.log('Home pressed');
  const handleCompassPress = () => console.log('Compass pressed');
  const handleGroupsPress = () => console.log('Groups pressed');
  const handleProfilePress = () => console.log('Profile pressed');

  return (
    <SafeAreaView style={[styles.container, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.neutral.white} />
      
      {/* Map Background */}
      <View style={styles.mapContainer}>
        <MapView 
          style={styles.mapBackground}
          userLocations={[]} 
          showUserLocation={true}
        />
      </View>
      
      {/* Main Content */}
      <View style={styles.contentContainer}>
        {/* Header with Logo */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>MidWhereAh</Text>
          </View>
        </View>
        
        {/* Address Input Card */}
        <Card variant="elevated" padding="lg" style={styles.addressCard}>
          {/* Address 1 Input */}
          <View style={styles.inputContainer}>
            <Input
              value={address1}
              onChangeText={setAddress1}
              placeholder="Your location"
              variant="outline"
              rightIcon="📍"
              style={styles.addressInput}
            />
          </View>
          
          {/* Address 2 Input */}
          <View style={styles.inputContainer}>
            <Input
              value={address2}
              onChangeText={setAddress2}
              placeholder="Friend's location"
              variant="outline"
              rightIcon="👥"
              style={styles.addressInput}
            />
          </View>
          
          <Button 
            title="Find Midpoint" 
            variant="primary" 
            onPress={handleAddressSearch} 
            style={{ marginTop: 10 }}
          />
        </Card>
      </View>
      
      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity style={styles.navItem} onPress={handleHomePress}>
          <Text style={[styles.navIcon, { color: colors.primary.main }]}>🏠</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={handleCompassPress}>
          <Text style={styles.navIcon}>🧭</Text>
        </TouchableOpacity>
        
        {/* Floating Action Button */}
        <TouchableOpacity style={styles.addButton} onPress={handleAddLocation}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={handleGroupsPress}>
          <Text style={styles.navIcon}>👥</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={handleProfilePress}>
          <Text style={styles.navIcon}>👤</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.white,
  },
  mapContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  mapBackground: {
    flex: 1,
    opacity: 0.9, // Slightly faded map background
  },
  contentContainer: {
    flex: 1,
    zIndex: 1,
    paddingTop: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoContainer: {
    backgroundColor: colors.primary.main,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    shadowColor: colors.neutral.gray900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  logoText: {
    fontSize: typography.sizes.h3,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  addressCard: {
    marginHorizontal: 20,
    borderRadius: 15,
    backgroundColor: colors.neutral.white,
    shadowColor: colors.neutral.gray900,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },
  inputContainer: {
    marginBottom: 15,
  },
  addressInput: {
    borderColor: colors.neutral.gray200,
    borderRadius: 10,
  },
  bottomNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.gray200,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  navIcon: {
    fontSize: 24,
  },
  addButton: {
    backgroundColor: colors.primary.main,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20, // Lift it up from the bottom nav
    shadowColor: colors.neutral.gray900,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  addButtonText: {
    fontSize: 32,
    color: colors.neutral.white,
    fontWeight: '400',
    marginTop: -2, // Visual adjustment for the plus sign
  },
});
