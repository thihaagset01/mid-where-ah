/**
 * MidWhereAh - Transport-Aware Equity Optimization App
 * Core Innovation: Replace geometric centroids with Singapore MRT-aware optimization
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from './src/constants/colors';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>MidWhereAh</Text>
      <Text style={styles.subtitle}>Transport-Aware Equity Optimization</Text>
      <Text style={styles.description}>
        Revolutionary app that uses Jain's Fairness Index and Singapore MRT network
        intelligence to find truly equitable meeting points.
      </Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary.main,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.primary.dark,
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: colors.neutral.gray500,
    textAlign: 'center',
    lineHeight: 20,
  },
});
