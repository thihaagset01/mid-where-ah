/**
 * Animation utilities for React Native components
 * Provides helpers for sophisticated micro-interactions and animations
 */

import { 
  withTiming, 
  withSpring, 
  withDelay, 
  withSequence, 
  withRepeat,
  Easing,
  interpolate,
  Extrapolate,
  runOnJS,
  SharedValue,
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
} from 'react-native-reanimated';

export interface AnimationConfig {
  duration?: number;
  easing?: typeof Easing.bezier;
  delay?: number;
}

export interface SpringConfig {
  damping?: number;
  mass?: number;
  stiffness?: number;
  overshootClamping?: boolean;
  restDisplacementThreshold?: number;
  restSpeedThreshold?: number;
}

/**
 * Common easing functions for consistent animations
 */
export const AnimationEasing = {
  // Standard Material Design easing
  standard: Easing.bezier(0.4, 0.0, 0.2, 1),
  decelerate: Easing.bezier(0.0, 0.0, 0.2, 1),
  accelerate: Easing.bezier(0.4, 0.0, 1, 1),
  sharp: Easing.bezier(0.4, 0.0, 0.6, 1),
  
  // Custom easing for delightful animations
  bounce: Easing.bezier(0.68, -0.55, 0.265, 1.55),
  elastic: Easing.bezier(0.175, 0.885, 0.32, 1.275),
  smooth: Easing.bezier(0.25, 0.46, 0.45, 0.94),
} as const;

/**
 * Standard animation durations in milliseconds
 */
export const AnimationDuration = {
  fast: 150,
  normal: 250,
  slow: 350,
  extraSlow: 500,
} as const;

/**
 * Spring animation presets
 */
export const SpringPresets = {
  gentle: {
    damping: 20,
    mass: 1,
    stiffness: 120,
  },
  wobbly: {
    damping: 10,
    mass: 1,
    stiffness: 180,
  },
  stiff: {
    damping: 26,
    mass: 1,
    stiffness: 210,
  },
  slow: {
    damping: 28,
    mass: 1,
    stiffness: 120,
  },
} as const;

/**
 * Create a fade in animation
 */
export const createFadeIn = (config: AnimationConfig = {}) => {
  const { duration = AnimationDuration.normal, easing = AnimationEasing.standard, delay = 0 } = config;
  
  return withDelay(
    delay,
    withTiming(1, {
      duration,
      easing,
    })
  );
};

/**
 * Create a fade out animation
 */
export const createFadeOut = (config: AnimationConfig = {}) => {
  const { duration = AnimationDuration.normal, easing = AnimationEasing.standard, delay = 0 } = config;
  
  return withDelay(
    delay,
    withTiming(0, {
      duration,
      easing,
    })
  );
};

/**
 * Create a scale animation
 */
export const createScale = (
  toValue: number,
  config: AnimationConfig = {}
) => {
  const { duration = AnimationDuration.normal, easing = AnimationEasing.standard, delay = 0 } = config;
  
  return withDelay(
    delay,
    withTiming(toValue, {
      duration,
      easing,
    })
  );
};

/**
 * Create a spring scale animation
 */
export const createSpringScale = (
  toValue: number,
  config: SpringConfig = SpringPresets.gentle
) => {
  return withSpring(toValue, config);
};

/**
 * Create a slide animation
 */
export const createSlide = (
  fromValue: number,
  toValue: number,
  config: AnimationConfig = {}
) => {
  const { duration = AnimationDuration.normal, easing = AnimationEasing.standard, delay = 0 } = config;
  
  return withDelay(
    delay,
    withTiming(toValue, {
      duration,
      easing,
    })
  );
};

/**
 * Create a bounce animation sequence
 */
export const createBounce = (scale: number = 1.1) => {
  return withSequence(
    withTiming(scale, { duration: 100, easing: AnimationEasing.accelerate }),
    withTiming(1, { duration: 100, easing: AnimationEasing.decelerate })
  );
};

/**
 * Create a pulse animation
 */
export const createPulse = (scale: number = 1.05, duration: number = AnimationDuration.slow) => {
  return withRepeat(
    withSequence(
      withTiming(scale, { duration: duration / 2, easing: AnimationEasing.standard }),
      withTiming(1, { duration: duration / 2, easing: AnimationEasing.standard })
    ),
    -1, // Infinite repeat
    true // Reverse
  );
};

/**
 * Create a shake animation
 */
export const createShake = (intensity: number = 10) => {
  return withSequence(
    withTiming(intensity, { duration: 50 }),
    withTiming(-intensity, { duration: 50 }),
    withTiming(intensity, { duration: 50 }),
    withTiming(-intensity, { duration: 50 }),
    withTiming(0, { duration: 50 })
  );
};

/**
 * Create a rotation animation
 */
export const createRotation = (
  degrees: number,
  config: AnimationConfig = {}
) => {
  const { duration = AnimationDuration.normal, easing = AnimationEasing.standard } = config;
  
  return withTiming(degrees, {
    duration,
    easing,
  });
};

