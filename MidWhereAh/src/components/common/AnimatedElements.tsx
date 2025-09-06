import React from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  useAnimatedGestureHandler,
  runOnJS,
} from 'react-native-reanimated';
import { 
  PanGestureHandler, 
  TapGestureHandler,
  TapGestureHandlerGestureEvent,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import { StyleSheet, ViewStyle } from 'react-native';
import {
  AnimationEasing,
  AnimationDuration,
  SpringPresets,
  createFadeIn,
  createScale,
  GestureAnimations,
} from '../../utils/animations';

interface AnimatedElementProps {
  children: React.ReactNode;
  style?: ViewStyle;
  entrance?: 'fade' | 'scale' | 'slide';
  entranceDelay?: number;
  onPress?: () => void;
  pressScale?: number;
  disabled?: boolean;
}

/**
 * Basic animated container with entrance animations
 */
export const AnimatedContainer: React.FC<AnimatedElementProps> = ({
  children,
  style,
  entrance = 'fade',
  entranceDelay = 0,
}) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(entrance === 'scale' ? 0.8 : 1);
  const translateY = useSharedValue(entrance === 'slide' ? 20 : 0);

  React.useEffect(() => {
    // Entrance animation
    const delay = entranceDelay;
    
    if (entrance === 'fade') {
      opacity.value = withTiming(1, {
        duration: AnimationDuration.normal,
        easing: AnimationEasing.standard,
      });
    } else if (entrance === 'scale') {
      opacity.value = withTiming(1, {
        duration: AnimationDuration.normal,
        easing: AnimationEasing.standard,
      });
      scale.value = withSpring(1, SpringPresets.gentle);
    } else if (entrance === 'slide') {
      opacity.value = withTiming(1, {
        duration: AnimationDuration.normal,
        easing: AnimationEasing.standard,
      });
      translateY.value = withTiming(0, {
        duration: AnimationDuration.normal,
        easing: AnimationEasing.decelerate,
      });
    }
  }, [entrance, entranceDelay, opacity, scale, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
};

/**
 * Pressable animated button with scale and feedback
 */
export const AnimatedPressable: React.FC<AnimatedElementProps> = ({
  children,
  style,
  onPress,
  pressScale = 0.95,
  disabled = false,
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const tapGestureHandler = useAnimatedGestureHandler<TapGestureHandlerGestureEvent>({
    onStart: () => {
      if (!disabled) {
        scale.value = withTiming(pressScale, {
          duration: 100,
          easing: AnimationEasing.accelerate,
        });
        opacity.value = withTiming(0.8, {
          duration: 100,
        });
      }
    },
    onEnd: () => {
      if (!disabled) {
        scale.value = withSpring(1, SpringPresets.gentle);
        opacity.value = withTiming(1, {
          duration: 150,
        });
        if (onPress) {
          runOnJS(onPress)();
        }
      }
    },
    onFail: () => {
      scale.value = withSpring(1, SpringPresets.gentle);
      opacity.value = withTiming(1, {
        duration: 150,
      });
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <TapGestureHandler onGestureEvent={tapGestureHandler} enabled={!disabled}>
      <Animated.View style={[style, animatedStyle, disabled && styles.disabled]}>
        {children}
      </Animated.View>
    </TapGestureHandler>
  );
};

/**
 * Card component with hover and press animations
 */
interface AnimatedCardProps extends AnimatedElementProps {
  elevation?: number;
  hoverable?: boolean;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  style,
  onPress,
  elevation = 2,
  hoverable = true,
  disabled = false,
}) => {
  const scale = useSharedValue(1);
  const shadowOpacity = useSharedValue(0.1);
  const translateY = useSharedValue(0);

  const gestureHandler = useAnimatedGestureHandler<TapGestureHandlerGestureEvent>({
    onStart: () => {
      if (!disabled && hoverable) {
        scale.value = withSpring(1.02, SpringPresets.gentle);
        shadowOpacity.value = withTiming(0.15, {
          duration: 200,
        });
        translateY.value = withTiming(-2, {
          duration: 200,
          easing: AnimationEasing.decelerate,
        });
      }
    },
    onEnd: () => {
      if (!disabled) {
        scale.value = withSpring(1, SpringPresets.gentle);
        shadowOpacity.value = withTiming(0.1, {
          duration: 200,
        });
        translateY.value = withTiming(0, {
          duration: 200,
          easing: AnimationEasing.decelerate,
        });
        if (onPress) {
          runOnJS(onPress)();
        }
      }
    },
    onFail: () => {
      scale.value = withSpring(1, SpringPresets.gentle);
      shadowOpacity.value = withTiming(0.1, {
        duration: 200,
      });
      translateY.value = withTiming(0, {
        duration: 200,
      });
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
    shadowOpacity: shadowOpacity.value,
  }));

  const cardStyle = [
    styles.card,
    {
      shadowOffset: {
        width: 0,
        height: elevation,
      },
      shadowRadius: elevation * 2,
      elevation: elevation,
    },
    style,
    animatedStyle,
  ];

  return (
    <TapGestureHandler onGestureEvent={gestureHandler} enabled={!disabled}>
      <Animated.View style={cardStyle}>
        {children}
      </Animated.View>
    </TapGestureHandler>
  );
};

/**
 * Floating Action Button with scale animation
 */
interface AnimatedFABProps {
  onPress: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
  size?: number;
  disabled?: boolean;
}

export const AnimatedFAB: React.FC<AnimatedFABProps> = ({
  onPress,
  children,
  style,
  size = 56,
  disabled = false,
}) => {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const gestureHandler = useAnimatedGestureHandler<TapGestureHandlerGestureEvent>({
    onStart: () => {
      if (!disabled) {
        scale.value = withTiming(0.9, {
          duration: 100,
          easing: AnimationEasing.accelerate,
        });
      }
    },
    onEnd: () => {
      if (!disabled) {
        scale.value = withSpring(1, SpringPresets.wobbly);
        rotation.value = withTiming(rotation.value + 360, {
          duration: 300,
          easing: AnimationEasing.standard,
        });
        runOnJS(onPress)();
      }
    },
    onFail: () => {
      scale.value = withSpring(1, SpringPresets.gentle);
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const fabStyle = [
    styles.fab,
    {
      width: size,
      height: size,
      borderRadius: size / 2,
    },
    style,
    animatedStyle,
    disabled && styles.disabled,
  ];

  return (
    <TapGestureHandler onGestureEvent={gestureHandler} enabled={!disabled}>
      <Animated.View style={fabStyle}>
        {children}
      </Animated.View>
    </TapGestureHandler>
  );
};

/**
 * Loading spinner component
 */
interface AnimatedSpinnerProps {
  size?: number;
  color?: string;
  style?: ViewStyle;
}

export const AnimatedSpinner: React.FC<AnimatedSpinnerProps> = ({
  size = 24,
  color = '#007AFF',
  style,
}) => {
  const rotation = useSharedValue(0);

  React.useEffect(() => {
    rotation.value = withTiming(360, {
      duration: 1000,
      easing: AnimationEasing.standard,
    });
    
    const interval = setInterval(() => {
      rotation.value = withTiming(rotation.value + 360, {
        duration: 1000,
        easing: AnimationEasing.standard,
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View 
      style={[
        styles.spinner,
        {
          width: size,
          height: size,
          borderColor: color,
          borderTopColor: 'transparent',
        },
        style,
        animatedStyle,
      ]}
    />
  );
};

/**
 * Progress bar with animated progress
 */
interface AnimatedProgressBarProps {
  progress: number; // 0-1
  height?: number;
  backgroundColor?: string;
  progressColor?: string;
  style?: ViewStyle;
  animated?: boolean;
}

export const AnimatedProgressBar: React.FC<AnimatedProgressBarProps> = ({
  progress,
  height = 4,
  backgroundColor = '#E5E5E5',
  progressColor = '#007AFF',
  style,
  animated = true,
}) => {
  const progressWidth = useSharedValue(0);

  React.useEffect(() => {
    if (animated) {
      progressWidth.value = withTiming(progress, {
        duration: AnimationDuration.slow,
        easing: AnimationEasing.decelerate,
      });
    } else {
      progressWidth.value = progress;
    }
  }, [progress, animated, progressWidth]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }));

  return (
    <Animated.View
      style={[
        styles.progressContainer,
        {
          height,
          backgroundColor,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.progressFill,
          {
            height,
            backgroundColor: progressColor,
          },
          animatedStyle,
        ]}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  fab: {
    backgroundColor: '#007AFF',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  disabled: {
    opacity: 0.6,
  },
  spinner: {
    borderWidth: 2,
    borderRadius: 12,
  },
  progressContainer: {
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: 2,
  },
});

export default {
  AnimatedContainer,
  AnimatedPressable,
  AnimatedCard,
  AnimatedFAB,
  AnimatedSpinner,
  AnimatedProgressBar,
};