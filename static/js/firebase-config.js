// Firebase Configuration for MidWhereAh

// IMPORTANT: Replace this configuration with your actual Firebase project details
// For development, paste your Firebase config object from the Firebase Console here
// For production, these values should be injected from environment variables

const firebaseConfig = {
    apiKey: "AIzaSyDpZqzqdhX0m5UDoxozq7B7MJFLDPiXZH4",
    authDomain: "mid-where-ah.firebaseapp.com",
    projectId: "mid-where-ah",
    storageBucket: "mid-where-ah.firebasestorage.app",
    messagingSenderId: "1095052427731",
    appId: "1:1095052427731:web:dd49ccc7ca5cc80f5a2f26",
    measurementId: "G-BSGWXZMLJQ"
};

// Initialize Firebase
const initFirebase = () => {
    // Check if Firebase is already initialized to prevent multiple initializations
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        
        // Initialize Analytics if available
        if ('measurementId' in firebaseConfig) {
            firebase.analytics();
        }
        
        // Initialize Firestore
        const db = firebase.firestore();
        window.db = db; // Make db accessible globally
        
        // Initialize Authentication
        const auth = firebase.auth();
        window.auth = auth; // Make auth accessible globally
        
        console.log('Firebase initialized successfully');
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
