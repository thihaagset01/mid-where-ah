import { useEffect, useRef, useCallback } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  withRepeat,
  Easing,
  interpolate,
  runOnJS,
  useDerivedValue,
} from 'react-native-reanimated';
import {
  AnimationConfig,
  SpringConfig,
  AnimationEasing,
  AnimationDuration,
  SpringPresets,
} from '../utils/animations';

/**
 * Hook for fade animations
 */
export const useFadeAnimation = (initialValue: number = 0) => {
  const opacity = useSharedValue(initialValue);

  const fadeIn = useCallback((config?: AnimationConfig) => {
    const { duration = AnimationDuration.normal, easing = AnimationEasing.standard, delay = 0 } = config || {};
    opacity.value = withDelay(delay, withTiming(1, { duration, easing }));
  }, [opacity]);

  const fadeOut = useCallback((config?: AnimationConfig) => {
    const { duration = AnimationDuration.normal, easing = AnimationEasing.standard, delay = 0 } = config || {};
    opacity.value = withDelay(delay, withTiming(0, { duration, easing }));
  }, [opacity]);

  const fadeToggle = useCallback((config?: AnimationConfig) => {
    if (opacity.value > 0.5) {
      fadeOut(config);
    } else {
      fadeIn(config);
    }
  }, [opacity, fadeIn, fadeOut]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return {
    opacity,
    fadeIn,
    fadeOut,
    fadeToggle,
    animatedStyle,
  };
};

/**
 * Hook for scale animations
 */
export const useScaleAnimation = (initialValue: number = 1) => {
  const scale = useSharedValue(initialValue);

  const scaleIn = useCallback((toValue: number = 1, config?: AnimationConfig | SpringConfig) => {
    if ('damping' in (config || {})) {
      scale.value = withSpring(toValue, config as SpringConfig);
    } else {
      const { duration = AnimationDuration.normal, easing = AnimationEasing.standard } = config as AnimationConfig || {};
      scale.value = withTiming(toValue, { duration, easing });
    }
  }, [scale]);

  const scaleOut = useCallback((toValue: number = 0, config?: AnimationConfig) => {
    const { duration = AnimationDuration.normal, easing = AnimationEasing.standard } = config || {};
    scale.value = withTiming(toValue, { duration, easing });
  }, [scale]);

  const bounce = useCallback((intensity: number = 1.1) => {
    scale.value = withSequence(
      withTiming(intensity, { duration: 100, easing: AnimationEasing.accelerate }),
      withTiming(1, { duration: 100, easing: AnimationEasing.decelerate })
    );
  }, [scale]);

  const pulse = useCallback((intensity: number = 1.05, interval: number = 1000) => {
    scale.value = withRepeat(
      withSequence(
        withTiming(intensity, { duration: interval / 2 }),
        withTiming(1, { duration: interval / 2 })
      ),
      -1,
      true
    );
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return {
    scale,
    scaleIn,
    scaleOut,
    bounce,
    pulse,
    animatedStyle,
  };
};

/**
 * Hook for slide animations
 */
export const useSlideAnimation = (initialX: number = 0, initialY: number = 0) => {
  const translateX = useSharedValue(initialX);
  const translateY = useSharedValue(initialY);

  const slideIn = useCallback((
    direction: 'left' | 'right' | 'up' | 'down',
    distance: number = 100,
    config?: AnimationConfig
  ) => {
    const { duration = AnimationDuration.normal, easing = AnimationEasing.decelerate } = config || {};
    
    switch (direction) {
      case 'left':
        translateX.value = withTiming(0, { duration, easing });
        break;
      case 'right':
        translateX.value = withTiming(0, { duration, easing });
        break;
      case 'up':
        translateY.value = withTiming(0, { duration, easing });
        break;
      case 'down':
        translateY.value = withTiming(0, { duration, easing });
        break;
    }
  }, [translateX, translateY]);

  const slideOut = useCallback((
    direction: 'left' | 'right' | 'up' | 'down',
    distance: number = 100,
    config?: AnimationConfig
  ) => {
    const { duration = AnimationDuration.normal, easing = AnimationEasing.accelerate } = config || {};
    
    switch (direction) {
      case 'left':
        translateX.value = withTiming(-distance, { duration, easing });
        break;
      case 'right':
        translateX.value = withTiming(distance, { duration, easing });
        break;
      case 'up':
        translateY.value = withTiming(-distance, { duration, easing });
        break;
      case 'down':
        translateY.value = withTiming(distance, { duration, easing });
        break;
    }
  }, [translateX, translateY]);

  const shake = useCallback((intensity: number = 10, axis: 'x' | 'y' = 'x') => {
    const targetValue = axis === 'x' ? translateX : translateY;
    
    targetValue.value = withSequence(
      withTiming(intensity, { duration: 50 }),
      withTiming(-intensity, { duration: 50 }),
      withTiming(intensity, { duration: 50 }),
      withTiming(-intensity, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  }, [translateX, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return {
    translateX,
    translateY,
    slideIn,
    slideOut,
    shake,
    animatedStyle,
  };
};

/**
 * Hook for rotation animations
 */
export const useRotationAnimation = (initialValue: number = 0) => {
  const rotation = useSharedValue(initialValue);

  const rotate = useCallback((degrees: number, config?: AnimationConfig) => {
    const { duration = AnimationDuration.normal, easing = AnimationEasing.standard } = config || {};
    rotation.value = withTiming(degrees, { duration, easing });
  }, [rotation]);

  const spin = useCallback((direction: 'clockwise' | 'counterclockwise' = 'clockwise') => {
    const targetValue = direction === 'clockwise' ? 360 : -360;
    rotation.value = withRepeat(
      withTiming(rotation.value + targetValue, {
        duration: 1000,
        easing: Easing.linear,
      }),
      -1
    );
  }, [rotation]);

  const wiggle = useCallback((intensity: number = 15) => {
    rotation.value = withSequence(
      withTiming(intensity, { duration: 100 }),
      withTiming(-intensity, { duration: 100 }),
      withTiming(intensity, { duration: 100 }),
      withTiming(0, { duration: 100 })
    );
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return {
    rotation,
    rotate,
    spin,
    wiggle,
    animatedStyle,
  };
};

/**
 * Hook for complex entrance animations
 */
export const useEntranceAnimation = (
  type: 'fadeIn' | 'slideIn' | 'scaleIn' | 'bounceIn' = 'fadeIn',
  delay: number = 0
) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(type === 'scaleIn' || type === 'bounceIn' ? 0.3 : 1);
  const translateY = useSharedValue(type === 'slideIn' ? 50 : 0);

  const animate = useCallback(() => {
    const animationDelay = delay;

    switch (type) {
      case 'fadeIn':
        opacity.value = withDelay(animationDelay, withTiming(1, {
          duration: AnimationDuration.normal,
          easing: AnimationEasing.standard,
        }));
        break;
      
      case 'slideIn':
        opacity.value = withDelay(animationDelay, withTiming(1, {
          duration: AnimationDuration.normal,
          easing: AnimationEasing.standard,
        }));
        translateY.value = withDelay(animationDelay, withTiming(0, {
          duration: AnimationDuration.normal,
          easing: AnimationEasing.decelerate,
        }));
        break;
      
      case 'scaleIn':
        opacity.value = withDelay(animationDelay, withTiming(1, {
          duration: AnimationDuration.normal,
          easing: AnimationEasing.standard,
        }));
        scale.value = withDelay(animationDelay, withSpring(1, SpringPresets.gentle));
        break;
      
      case 'bounceIn':
        opacity.value = withDelay(animationDelay, withTiming(1, {
          duration: AnimationDuration.fast,
          easing: AnimationEasing.standard,
        }));
        scale.value = withDelay(animationDelay, withSpring(1, SpringPresets.wobbly));
        break;
    }
  }, [type, delay, opacity, scale, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
  }));

  return {
    animate,
    animatedStyle,
  };
};

/**
 * Hook for scroll-based animations
 */
export const useScrollAnimation = (scrollY: any) => {
  const translateY = useDerivedValue(() => {
    return interpolate(
      scrollY.value,
      [0, 100],
      [0, -50],
      'clamp'
    );
  });

  const opacity = useDerivedValue(() => {
    return interpolate(
      scrollY.value,
      [0, 100],
      [1, 0],
      'clamp'
    );
  });

  const scale = useDerivedValue(() => {
    return interpolate(
      scrollY.value,
      [0, 100],
      [1, 0.9],
      'clamp'
    );
  });

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return {
    animatedStyle,
  };
};

/**
 * Hook for gesture-based animations
 */
export const useGestureAnimation = () => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const onPressIn = useCallback(() => {
    scale.value = withTiming(0.95, {
      duration: 100,
      easing: AnimationEasing.accelerate,
    });
    opacity.value = withTiming(0.8, {
      duration: 100,
    });
  }, [scale, opacity]);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, SpringPresets.gentle);
    opacity.value = withTiming(1, {
      duration: 150,
    });
  }, [scale, opacity]);

  const onLongPress = useCallback(() => {
    scale.value = withSequence(
      withTiming(1.05, { duration: 100 }),
      withTiming(0.95, { duration: 100 })
    );
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return {
    onPressIn,
    onPressOut,
    onLongPress,
    animatedStyle,
  };
};

/**
 * Hook for sequential animations (stagger effect)
 */
export const useStaggerAnimation = (itemCount: number, staggerDelay: number = 100) => {
  const animationValues = useRef(
    Array.from({ length: itemCount }, () => ({
      opacity: useSharedValue(0),
      translateY: useSharedValue(20),
    }))
  ).current;

  const animateIn = useCallback(() => {
    animationValues.forEach((values, index) => {
      const delay = index * staggerDelay;
      
      values.opacity.value = withDelay(delay, withTiming(1, {
        duration: AnimationDuration.normal,
        easing: AnimationEasing.standard,
      }));
      
      values.translateY.value = withDelay(delay, withTiming(0, {
        duration: AnimationDuration.normal,
        easing: AnimationEasing.decelerate,
      }));
    });
  }, [animationValues, staggerDelay]);

  const animateOut = useCallback(() => {
    animationValues.forEach((values, index) => {
      const delay = index * (staggerDelay / 2);
      
      values.opacity.value = withDelay(delay, withTiming(0, {
        duration: AnimationDuration.fast,
        easing: AnimationEasing.accelerate,
      }));
      
      values.translateY.value = withDelay(delay, withTiming(-20, {
        duration: AnimationDuration.fast,
        easing: AnimationEasing.accelerate,
      }));
    });
  }, [animationValues, staggerDelay]);

  const getAnimatedStyle = useCallback((index: number) => {
    if (!animationValues[index]) {
      return {};
    }

    return useAnimatedStyle(() => ({
      opacity: animationValues[index].opacity.value,
      transform: [{ translateY: animationValues[index].translateY.value }],
    }));
  }, [animationValues]);

  return {
    animateIn,
    animateOut,
    getAnimatedStyle,
  };
};

/**
 * Hook for loading animations
 */
export const useLoadingAnimation = () => {
  const rotation = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const dotsOpacity = Array.from({ length: 3 }, () => useSharedValue(0.3));

  const startSpinner = useCallback(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 1000,
        easing: Easing.linear,
      }),
      -1
    );
  }, [rotation]);

  const stopSpinner = useCallback(() => {
    rotation.value = withTiming(0, {
      duration: 200,
    });
  }, [rotation]);

  const startPulse = useCallback(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 600 }),
        withTiming(1, { duration: 600 })
      ),
      -1,
      true
    );
  }, [pulseScale]);

  const startDots = useCallback(() => {
    dotsOpacity.forEach((dot, index) => {
      dot.value = withDelay(
        index * 200,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 400 }),
            withTiming(0.3, { duration: 400 })
          ),
          -1,
          true
        )
      );
    });
  }, [dotsOpacity]);

  const spinnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const getDotStyle = useCallback((index: number) => {
    return useAnimatedStyle(() => ({
      opacity: dotsOpacity[index]?.value || 0.3,
    }));
  }, [dotsOpacity]);

  return {
    startSpinner,
    stopSpinner,
    startPulse,
    startDots,
    spinnerStyle,
    pulseStyle,
    getDotStyle,
  };
};