// Firebase Configuration for MidWhereAh

// This file handles Firebase initialization using the config injected by Flask
// The config is available as window.firebaseConfig

// DO NOT hardcode Firebase credentials here
// These are injected by the server from environment variables

// Initialize Firebase
const initFirebase = () => {
    // Log the config for debugging (without exposing the full API key)
    const safeConfig = {...firebaseConfig};
    if (safeConfig.apiKey) {
        safeConfig.apiKey = safeConfig.apiKey.substring(0, 5) + '...';
    }
    console.log('Firebase config:', safeConfig);
    
    // Check if Firebase is already initialized to prevent multiple initializations
    if (!firebase.apps || !firebase.apps.length) {
        try {
            firebase.initializeApp(firebaseConfig);
            
            // Initialize Analytics if available
            if ('measurementId' in firebaseConfig && typeof firebase.analytics === 'function') {
                try {
                    firebase.analytics();
                    console.log('Firebase Analytics initialized');
                } catch (analyticsError) {
                    console.warn('Firebase Analytics initialization failed:', analyticsError.message);
                    console.warn('This is non-critical and the app will continue to function.');
                }
            }
            
            // Initialize Firestore with error handling
            try {
                const db = firebase.firestore();
                window.db = db; // Make db accessible globally
                console.log('Firebase Firestore initialized');
            } catch (firestoreError) {
                console.error('Firebase Firestore initialization failed:', firestoreError.message);
            }
            
            // Initialize Authentication with error handling
            try {
                const auth = firebase.auth();
                // Set persistence to LOCAL to persist across page reloads and browser sessions
                auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
                    .then(() => {
                        console.log('Firebase Authentication persistence set to LOCAL');
                    })
                    .catch((error) => {
                        console.error('Error setting authentication persistence:', error);
                    });
                window.auth = auth; // Make auth accessible globally
                console.log('Firebase Authentication initialized');
            } catch (authError) {
                console.error('Firebase Authentication initialization failed:', authError.message);
            }
            
            // Disable Firebase Installations if causing 403 errors
            try {
                if (typeof firebase.installations === 'function') {
                    // Add a custom error handler for installations
                    firebase.installations().catch(error => {
                        if (error.code === 'installations/request-failed' && error.message.includes('403')) {
                            console.warn('Firebase Installations 403 error detected. This is likely due to missing permissions.');
                            console.warn('This is non-critical and the app will continue to function.');
                        }
                    });
                }
            } catch (installError) {
                console.warn('Firebase Installations handling failed:', installError.message);
                console.warn('This is non-critical and the app will continue to function.');
            }
            
            console.log('Firebase initialized successfully');
        } catch (error) {
            console.error('Firebase initialization error:', error);
        }
    } else {
        console.log('Firebase already initialized');
    }
};

// Make firebaseConfig and initialization function available to other scripts
window.firebaseConfig = firebaseConfig;
window.initFirebase = initFirebase;

// Note: In a production environment, you would want to load this configuration
// from environment variables on the server side and inject it into the page
// to avoid exposing your API keys in client-side code.

/*
* HOW TO SET UP FIREBASE:
* 
* 1. Go to Firebase Console (https://console.firebase.google.com/)
* 2. Create a new project or select an existing one
* 3. Add a web app to your project (click the </> icon)
* 4. Register your app and copy the configuration object
* 5. Replace the firebaseConfig object above with your actual config
* 6. Enable Authentication methods (Email/Password and Google) in the Firebase Console
* 7. Create a Firestore database in production mode
* 8. Set up security rules for your Firestore database
*/
