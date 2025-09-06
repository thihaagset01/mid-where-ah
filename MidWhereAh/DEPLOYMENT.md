# MidWhereAh - Deployment Guide

## Overview
This guide covers the deployment process for the MidWhereAh React Native app using Expo and EAS Build.

## Prerequisites

### 1. Install Expo CLI and EAS CLI
```bash
npm install -g @expo/cli eas-cli
```

### 2. Login to Expo
```bash
expo login
eas login
```

### 3. Set up Environment Variables
Copy the environment files and fill in your actual API keys:

#### Development
```bash
cp .env.development .env.local
# Edit .env.local with your development API keys
```

#### Production
Set the following secrets in your CI/CD environment:
- `EXPO_TOKEN`
- `GOOGLE_MAPS_API_KEY`
- `ONEMAP_API_KEY`
- `EXPO_APPLE_ID` (for iOS submission)
- `EXPO_ASC_APP_ID` (for iOS submission)

## Local Development

### Run the app locally
```bash
npm install
npm start
```

### Run tests
```bash
npm test
npm run test:accessibility
npm run test:coverage
```

### Lint code
```bash
npm run lint
npm run lint:fix
```

## Building for Production

### Configure EAS Project
```bash
eas init
```

### Build Development Version
```bash
npm run build:development
```

### Build Preview Version
```bash
npm run build:preview
```

### Build Production Version
```bash
npm run build:production
```

## Deployment

### Submit to App Stores
```bash
# iOS App Store
npm run submit:ios

# Google Play Store
npm run submit:android
```

### Automatic Deployment via GitHub Actions
The app automatically builds and deploys when:
1. Push to `main` branch triggers production build
2. Pull requests trigger preview builds
3. Commits with `[release]` in message trigger app store submission

## Environment Configuration

### Required Environment Variables

#### API Keys
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`: Google Maps API key for location services
- `EXPO_PUBLIC_ONEMAP_API_KEY`: OneMap Singapore API key (fallback)

#### Firebase Configuration
- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`

#### Feature Flags
- `EXPO_PUBLIC_ENABLE_ANALYTICS`: Enable analytics tracking
- `EXPO_PUBLIC_ENABLE_CRASH_REPORTING`: Enable crash reporting
- `EXPO_PUBLIC_DEBUG_MODE`: Enable debug features
- `EXPO_PUBLIC_PERFORMANCE_MONITORING`: Enable performance monitoring
- `EXPO_PUBLIC_ACCESSIBILITY_TESTING`: Enable accessibility testing features

## Accessibility Features

The app includes comprehensive accessibility features:

### Implemented Features
- Screen reader support with proper ARIA labels
- Keyboard navigation
- Focus management
- High contrast mode support
- Voice announcements for state changes
- Accessibility testing utilities

### Testing Accessibility
```bash
npm run test:accessibility
```

### Accessibility Guidelines
- All interactive elements have accessibility labels
- Images have alt text or are marked as decorative
- Forms have proper field labels and error messages
- Navigation is keyboard accessible
- Color contrast meets WCAG AA standards

## Animation Features

The app includes sophisticated animations:

### Implemented Animations
- Entrance animations (fade, slide, scale)
- Micro-interactions for buttons and cards
- Loading animations and progress indicators
- Gesture-based animations
- Scroll-based parallax effects

### Performance Considerations
- Animations respect reduced motion preferences
- Performance optimized for 60fps
- Efficient use of React Native Reanimated

## Performance Optimization

### Build Optimization
- ProGuard enabled for Android release builds
- Resource shrinking enabled
- Code splitting and tree shaking
- Bundle size optimization

### Runtime Performance
- Intelligent caching for API requests
- Optimized rendering with React.memo
- Lazy loading of heavy components
- Memory management for large datasets

## Monitoring and Analytics

### Production Monitoring
- Crash reporting (when enabled)
- Performance monitoring
- User analytics (when enabled)
- Error tracking and reporting

### Development Monitoring
- Jest test coverage reports
- ESLint accessibility rule enforcement
- Bundle size analysis
- Performance profiling

## Troubleshooting

### Common Issues

#### Build Failures
1. Check environment variables are set correctly
2. Ensure all dependencies are installed
3. Clear node_modules and reinstall if needed
4. Check EAS build logs for specific errors

#### Accessibility Issues
1. Run accessibility tests: `npm run test:accessibility`
2. Use accessibility inspector on device
3. Test with screen reader enabled
4. Validate with accessibility guidelines

#### Animation Performance
1. Check for excessive re-renders
2. Profile animation performance
3. Ensure animations respect reduced motion
4. Test on lower-end devices

### Getting Help
- Check Expo documentation: https://docs.expo.dev/
- React Native accessibility: https://reactnative.dev/docs/accessibility
- Report issues in the project repository

## Security Considerations

### API Keys
- Never commit API keys to version control
- Use environment-specific configurations
- Rotate keys regularly
- Monitor API usage for anomalies

### User Data
- Follow data protection regulations
- Implement proper data encryption
- Secure user location data
- Provide privacy controls

## Maintenance

### Regular Tasks
- Update dependencies monthly
- Review and update accessibility features
- Monitor performance metrics
- Test on latest OS versions
- Update app store metadata

### Version Management
- Use semantic versioning
- Maintain changelog
- Test on multiple devices
- Plan for backward compatibility