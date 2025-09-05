// Jest setup file for React Native components

// Mock react-native modules
jest.mock('react-native', () => {
  const ReactNative = jest.requireActual('react-native');
  return {
    ...ReactNative,
    Alert: {
      alert: jest.fn(),
    },
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 667 })),
    },
    Platform: {
      OS: 'ios',
      select: jest.fn((obj) => obj.ios),
    },
  };
});

// Mock AsyncStorage for testing
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock native modules that might not be available in test environment
jest.mock('react-native-maps', () => ({
  __esModule: true,
  default: jest.fn(),
  Marker: jest.fn(),
  PROVIDER_GOOGLE: 'google',
}));

jest.mock('supercluster', () => {
  return jest.fn().mockImplementation(() => ({
    load: jest.fn(),
    getClusters: jest.fn().mockReturnValue([]),
    getClusterExpansionZoom: jest.fn().mockReturnValue(10),
  }));
});

// Mock axios for API testing
jest.mock('axios', () => ({
  get: jest.fn(() => Promise.resolve({ data: {} })),
  post: jest.fn(() => Promise.resolve({ data: {} })),
}));

// Global test timeout
jest.setTimeout(10000);