# MidWhereAh

A mobile-first web application for coordinating meetups in Singapore. MidWhereAh helps groups find fair meeting points based on everyone's location and preferences.

## Features

- **User Authentication**: Secure sign up/login with email using Firebase Auth
- **User Profiles**: Personalized profiles with default location and transport preferences
- **Group Management**: Create meetup groups and invite friends
- **Location Input**: Current location detection or manual address input with Google Places autocomplete
- **Venue Recommendation**: Calculate midpoint between group members and find suitable venues
- **Mobile-First UI**: Responsive design optimized for mobile devices
- **Multiple Location Inputs**: Add multiple starting locations to calculate the fairest midpoint
- **Interactive Map Interface**: Full-screen map with floating UI elements for better mobile experience
- **Real-time Chat**: Group messaging for coordinating meetups

## Tech Stack

- **Backend**: Flask (Python 3.8+)
- **Frontend**: HTML/CSS/JavaScript with Bootstrap 5
- **Database**: Firebase Firestore
- **Authentication**: Firebase Authentication with backend token verification
- **APIs**: Google Maps JavaScript API, Google Places API
- **Deployment**: Ready for deployment with Gunicorn

## Project Structure

```
midwhereah/
├── app.py                    # Flask main application
├── config.py                 # Configuration settings
├── firebase_admin_config.py  # Firebase Admin SDK configuration
├── firestore.rules           # Firestore security rules
├── firestore-schema.md       # Database schema documentation
├── requirements.txt          # Python dependencies
├── .env                      # Environment variables (gitignored)
├── service-account.json      # Firebase service account (gitignored)
├── static/                   # Static assets
│   ├── css/
│   │   ├── auth.css          # Authentication styles
│   │   ├── base.css          # Base styles
│   │   ├── chat.css          # Chat interface styles
│   │   ├── components.css    # Reusable component styles
│   │   ├── groups.css        # Group management styles
│   │   ├── home.css          # Home page styles
│   │   ├── profile.css       # User profile styles
│   │   ├── venue-cards.css   # Venue card styles
│   │   └── view_map.css      # Map view styles
│   ├── js/
│   │   ├── app.js            # Main application logic
│   │   ├── LocationInput.js   # Location input component
│   │   ├── LocationManager.js # Location management
│   │   ├── SingaporeGeocoder.js # Singapore-specific geocoding
│   │   ├── autofill.js       # Address autofill functionality
│   │   ├── error-handler.js  # Error handling utilities
│   │   ├── firebase-config.js # Firebase client configuration
│   │   ├── group.js          # Group management logic
│   │   ├── group_chat.js     # Group chat functionality
│   │   ├── maps.js           # Google Maps integration
│   │   ├── mobile.js         # Mobile-specific functionality
│   │   ├── modal.js          # Modal dialog functionality
│   │   ├── profile.js        # User profile management
│   │   ├── results.js        # Results display logic
│   │   └── swipe.js          # Venue selection interface
│   ├── images/               # App icons and images
│   ├── manifest.json         # PWA manifest
│   └── service-worker.js     # PWA service worker
└── templates/                # HTML templates
    ├── group.html            # Group management page
    ├── group_chat.html       # Group chat interface
    ├── landing.html          # Landing/welcome page
    ├── login.html            # Authentication page
    ├── mobile_base.html      # Base template for mobile views
    ├── mobile_home.html      # Mobile home with map interface
    └── profile.html          # User profile page
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

4. Set up environment variables:
   - Create a `.env` file in the project root (this file is in `.gitignore` to prevent accidental commits)
   - Add the following environment variables:
   ```
   # Flask configuration
   FLASK_APP=app.py
   FLASK_ENV=development
   DEVELOPMENT_MODE=true  # Set to false in production
   SECRET_KEY=your_secure_random_key
   
   # Google Maps API
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   
   # Firebase configuration
   FIREBASE_API_KEY=your_firebase_api_key
   FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
   FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   FIREBASE_APP_ID=your_app_id
   FIREBASE_MEASUREMENT_ID=your_measurement_id
   
   # Firebase Admin SDK (choose one method)
   # Option 1: Path to service account JSON file
   FIREBASE_SERVICE_ACCOUNT_PATH=service-account.json
   # Option 2: Service account JSON as environment variable
   # FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
   ```

5. Set up Firebase service account for backend authentication:
   - Go to the Firebase Console > Project Settings > Service accounts
   - Click "Generate new private key"
   - Save the JSON file as `service-account.json` in the project root
   - This file is automatically added to `.gitignore` to prevent committing secrets

6. Run the application:
   ```
   python app.py
   ```

7. Open your browser and navigate to `http://localhost:5000`

