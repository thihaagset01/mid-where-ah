// Jest setup file for React Native components

// Mock react-native modules
jest.mock('react-native', () => ({
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
  StyleSheet: {
    create: jest.fn((styles) => styles),
    flatten: jest.fn((style) => style),
  },
  View: 'View',
  Text: 'Text',
  AccessibilityInfo: {
    announceForAccessibility: jest.fn(),
    announceForAccessibilityWithOptions: jest.fn(),
    isScreenReaderEnabled: jest.fn(() => Promise.resolve(false)),
    setAccessibilityFocus: jest.fn(),
  },
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  
  // The mock for `call` immediately calls the callback which is incorrect
  // So we override it with a no-op
  Reanimated.default.call = () => {};
  
  return {
    ...Reanimated,
    useSharedValue: jest.fn(() => ({ value: 0 })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((value) => value),
    withSpring: jest.fn((value) => value),
    withDelay: jest.fn((delay, value) => value),
    withSequence: jest.fn((...values) => values[values.length - 1]),
    withRepeat: jest.fn((value) => value),
    useDerivedValue: jest.fn(() => ({ value: 0 })),
    useAnimatedGestureHandler: jest.fn(() => ({})),
    runOnJS: jest.fn((fn) => fn),
    Easing: {
      linear: jest.fn(),
      bezier: jest.fn(),
    },
    interpolate: jest.fn(),
  };
});

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => ({
  TapGestureHandler: 'TapGestureHandler',
  PanGestureHandler: 'PanGestureHandler',
  State: {
    BEGAN: 0,
    ACTIVE: 1,
    END: 2,
    CANCELLED: 3,
    FAILED: 4,
  },
}));

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