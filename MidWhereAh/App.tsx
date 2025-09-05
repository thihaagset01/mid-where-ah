import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';
import { AppNavigator } from './src/navigation/AppNavigator';
import { useNetworkState } from './src/hooks/useNetworkState';
import { AppState } from './src/types/navigation';
import { store } from './src/store';

export default function App() {
  const [appState, setAppState] = useState<AppState>({
    isLoading: true,
    hasError: false,
    networkState: 'unknown',
  });

  const networkState = useNetworkState();

  useEffect(() => {
    // Update network state
    setAppState(prev => ({ ...prev, networkState }));
  }, [networkState]);

  useEffect(() => {
    // Simulate app initialization
    const initializeApp = async () => {
      try {
        // Add any initialization logic here
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate loading
        
        setAppState(prev => ({
          ...prev,
          isLoading: false,
          hasError: false,
        }));
      } catch (error) {
        console.error('App initialization failed:', error);
        setAppState(prev => ({
          ...prev,
          isLoading: false,
          hasError: true,
          errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
        }));
      }
    };

    initializeApp();
  }, []);

  // Show loading screen during initialization
  if (appState.isLoading) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Loading MidWhereAh...</Text>
          <StatusBar style="auto" />
        </View>
      </SafeAreaProvider>
    );
  }

  // Show error screen if initialization failed
  if (appState.hasError) {
    return (
      <SafeAreaProvider>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Failed to start app</Text>
          <Text style={styles.errorMessage}>
            {appState.errorMessage || 'An unexpected error occurred'}
          </Text>
          <StatusBar style="auto" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <View style={styles.container}>
            {/* Show network status if disconnected */}
            {appState.networkState === 'disconnected' && (
              <View style={styles.networkBanner}>
                <Text style={styles.networkBannerText}>📶 No internet connection</Text>
              </View>
            )}
            
            <AppNavigator />
            <StatusBar style="auto" />
          </View>
        </ErrorBoundary>
      </SafeAreaProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 24,
  },
  networkBanner: {
    backgroundColor: '#f39c12',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    paddingTop: 48, // Account for status bar
  },
  networkBannerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
