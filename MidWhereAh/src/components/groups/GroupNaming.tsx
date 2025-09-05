/**
 * Group Naming Component for MidWhereAh
 * 
 * Fun and social group naming interface with suggestions
 * and purple theme styling.
 * 
 * @author MidWhereAh Team
 * @version 1.0.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Animated,
  Dimensions,
  ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { PurpleTheme } from '../../design/theme';
import { getGroupNameSuggestions } from './GroupHeader';

/**
 * Group Naming Props
 */
export interface GroupNamingProps {
  /** Current group name */
  currentName: string;
  /** Callback when name is changed */
  onNameChange: (name: string) => void;
  /** Callback when naming is completed */
  onComplete: () => void;
  /** Callback when naming is cancelled */
  onCancel: () => void;
  /** Show as modal */
  isModal?: boolean;
  /** Modal visibility */
  visible?: boolean;
  /** Custom style override */
  style?: ViewStyle;
}

/**
 * Name suggestion chip component
 */
const NameSuggestionChip: React.FC<{
  name: string;
  onPress: () => void;
  isSelected: boolean;
}> = ({ name, onPress, isSelected }) => {
  return (
    <TouchableOpacity
      style={[
        styles.suggestionChip,
        isSelected && styles.selectedChip,
      ]}
      onPress={onPress}
      accessibilityLabel={`Select group name: ${name}`}
      accessibilityRole="button"
    >
      {isSelected ? (
        <LinearGradient
          colors={PurpleTheme.gradients.primary.colors}
          start={PurpleTheme.gradients.primary.direction.start}
          end={PurpleTheme.gradients.primary.direction.end}
          style={styles.selectedChipGradient}
        >
          <Text style={[styles.suggestionText, styles.selectedSuggestionText]}>
            {name}
          </Text>
        </LinearGradient>
      ) : (
        <Text style={styles.suggestionText}>{name}</Text>
      )}
    </TouchableOpacity>
  );
};

/**
 * Group Naming Component
 */
