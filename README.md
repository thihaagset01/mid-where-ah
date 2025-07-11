# MidWhereAh

A mobile-first web application for coordinating meetups in Singapore. MidWhereAh helps groups find fair meeting points based on everyone's location and preferences.

## Features

- **User Authentication**: Sign up/login with email or Google using Firebase Auth
- **Group Management**: Create meetup groups and invite friends via email/link
- **Location Input**: Current location detection or manual address input with Google Places autocomplete
- **Venue Recommendation**: Calculate midpoint between group members and find suitable venues
- **Group Decision Making**: Swipe interface for venue selection with real-time voting
- **Mobile-First UI**: Responsive design optimized for mobile with PWA capabilities
- **Multiple Location Inputs**: Add multiple starting locations to calculate the fairest midpoint
- **Interactive Map Interface**: Full-screen map with floating UI elements for better mobile experience

## Tech Stack

- **Backend**: Flask (Python)
- **Frontend**: HTML/CSS with Twitter Bootstrap 5
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **APIs**: Google Maps JavaScript API, Google Places API

## Project Structure

```
midwhereah/
├── app.py                 # Flask main application
├── requirements.txt       # Python dependencies
├── config.py              # Configuration settings
├── static/                # Static assets
│   ├── css/
│   │   ├── style.css      # Custom styles
│   │   ├── mobile.css     # Mobile-specific styles
│   │   └── venue-cards.css # Venue card component styles
│   ├── js/
│   │   ├── app.js         # Main JavaScript
│   │   ├── maps.js        # Google Maps integration
│   │   ├── mobile.js      # Mobile UI functionality
│   │   └── firebase-config.js  # Firebase configuration
│   ├── images/            # App icons and images
│   ├── manifest.json      # PWA manifest
│   └── service-worker.js  # PWA service worker
└── templates/             # HTML templates
    ├── base.html          # Base template with common elements
    ├── index.html         # Landing page
    ├── login.html         # Authentication page
    ├── dashboard.html     # User dashboard
    ├── group.html         # Group management
    ├── venues.html        # Venue recommendations
    ├── swipe.html         # Venue voting interface
    └── mobile_home.html    # Mobile-optimized home with map interface
```

## Setup Instructions

### Prerequisites

- Python 3.8+
- Google Maps API key
- Firebase project with Firestore and Authentication enabled

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/mid-where-ah.git
   cd mid-where-ah
   ```

2. Create and activate a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Set up environment variables securely:
   - Copy `.env.example` to `.env` (`.env` is in `.gitignore` to prevent accidental commits)
   - Fill in your Google Maps API key and Firebase configuration in the `.env` file
   - **IMPORTANT:** Never commit your actual API keys or secrets to version control
   - If you need to rotate credentials due to exposure, see the "Security" section below

5. Run the application:
   ```
   python app.py
   ```

6. Open your browser and navigate to `http://localhost:5000`

## Firebase Setup

1. Create a new Firebase project at [firebase.google.com](https://firebase.google.com)
2. Enable Authentication with Email/Password and Google sign-in methods

## Security

### Environment Variables

This project uses environment variables to manage sensitive credentials. Follow these best practices:

1. **Never commit secrets to version control**
   - The `.env` file is listed in `.gitignore` to prevent accidental commits
   - Only commit `.env.example` with placeholder values

2. **Properly manage your .env file**
   - Keep your `.env` file secure and restricted to only those who need access
   - Use different environment variables for development and production

3. **Rotate credentials regularly**
   - Change API keys and secrets periodically as a security best practice
   - Always rotate credentials immediately if they are accidentally exposed

### If Credentials Are Exposed

If you accidentally expose credentials (e.g., commit them to a public repository):

1. **Rotate all exposed credentials immediately**
   - Firebase: Go to Firebase Console > Project Settings > Web App > Regenerate keys
   - Google Maps: Go to Google Cloud Console > APIs & Services > Credentials > Regenerate key
   - Flask Secret Key: Generate a new random secret key

2. **Clean Git history**
   - Use tools like BFG Repo-Cleaner or git-filter-branch to remove secrets from history
   - Force push the cleaned repository

3. **Monitor for unusual activity**
   - Check Firebase usage logs for unexpected activity
   - Set up billing alerts to catch potential abuse
3. Create a Firestore database in production mode
4. Add your web app to the Firebase project and copy the configuration
5. Update the Firebase configuration in `.env` or directly in `static/js/firebase-config.js`

## Google Maps API Setup

1. Create a project in the [Google Cloud Platform Console](https://console.cloud.google.com)
2. Enable the Maps JavaScript API and Places API
3. Create an API key with appropriate restrictions
4. Add the API key to your `.env` file

## Mobile-First Design

MidWhereAh uses a mobile-first approach with these key UI components:

### Map Interface
- Full-screen Google Map as the primary interface
- Floating location input card at the top for adding multiple starting points
- Bottom venue card that slides up to show recommendations
- Bottom navigation bar for app-wide navigation

### Location Inputs
- Support for multiple location inputs (2+ addresses)
- Dynamic addition of more location fields
- Each location is geocoded and displayed on the map
- Midpoint calculation based on all provided locations

### Venue Discovery
- Venues are recommended based on the calculated midpoint
- Card-based UI for venue information
- Quick actions for adding venues to group voting

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.