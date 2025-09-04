import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';

type MapScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Map'>;

interface Props {
  navigation: MapScreenNavigationProp;
}

export function MapScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.title}>Map View</Text>
        <Text style={styles.subtitle}>Interactive map coming soon</Text>
        
        <View style={styles.placeholderMap}>
          <Text style={styles.placeholderText}>🗺️</Text>
          <Text style={styles.placeholderSubtext}>Map component will be integrated here</Text>
        </View>
        
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            This screen will show user locations and the optimized meeting point on an interactive map
          </Text>
        </View>
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
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 30,
  },
  placeholderMap: {
    width: '100%',
    height: 300,
    backgroundColor: '#ecf0f1',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
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
  },
  infoContainer: {
    paddingHorizontal: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 20,
  },
});