export const GroupNaming: React.FC<GroupNamingProps> = ({
  currentName,
  onNameChange,
  onComplete,
  onCancel,
  isModal = true,
  visible = true,
  style,
}) => {
  const [inputName, setInputName] = useState(currentName);
  const [suggestions] = useState(() => getGroupNameSuggestions(8));
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
  
  const textInputRef = useRef<TextInput>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Start animations when modal opens
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 8,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Focus text input after animation
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 400);
    } else {
      slideAnim.setValue(0);
      fadeAnim.setValue(0);
    }
  }, [visible, slideAnim, fadeAnim]);

  const handleSuggestionPress = (suggestion: string) => {
    setInputName(suggestion);
    setSelectedSuggestion(suggestion);
  };

  const handleInputChange = (text: string) => {
    setInputName(text);
    setSelectedSuggestion(null); // Clear selection when typing
  };

  const handleSave = () => {
    const finalName = inputName.trim() || 'Awesome Group';
    onNameChange(finalName);
    onComplete();
  };

  const handleCancel = () => {
    setInputName(currentName);
    setSelectedSuggestion(null);
    onCancel();
  };

  const generateNewSuggestions = () => {
    // Simple shuffle for new suggestions
    const newSuggestions = getGroupNameSuggestions(8);
    // In a real app, you'd update state here
  };

  const screenHeight = Dimensions.get('window').height;
  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [screenHeight, 0],
  });

  const content = (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity: fadeAnim,
        },
        !isModal && style,
      ]}
    >
      <LinearGradient
        colors={PurpleTheme.gradients.background.colors}
        start={PurpleTheme.gradients.background.direction.start}
        end={PurpleTheme.gradients.background.direction.end}
        style={styles.backgroundGradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Name Your Group</Text>
          <Text style={styles.subtitle}>
            Give your meetup squad a fun name that represents your crew!
          </Text>
        </View>

        {/* Custom Name Input */}
        <View style={styles.inputSection}>
          <Text style={styles.sectionTitle}>Custom Name</Text>
          <View style={styles.inputContainer}>
            <TextInput
              ref={textInputRef}
              style={styles.textInput}
              value={inputName}
              onChangeText={handleInputChange}
              placeholder="Enter a group name..."
              placeholderTextColor={PurpleTheme.colors.textLight}
              selectionColor={PurpleTheme.colors.primary}
              maxLength={30}
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
            <View style={styles.inputUnderline} />
          </View>
          <Text style={styles.characterCount}>
            {inputName.length}/30 characters
          </Text>
        </View>

        {/* Suggestions */}
        <View style={styles.suggestionsSection}>
          <View style={styles.suggestionHeader}>
            <Text style={styles.sectionTitle}>Quick Suggestions</Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={generateNewSuggestions}
              accessibilityLabel="Get new suggestions"
            >
              <Text style={styles.refreshText}>🎲</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView
            style={styles.suggestionsScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.suggestionsGrid}>
              {suggestions.map((suggestion, index) => (
                <NameSuggestionChip
                  key={`${suggestion}-${index}`}
                  name={suggestion}
                  onPress={() => handleSuggestionPress(suggestion)}
                  isSelected={selectedSuggestion === suggestion}
                />
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            accessibilityLabel="Cancel group naming"
            accessibilityRole="button"
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            accessibilityLabel="Save group name"
            accessibilityRole="button"
          >
            <LinearGradient
              colors={PurpleTheme.gradients.button.colors}
              start={PurpleTheme.gradients.button.direction.start}
              end={PurpleTheme.gradients.button.direction.end}
              style={styles.saveButtonGradient}
            >
              <Text style={styles.saveButtonText}>Save Name</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  if (isModal) {
    return (
      <Modal
        visible={visible}
        animationType="none"
        presentationStyle="overFullScreen"
        transparent={true}
        statusBarTranslucent={true}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={handleCancel}
            activeOpacity={1}
          />
          {content}
        </View>
      </Modal>
    );
  }

  return content;
};

/**
 * Styles
 */
const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: PurpleTheme.colors.backdrop,
  },
  
  container: {
    maxHeight: '80%',
    minHeight: '60%',
  },
  
  backgroundGradient: {
    flex: 1,
    borderTopLeftRadius: PurpleTheme.borderRadius.xl,
    borderTopRightRadius: PurpleTheme.borderRadius.xl,
    paddingTop: PurpleTheme.spacing.lg,
    paddingHorizontal: PurpleTheme.spacing.lg,
    paddingBottom: PurpleTheme.spacing.xl,
  },
  
  header: {
    alignItems: 'center',
    marginBottom: PurpleTheme.spacing.xl,
  },
  
  title: {
    ...PurpleTheme.typography.styles.h2,
    color: PurpleTheme.colors.textPrimary,
    marginBottom: PurpleTheme.spacing.sm,
  },
  
  subtitle: {
    ...PurpleTheme.typography.styles.body,
    color: PurpleTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  
  inputSection: {
    marginBottom: PurpleTheme.spacing.xl,
  },
  
  sectionTitle: {
    ...PurpleTheme.typography.styles.label,
    color: PurpleTheme.colors.textPrimary,
    marginBottom: PurpleTheme.spacing.md,
    fontWeight: '600',
  },
  
  inputContainer: {
    position: 'relative',
  },
  
  textInput: {
    ...PurpleTheme.typography.styles.bodyLarge,
    color: PurpleTheme.colors.textPrimary,
    backgroundColor: 'transparent',
    paddingVertical: PurpleTheme.spacing.md,
    paddingHorizontal: 0,
    borderWidth: 0,
  },
  
  inputUnderline: {
    height: 2,
    backgroundColor: PurpleTheme.colors.primary,
    marginTop: PurpleTheme.spacing.xs,
  },
  
  characterCount: {
    ...PurpleTheme.typography.styles.caption,
    color: PurpleTheme.colors.textLight,
    textAlign: 'right',
    marginTop: PurpleTheme.spacing.xs,
  },
  
  suggestionsSection: {
    flex: 1,
    marginBottom: PurpleTheme.spacing.xl,
  },
  
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: PurpleTheme.spacing.md,
  },
  
  refreshButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PurpleTheme.colors.purple100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  refreshText: {
    fontSize: 16,
  },
  
  suggestionsScroll: {
    flex: 1,
  },
  
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  
  suggestionChip: {
    minWidth: '45%',
    marginBottom: PurpleTheme.spacing.sm,
    borderRadius: PurpleTheme.borderRadius.md,
    overflow: 'hidden',
  },
  
  selectedChip: {
    // Styling handled by gradient
  },
  
  selectedChipGradient: {
    paddingVertical: PurpleTheme.spacing.md,
    paddingHorizontal: PurpleTheme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  
  suggestionText: {
    ...PurpleTheme.typography.styles.body,
    color: PurpleTheme.colors.textPrimary,
    textAlign: 'center',
    backgroundColor: PurpleTheme.colors.purple100,
    paddingVertical: PurpleTheme.spacing.md,
    paddingHorizontal: PurpleTheme.spacing.md,
    borderRadius: PurpleTheme.borderRadius.md,
    minHeight: 44,
    textAlignVertical: 'center',
  },
  
  selectedSuggestionText: {
    color: PurpleTheme.colors.white,
    backgroundColor: 'transparent',
    paddingVertical: 0,
    paddingHorizontal: 0,
    borderRadius: 0,
    minHeight: 'auto',
  },
  
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: PurpleTheme.spacing.md,
  },
  
  cancelButton: {
    flex: 1,
    marginRight: PurpleTheme.spacing.md,
    paddingVertical: PurpleTheme.spacing.md,
    paddingHorizontal: PurpleTheme.spacing.lg,
    borderRadius: PurpleTheme.borderRadius.button,
    backgroundColor: PurpleTheme.colors.gray200,
    alignItems: 'center',
  },
  
  cancelButtonText: {
    ...PurpleTheme.typography.styles.button,
    color: PurpleTheme.colors.textSecondary,
  },
  
  saveButton: {
    flex: 1,
    marginLeft: PurpleTheme.spacing.md,
    borderRadius: PurpleTheme.borderRadius.button,
    overflow: 'hidden',
    ...PurpleTheme.shadows.button,
  },
  
  saveButtonGradient: {
    paddingVertical: PurpleTheme.spacing.md,
    paddingHorizontal: PurpleTheme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  saveButtonText: {
    ...PurpleTheme.typography.styles.button,
    color: PurpleTheme.colors.white,
  },
});

export default GroupNaming;