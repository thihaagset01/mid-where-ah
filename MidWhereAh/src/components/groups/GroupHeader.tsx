/**
 * Group Header Component for MidWhereAh
 * 
 * Social group features with fun naming like "The Biceps" style,
 * character avatars, and purple-themed design.
 * 
 * @author MidWhereAh Team
 * @version 1.0.0
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ViewStyle,
  TextStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { PurpleTheme } from '../../design/theme';
import { CharacterAvatar, getCharacterForUser } from '../avatars/CharacterAvatar';
import { UserLocationInput } from '../location/types';

/**
 * Group Header Props
 */
export interface GroupHeaderProps {
  /** Current group name */
  groupName: string;
  /** Array of group members */
  members: UserLocationInput[];
  /** Callback when edit name is pressed */
  onEditName: () => void;
  /** Show edit button */
  showEditButton?: boolean;
  /** Custom style override */
  style?: ViewStyle;
  /** Header size variant */
  size?: 'compact' | 'default' | 'large';
}

/**
 * Fun group name suggestions
 */
const GroupNameSuggestions = [
  'The Biceps',
  'Squad Goals',
  'The Adventurers',
  'Purple Squad',
  'Team Awesome',
  'The Explorers',
  'Travel Buddies',
  'The Journey Crew',
  'Singapore Squad',
  'The Meeting Makers',
  'Group Harmony',
  'The Fairness Force',
  'Travel Team',
  'The Optimizers',
  'Route Riders',
  'The Commuters',
  'Journey Squad',
  'The Travelers',
  'Transport Team',
  'The Coordinators',
];

/**
 * Avatar overlap configuration
 */
const AvatarConfig = {
  compact: { size: 'small' as const, overlap: 8, maxVisible: 3 },
  default: { size: 'medium' as const, overlap: 12, maxVisible: 4 },
  large: { size: 'large' as const, overlap: 16, maxVisible: 5 },
};

/**
 * Member avatars with overlap effect
 */
const MemberAvatars: React.FC<{
  members: UserLocationInput[];
  size: 'compact' | 'default' | 'large';
}> = ({ members, size }) => {
  const config = AvatarConfig[size];
  const visibleMembers = members.slice(0, config.maxVisible);
  const remainingCount = members.length - config.maxVisible;
  
  return (
    <View style={styles.avatarsContainer}>
      {visibleMembers.map((member, index) => (
        <View
          key={member.id}
          style={[
            styles.avatarWrapper,
            {
              marginLeft: index > 0 ? -config.overlap : 0,
              zIndex: visibleMembers.length - index,
            },
          ]}
        >
          <CharacterAvatar
            userId={member.id}
            size={config.size}
            character={getCharacterForUser(member.id)}
            transportMode={member.transportMode}
            showTransportMode={true}
            style={styles.memberAvatar}
          />
        </View>
      ))}
      
      {remainingCount > 0 && (
        <View
          style={[
            styles.avatarWrapper,
            styles.remainingCountWrapper,
            {
              marginLeft: -config.overlap,
              zIndex: 0,
              width: config.size === 'small' ? 32 : config.size === 'medium' ? 48 : 64,
              height: config.size === 'small' ? 32 : config.size === 'medium' ? 48 : 64,
            },
          ]}
        >
          <LinearGradient
            colors={PurpleTheme.gradients.primary.colors}
            start={PurpleTheme.gradients.primary.direction.start}
            end={PurpleTheme.gradients.primary.direction.end}
            style={[
              styles.remainingCountGradient,
              {
                width: config.size === 'small' ? 32 : config.size === 'medium' ? 48 : 64,
                height: config.size === 'small' ? 32 : config.size === 'medium' ? 48 : 64,
                borderRadius: config.size === 'small' ? 16 : config.size === 'medium' ? 24 : 32,
              },
            ]}
          >
            <Text
              style={[
                styles.remainingCountText,
                {
                  fontSize: config.size === 'small' ? 10 : config.size === 'medium' ? 12 : 14,
                },
              ]}
            >
              +{remainingCount}
            </Text>
          </LinearGradient>
        </View>
      )}
    </View>
  );
};

/**
 * Group stats component
 */
