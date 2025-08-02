// Firebase Configuration for MidWhereAh
// SINGLE initialization to prevent duplicates

// This file handles Firebase initialization using the config injected by Flask
// The config is available as window.firebaseConfig

// DO NOT hardcode Firebase credentials here
// These are injected by the server from environment variables

// Initialize Firebase ONLY ONCE
const initFirebase = () => {
    // Prevent duplicate initialization
    if (window.firebaseInitialized) {
        console.log('Firebase already initialized, skipping...');
        return;
    }

    // Log the config for debugging (without exposing the full API key)
    const safeConfig = {...window.firebaseConfig};
    if (safeConfig.apiKey) {
        safeConfig.apiKey = safeConfig.apiKey.substring(0, 5) + '...';
    }
    console.log('Firebase config:', safeConfig);
    
    try {
        firebase.initializeApp(window.firebaseConfig);
        window.firebaseInitialized = true;
        
        // Initialize Analytics if available
        if ('measurementId' in window.firebaseConfig && typeof firebase.analytics === 'function') {
            try {
                firebase.analytics();
                console.log('Firebase Analytics initialized');
            } catch (analyticsError) {
                console.warn('Firebase Analytics initialization failed:', analyticsError.message);
                console.warn('This is non-critical and the app will continue to function.');
            }
        }

        // Initialize Firestore
        if (typeof firebase.firestore === 'function') {
            firebase.firestore();
            console.log('Firebase Firestore initialized');
        }

        // Initialize Authentication with persistence
        if (typeof firebase.auth === 'function') {
            firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
                .then(() => {
                    console.log('Firebase Authentication persistence set to LOCAL');
                })
                .catch((error) => {
                    console.warn('Could not set Firebase Auth persistence:', error);
                });
            
            console.log('Firebase Authentication initialized');
        }

        console.log('Firebase initialized successfully');
    } catch (error) {
        console.error('Firebase initialization failed:', error);
    }
};

// Initialize Firebase when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize if not already done
    if (!window.firebaseInitialized) {
        initFirebase();
    }
});

// Also expose globally for manual initialization
window.initFirebase = initFirebase;