/**
 * Create a staggered animation for multiple elements
 */
export const createStaggered = <T>(
  items: T[],
  animationCreator: (index: number) => any,
  staggerDelay: number = 100
) => {
  return items.map((_, index) => 
    withDelay(index * staggerDelay, animationCreator(index))
  );
};

/**
 * Create entrance animations
 */
export const EntranceAnimations = {
  fadeInUp: (distance: number = 20) => ({
    opacity: createFadeIn(),
    transform: [{ translateY: createSlide(distance, 0) }],
  }),
  
  fadeInDown: (distance: number = 20) => ({
    opacity: createFadeIn(),
    transform: [{ translateY: createSlide(-distance, 0) }],
  }),
  
  fadeInLeft: (distance: number = 20) => ({
    opacity: createFadeIn(),
    transform: [{ translateX: createSlide(-distance, 0) }],
  }),
  
  fadeInRight: (distance: number = 20) => ({
    opacity: createFadeIn(),
    transform: [{ translateX: createSlide(distance, 0) }],
  }),
  
  scaleIn: () => ({
    opacity: createFadeIn(),
    transform: [{ scale: createScale(1, { easing: AnimationEasing.bounce }) }],
  }),
  
  slideInUp: (distance: number = 100) => ({
    transform: [{ translateY: createSlide(distance, 0, { easing: AnimationEasing.decelerate }) }],
  }),
};

/**
 * Create exit animations
 */
export const ExitAnimations = {
  fadeOutUp: (distance: number = 20) => ({
    opacity: createFadeOut(),
    transform: [{ translateY: createSlide(0, -distance) }],
  }),
  
  fadeOutDown: (distance: number = 20) => ({
    opacity: createFadeOut(),
    transform: [{ translateY: createSlide(0, distance) }],
  }),
  
  scaleOut: () => ({
    opacity: createFadeOut(),
    transform: [{ scale: createScale(0.8) }],
  }),
};

/**
 * Interpolation helpers
 */
export const createInterpolation = (
  value: SharedValue<number>,
  inputRange: number[],
  outputRange: number[],
  extrapolate: Extrapolate = Extrapolate.CLAMP
) => {
  return interpolate(value.value, inputRange, outputRange, extrapolate);
};

/**
 * Animation state management
 */
export const useAnimationState = (initialValue: number = 0) => {
  const animatedValue = useSharedValue(initialValue);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: animatedValue.value }],
    opacity: animatedValue.value,
  }));
  
  const animate = (toValue: number, config?: AnimationConfig | SpringConfig) => {
    if ('damping' in (config || {})) {
      animatedValue.value = withSpring(toValue, config as SpringConfig);
    } else {
      const { duration = AnimationDuration.normal, easing = AnimationEasing.standard } = config as AnimationConfig || {};
      animatedValue.value = withTiming(toValue, { duration, easing });
    }
  };
  
  return {
    animatedValue,
    animatedStyle,
    animate,
  };
};

/**
 * Gesture animation helpers
 */
export const GestureAnimations = {
  createPressAnimation: (scale: number = 0.95) => {
    return {
      onPressIn: (animatedValue: SharedValue<number>) => {
        animatedValue.value = withTiming(scale, {
          duration: 100,
          easing: AnimationEasing.accelerate,
        });
      },
      onPressOut: (animatedValue: SharedValue<number>) => {
        animatedValue.value = withSpring(1, SpringPresets.gentle);
      },
    };
  },
  
  createHoverAnimation: (scale: number = 1.05) => {
    return {
      onHoverIn: (animatedValue: SharedValue<number>) => {
        animatedValue.value = withSpring(scale, SpringPresets.gentle);
      },
      onHoverOut: (animatedValue: SharedValue<number>) => {
        animatedValue.value = withSpring(1, SpringPresets.gentle);
      },
    };
  },
};

/**
 * Loading animation utilities
 */
export const LoadingAnimations = {
  createSpinner: (animatedValue: SharedValue<number>) => {
    animatedValue.value = withRepeat(
      withTiming(360, {
        duration: 1000,
        easing: Easing.linear,
      }),
      -1
    );
  },
  
  createPulsingDots: (delay: number = 0) => {
    return withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.4, { duration: 400 }),
          withTiming(1, { duration: 400 })
        ),
        -1,
        true
      )
    );
  },
  
  createProgressBar: (
    progress: SharedValue<number>,
    targetProgress: number,
    duration: number = 1000
  ) => {
    progress.value = withTiming(targetProgress, {
      duration,
      easing: AnimationEasing.standard,
    });
  },
};

/**
 * Performance optimization helpers
 */
export const AnimationPerformance = {
  // Throttle animations for better performance
  shouldAnimate: (lastAnimationTime: number, threshold: number = 16) => {
    const now = Date.now();
    return now - lastAnimationTime > threshold;
  },
  
  // Reduce motion for accessibility
  respectReducedMotion: (enabledValue: any, disabledValue: any = 0) => {
    // In a real implementation, you'd check the device's reduced motion setting
    // For now, return the enabled value
    return enabledValue;
  },
};