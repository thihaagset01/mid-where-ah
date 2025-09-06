# Accessibility Guide for MidWhereAh

## Overview
This guide outlines the accessibility features implemented in MidWhereAh and provides guidelines for maintaining and extending accessibility support.

## WCAG 2.1 AA Compliance

### Implemented Features

#### ✅ Perceivable
- **Text Alternatives**: All images and icons have appropriate alt text or are marked as decorative
- **Screen Reader Support**: Comprehensive screen reader announcements and labels
- **Color Contrast**: All text meets WCAG AA color contrast requirements (4.5:1 for normal text, 3:1 for large text)
- **Visual Indicators**: Non-color dependent visual cues for important information

#### ✅ Operable
- **Keyboard Navigation**: All interactive elements are keyboard accessible
- **Touch Target Size**: Minimum 44x44pt touch targets for all interactive elements
- **Gesture Alternatives**: Alternative methods for complex gestures
- **Focus Management**: Proper focus order and visible focus indicators

#### ✅ Understandable
- **Clear Labels**: Descriptive labels for all form controls and buttons
- **Error Identification**: Clear error messages and validation feedback
- **Consistent Navigation**: Predictable navigation patterns throughout the app
- **Context Provision**: Sufficient context for screen reader users

#### ✅ Robust
- **Semantic Markup**: Proper use of accessibility roles and properties
- **Screen Reader Testing**: Tested with iOS VoiceOver and Android TalkBack
- **Cross-Platform Support**: Consistent accessibility across iOS and Android

## Accessibility Utilities

### Core Utilities (`src/utils/accessibility.ts`)

#### Screen Reader Announcements
```typescript
import { announceForAccessibility } from '../utils/accessibility';

// Announce important state changes
announceForAccessibility('Location added successfully');
```

#### Accessibility Props Generators
```typescript
import { getButtonAccessibilityProps } from '../utils/accessibility';

<TouchableOpacity
  {...getButtonAccessibilityProps(
    'Add location',
    'Adds a new location to your group'
  )}
/>
```

#### Available Generators
- `getButtonAccessibilityProps()` - For buttons and pressable elements
- `getTextInputAccessibilityProps()` - For text inputs with labels and validation
- `getSwitchAccessibilityProps()` - For toggle switches
- `getSliderAccessibilityProps()` - For sliders and adjustable values
- `getListAccessibilityProps()` - For lists and collections
- `getHeadingAccessibilityProps()` - For headings with proper hierarchy
- `getProgressAccessibilityProps()` - For progress indicators
- `getImageAccessibilityProps()` - For images and visual content

### VisuallyHidden Component

For content that should only be available to screen readers:

```typescript
import { VisuallyHidden } from '../components/common/VisuallyHidden';

<VisuallyHidden>
  <Text>Additional context for screen readers</Text>
</VisuallyHidden>
```

## Implementation Guidelines

### 1. Interactive Elements

#### Buttons
```typescript
// ✅ Good
<AnimatedPressable
  {...getButtonAccessibilityProps(
    'Start optimization',
    'Begins finding the optimal meeting point'
  )}
  onPress={handleOptimize}
>
  <Text>🚀 Start Optimization</Text>
</AnimatedPressable>

// ❌ Bad
<TouchableOpacity onPress={handleOptimize}>
  <Text>🚀</Text>
</TouchableOpacity>
```

#### Text Inputs
```typescript
// ✅ Good
<TextInput
  {...getTextInputAccessibilityProps(
    'Location name',
    value,
    'Enter a location name or address',
    true // required
  )}
  value={value}
  onChangeText={setValue}
/>

// ❌ Bad
<TextInput
  placeholder="Location"
  value={value}
  onChangeText={setValue}
/>
```

### 2. Navigation and Focus

#### Focus Management
```typescript
import { useEffect, useRef } from 'react';
import { AccessibilityInfo } from 'react-native';

const MyComponent = () => {
  const firstElementRef = useRef();

  useEffect(() => {
    // Focus first element when screen loads
    AccessibilityInfo.setAccessibilityFocus(firstElementRef.current);
  }, []);

  return (
    <View>
      <Text ref={firstElementRef} {...getHeadingAccessibilityProps('Page Title', 1)}>
        Welcome
      </Text>
    </View>
  );
};
```

#### Screen Announcements
```typescript
// Announce navigation changes
const navigateToMap = () => {
  announceForAccessibility('Opening map view');
  navigation.navigate('Map');
};

// Announce state changes
const addLocation = () => {
  setLocations([...locations, newLocation]);
  announceForAccessibility('Location added to group');
};
```

### 3. Visual Content

#### Images
```typescript
// ✅ Informative image
<Image
  source={mapImage}
  {...getImageAccessibilityProps('Map showing current meeting point locations')}
/>

// ✅ Decorative image
<Image
  source={decorativeIcon}
  {...getImageAccessibilityProps('', true)} // decorative
/>
```

#### Progress Indicators
```typescript
<AnimatedProgressBar
  progress={0.75}
  {...getProgressAccessibilityProps('Optimization progress', 75, 100)}
/>
```

### 4. Lists and Collections

