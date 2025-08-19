import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { MapView } from '../components/maps/MapView';
import { colors, spacing, typography } from '../constants';
import { TransportMode, Coordinate } from '../types';

interface LocationInput {
  id: string;
  address: string;
  transportMode: TransportMode;
  coordinate?: Coordinate;
}

export const HomeScreen: React.FC = () => {
  const [locations, setLocations] = useState<LocationInput[]>([
    { id: '1', address: '', transportMode: 'TRANSIT' },
    { id: '2', address: '', transportMode: 'TRANSIT' }
  ]);

  const updateLocation = useCallback((id: string, address: string) => {
    setLocations(prev => prev.map(loc => 
      loc.id === id ? { ...loc, address } : loc
    ));
  }, []);

  const updateTransportMode = useCallback((id: string, mode: TransportMode) => {
    setLocations(prev => prev.map(loc => 
      loc.id === id ? { ...loc, transportMode: mode } : loc
    ));
  }, []);

  const addPerson = useCallback(() => {
    // Generate a new unique string ID
    const newId = String(Math.max(...locations.map(l => parseInt(l.id, 10))) + 1);
    setLocations(prev => [...prev, { 
      id: newId, 
      address: '', 
      transportMode: 'TRANSIT' 
    }]);
  }, [locations]);

  const handleFindCentral = useCallback(() => {
    const validLocations = locations.filter(loc => loc.address.trim());
    if (validLocations.length < 2) return;
    
    // TODO: Navigate to optimization screen
    console.log('Finding central point for:', validLocations);
  }, [locations]);

  const getTransportIcon = (mode: TransportMode): string => {
    const icons = {
      TRANSIT: '🚇',
      DRIVING: '🚗', 
      WALKING: '🚶',
      CYCLING: '🚴'
    };
    return icons[mode];
  };

  const getTransportColor = (mode: TransportMode): string => {
    const transportColors = {
      TRANSIT: colors.transport.mrt,
      DRIVING: colors.transport.drive,
      WALKING: colors.transport.walk,
      CYCLING: colors.transport.mixed
    };
    return transportColors[mode];
  };

  const cycleTransportMode = (current: TransportMode): TransportMode => {
    const modes: TransportMode[] = ['TRANSIT', 'DRIVING', 'WALKING', 'CYCLING'];
    const currentIndex = modes.indexOf(current);
    // Ensure we always return a valid TransportMode
    return modes[(currentIndex + 1) % modes.length] || 'TRANSIT';
  };

  const validLocationCount = locations.filter(loc => loc.address.trim()).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Full-screen map background */}
      <View style={styles.mapContainer}>
        <MapView 
          style={styles.map}
          userLocations={locations
            .filter(loc => loc.coordinate)
            .map(loc => ({
              id: loc.id,
              name: '',
              coordinate: loc.coordinate!,
              transportMode: loc.transportMode
            }))}
          showUserLocation={false}
          onVenueSelect={() => {}}
        />
      </View>

      {/* Floating locations container */}
      <View style={styles.locationsContainer}>
        {locations.map((location, index) => (
          <View key={location.id} style={styles.locationRow}>
            {/* Transport mode icon */}
            <TouchableOpacity 
              style={[
                styles.transportIcon, 
                { backgroundColor: getTransportColor(location.transportMode) }
              ]}
              onPress={() => updateTransportMode(location.id, cycleTransportMode(location.transportMode))}
            >
              <Text style={styles.transportIconText}>
                {getTransportIcon(location.transportMode)}
              </Text>
            </TouchableOpacity>
            
            {/* Address input */}
            <TextInput
              style={styles.addressInput}
              value={location.address}
              onChangeText={(text) => updateLocation(location.id, text)}
              placeholder={`Address ${index + 1}`}
              placeholderTextColor={colors.neutral.gray500}
              autoComplete="street-address"
              autoCapitalize="words"
              returnKeyType="done"
            />
          </View>
        ))}
        
        {/* Actions row */}
        <View style={styles.actionsRow}>
          <TouchableOpacity 
            style={styles.addPersonButton} 
            onPress={addPerson}
          >
            <Text style={styles.addPersonIcon}>+</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.findCentralButton,
              validLocationCount < 2 && styles.findCentralButtonDisabled
            ]}
            onPress={handleFindCentral}
            disabled={validLocationCount < 2}
          >
            <Text style={[
              styles.findCentralButtonText,
              validLocationCount < 2 && styles.findCentralButtonTextDisabled
            ]}>
              Find Central
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const { width: screenWidth } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  map: {
    flex: 1,
  },
  locationsContainer: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(248, 248, 248, 0.95)',
    borderRadius: 16,
    padding: 16,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    // Android shadow
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(248, 248, 248, 0.95)',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  transportIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transportIconText: {
    fontSize: 16,
    color: 'white',
  },
  addressInput: {
    flex: 1,
    fontSize: 16,
    color: colors.neutral.gray900,
    padding: 8,
    backgroundColor: 'transparent',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  addPersonButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPersonIcon: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  findCentralButton: {
    flex: 1,
    backgroundColor: colors.primary.main,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginLeft: 16,
    alignItems: 'center',
  },
  findCentralButtonDisabled: {
    backgroundColor: colors.neutral.gray300,
  },
  findCentralButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  findCentralButtonTextDisabled: {
    color: colors.neutral.gray500,
  },
});