## Firebase Setup

1. Create a new Firebase project at [firebase.google.com](https://firebase.google.com)
2. Enable Authentication with Email/Password sign-in method
3. Set up Firestore Database and configure security rules
4. Create a Firebase service account for backend authentication:
   - Go to Project Settings > Service accounts
   - Click "Generate new private key"
   - Save the JSON file as `service-account.json` in your project root
   - This file is automatically added to `.gitignore` to prevent committing secrets

### Firebase Authentication

The application uses Firebase Authentication for user management:

- Frontend authentication is handled by the Firebase JS SDK
- Backend authentication uses Firebase Admin SDK to verify ID tokens
- For development, set `DEVELOPMENT_MODE=true` to bypass token verification
- For production, ensure you have proper Firebase Admin credentials configured

### Firestore Security Rules

The application requires the following Firestore security rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read and write their own documents
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow users to read and write to groups they belong to
    match /groups/{groupId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Allow users to read and write to venues
    match /venues/{venueId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

## Authentication Flow

MidWhereAh implements a secure authentication flow:

1. **Frontend Authentication**: Users sign up or log in using Firebase Authentication
2. **Token Generation**: After successful authentication, Firebase generates an ID token
3. **Token Storage**: The ID token is stored in an HTTP-only cookie for security
4. **Backend Verification**: Protected routes verify the token using Firebase Admin SDK
5. **Session Management**: Flask session stores user information after token verification

### Development Mode

For easier local development, the application includes a development mode:

- Set `DEVELOPMENT_MODE=true` in your `.env` file
- In this mode, token verification is bypassed using PyJWT
- A mock user is provided when authentication would normally fail
- This allows testing without Firebase Admin SDK credentials

### Protected Routes

The following routes require authentication:

- `/profile` - User profile management
- `/group` - Group management
- Any other sensitive routes

## Security

### Environment Variables

This project uses environment variables to manage sensitive credentials. Follow these best practices:

1. **Never commit secrets to version control**

3. **Credential Rotation**
   - If credentials are compromised, rotate them immediately in the Firebase Console
   - Update your `.env` file and `service-account.json` with new credentials
   - For Google Maps API keys, rotate them in the Google Cloud Console

### Deployment Security

1. **Production Configuration**
   - Set `DEVELOPMENT_MODE=false` or remove it entirely in production
   - Ensure proper Firebase Admin SDK credentials are configured
   - Use HTTPS for all production deployments

2. **Environment Separation**
   - Consider using separate Firebase projects for development and production
   - This prevents development testing from affecting production data

3. **Regular Updates**
   - Keep dependencies updated to patch security vulnerabilities
   - Run `pip list --outdated` regularly to check for updates

## Deployment

MidWhereAh is ready for deployment with Gunicorn:

```bash
gunicorn app:app
```

For production deployment, consider using a process manager like Supervisor or systemd to ensure the application stays running.

### Environment Configuration

For production, set these environment variables:

```
FLASK_ENV=production
DEVELOPMENT_MODE=false
```

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- Google Maps API for location services
- Firebase for authentication and database
- Flask community for the excellent web framework
- Bootstrap team for the responsive UI components

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