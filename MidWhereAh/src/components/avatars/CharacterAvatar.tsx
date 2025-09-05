/**
 * Character Avatar Component for MidWhereAh
 * 
 * Diverse, friendly character illustrations matching Canva design style
 * with transport mode integration and accessibility support.
 * 
 * @author MidWhereAh Team
 * @version 1.0.0
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { PurpleTheme } from '../../design/theme';
import { TransportMode } from '../maps/types';

/**
 * Character types for diverse representation
 */
export type CharacterType = 
  | 'person1' | 'person2' | 'person3' | 'person4' | 'person5'
  | 'person6' | 'person7' | 'person8' | 'person9' | 'person10';

/**
 * Avatar size variants
 */
export type AvatarSize = 'small' | 'medium' | 'large' | 'xlarge';

/**
 * Character Avatar Props
 */
export interface CharacterAvatarProps {
  /** Unique user identifier */
  userId: string;
  /** Avatar size variant */
  size: AvatarSize;
  /** Character type for illustration */
  character: CharacterType;
  /** Optional transport mode to show icon */
  transportMode?: TransportMode;
  /** Show transport mode icon overlay */
  showTransportMode?: boolean;
  /** Custom style override */
  style?: ViewStyle;
  /** Accessibility label */
  accessibilityLabel?: string;
}

/**
 * Character color schemes based on purple theme
 */
const CharacterColors = {
  person1: {
    skin: '#F4C2A1',
    hair: '#8B4513',
    clothes: PurpleTheme.colors.primary,
    accent: PurpleTheme.colors.primaryLight,
  },
  person2: {
    skin: '#D4A574',
    hair: '#2F1B14',
    clothes: PurpleTheme.colors.primaryDark,
    accent: PurpleTheme.colors.purple400,
  },
  person3: {
    skin: '#E6B89C',
    hair: '#FFD700',
    clothes: PurpleTheme.colors.primaryLight,
    accent: PurpleTheme.colors.purple300,
  },
  person4: {
    skin: '#A0522D',
    hair: '#000000',
    clothes: PurpleTheme.colors.purple600,
    accent: PurpleTheme.colors.purple500,
  },
  person5: {
    skin: '#C8A882',
    hair: '#8B0000',
    clothes: PurpleTheme.colors.purple700,
    accent: PurpleTheme.colors.purple400,
  },
  person6: {
    skin: '#F5DEB3',
    hair: '#A0522D',
    clothes: PurpleTheme.colors.primaryExtraLight,
    accent: PurpleTheme.colors.purple300,
  },
  person7: {
    skin: '#DDB892',
    hair: '#4B0082',
    clothes: PurpleTheme.colors.purple500,
    accent: PurpleTheme.colors.primaryLight,
  },
  person8: {
    skin: '#8D5524',
    hair: '#654321',
    clothes: PurpleTheme.colors.primary,
    accent: PurpleTheme.colors.purple600,
  },
  person9: {
    skin: '#FAEBD7',
    hair: '#FF6347',
    clothes: PurpleTheme.colors.purple800,
    accent: PurpleTheme.colors.purple400,
  },
  person10: {
    skin: '#CD853F',
    hair: '#2F4F4F',
    clothes: PurpleTheme.colors.primaryDark,
    accent: PurpleTheme.colors.purple500,
  },
};

/**
 * Transport mode icons as simple shapes (would be SVG in production)
 */
const TransportIcons = {
  DRIVING: '🚗',
  TRANSIT: '🚌', 
  WALKING: '🚶',
  CYCLING: '🚴',
};

/**
 * Size configurations
 */
const SizeConfig = {
  small: { size: 32, iconSize: 12, borderWidth: 1 },
  medium: { size: 48, iconSize: 16, borderWidth: 2 },
  large: { size: 64, iconSize: 20, borderWidth: 2 },
  xlarge: { size: 96, iconSize: 24, borderWidth: 3 },
};

/**
 * Simple character avatar using CSS-based illustration
 * In production, this would use SVG assets for better quality
 */
