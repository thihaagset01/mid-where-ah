import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';
import { useAppSelector } from '../store';
import { selectOptimizationResult, selectUserLocations } from '../store/optimization/optimizationSlice';
import { UserLocation, OptimalPoint, MARKER_COLORS, MapView } from '../components/maps';

type MapScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Map'>;

interface Props {
  navigation: MapScreenNavigationProp;
}

export function MapScreen({ navigation }: Props) {
  const optimizationResult = useAppSelector(selectOptimizationResult);
  const userLocations = useAppSelector(selectUserLocations);

  // Transform Redux state to MapView format
  const mapUserLocations: UserLocation[] = userLocations.map((location, index) => ({
    id: location.id,
    coordinate: location.coordinate || { latitude: 1.3521, longitude: 103.8198 }, // Fallback to Singapore center
    transportMode: location.transportMode,
    name: location.address || `Location ${index + 1}`,
    travelTime: optimizationResult?.participantTravelTimes.find(p => p.id === location.id)?.travelTimeMinutes
  }));

  const optimalPoint: OptimalPoint | undefined = optimizationResult ? {
    coordinate: {
      latitude: optimizationResult.optimalLocation.latitude,
      longitude: optimizationResult.optimalLocation.longitude
    },
    equityLevel: optimizationResult.equityLevel,
    jainsIndex: optimizationResult.equityAnalysis.fairnessIndex,
    venues: [] // Could be populated with nearby venues later
  } : undefined;

  const hasData = userLocations.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.title}>
          {hasData ? '🗺️ Optimization Map' : '🗺️ Map View'}
        </Text>
        <Text style={styles.subtitle}>
          {hasData 
            ? 'Interactive map showing user locations and optimal meeting point'
            : 'Complete an optimization to see results on the map'
          }
        </Text>
        
        {hasData ? (
          <View style={styles.mapContainer}>
            <MapView
              userLocations={mapUserLocations}
              optimalPoint={optimalPoint}
              style={styles.map}
              onMapReady={() => console.log('Map ready')}
              onMarkerPress={(marker) => console.log('Marker pressed:', marker.id)}
            />
            
            {optimizationResult && (
              <View style={styles.resultsSummary}>
                <Text style={styles.resultsTitle}>
                  {optimizationResult.equityAssessment.title}
                </Text>
                <Text style={[
                  styles.equityScore,
                  { color: MARKER_COLORS.optimal[optimizationResult.equityLevel] }
                ]}>
                  {(optimizationResult.equityAnalysis.fairnessIndex * 100).toFixed(1)}% Fair
                </Text>
                <Text style={styles.improvementText}>
                  {optimizationResult.improvementVsBaseline >= 0 ? '+' : ''}{optimizationResult.improvementVsBaseline.toFixed(1)}% vs baseline
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.placeholderMap}>
            <Text style={styles.placeholderText}>🗺️</Text>
            <Text style={styles.placeholderSubtext}>
              Start an optimization from the home screen to see results here
            </Text>
            <TouchableOpacity 
              style={styles.homeButton} 
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.homeButtonText}>🏠 Go to Home</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {hasData && (
          <View style={styles.legend}>
            <Text style={styles.legendTitle}>Legend:</Text>
            <View style={styles.legendItems}>
              <View style={styles.legendItem}>
                <View style={[styles.legendMarker, { backgroundColor: MARKER_COLORS.user.DRIVING }]} />
                <Text style={styles.legendText}>🚗 Driving</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendMarker, { backgroundColor: MARKER_COLORS.user.TRANSIT }]} />
                <Text style={styles.legendText}>🚇 Transit</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendMarker, { backgroundColor: MARKER_COLORS.user.WALKING }]} />
                <Text style={styles.legendText}>🚶 Walking</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendMarker, { backgroundColor: MARKER_COLORS.user.CYCLING }]} />
                <Text style={styles.legendText}>🚲 Cycling</Text>
              </View>
              {optimalPoint && (
                <View style={styles.legendItem}>
                  <View style={[styles.legendMarker, { backgroundColor: MARKER_COLORS.optimal[optimalPoint.equityLevel] }]} />
                  <Text style={styles.legendText}>🎯 Optimal Point</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: '#3498db',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 20,
    textAlign: 'center',
  },
  mapContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  map: {
    flex: 1,
  },
  resultsSummary: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  equityScore: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  improvementText: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  placeholderMap: {
    flex: 1,
    backgroundColor: '#ecf0f1',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#bdc3c7',
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: 60,
    marginBottom: 10,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  homeButton: {
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  homeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  legend: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  legendMarker: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#34495e',
  },
});