#### List Implementation
```typescript
const LocationList = ({ locations }) => {
  return (
    <View {...getListAccessibilityProps('User locations', locations.length)}>
      {locations.map((location, index) => (
        <TouchableOpacity
          key={location.id}
          {...getListItemAccessibilityProps(
            location.name,
            index,
            locations.length,
            location.selected
          )}
        >
          <Text>{location.name}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};
```

## Testing

### Automated Testing

#### Run Accessibility Tests
```bash
npm run test:accessibility
```

#### ESLint Accessibility Rules
The project includes comprehensive accessibility linting:
```bash
npm run lint
```

### Manual Testing

#### iOS VoiceOver Testing
1. Enable VoiceOver: Settings > Accessibility > VoiceOver
2. Navigate using swipe gestures
3. Verify all elements are announced correctly
4. Test custom actions and gestures

#### Android TalkBack Testing
1. Enable TalkBack: Settings > Accessibility > TalkBack
2. Navigate using swipe gestures
3. Verify focus order and announcements
4. Test with different verbosity levels

### Testing Checklist

#### Basic Functionality
- [ ] All interactive elements are reachable via screen reader
- [ ] All elements have meaningful labels
- [ ] Focus order is logical and predictable
- [ ] State changes are announced appropriately
- [ ] Error messages are clear and actionable

#### Navigation
- [ ] Tab order follows visual layout
- [ ] Focus moves appropriately between screens
- [ ] Back navigation works with assistive technology
- [ ] Modal focus is trapped appropriately

#### Content
- [ ] Headings create proper hierarchy
- [ ] Lists are properly structured
- [ ] Images have appropriate alt text
- [ ] Form validation is accessible

## Common Accessibility Patterns

### Loading States
```typescript
const LoadingComponent = ({ isLoading, progress }) => {
  if (isLoading) {
    return (
      <View {...getProgressAccessibilityProps('Loading locations', progress, 100, !progress)}>
        <AnimatedSpinner />
        <VisuallyHidden>
          <Text>Loading in progress, please wait</Text>
        </VisuallyHidden>
      </View>
    );
  }
  return <Content />;
};
```

### Error Handling
```typescript
const ErrorComponent = ({ error }) => {
  useEffect(() => {
    if (error) {
      announceForAccessibility(`Error: ${error.message}`);
    }
  }, [error]);

  return (
    <View {...getModalAccessibilityProps('Error message', true)}>
      <Text {...getHeadingAccessibilityProps('Error', 2)}>
        Something went wrong
      </Text>
      <Text>{error.message}</Text>
    </View>
  );
};
```

### Form Validation
```typescript
const FormField = ({ label, value, error, required }) => {
  return (
    <View>
      <Text {...getHeadingAccessibilityProps(label, 3)}>
        {label} {required && '*'}
      </Text>
      <TextInput
        {...getTextInputAccessibilityProps(label, value, undefined, required)}
        value={value}
        onChangeText={setValue}
      />
      {error && (
        <Text
          {...getModalAccessibilityProps(`Error: ${error}`, true)}
          style={styles.errorText}
        >
          {error}
        </Text>
      )}
    </View>
  );
};
```

## Accessibility Validation

### Validation Utility
```typescript
import { validateAccessibilityProps } from '../utils/accessibility';

// Use in development to catch accessibility issues
const warnings = validateAccessibilityProps(props);
if (__DEV__ && warnings.length > 0) {
  console.warn('Accessibility warnings:', warnings);
}
```

### Common Validation Warnings
- Missing accessibility labels on interactive elements
- Overly long accessibility hints (>50 characters)
- Missing required props for specific roles
- Improper use of accessibility roles

## Best Practices

### 1. Design for Accessibility First
- Consider screen reader users during design phase
- Ensure sufficient color contrast from the start
- Design clear focus indicators
- Plan logical navigation flow

### 2. Test Early and Often
- Include accessibility testing in development process
- Test with real assistive technology
- Get feedback from users with disabilities
- Automate accessibility testing where possible

### 3. Provide Context
- Use descriptive labels, not just visual cues
- Announce state changes and navigation
- Provide alternative ways to access information
- Explain complex interactions

### 4. Keep It Simple
- Use standard UI patterns when possible
- Avoid overly complex gestures
- Provide clear, concise instructions
- Minimize cognitive load

## Continuous Improvement

### Regular Audits
- Monthly accessibility testing with screen readers
- Quarterly review of accessibility features
- Annual comprehensive accessibility audit
- User feedback collection and analysis

### Staying Updated
- Monitor WCAG guidelines for updates
- Follow platform accessibility best practices
- Participate in accessibility communities
- Train team members on accessibility principles

## Resources

### Official Guidelines
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [React Native Accessibility](https://reactnative.dev/docs/accessibility)
- [iOS Accessibility](https://developer.apple.com/accessibility/)
- [Android Accessibility](https://developer.android.com/guide/topics/ui/accessibility)

### Testing Tools
- iOS VoiceOver
- Android TalkBack
- Accessibility Inspector (iOS)
- ESLint jsx-a11y plugin

### Community Resources
- [A11y Project](https://www.a11yproject.com/)
- [WebAIM](https://webaim.org/)
- [Accessibility Developer Guide](https://www.accessibility-developer-guide.com/)