import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

export type NetworkState = 'connected' | 'disconnected' | 'unknown';

export function useNetworkState(): NetworkState {
  const [networkState, setNetworkState] = useState<NetworkState>('unknown');

  useEffect(() => {
    // Get initial network state
    NetInfo.fetch().then(state => {
      setNetworkState(state.isConnected ? 'connected' : 'disconnected');
    }).catch(() => {
      setNetworkState('unknown');
    });

    // Listen for network state changes
    const unsubscribe = NetInfo.addEventListener(state => {
      try {
        setNetworkState(state.isConnected ? 'connected' : 'disconnected');
      } catch (error) {
        console.warn('Failed to update network state:', error);
        setNetworkState('unknown');
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return networkState;
}