const GroupStats: React.FC<{
  members: UserLocationInput[];
  size: 'compact' | 'default' | 'large';
}> = ({ members, size }) => {
  const transportModes = [...new Set(members.map(m => m.transportMode))];
  const isCompact = size === 'compact';
  
  if (isCompact) {
    return (
      <Text style={styles.compactStats}>
        {members.length} members
      </Text>
    );
  }
  
  return (
    <View style={styles.statsContainer}>
      <Text style={styles.memberCount}>
        {members.length} member{members.length !== 1 ? 's' : ''}
      </Text>
      <View style={styles.transportModesContainer}>
        {transportModes.map((mode, index) => (
          <View key={mode} style={styles.transportModeChip}>
            <View
              style={[
                styles.transportModeDot,
                { backgroundColor: PurpleTheme.utils.getTransportColor(mode) },
              ]}
            />
            <Text style={styles.transportModeText}>
              {mode.toLowerCase()}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

/**
 * Group Header Component
 */
export const GroupHeader: React.FC<GroupHeaderProps> = ({
  groupName,
  members,
  onEditName,
  showEditButton = true,
  style,
  size = 'default',
}) => {
  const isCompact = size === 'compact';
  const isLarge = size === 'large';
  
  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={PurpleTheme.gradients.card.colors}
        start={PurpleTheme.gradients.card.direction.start}
        end={PurpleTheme.gradients.card.direction.end}
        style={[
          styles.cardGradient,
          isCompact && styles.compactCard,
          isLarge && styles.largeCard,
        ]}
      >
        <View style={[styles.content, isCompact && styles.compactContent]}>
          {/* Group Name and Edit Button */}
          <View style={styles.headerRow}>
            <View style={styles.nameContainer}>
              <Text
                style={[
                  styles.groupName,
                  isCompact && styles.compactGroupName,
                  isLarge && styles.largeGroupName,
                ]}
                numberOfLines={1}
              >
                {groupName}
              </Text>
              {showEditButton && (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={onEditName}
                  accessibilityLabel="Edit group name"
                  accessibilityRole="button"
                >
                  <Text style={styles.editButtonText}>✏️</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          {/* Members and Stats */}
          <View style={[styles.membersSection, isCompact && styles.compactMembersSection]}>
            <MemberAvatars members={members} size={size} />
            <GroupStats members={members} size={size} />
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

/**
 * Utility function to generate random group name
 */
export const generateRandomGroupName = (): string => {
  return GroupNameSuggestions[Math.floor(Math.random() * GroupNameSuggestions.length)];
};

/**
 * Utility function to get group name suggestions
 */
export const getGroupNameSuggestions = (count: number = 5): string[] => {
  const shuffled = [...GroupNameSuggestions].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

/**
 * Styles
 */
const styles = StyleSheet.create({
  container: {
    marginVertical: PurpleTheme.spacing.sm,
  },
  
  cardGradient: {
    borderRadius: PurpleTheme.borderRadius.card,
    ...PurpleTheme.shadows.card,
  },
  
  compactCard: {
    borderRadius: PurpleTheme.borderRadius.md,
  },
  
  largeCard: {
    borderRadius: PurpleTheme.borderRadius.xl,
  },
  
  content: {
    padding: PurpleTheme.spacing.lg,
  },
  
  compactContent: {
    padding: PurpleTheme.spacing.md,
  },
  
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: PurpleTheme.spacing.md,
  },
  
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  groupName: {
    ...PurpleTheme.typography.styles.h3,
    color: PurpleTheme.colors.textPrimary,
    flex: 1,
    marginRight: PurpleTheme.spacing.sm,
  },
  
  compactGroupName: {
    ...PurpleTheme.typography.styles.h4,
  },
  
  largeGroupName: {
    ...PurpleTheme.typography.styles.h2,
  },
  
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PurpleTheme.colors.purple100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  editButtonText: {
    fontSize: 16,
  },
  
  membersSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  compactMembersSection: {
    marginTop: 0,
  },
  
  avatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  avatarWrapper: {
    position: 'relative',
  },
  
  memberAvatar: {
    borderWidth: 2,
    borderColor: PurpleTheme.colors.white,
  },
  
  remainingCountWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  remainingCountGradient: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: PurpleTheme.colors.white,
  },
  
  remainingCountText: {
    color: PurpleTheme.colors.white,
    fontWeight: 'bold',
  },
  
  statsContainer: {
    alignItems: 'flex-end',
  },
  
  memberCount: {
    ...PurpleTheme.typography.styles.bodySmall,
    color: PurpleTheme.colors.textSecondary,
    marginBottom: PurpleTheme.spacing.xs,
  },
  
  compactStats: {
    ...PurpleTheme.typography.styles.caption,
    color: PurpleTheme.colors.textLight,
  },
  
  transportModesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  
  transportModeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PurpleTheme.colors.purple100,
    paddingHorizontal: PurpleTheme.spacing.xs,
    paddingVertical: PurpleTheme.spacing.xs / 2,
    borderRadius: PurpleTheme.borderRadius.xs,
    marginLeft: PurpleTheme.spacing.xs,
    marginBottom: PurpleTheme.spacing.xs / 2,
  },
  
  transportModeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: PurpleTheme.spacing.xs / 2,
  },
  
  transportModeText: {
    ...PurpleTheme.typography.styles.caption,
    color: PurpleTheme.colors.textSecondary,
    fontSize: 10,
  },
});

export default GroupHeader;