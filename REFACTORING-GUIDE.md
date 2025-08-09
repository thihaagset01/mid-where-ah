# UI Components Refactoring Guide

This guide provides instructions for refactoring the codebase to use the new shared UI components and services.

## Table of Contents
1. [Overview](#overview)
2. [New Services](#new-services)
3. [Refactoring Patterns](#refactoring-patterns)
4. [Examples](#examples)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

## Overview

We've introduced a new UI component system to standardize the look and behavior of UI elements across the application. The main components are:

- **UIService**: For creating consistent UI elements like buttons, cards, and loading spinners
- **MarkerStyleService**: For creating and styling map markers with consistent appearance and behavior
- **ServiceInitializer**: For managing service dependencies and initialization

## New Services

### UIService

**Location:** `/static/js/services/UIService.js`

Provides methods for creating consistent UI components:

- `createButton()`: Create styled buttons with icons and click handlers
- `createVenueCard()`: Create consistent venue cards with actions
- `createLoadingSpinner()`: Create loading indicators

### MarkerStyleService

**Location:** `/static/js/services/MarkerStyleService.js`

Handles map marker creation and styling:

- `createMarker()`: Basic marker creation
- `createEnhancedMarker()`: Marker with animations and event handlers
- `createSvgMarker()`: Custom SVG markers with icons and labels
- `createVenueInfoWindow()`: Standardized info windows for venues

### ServiceInitializer

**Location:** `/static/js/services/init.js`

Manages service initialization and dependencies:

- `initialize()`: Initialize all services
- `getService()`: Get a service by name

## Refactoring Patterns

### 1. Button Creation

**Before:**
```javascript
const button = document.createElement('button');
button.className = 'btn btn-primary';
button.innerHTML = '<i class="fas fa-search"></i> Search';
button.addEventListener('click', handleSearch);
```

**After:**
```javascript
const button = uiService.createButton({
    label: 'Search',
    variant: 'primary',
    icon: 'fas fa-search',
    onClick: handleSearch
});
```

### 2. Marker Creation

**Before:**
```javascript
const marker = new google.maps.Marker({
    position: location,
    map: map,
    title: 'My Marker',
    icon: {
        url: 'path/to/icon.png',
        scaledSize: new google.maps.Size(32, 32)
    }
});
```

**After:**
```javascript
const marker = markerStyleService.createEnhancedMarker(map, location, 'venue', {
    title: 'My Marker',
    animation: google.maps.Animation.DROP,
    onClick: (e) => {
        // Handle click
    }
});
```

### 3. Venue Info Windows

**Before:**
```javascript
const content = `
    <div class="info-window">
        <h3>${venue.name}</h3>
        <p>${venue.address}</p>
        <button class="btn">Select</button>
    </div>
`;
const infoWindow = new google.maps.InfoWindow({ content });
```

**After:**
```javascript
const infoWindow = markerStyleService.createVenueInfoWindow(
    venue,
    (selectedVenue) => {
        // Handle venue selection
    },
    (venueForDirections) => {
        // Handle directions
    }
);
```

## Examples

### Creating a Button with Icon

```javascript
// Import services
import serviceInitializer from './services/init';

// Initialize services
await serviceInitializer.initialize();
const { uiService } = serviceInitializer.services;

// Create button
const searchButton = uiService.createButton({
    label: 'Search',
    variant: 'primary',
    size: 'medium',
    icon: 'fas fa-search',
    onClick: () => {
        console.log('Search clicked!');
    }
});

document.body.appendChild(searchButton);
```

### Creating a Custom Marker

```javascript
import serviceInitializer from './services/init';

// Initialize services
await serviceInitializer.initialize();
const { markerStyleService } = serviceInitializer.services;

// Create custom marker
const location = { lat: 1.3521, lng: 103.8198 }; // Singapore
const marker = markerStyleService.createEnhancedMarker(
    map, 
    location, 
    'venue', 
    {
        title: 'Custom Location',
        animation: google.maps.Animation.DROP,
        onClick: (e, marker) => {
            console.log('Marker clicked!', marker);
        }
    }
);
```

## Best Practices

1. **Always initialize services** before using them:
   ```javascript
   await serviceInitializer.initialize();
   const { uiService, markerStyleService } = serviceInitializer.services;
   ```

2. **Use the service methods** instead of direct DOM manipulation or Google Maps API calls.

3. **Keep styles in the CSS file** - Don't use inline styles when a class can be used instead.

4. **Reuse components** - Check if a component already exists before creating a new one.

5. **Handle errors** - Always add error handling around service initialization and usage.

## Troubleshooting

### Services not initialized
**Error:** "Services have not been initialized"
**Solution:** Make sure to call `await serviceInitializer.initialize()` before using any services.

### Marker not appearing
**Issue:** Marker is created but not visible
**Solution:** Check that:
1. The map instance is valid
2. The position coordinates are valid
3. The map's zoom level and center are appropriate

### Styles not applying
**Issue:** Buttons or other elements don't have the expected styles
**Solution:** Check that:
1. The CSS file is properly included in your HTML
2. There are no CSS specificity issues
3. The correct class names are being used

## Next Steps

1. Refactor one component at a time
2. Test thoroughly after each change
3. Update any tests that might be affected
4. Document any new patterns or conventions