const SimpleCharacterIllustration: React.FC<{
  character: CharacterType;
  size: number;
}> = ({ character, size }) => {
  const colors = CharacterColors[character];
  const faceSize = size * 0.7;
  const hairSize = size * 0.8;
  
  return (
    <View style={[styles.characterContainer, { width: size, height: size }]}>
      {/* Hair (back layer) */}
      <View
        style={[
          styles.hair,
          {
            width: hairSize,
            height: hairSize * 0.7,
            backgroundColor: colors.hair,
            top: size * 0.05,
          },
        ]}
      />
      
      {/* Face */}
      <View
        style={[
          styles.face,
          {
            width: faceSize,
            height: faceSize,
            backgroundColor: colors.skin,
            top: size * 0.15,
          },
        ]}
      />
      
      {/* Eyes */}
      <View
        style={[
          styles.eye,
          {
            width: size * 0.08,
            height: size * 0.08,
            left: size * 0.25,
            top: size * 0.35,
          },
        ]}
      />
      <View
        style={[
          styles.eye,
          {
            width: size * 0.08,
            height: size * 0.08,
            right: size * 0.25,
            top: size * 0.35,
          },
        ]}
      />
      
      {/* Smile */}
      <View
        style={[
          styles.smile,
          {
            width: size * 0.2,
            height: size * 0.1,
            top: size * 0.5,
            borderColor: colors.accent,
          },
        ]}
      />
      
      {/* Clothes (shoulders) */}
      <View
        style={[
          styles.clothes,
          {
            width: size * 0.9,
            height: size * 0.3,
            backgroundColor: colors.clothes,
            bottom: 0,
          },
        ]}
      />
    </View>
  );
};

/**
 * Transport mode overlay icon
 */
const TransportModeOverlay: React.FC<{
  mode: TransportMode;
  size: number;
  iconSize: number;
}> = ({ mode, size, iconSize }) => {
  return (
    <View
      style={[
        styles.transportOverlay,
        {
          width: iconSize + 4,
          height: iconSize + 4,
          borderRadius: (iconSize + 4) / 2,
          bottom: -2,
          right: -2,
        },
      ]}
    >
      <View
        style={[
          styles.transportIcon,
          {
            width: iconSize,
            height: iconSize,
            borderRadius: iconSize / 2,
            backgroundColor: PurpleTheme.utils.getTransportColor(mode),
          },
        ]}
      />
    </View>
  );
};

/**
 * Character Avatar Component
 */
export const CharacterAvatar: React.FC<CharacterAvatarProps> = ({
  userId,
  size,
  character,
  transportMode,
  showTransportMode = false,
  style,
  accessibilityLabel,
}) => {
  const config = SizeConfig[size];
  
  const defaultAccessibilityLabel = 
    `${character} avatar${transportMode && showTransportMode ? ` with ${transportMode} transport` : ''}`;

  return (
    <View
      style={[
        styles.container,
        {
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          borderWidth: config.borderWidth,
        },
        style,
      ]}
      accessible={true}
      accessibilityLabel={accessibilityLabel || defaultAccessibilityLabel}
      accessibilityRole="image"
    >
      <SimpleCharacterIllustration character={character} size={config.size} />
      
      {showTransportMode && transportMode && (
        <TransportModeOverlay
          mode={transportMode}
          size={config.size}
          iconSize={config.iconSize}
        />
      )}
    </View>
  );
};

/**
 * Utility function to get character for user ID
 */
export const getCharacterForUser = (userId: string): CharacterType => {
  // Simple hash to assign consistent character per user
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const characters: CharacterType[] = [
    'person1', 'person2', 'person3', 'person4', 'person5',
    'person6', 'person7', 'person8', 'person9', 'person10',
  ];
  return characters[hash % characters.length];
};

/**
 * Utility function to create avatar for user location
 */
export const createUserAvatar = (
  userId: string,
  size: AvatarSize = 'medium',
  transportMode?: TransportMode,
  showTransportMode: boolean = true
) => {
  const character = getCharacterForUser(userId);
  
  return (
    <CharacterAvatar
      userId={userId}
      size={size}
      character={character}
      transportMode={transportMode}
      showTransportMode={showTransportMode}
    />
  );
};

/**
 * Styles
 */
const styles = StyleSheet.create({
  container: {
    backgroundColor: PurpleTheme.colors.white,
    borderColor: PurpleTheme.colors.purple200,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    ...PurpleTheme.shadows.sm,
  },
  
  characterContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  hair: {
    position: 'absolute',
    borderRadius: 100,
  },
  
  face: {
    position: 'absolute',
    borderRadius: 100,
  },
  
  eye: {
    position: 'absolute',
    backgroundColor: '#2F1B14',
    borderRadius: 100,
  },
  
  smile: {
    position: 'absolute',
    borderBottomWidth: 2,
    borderRadius: 100,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    left: '50%',
    marginLeft: -20, // Half of width for centering
  },
  
  clothes: {
    position: 'absolute',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    left: '50%',
    marginLeft: -45, // Half of width for centering
  },
  
  transportOverlay: {
    position: 'absolute',
    backgroundColor: PurpleTheme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...PurpleTheme.shadows.sm,
  },
  
  transportIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CharacterAvatar;